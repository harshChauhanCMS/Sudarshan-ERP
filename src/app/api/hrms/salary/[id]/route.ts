import { connectDB } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";
import SalarySheet from "@/lib/models/SalarySheet";
import { assertEmployeeVisibleToViewer } from "@/lib/hr-staff-visibility";
import { getSession } from "@/lib/session";
import { canManagePayroll } from "@/lib/hrms-access";
import { SALARY_PATCH_FIELDS, pickAllowedFields } from "@/lib/field-allowlists";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.user) return fail("Unauthorized", 401);
  if (!canManagePayroll(session.user)) return fail("Forbidden", 403);

  try {
    await connectDB();
    const { id } = await params;
    const raw = await request.json().catch(() => null);
    if (!raw) return fail("Invalid body", 400);
    const body = pickAllowedFields(raw as Record<string, unknown>, SALARY_PATCH_FIELDS);

    const existing = await SalarySheet.findById(id).lean();
    if (!existing) return fail("Salary sheet not found", 404);

    const access = await assertEmployeeVisibleToViewer(
      session.user?.role,
      String(existing.employeeId)
    );
    if (!access.ok) return fail(access.message, 403);

    const sheet = await SalarySheet.findByIdAndUpdate(id, { $set: body }, { new: true, runValidators: true });
    if (!sheet) return fail("Salary sheet not found", 404);
    return ok({ sheet });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Update failed", 500);
  }
}
