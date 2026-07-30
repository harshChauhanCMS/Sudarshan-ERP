import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Employee from "@/lib/models/Employee";
import { User } from "@/models/User";
import {
  employeeUniqueConflictMessage,
  findEmployeeUniqueConflict,
} from "@/lib/hrms-employee-uniqueness";
import { assertEmployeeVisibleToViewer } from "@/lib/hr-staff-visibility";
import { assertManagerCanAccessEmployee, isManagerRole } from "@/lib/manager-scope";
import { canManageEmployees } from "@/lib/hrms-access";
import { validateEmployeePayload } from "@/lib/hrms-validation";
import { HR_EMPLOYEE_EXCLUDED_ROLE_KEYS } from "@/lib/hrms-employee-options";
import {
  EMPLOYEE_WRITABLE_FIELDS,
  pickAllowedFields,
} from "@/lib/field-allowlists";
import { getSession } from "@/lib/session";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const session = await getSession();
    const managerAccess = await assertManagerCanAccessEmployee(session.user, id);
    if (!managerAccess.ok) {
      return NextResponse.json({ error: managerAccess.message }, { status: 403 });
    }
    const access = await assertEmployeeVisibleToViewer(session.user?.role, id);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: 403 });
    }

    const employee = await Employee.findOne({ employeeId: id });
    if (!employee) {
      return NextResponse.json(
        { error: `Employee not found with ID: ${id}` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: employee });
  } catch (error: any) {
    console.error("GET Employee Details API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const session = await getSession();
    if (!session.user || !canManageEmployees(session.user)) {
      return NextResponse.json(
        { error: "You are not authorized to edit employees." },
        { status: 403 },
      );
    }
    if (isManagerRole(session.user.role)) {
      return NextResponse.json(
        { error: "Managers can view team profiles but cannot edit employee records." },
        { status: 403 },
      );
    }
    const managerAccess = await assertManagerCanAccessEmployee(session.user, id);
    if (!managerAccess.ok) {
      return NextResponse.json({ error: managerAccess.message }, { status: 403 });
    }
    const access = await assertEmployeeVisibleToViewer(session.user.role, id);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: 403 });
    }

    const raw = await req.json();
    const payload = pickAllowedFields(raw, EMPLOYEE_WRITABLE_FIELDS);
    const validationErr = validateEmployeePayload(payload);
    if (validationErr) {
      return NextResponse.json({ error: validationErr }, { status: 400 });
    }

    const employee = await Employee.findOne({ employeeId: id });
    if (!employee) {
      return NextResponse.json(
        { error: `Employee not found with ID: ${id}` },
        { status: 404 }
      );
    }

    // Lock employeeId updates
    if (payload.employeeId && payload.employeeId !== id) {
      return NextResponse.json(
        { error: "Modifying Employee ID is not permitted" },
        { status: 400 }
      );
    }

    // Required fields check
    const requiredFields = [
      "fullName",
      "primaryContact",
      "department",
      "designation",
      "employmentType",
      "dateJoining",
      "compensationType",
    ];

    for (const field of requiredFields) {
      if (payload[field] !== undefined && !payload[field]) {
        return NextResponse.json(
          { error: `${field} cannot be empty` },
          { status: 400 }
        );
      }
    }

    const uniqueConflict = await findEmployeeUniqueConflict(payload, id);
    if (uniqueConflict) {
      return NextResponse.json(
        { error: employeeUniqueConflictMessage(uniqueConflict) },
        { status: 409 }
      );
    }

    const updatedEmployee = await Employee.findOneAndUpdate(
      { employeeId: id },
      { $set: payload },
      { new: true, runValidators: true }
    );

    // Department doubles as the employee's login role — keep the linked
    // User account's role in sync so an edit here doesn't leave them stuck
    // with permissions from their old department (validateEmployeePayload
    // above already blocks setting department TO owner/admin/master; the
    // role filter below additionally protects any account that is ALREADY
    // owner/admin/master from being silently downgraded by this sync, e.g.
    // the seed owner employee's department is the cosmetic label
    // "Leadership", not a real role key — never overwrite their role).
    if (payload.department && payload.department !== employee.department) {
      await User.updateOne(
        {
          employeeId: id,
          role: { $nin: Array.from(HR_EMPLOYEE_EXCLUDED_ROLE_KEYS) },
        },
        { $set: { role: payload.department } },
      );
    }

    return NextResponse.json({ success: true, data: updatedEmployee });
  } catch (error: any) {
    console.error("PUT Employee Details API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const session = await getSession();
    if (!session.user || !canManageEmployees(session.user)) {
      return NextResponse.json(
        { error: "You are not authorized to delete employees." },
        { status: 403 },
      );
    }
    if (isManagerRole(session.user.role)) {
      return NextResponse.json(
        { error: "Managers can view team profiles but cannot delete employee records." },
        { status: 403 },
      );
    }
    const managerAccess = await assertManagerCanAccessEmployee(session.user, id);
    if (!managerAccess.ok) {
      return NextResponse.json({ error: managerAccess.message }, { status: 403 });
    }
    const access = await assertEmployeeVisibleToViewer(session.user.role, id);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: 403 });
    }

    const employee = await Employee.findOneAndDelete({ employeeId: id });
    if (!employee) {
      return NextResponse.json(
        { error: `Employee not found with ID: ${id}` },
        { status: 404 }
      );
    }

    // Remove the linked login account too, so a deleted employee can't still sign in.
    await User.deleteOne({ employeeId: id });

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error: any) {
    console.error("DELETE Employee API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
