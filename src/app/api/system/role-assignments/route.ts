import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Employee from "@/lib/models/Employee";
import Role from "@/lib/models/Role";
import { User } from "@/models/User";
import {
  isAdminOrOwner,
  requirePermission,
  requireSession,
} from "@/lib/api-auth";
import { HR_EMPLOYEE_EXCLUDED_ROLE_KEYS } from "@/lib/hrms-employee-options";
import { pickEmployeeLoginEmail } from "@/lib/hrms-employee-welcome";
import { sendRoleAssignmentNotifications } from "@/lib/role-assignment-email";

// Role assignment reads the live User.role of every employee, so it must never
// be served from a cache.
export const dynamic = "force-dynamic";

/** Same shape the role-create form enforces — lowercase, hyphen-separated. */
const ROLE_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type EmployeeLean = {
  employeeId?: string;
  fullName?: string;
  department?: string;
  designation?: string;
  officialEmail?: string;
  personalEmail?: string;
};

/**
 * GET — every employee with their employee code and the role their login
 * account currently carries, for the "assign role" picker on /users.
 */
export async function GET() {
  const { user, error } = await requireSession();
  if (error) return error;
  if (!isAdminOrOwner(user.role)) {
    const permErr = requirePermission(user, "user_management", "view");
    if (permErr) return permErr;
  }

  try {
    await connectDB();

    const employees = (await Employee.find(
      {},
      {
        employeeId: 1,
        fullName: 1,
        department: 1,
        designation: 1,
        officialEmail: 1,
        personalEmail: 1,
      },
    )
      .sort({ fullName: 1 })
      .lean()) as EmployeeLean[];

    const employeeIds = employees
      .map((emp) => String(emp.employeeId || "").trim())
      .filter(Boolean);

    const accounts = await User.find(
      { employeeId: { $in: employeeIds } },
      { employeeId: 1, email: 1, role: 1 },
    ).lean();

    const accountByEmployeeId = new Map<string, { email: string; role: string }>();
    for (const account of accounts) {
      const key = String(account.employeeId || "").trim();
      if (!key) continue;
      accountByEmployeeId.set(key, {
        email: String(account.email || "").trim().toLowerCase(),
        role: String(account.role || "").trim(),
      });
    }

    const data = employees
      .filter((emp) => String(emp.employeeId || "").trim())
      .map((emp) => {
        const employeeId = String(emp.employeeId).trim();
        const account = accountByEmployeeId.get(employeeId);
        const department = String(emp.department || "").trim();
        return {
          employeeId,
          fullName: String(emp.fullName || "").trim() || employeeId,
          designation: String(emp.designation || "").trim(),
          department,
          // The login account is the source of truth; department is the
          // fallback because it doubles as the role for employees whose
          // account has not been provisioned yet.
          role: account?.role || department,
          email: account?.email || pickEmployeeLoginEmail(emp),
          hasAccount: Boolean(account),
        };
      });

    return NextResponse.json(
      { success: true, count: data.length, data },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("GET Role Assignments API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST — update an employee's access role and/or their designation (the plain
 * job-title string), then notify them + owners/admins. Either field may be sent
 * on its own; at least one must actually change.
 */
export async function POST(req: Request) {
  const { user, error } = await requireSession();
  if (error) return error;
  if (!isAdminOrOwner(user.role)) {
    const permErr = requirePermission(user, "user_management", "edit");
    if (permErr) return permErr;
  }

  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const employeeId =
      typeof body.employeeId === "string" ? body.employeeId.trim() : "";
    const roleKey =
      typeof body.roleKey === "string" ? body.roleKey.trim().toLowerCase() : "";
    const designationProvided = typeof body.designation === "string";
    const designation = designationProvided ? body.designation.trim() : "";

    if (!employeeId) {
      return NextResponse.json(
        { error: "employeeId is required" },
        { status: 400 },
      );
    }
    if (!roleKey && !designationProvided) {
      return NextResponse.json(
        { error: "Provide a roleKey, a designation, or both" },
        { status: 400 },
      );
    }
    // Designation is required on the Employee schema — never blank it out.
    if (designationProvided && !designation) {
      return NextResponse.json(
        { error: "Designation cannot be empty" },
        { status: 400 },
      );
    }

    // A role is ultimately just a string on the user account. Assigning a key
    // that has no Role document is allowed (the caller may be staging a role
    // that is about to be created), but it must still look like a role key —
    // and the caller is told, so they know the account resolves to zero
    // permissions until a matching role exists.
    if (roleKey && !ROLE_KEY_PATTERN.test(roleKey)) {
      return NextResponse.json(
        {
          error:
            "Role key must use lowercase letters, numbers, and hyphens only (e.g. field-sales-lead)",
        },
        { status: 400 },
      );
    }

    const role = roleKey ? await Role.findOne({ roleKey }).lean() : null;

    const employee = (await Employee.findOne({ employeeId }).lean()) as
      | EmployeeLean
      | null;
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const account = await User.findOne({ employeeId }).lean();
    const previousRole = String(account?.role || employee.department || "").trim();
    const previousDesignation = String(employee.designation || "").trim();

    const roleChanged = Boolean(roleKey) && previousRole.toLowerCase() !== roleKey;
    const changesDesignation =
      designationProvided && designation !== previousDesignation;

    if (!roleChanged && !changesDesignation) {
      return NextResponse.json(
        {
          error: `Nothing to update — ${
            employee.fullName || employeeId
          } already has this role and designation.`,
        },
        { status: 400 },
      );
    }

    // Granting or revoking owner/admin/master is an admin/owner-only action —
    // a role that merely holds user_management:edit must not be able to mint
    // (or strip) top-level access.
    const touchesPrivilegedRole =
      roleChanged &&
      (HR_EMPLOYEE_EXCLUDED_ROLE_KEYS.has(roleKey) ||
        HR_EMPLOYEE_EXCLUDED_ROLE_KEYS.has(previousRole.toLowerCase()));
    if (touchesPrivilegedRole && !isAdminOrOwner(user.role)) {
      return NextResponse.json(
        { error: "Only an admin or owner can change owner/admin/master access." },
        { status: 403 },
      );
    }

    // Changing your own role can lock you out mid-session — make someone else
    // do it.
    if (
      (user.employeeId && user.employeeId === employeeId) ||
      (account && String(account._id) === user.id)
    ) {
      return NextResponse.json(
        { error: "You cannot change your own role or designation." },
        { status: 400 },
      );
    }

    if (roleChanged && account) {
      await User.updateOne({ _id: account._id }, { $set: { role: roleKey } });
    }

    const employeeSet: Record<string, string> = {};
    if (changesDesignation) {
      employeeSet.designation = designation;
    }

    // Department doubles as the employee's login role (see the employee PUT
    // route), so keep it in sync — otherwise the next HR edit would silently
    // revert this assignment. owner/admin/master are never valid departments.
    let departmentSynced = false;
    if (
      roleChanged &&
      !HR_EMPLOYEE_EXCLUDED_ROLE_KEYS.has(roleKey) &&
      String(employee.department || "").trim() !== roleKey
    ) {
      employeeSet.department = roleKey;
      departmentSynced = true;
    }

    if (Object.keys(employeeSet).length) {
      await Employee.updateOne({ employeeId }, { $set: employeeSet });
    }

    const employeeName = String(employee.fullName || "").trim() || employeeId;
    const employeeEmail =
      String(account?.email || "").trim().toLowerCase() ||
      pickEmployeeLoginEmail(employee);

    const previousRoleDoc =
      roleChanged && previousRole
        ? await Role.findOne({ roleKey: previousRole.toLowerCase() }).lean()
        : null;

    const notified = await sendRoleAssignmentNotifications({
      employeeId,
      employeeName,
      employeeEmail,
      roleChanged,
      previousRoleLabel: previousRoleDoc?.label || previousRole || "Not assigned",
      newRoleLabel: role?.label || roleKey || previousRole,
      newRoleKey: roleKey || previousRole,
      ...(changesDesignation
        ? { previousDesignation, newDesignation: designation }
        : {}),
      actedBy: user.name || user.email,
    });

    return NextResponse.json({
      success: true,
      data: {
        employeeId,
        fullName: employeeName,
        role: roleChanged ? roleKey : previousRole,
        previousRole,
        roleChanged,
        designation: changesDesignation ? designation : previousDesignation,
        previousDesignation,
        designationChanged: changesDesignation,
        email: employeeEmail,
        hasAccount: Boolean(account),
        departmentSynced,
        // No Role document backs this key yet, so the account resolves to no
        // permissions until one is created.
        isCustomRole: roleChanged && !role,
        notified,
      },
    });
  } catch (error) {
    console.error("POST Role Assignment API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
