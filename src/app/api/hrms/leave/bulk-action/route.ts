import { connectDB } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";
import LeaveRequest from "@/lib/models/LeaveRequest";
import { assertManagerCanAccessLeave } from "@/lib/manager-scope";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.user) return fail("Unauthorized", 401);

  try {
    await connectDB();
    const body = await request.json().catch(() => null);
    if (!body) return fail("Invalid body", 400);

    const { ids, action, reason } = body;
    if (!Array.isArray(ids) || ids.length === 0) return fail("ids array is required", 400);
    if (!["approve", "reject"].includes(action)) return fail("action must be approve or reject", 400);

    const now = new Date();
    const by = session.user.email;
    const results: { id: string; status: string; error?: string }[] = [];

    for (const id of ids) {
      try {
        const leave = await LeaveRequest.findById(id);
        if (!leave) { results.push({ id, status: "error", error: "Not found" }); continue; }

        const access = await assertManagerCanAccessLeave(
          session.user,
          String(leave.employeeId)
        );
        if (!access.ok) {
          results.push({ id, status: "error", error: access.message });
          continue;
        }

        if (action === "approve") {
          if (!["pending", "hod_approved"].includes(leave.status)) {
            results.push({ id, status: "skipped", error: `Already ${leave.status}` });
            continue;
          }
          // Single-step HR approval
          leave.status = "approved";
          leave.hrApprovedAt = now;
          leave.hrApprovedBy = by;
        } else {
          if (["approved", "rejected", "cancelled", "rolled_back"].includes(leave.status)) {
            results.push({ id, status: "skipped", error: `Already ${leave.status}` });
            continue;
          }
          leave.status = "rejected";
          leave.rejectionReason = reason || "Bulk rejected";
        }

        await leave.save();
        results.push({ id, status: "ok" });
      } catch (err) {
        results.push({ id, status: "error", error: err instanceof Error ? err.message : "Failed" });
      }
    }

    return ok({ results, processed: results.filter((r) => r.status === "ok").length });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Bulk action failed", 500);
  }
}
