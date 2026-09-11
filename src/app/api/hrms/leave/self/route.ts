import { connectDB } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";
import LeaveRequest from "@/lib/models/LeaveRequest";
import LeavePolicy, { DEFAULT_LEAVE_POLICIES } from "@/lib/models/LeavePolicy";
import { getHolidayMap } from "@/lib/holiday-service";
import { normalizeLeaveType } from "@/lib/leave-apply";
import { resolveSessionEmployee } from "@/lib/resolve-session-employee";
import { getUserFromRequest } from "@/lib/api-request-auth";
import {
  LEAVE_BALANCE_USAGE_STATUSES,
  syncCompletedLeaveStatuses,
} from "@/lib/leave-status-sync";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return fail("Unauthorized", 401);
  }

  try {
    await connectDB();
    await syncCompletedLeaveStatuses();
    const employee = await resolveSessionEmployee(user);
    if (!employee) {
      return fail(
        "No employee profile is linked to your login. Contact HR to link your official email or employee ID.",
        404,
      );
    }

    const employeeId = String(employee.employeeId);

    const policyCount = await LeavePolicy.countDocuments();
    if (policyCount === 0) {
      await LeavePolicy.insertMany(DEFAULT_LEAVE_POLICIES);
    }

    const policies = await LeavePolicy.find({ isActive: true }).lean();
    const year = new Date().getFullYear();
    const start = new Date(`${year}-01-01`);
    const end = new Date(`${year}-12-31`);

    const usedLeaves = await LeaveRequest.find({
      employeeId,
      status: { $in: [...LEAVE_BALANCE_USAGE_STATUSES] },
      fromDate: { $gte: start, $lte: end },
    })
      .select({ leaveType: 1, days: 1 })
      .lean();

    const usedByType: Record<string, number> = {};
    for (const leave of usedLeaves) {
      // Legacy aliases (`earned`) fold into their canonical type so the
      // balance reflects every day actually consumed.
      const key = normalizeLeaveType(leave.leaveType);
      usedByType[key] = (usedByType[key] || 0) + Number(leave.days || 0);
    }

    // The policy row's own key is normalised too — a DB still holding the
    // `earned` row must line up with usage recorded under `privilege`.
    const balance = policies.map((policy) => {
      const key = normalizeLeaveType(policy.leaveType);
      const used = usedByType[key] || 0;
      return {
        leaveType: key,
        label: policy.label,
        annualQuota: policy.annualQuota,
        used,
        remaining: Math.max(0, policy.annualQuota - used),
      };
    });

    const recent = await LeaveRequest.find({ employeeId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Holiday keys for the year, so the apply form can exclude them from its
    // preview exactly as the server does.
    const holidayMap = await getHolidayMap(start, end);
    const holidayKeys = [...holidayMap.keys()];

    return ok({
      holidayKeys,
      employee: {
        employeeId,
        fullName: employee.fullName,
        department: employee.department,
        designation: employee.designation,
        // Needed by the apply form so its day-count preview matches the
        // figure the server will derive on submit.
        weeklyOff: employee.weeklyOff ?? "Sunday",
        primaryContact: employee.primaryContact ?? "",
        officialEmail: employee.officialEmail ?? "",
        personalEmail: employee.personalEmail ?? "",
      },
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
      },
      balance,
      recent: recent.map((leave) => ({
        ...leave,
        _id: String(leave._id),
        employeeId: String(leave.employeeId),
      })),
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to load profile", 500);
  }
}
