import { ok, fail } from "@/lib/api-response";
import { requireSession, requirePermission } from "@/lib/api-auth";
import { isDbConfigured } from "@/lib/mongodb";
import { createVendor, listVendors } from "@/lib/vendor-service";
import { pickVendorFields, validateVendorPayload } from "@/lib/vendor-validation";

/** GET /api/procurement/vendors — list all vendors. */
export async function GET() {
  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requirePermission(user, "procurement_vendors", "view");
  if (permErr) return permErr;

  if (!isDbConfigured()) return ok([]);

  try {
    const items = await listVendors();
    return ok(items);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Load failed", 500);
  }
}

export async function POST(request: Request) {
  if (!isDbConfigured()) return fail("Database not configured", 503);

  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requirePermission(user, "procurement_vendors", "add");
  if (permErr) return permErr;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return fail("Invalid body", 400);

  const payload = pickVendorFields(body as Record<string, unknown>);

  const validationErr = validateVendorPayload(payload, { requireName: true });
  if (validationErr) return fail(validationErr, 400);

  try {
    const vendor = await createVendor(payload);
    return ok(vendor, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Create failed";
    const status = message.includes("already exists") ? 409 : 400;
    return fail(message, status);
  }
}
