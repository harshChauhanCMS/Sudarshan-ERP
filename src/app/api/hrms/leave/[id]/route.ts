import { connectDB } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";
import LeaveRequest from "@/lib/models/LeaveRequest";
import { assertEmployeeVisibleToViewer } from "@/lib/hr-staff-visibility";
import { assertManagerCanAccessLeave } from "@/lib/manager-scope";
import { validateLeaveReason } from "@/lib/hrms-validation";
import { LEAVE_PATCH_FIELDS, pickAllowedFields } from "@/lib/field-allowlists";
import { syncCompletedLeaveStatuses } from "@/lib/leave-status-sync";
import { getSession } from "@/lib/session";

const VALID_LEAVE_TYPES = new Set(["casual", "sick", "privilege", "compOff", "unpaid"]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.user) return fail("Unauthorized", 401);

  try {
    await connectDB();
    const { id } = await params;
    await syncCompletedLeaveStatuses();
    const leave = await LeaveRequest.findById(id).lean();
    if (!leave) return fail("Leave request not found", 404);

    const access = await assertEmployeeVisibleToViewer(
      session.user.role,
      String(leave.employeeId),
    );
    if (!access.ok) return fail(access.message, 403);

    return ok({ leave: { ...leave, _id: String(leave._id) } });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to load leave request", 500);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
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
      String(leave.employeeId),
    );
    if (!access.ok) return fail(access.message, 403);

    if (leave.status !== "pending") {
      return fail(`Cannot edit leave in status: ${leave.status}`, 409);
    }

    const raw = await request.json().catch(() => null);
    if (!raw) return fail("Invalid body", 400);
    const body = pickAllowedFields(raw as Record<string, unknown>, LEAVE_PATCH_FIELDS);

    if (typeof body.leaveType === "string") {
      if (!VALID_LEAVE_TYPES.has(body.leaveType)) {
        return fail("Invalid leave type.", 400);
      }
    }

    if (typeof body.reason === "string") {
      const reasonErr = validateLeaveReason(body.reason.trim());
      if (reasonErr) return fail(reasonErr, 400);
    }

    const fromRaw = typeof body.fromDate === "string" ? body.fromDate : null;
    const toRaw = typeof body.toDate === "string" ? body.toDate : null;
    if (fromRaw || toRaw) {
      const from = new Date(fromRaw ?? leave.fromDate);
      const to = new Date(toRaw ?? leave.toDate);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        return fail("Invalid from or to date.", 400);
      }
      if (to < from) {
        return fail("To date cannot be before from date.", 400);
      }
      body.fromDate = from;
      body.toDate = to;
      body.days = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
    } else if (body.days != null) {
      const days = Number(body.days);
      if (!Number.isFinite(days) || days < 0.5) {
        return fail("Leave days must be at least 0.5.", 400);
      }
      body.days = days;
    }

    const updated = await LeaveRequest.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true },
    );

    return ok({ leave: updated });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Update failed", 500);
  }
}
