import { ok, fail } from "@/lib/api-response";
import { requireSession, requirePermission } from "@/lib/api-auth";
import { isDbConfigured } from "@/lib/mongodb";
import { getVendorById, updateVendorById } from "@/lib/vendor-service";
import { pickVendorFields, validateVendorPayload } from "@/lib/vendor-validation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDbConfigured()) return fail("Database not configured", 503);

  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requirePermission(user, "procurement_vendors", "view");
  if (permErr) return permErr;

  const { id } = await params;

  try {
    const vendor = await getVendorById(id);
    if (!vendor) return fail(`Vendor not found: ${id}`, 404);
    return ok(vendor);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to load vendor", 500);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDbConfigured()) return fail("Database not configured", 503);

  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requirePermission(user, "procurement_vendors", "edit");
  if (permErr) return permErr;

  const { id } = await params;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return fail("Invalid body", 400);

  const payload = pickVendorFields(body as Record<string, unknown>);
  // Vendor code is immutable via update (vendor-service already strips it,
  // this just avoids validating a value that will be discarded anyway).
  delete payload.id;

  const validationErr = validateVendorPayload(payload, { requireName: false });
  if (validationErr) return fail(validationErr, 400);

  try {
    const vendor = await updateVendorById(id, payload);
    return ok(vendor);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Update failed";
    const status = message.includes("not found")
      ? 404
      : message.includes("already exists")
        ? 409
        : 400;
    return fail(message, status);
  }
}
