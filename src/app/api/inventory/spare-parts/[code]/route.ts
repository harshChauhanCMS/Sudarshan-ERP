import { ok, fail } from "@/lib/api-response";
import { requireSession, requirePermission } from "@/lib/api-auth";
import { isDbConfigured } from "@/lib/mongodb";
import {
  getSparePartByCode,
  updateSparePartByCode,
  deleteSparePartByCode,
} from "@/lib/spare-part-service";

type Params = { params: Promise<{ code: string }> };

/** GET /api/inventory/spare-parts/[code] — fetch one spare part master record. */
export async function GET(_request: Request, { params }: Params) {
  const { code } = await params;
  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requirePermission(user, "inventory_spares", "view");
  if (permErr) return permErr;

  if (!isDbConfigured()) return fail("Database not configured", 503);

  try {
    const item = await getSparePartByCode(code);
    if (!item) return fail("Spare part not found", 404);
    return ok(item);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Load failed", 500);
  }
}

/** PUT /api/inventory/spare-parts/[code] — update a spare part master record. */
export async function PUT(request: Request, { params }: Params) {
  const { code } = await params;
  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requirePermission(user, "inventory_spares", "edit");
  if (permErr) return permErr;

  if (!isDbConfigured()) return fail("Database not configured", 503);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return fail("Invalid request body", 400);
  }

  try {
    const item = await updateSparePartByCode(code, body as Record<string, unknown>);
    return ok({ updated: true, item });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Update failed";
    return fail(message, message.startsWith("Record not found") ? 404 : 400);
  }
}

/** DELETE /api/inventory/spare-parts/[code] — remove a spare part master record. */
export async function DELETE(_request: Request, { params }: Params) {
  const { code } = await params;
  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requirePermission(user, "inventory_spares", "edit");
  if (permErr) return permErr;

  if (!isDbConfigured()) return fail("Database not configured", 503);

  try {
    await deleteSparePartByCode(code);
    return ok({ deleted: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Delete failed";
    return fail(message, 404);
  }
}
