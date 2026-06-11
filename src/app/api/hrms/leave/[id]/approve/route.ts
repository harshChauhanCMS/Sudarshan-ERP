import { connectDB } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";
import LeaveRequest from "@/lib/models/LeaveRequest";
import { assertManagerCanAccessLeave } from "@/lib/manager-scope";
import { sendLeaveDecisionEmail } from "@/lib/leave-notification-email";
import { getSession } from "@/lib/session";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.user) return fail("Unauthorized", 401);

  try {
    await connectDB();
    const { id } = await params;
    const leave = await LeaveRequest.findById(id);
    if (!leave) return fail("Leave request not found", 404);

    const access = await assertManagerCanAccessLeave(
      session.user,
      String(leave.employeeId)
    );
    if (!access.ok) return fail(access.message, 403);

    const by = session.user.email;
    const now = new Date();

    if (!["pending", "hod_approved"].includes(leave.status)) {
      return fail(`Cannot approve leave in status: ${leave.status}`, 409);
    }

    // Single-step HR approval
    leave.status = "approved";
    leave.hrApprovedAt = now;
    leave.hrApprovedBy = by;

    await leave.save();

    const emailResult = await sendLeaveDecisionEmail(
      {
        employeeId: String(leave.employeeId),
        employeeName: leave.employeeName,
        leaveType: leave.leaveType,
        fromDate: leave.fromDate,
        toDate: leave.toDate,
        days: leave.days,
        reason: leave.reason,
      },
      "approved",
      { actedBy: by },
    );

    return ok({ leave, email: emailResult });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Approve failed", 500);
  }
}
