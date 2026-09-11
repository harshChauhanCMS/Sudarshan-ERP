import { connectDB } from "@/lib/db";
import { normalizeLeaveType } from "@/lib/leave-apply";
import { ok, fail } from "@/lib/api-response";
import LeaveRequest from "@/lib/models/LeaveRequest";
import LeavePolicy, { DEFAULT_LEAVE_POLICIES } from "@/lib/models/LeavePolicy";
import { assertCanAccessEmployee } from "@/lib/hrms-access";
import { LEAVE_BALANCE_USAGE_STATUSES, syncCompletedLeaveStatuses } from "@/lib/leave-status-sync";
import { getSession } from "@/lib/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    await connectDB();
    await syncCompletedLeaveStatuses();
    const session = await getSession();
    if (!session.isLoggedIn || !session.user) return fail("Unauthorized", 401);

    const { employeeId } = await params;
    const access = await assertCanAccessEmployee(session.user, employeeId);
    if (!access.ok) return fail(access.message, 403);

    // Seed default policies if none exist
    const count = await LeavePolicy.countDocuments();
    if (count === 0) await LeavePolicy.insertMany(DEFAULT_LEAVE_POLICIES);

    const policies = await LeavePolicy.find({ isActive: true }).lean();

    const year = new Date().getFullYear();
    const start = new Date(`${year}-01-01`);
    const end   = new Date(`${year}-12-31`);

    const usedLeaves = await LeaveRequest.find({
      employeeId,
      status: { $in: [...LEAVE_BALANCE_USAGE_STATUSES] },
      fromDate: { $gte: start, $lte: end },
    }).lean();

    const usedByType: Record<string, number> = {};
    for (const l of usedLeaves) {
      // Legacy aliases (`earned`) fold into their canonical type.
      const key = normalizeLeaveType(l.leaveType);
      usedByType[key] = (usedByType[key] || 0) + l.days;
    }

    // The policy row's own key is normalised too, so a legacy `earned` row
    // lines up with usage recorded under `privilege`.
    const balance = policies.map((p) => {
      const key = normalizeLeaveType(p.leaveType);
      const used = usedByType[key] || 0;
      return {
        leaveType: key,
        label: p.label,
        annualQuota: p.annualQuota,
        used,
        remaining: Math.max(0, p.annualQuota - used),
      };
    });

    return ok({ employeeId, year, balance });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed", 500);
  }
}
