import { connectDB } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";
import LeaveRequest from "@/lib/models/LeaveRequest";
import { assertManagerCanAccessLeave } from "@/lib/manager-scope";
import { assertCanApproveLeave } from "@/lib/hrms-access";
import { sendLeaveRollbackEmail } from "@/lib/leave-notification-email";
import { validateRejectReason } from "@/lib/hrms-validation";
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
    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    const reasonErr = validateRejectReason(reason);
    if (reasonErr) return fail(reasonErr, 400);

    const leave = await LeaveRequest.findById(id);
    if (!leave) return fail("Leave request not found", 404);

    const access = await assertManagerCanAccessLeave(
      session.user,
      String(leave.employeeId)
    );
    if (!access.ok) return fail(access.message, 403);

    const approveAccess = await assertCanApproveLeave(
      session.user,
      String(leave.employeeId),
    );
    if (!approveAccess.ok) return fail(approveAccess.message, 403);

    if (leave.status !== "approved") {
      if (leave.status === "completed") {
        return fail("Cannot rollback a completed leave.", 409);
      }
      return fail(`Can only rollback approved leaves, current status: ${leave.status}`, 409);
    }

    leave.status = "pending";
    leave.rollbackReason = reason;
    leave.rollbackAt = new Date();
    leave.hrApprovedAt = undefined;
    leave.hrApprovedBy = undefined;
    await leave.save();

    const emailResult = await sendLeaveRollbackEmail(
      {
        employeeId: String(leave.employeeId),
        employeeName: leave.employeeName,
        leaveType: leave.leaveType,
        fromDate: leave.fromDate,
        toDate: leave.toDate,
        days: leave.days,
        reason: leave.reason,
      },
      {
        rollbackReason: reason,
        actedBy: session.user.email,
      },
    );

    return ok({ leave, email: emailResult });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Rollback failed", 500);
  }
}
