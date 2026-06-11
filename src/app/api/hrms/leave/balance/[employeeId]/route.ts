import { connectDB } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";
import LeaveRequest from "@/lib/models/LeaveRequest";
import LeavePolicy, { DEFAULT_LEAVE_POLICIES } from "@/lib/models/LeavePolicy";
import { assertCanAccessEmployee } from "@/lib/hrms-access";
import { getSession } from "@/lib/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    await connectDB();
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
      status: { $in: ["approved", "hod_approved"] },
      fromDate: { $gte: start, $lte: end },
    }).lean();

    const usedByType: Record<string, number> = {};
    for (const l of usedLeaves) {
      usedByType[l.leaveType] = (usedByType[l.leaveType] || 0) + l.days;
    }

    const balance = policies.map((p) => ({
      leaveType: p.leaveType,
      label: p.label,
      annualQuota: p.annualQuota,
      used: usedByType[p.leaveType] || 0,
      remaining: Math.max(0, p.annualQuota - (usedByType[p.leaveType] || 0)),
    }));

    return ok({ employeeId, year, balance });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed", 500);
  }
}
