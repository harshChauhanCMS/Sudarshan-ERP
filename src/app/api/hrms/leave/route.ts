import { connectDB } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";
import LeaveRequest from "@/lib/models/LeaveRequest";
import LeavePolicy, { DEFAULT_LEAVE_POLICIES } from "@/lib/models/LeavePolicy";
import Employee from "@/lib/models/Employee";
import {
  assertManagerCanAccessEmployee,
  isManagerRole,
} from "@/lib/manager-scope";
import {
  filterRowsByHrScope,
  resolveHrDataScope,
  scopeEmployeeFilter,
} from "@/lib/hrms-access";
import { validateLeaveReason } from "@/lib/hrms-validation";
import {
  canApplyLeaveOnBehalf,
  resolveSessionEmployee,
} from "@/lib/resolve-session-employee";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  try {
    await connectDB();
    const session = await getSession();
    const scope = await resolveHrDataScope(session.user);
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const department = url.searchParams.get("department");
    const employeeId = url.searchParams.get("employeeId");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const q: Record<string, any> = {};
    if (status) q.status = status;
    if (department) q.department = department;
    if (employeeId) {
      const access = await assertManagerCanAccessEmployee(
        session.user,
        employeeId,
      );
      if (!access.ok) return fail(access.message, 403);
      q.employeeId = employeeId;
    } else {
      const teamFilter = scopeEmployeeFilter(scope);
      if (teamFilter) Object.assign(q, teamFilter);
    }
    if (from || to) {
      q.fromDate = {};
      if (from) q.fromDate.$gte = new Date(from);
      if (to)   q.fromDate.$lte = new Date(to);
    }

    const leaves = await LeaveRequest.find(q).sort({ createdAt: -1 }).lean();
    const visible = filterRowsByHrScope(
      leaves.map((leave) => ({
        ...leave,
        employeeId: String(leave.employeeId),
      })),
      scope,
    );
    return ok(visible);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed", 500);
  }
}

const VALID_LEAVE_TYPES = new Set(["casual", "sick", "earned", "unpaid"]);

async function getLeaveUsageForYear(employeeId: string, year: number) {
  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year}-12-31`);

  const leaves = await LeaveRequest.find({
    employeeId,
    status: { $in: ["pending", "hod_approved", "approved"] },
    fromDate: { $gte: start, $lte: end },
  })
    .select({ leaveType: 1, days: 1 })
    .lean();

  const usedByType: Record<string, number> = {};
  for (const leave of leaves) {
    usedByType[leave.leaveType] =
      (usedByType[leave.leaveType] || 0) + Number(leave.days || 0);
  }
  return usedByType;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.user?.email) return fail("Unauthorized", 401);

  try {
    await connectDB();
    const body = await request.json().catch(() => null);
    if (!body) return fail("Invalid body", 400);

    const selfApply = body.selfApply === true;
    const leaveType =
      typeof body.leaveType === "string" ? body.leaveType.trim() : "";
    const fromDate = typeof body.fromDate === "string" ? body.fromDate : "";
    const toDate = typeof body.toDate === "string" ? body.toDate : "";
    const days = Number(body.days);
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    let employeeId = "";
    let employeeRecord: Awaited<ReturnType<typeof resolveSessionEmployee>> = null;

    if (selfApply) {
      employeeRecord = await resolveSessionEmployee(session.user);
      if (!employeeRecord) {
        return fail(
          "No employee profile is linked to your login. Contact HR to link your official email or employee ID.",
          400,
        );
      }
      employeeId = String(employeeRecord.employeeId);
    } else {
      const requestedId =
        typeof body.employeeId === "string" && body.employeeId.trim()
          ? body.employeeId.trim()
          : session.user.employeeId
            ? String(session.user.employeeId)
            : "";

      if (!requestedId) {
        return fail("employeeId is required.", 400);
      }

      const selfEmployee = await resolveSessionEmployee(session.user);
      const selfEmployeeId = selfEmployee
        ? String(selfEmployee.employeeId)
        : session.user.employeeId
          ? String(session.user.employeeId)
          : "";

      const applyingForSelf =
        selfEmployeeId && String(selfEmployeeId) === String(requestedId);

      if (!applyingForSelf) {
        if (!canApplyLeaveOnBehalf(session.user?.role)) {
          return fail("You can only apply leave for your own account.", 403);
        }
        if (isManagerRole(session.user?.role)) {
          return fail("Managers cannot apply leave on behalf of employees.", 403);
        }
      }

      employeeId = requestedId;
      employeeRecord = await Employee.findOne({ employeeId }).lean();
    }

    if (!employeeId || !leaveType || !fromDate || !toDate || !days) {
      return fail("leaveType, fromDate, toDate, and days are required", 400);
    }

    const reasonErr = validateLeaveReason(reason);
    if (reasonErr) return fail(reasonErr, 400);

    if (!VALID_LEAVE_TYPES.has(leaveType)) {
      return fail("Invalid leave type.", 400);
    }

    if (!Number.isFinite(days) || days < 0.5) {
      return fail("Leave days must be at least 0.5.", 400);
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return fail("Invalid from or to date.", 400);
    }
    if (to < from) {
      return fail("To date cannot be before from date.", 400);
    }

    if (!employeeRecord) {
      return fail(`Employee ${employeeId} not found`, 404);
    }
    const employee = employeeRecord;

    if (leaveType !== "unpaid") {
      const policyCount = await LeavePolicy.countDocuments();
      if (policyCount === 0) {
        await LeavePolicy.insertMany(DEFAULT_LEAVE_POLICIES);
      }

      const policy = await LeavePolicy.findOne({
        leaveType,
        isActive: true,
      }).lean();

      if (policy && policy.annualQuota > 0) {
        const year = from.getFullYear();
        const usedByType = await getLeaveUsageForYear(employeeId, year);
        const used = usedByType[leaveType] || 0;
        const remaining = Math.max(0, policy.annualQuota - used);
        if (days > remaining) {
          return fail(
            `Insufficient ${policy.label} balance. Remaining: ${remaining} day(s).`,
            400
          );
        }
      }
    }

    const created = await LeaveRequest.create({
      employeeId,
      employeeName: employee.fullName,
      department: employee.department,
      reportingManager: employee.reportingManager,
      leaveType,
      fromDate: from,
      toDate: to,
      days,
      reason,
      status: "pending",
    });

    return ok({ leave: created }, 201);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Apply failed", 500);
  }
}
