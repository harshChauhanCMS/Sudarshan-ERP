import { validateOptionalPhone, validateEmail } from "@/lib/hrms-validation";

const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;
const PAYMENT_TERMS = new Set(["cod", "15", "30", "45", "60"]);

export const VENDOR_WRITABLE_FIELDS = [
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

export function pickVendorFields(raw: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const field of VENDOR_WRITABLE_FIELDS) {
    if (raw[field] !== undefined) out[field] = raw[field];
  }
  return out;
}

/**
 * Validates and normalizes a vendor payload in place (trims/uppercases as
 * needed). Shared by create (name always required) and update (name only
 * validated if present in the patch — partial-patch semantics).
 */
export function validateVendorPayload(
  payload: Record<string, unknown>,
  opts: { requireName: boolean },
): string | null {
  if (opts.requireName || payload.name !== undefined) {
    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    if (!name) return "Vendor name is required.";
    if (name.length > 120) return "Vendor name must be at most 120 characters.";
    payload.name = name;
  }

  if (typeof payload.id === "string") {
    const code = payload.id.trim();
    if (code && !/^[A-Za-z0-9-]+$/.test(code)) {
      return "Vendor code must be alphanumeric (hyphens allowed).";
    }
    payload.id = code;
  }

  const phoneErr = validateOptionalPhone(payload.phone, "Phone number");
  if (phoneErr) return phoneErr;

  const emailErr = validateEmail(payload.email, "Email");
  if (emailErr) return emailErr;

  if (typeof payload.gstin === "string" && payload.gstin.trim()) {
    const gstin = payload.gstin.trim().toUpperCase();
    if (!GSTIN_RE.test(gstin)) return "Enter a valid 15-character GSTIN.";
    payload.gstin = gstin;
  }

  if (payload.paymentTerms != null && !PAYMENT_TERMS.has(String(payload.paymentTerms))) {
    return "Invalid payment terms.";
  }

  if (payload.leadTime != null) {
    const leadTime = Number(payload.leadTime);
    if (!Number.isFinite(leadTime) || leadTime < 1 || leadTime > 90) {
      return "Lead time must be between 1 and 90 days.";
    }
    payload.leadTime = leadTime;
  }

  return null;
}
