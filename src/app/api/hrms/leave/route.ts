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
import { filterLeavesForHrApproval } from "@/lib/leave-approval-rules";
import { LEAVE_BALANCE_USAGE_STATUSES, syncCompletedLeaveStatuses } from "@/lib/leave-status-sync";
import {
  canApplyLeaveOnBehalf,
  resolveSessionEmployee,
} from "@/lib/resolve-session-employee";
import { getUserFromRequest } from "@/lib/api-request-auth";
import { getHolidayMap } from "@/lib/holiday-service";
import {
  countLeaveWorkingDays,
  isLeaveDuration,
  type LeaveDuration,
} from "@/lib/leave-window";
import {
  normalizeLeaveType,
  leaveTypeQueryValues,
} from "@/lib/leave-apply";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  try {
    await connectDB();
    await syncCompletedLeaveStatuses();
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

    const forApproval =
      url.searchParams.get("forApproval") === "1" ||
      url.searchParams.get("forApproval") === "true";

    const leaves = await LeaveRequest.find(q).sort({ createdAt: -1 }).lean();
    const visible = filterRowsByHrScope(
      leaves.map((leave) => ({
        ...leave,
        employeeId: String(leave.employeeId),
      })),
      scope,
    );
    const result = forApproval
      ? filterLeavesForHrApproval(session.user, visible)
      : visible;
    return ok(result);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed", 500);
  }
}

const VALID_LEAVE_TYPES = new Set(["casual", "sick", "privilege", "compOff", "unpaid"]);

async function getLeaveUsageForYear(employeeId: string, year: number) {
  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year}-12-31`);

  const leaves = await LeaveRequest.find({
    employeeId,
    status: { $in: [...LEAVE_BALANCE_USAGE_STATUSES] },
    fromDate: { $gte: start, $lte: end },
  })
    .select({ leaveType: 1, days: 1 })
    .lean();

  const usedByType: Record<string, number> = {};
  for (const leave of leaves) {
    // Legacy rows stored under an alias count against the same entitlement.
    const key = normalizeLeaveType(leave.leaveType);
    usedByType[key] = (usedByType[key] || 0) + Number(leave.days || 0);
  }
  return usedByType;
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user?.email) return fail("Unauthorized", 401);

  try {
    await connectDB();
    const body = await request.json().catch(() => null);
    if (!body) return fail("Invalid body", 400);

    const selfApply = body.selfApply === true;
    // Normalised so a legacy spelling (`earned`) resolves to its canonical
    // key (`privilege`) and is stored, validated and quota-checked as one type.
    const leaveType = normalizeLeaveType(body.leaveType);
    const fromDate = typeof body.fromDate === "string" ? body.fromDate : "";
    const toDate = typeof body.toDate === "string" ? body.toDate : "";
    // `body.days` is deliberately ignored — the client used to send its own
    // figure, so any caller could apply for a one-day leave worth 9,999 days,
    // and an honest client still sent a raw calendar span that charged weekly
    // offs and holidays as leave. The count is derived below from the dates,
    // the employee's weekly off and the holiday calendar.
    const duration: LeaveDuration = isLeaveDuration(body.duration)
      ? body.duration
      : "full";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    let employeeId = "";
    let employeeRecord: Awaited<ReturnType<typeof resolveSessionEmployee>> = null;

    if (selfApply) {
      employeeRecord = await resolveSessionEmployee(user);
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
          : user.employeeId
            ? String(user.employeeId)
            : "";

      if (!requestedId) {
        return fail("employeeId is required.", 400);
      }

      const selfEmployee = await resolveSessionEmployee(user);
      const selfEmployeeId = selfEmployee
        ? String(selfEmployee.employeeId)
        : user.employeeId
          ? String(user.employeeId)
          : "";

      const applyingForSelf =
        selfEmployeeId && String(selfEmployeeId) === String(requestedId);

      if (!applyingForSelf) {
        if (!canApplyLeaveOnBehalf(user?.role)) {
          return fail("You can only apply leave for your own account.", 403);
        }
        if (isManagerRole(user?.role)) {
          return fail("Managers cannot apply leave on behalf of employees.", 403);
        }
      }

      employeeId = requestedId;
      employeeRecord = await Employee.findOne({ employeeId }).lean();
    }

    if (!employeeId || !leaveType || !fromDate || !toDate) {
      return fail("leaveType, fromDate and toDate are required", 400);
    }

    const reasonErr = validateLeaveReason(reason);
    if (reasonErr) return fail(reasonErr, 400);

    if (!VALID_LEAVE_TYPES.has(leaveType)) {
      return fail("Invalid leave type.", 400);
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

    // Authoritative day count: working days only, honouring this employee's
    // weekly off and the company holiday calendar.
    const holidayMap = await getHolidayMap(from, to);
    const days = countLeaveWorkingDays(
      from,
      to,
      duration,
      employee.weeklyOff,
      new Set(holidayMap.keys()),
    );
    if (days < 0.5) {
      return fail(
        "That range contains no working days — it falls entirely on weekly offs or holidays.",
        400,
      );
    }

    {
      const policyCount = await LeavePolicy.countDocuments();
      if (policyCount === 0) {
        await LeavePolicy.insertMany(DEFAULT_LEAVE_POLICIES);
      }

      // Matches the canonical key *or* a legacy alias, so a DB still holding
      // the `earned` policy row is found instead of silently returning null —
      // which is what disabled the Privilege Leave quota check entirely.
      const policy = await LeavePolicy.findOne({
        leaveType: { $in: leaveTypeQueryValues(leaveType) },
        isActive: true,
      }).lean();

      // Per-request cap. This is the only limit unpaid leave has — its
      // `annualQuota` is 0, which means "no entitlement to draw down", not
      // "unlimited", so the balance check below never constrains it.
      const maxPerRequest = Number(policy?.maxDaysPerRequest) || 0;
      if (maxPerRequest > 0 && days > maxPerRequest) {
        return fail(
          `${policy?.label ?? leaveType} is limited to ${maxPerRequest} working day(s) per request. ` +
            `This request is ${days}. Split it into shorter requests, or ask HR to raise the limit.`,
          400,
        );
      }

      if (leaveType !== "unpaid" && policy && policy.annualQuota > 0) {
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
      duration,
      reason,
      status: "pending",
    });

    return ok({ leave: created }, 201);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Apply failed", 500);
  }
}
