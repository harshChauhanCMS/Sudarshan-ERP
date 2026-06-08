import { connectDB } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";
import SalarySheet from "@/lib/models/SalarySheet";
import { getHrStaffEmployeeIds, isHrViewer } from "@/lib/hr-staff-visibility";
import { getSession } from "@/lib/session";

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.user) return fail("Unauthorized", 401);

  try {
    await connectDB();
    const body = await request.json().catch(() => ({}));
    const { ids, cycle } = body;

    const q: Record<string, unknown> = { status: "draft" };
    if (Array.isArray(ids) && ids.length > 0) {
      q._id = { $in: ids };
    } else if (cycle) {
      q.cycle = cycle;
    } else {
      return fail("Provide ids array or cycle", 400);
    }

    if (isHrViewer(session.user.role)) {
      const hrStaffIds = [...(await getHrStaffEmployeeIds())];
      q.employeeId = { $nin: hrStaffIds };
    }

    const now = new Date();
    const result = await SalarySheet.updateMany(q, {
      $set: { status: "approved", approvedAt: now, approvedBy: session.user.email },
    });

    return ok({ approved: result.modifiedCount });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Bulk approve failed", 500);
  }
}
