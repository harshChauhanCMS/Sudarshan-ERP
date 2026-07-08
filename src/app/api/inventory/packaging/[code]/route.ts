import { ok, fail } from "@/lib/api-response";
import { requireSession, requirePermission } from "@/lib/api-auth";
import { isDbConfigured } from "@/lib/mongodb";
import {
  getPackagingByCode,
  updatePackagingByCode,
  deletePackagingByCode,
} from "@/lib/packaging-service";

type Params = { params: Promise<{ code: string }> };

/** GET /api/inventory/packaging/[code] — fetch one packaging master record. */
export async function GET(_request: Request, { params }: Params) {
  const { code } = await params;
  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requirePermission(user, "inventory_packaging", "view");
  if (permErr) return permErr;

  if (!isDbConfigured()) return fail("Database not configured", 503);

  try {
    const item = await getPackagingByCode(code);
    if (!item) return fail("Packaging not found", 404);
    return ok(item);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Load failed", 500);
  }
}

/** PUT /api/inventory/packaging/[code] — update a packaging master record. */
export async function PUT(request: Request, { params }: Params) {
  const { code } = await params;
  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requirePermission(user, "inventory_packaging", "edit");
  if (permErr) return permErr;

  if (!isDbConfigured()) return fail("Database not configured", 503);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return fail("Invalid request body", 400);
  }

  try {
    const item = await updatePackagingByCode(code, body as Record<string, unknown>);
    return ok({ updated: true, item });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Update failed";
    return fail(message, message.startsWith("Record not found") ? 404 : 400);
  }
}

/** DELETE /api/inventory/packaging/[code] — remove a packaging master record. */
export async function DELETE(_request: Request, { params }: Params) {
  const { code } = await params;
  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requirePermission(user, "inventory_packaging", "edit");
  if (permErr) return permErr;

  if (!isDbConfigured()) return fail("Database not configured", 503);

  try {
    await deletePackagingByCode(code);
    return ok({ deleted: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Delete failed";
    return fail(message, 404);
  }
}
