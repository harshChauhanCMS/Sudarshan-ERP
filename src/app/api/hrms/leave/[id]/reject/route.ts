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

    const leave = await LeaveRequest.findById(id);
    if (!leave) return fail("Leave request not found", 404);

    const access = await assertManagerCanAccessLeave(
      session.user,
      String(leave.employeeId)
    );
    if (!access.ok) return fail(access.message, 403);

    if (["approved", "rejected", "cancelled", "rolled_back"].includes(leave.status)) {
      return fail(`Cannot reject leave in status: ${leave.status}`, 409);
    }

    leave.status = "rejected";
    leave.rejectionReason = reason;
    await leave.save();

    return ok({ leave });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Reject failed", 500);
  }
}
