import { ok, fail } from "@/lib/api-response";
import { requireSession, requirePermission } from "@/lib/api-auth";
import { isDbConfigured } from "@/lib/mongodb";
import { createVendor } from "@/lib/vendor-service";
import { validateOptionalPhone, validateEmail } from "@/lib/hrms-validation";

const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;
const PAYMENT_TERMS = new Set(["cod", "15", "30", "45", "60"]);

const WRITABLE_FIELDS = [
  "id",
  "name",
  "contactPerson",
  "phone",
  "email",
  "gstin",
  "address",
  "materialsSupplied",
  "paymentTerms",
  "leadTime",
  "status",
] as const;

function pickAllowedFields(raw: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const field of WRITABLE_FIELDS) {
    if (raw[field] !== undefined) out[field] = raw[field];
  }
  return out;
}

export async function POST(request: Request) {
  if (!isDbConfigured()) return fail("Database not configured", 503);

  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requirePermission(user, "procurement_vendors", "add");
  if (permErr) return permErr;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return fail("Invalid body", 400);

  const payload = pickAllowedFields(body as Record<string, unknown>);

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  if (!name) return fail("Vendor name is required.", 400);
  if (name.length > 120) {
    return fail("Vendor name must be at most 120 characters.", 400);
  }
  payload.name = name;

  if (typeof payload.id === "string") {
    const code = payload.id.trim();
    if (code && !/^[A-Za-z0-9-]+$/.test(code)) {
      return fail("Vendor code must be alphanumeric (hyphens allowed).", 400);
    }
    payload.id = code;
  }

  const phoneErr = validateOptionalPhone(payload.phone, "Phone number");
  if (phoneErr) return fail(phoneErr, 400);

  const emailErr = validateEmail(payload.email, "Email");
  if (emailErr) return fail(emailErr, 400);

  if (typeof payload.gstin === "string" && payload.gstin.trim()) {
    const gstin = payload.gstin.trim().toUpperCase();
    if (!GSTIN_RE.test(gstin)) {
      return fail("Enter a valid 15-character GSTIN.", 400);
    }
    payload.gstin = gstin;
  }

  if (payload.paymentTerms != null && !PAYMENT_TERMS.has(String(payload.paymentTerms))) {
    return fail("Invalid payment terms.", 400);
  }

  if (payload.leadTime != null) {
    const leadTime = Number(payload.leadTime);
    if (!Number.isFinite(leadTime) || leadTime < 1 || leadTime > 90) {
      return fail("Lead time must be between 1 and 90 days.", 400);
    }
    payload.leadTime = leadTime;
  }

  try {
    const vendor = await createVendor(payload);
    return ok(vendor, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Create failed";
    const status = message.includes("already exists") ? 409 : 400;
    return fail(message, status);
  }
}
