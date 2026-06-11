import { connectDB } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";
import Holiday from "@/lib/models/Holiday";
import { requireSession, requirePermission, isAdminOrOwner } from "@/lib/api-auth";

function requireHolidayEdit(user: NonNullable<Awaited<ReturnType<typeof requireSession>>["user"]>) {
  if (isAdminOrOwner(user.role)) return null;
  return requirePermission(user, "hr", "edit");
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requireHolidayEdit(user);
  if (permErr) return permErr;

  try {
    await connectDB();
    const { id } = await params;
    const h = await Holiday.findByIdAndDelete(id);
    if (!h) return fail("Holiday not found", 404);
    return ok({ deleted: true });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed", 500);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requireHolidayEdit(user);
  if (permErr) return permErr;

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json().catch(() => null);
    if (!body) return fail("Invalid body", 400);

    const updates: Record<string, unknown> = {};
    if (body.name != null) updates.name = body.name;
    if (body.type != null) updates.type = body.type;
    if (body.description != null) updates.description = body.description;
    if (body.date != null) {
      const date = new Date(body.date);
      if (Number.isNaN(date.getTime())) return fail("Invalid date", 400);
      updates.date = date;
      updates.year = date.getFullYear();
    }

    const h = await Holiday.findByIdAndUpdate(id, { $set: updates }, { new: true });
    if (!h) return fail("Holiday not found", 404);
    return ok({ holiday: h });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed", 500);
  }
}
