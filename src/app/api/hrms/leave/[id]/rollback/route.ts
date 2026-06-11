import { connectDB } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";
import LeaveRequest from "@/lib/models/LeaveRequest";
import { assertManagerCanAccessLeave } from "@/lib/manager-scope";
import { getSession } from "@/lib/session";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.isLoggedIn) return fail("Unauthorized", 401);

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!reason) return fail("rollback reason is required", 400);

    const leave = await LeaveRequest.findById(id);
    if (!leave) return fail("Leave request not found", 404);

    const access = await assertManagerCanAccessLeave(
      session.user,
      String(leave.employeeId)
    );
    if (!access.ok) return fail(access.message, 403);

    if (leave.status !== "approved") {
      return fail(`Can only rollback approved leaves, current status: ${leave.status}`, 409);
    }

    leave.status = "pending";
    leave.rollbackReason = reason;
    leave.rollbackAt = new Date();
    // Clear previous approval fields so it goes through fresh review
    leave.hrApprovedAt = undefined;
    leave.hrApprovedBy = undefined;
    await leave.save();

    return ok({ leave });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Rollback failed", 500);
  }
}
