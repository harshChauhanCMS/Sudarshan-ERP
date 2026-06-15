import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { HR_EMPLOYEE_EXCLUDED_ROLE_KEYS } from "@/lib/hrms-employee-options";

dayjs.extend(customParseFormat);

const PHONE_RE = /^\d{10}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AADHAR_RE = /^\d{12}$/;
const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/i;

export function validatePhone10(value: unknown, field = "primaryContact"): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  if (!PHONE_RE.test(s)) return `${field} must be exactly 10 digits`;
  return null;
}

export function validateOptionalPhone(value: unknown, field: string): string | null {
  if (value == null || value === "") return null;
  return validatePhone10(value, field);
}

export function validateEmail(value: unknown, field: string): string | null {
  if (value == null || value === "") return null;
  const s = String(value).trim();
  if (!EMAIL_RE.test(s)) return `${field} must be a valid email address`;
  return null;
}

export function validateEmployeeDob(value: unknown): string | null {
  if (value == null || value === "") return null;
  const s = String(value).trim();
  const parsed = dayjs(s, ["DD/MM/YYYY", "YYYY-MM-DD"], true);
  if (!parsed.isValid()) return "Date of birth is invalid";
  const age = dayjs().diff(parsed, "year");
  if (age < 18) return "Employee must be at least 18 years old";
  return null;
}

export function validateAadhar(value: unknown): string | null {
  if (value == null || value === "") return null;
  const s = String(value).replace(/\s/g, "");
  if (!AADHAR_RE.test(s)) return "Aadhar must be 12 digits";
  return null;
}

export function validatePan(value: unknown): string | null {
  if (value == null || value === "") return null;
  const s = String(value).trim().toUpperCase();
  if (!PAN_RE.test(s)) return "PAN format is invalid";
  return null;
}

export function validateLeaveReason(reason: unknown): string | null {
  const s = typeof reason === "string" ? reason.trim() : "";
  if (s.length < 3) return "Reason is required (minimum 3 characters)";
  if (s.length > 500) return "Reason must be at most 500 characters";
  return null;
}

export function validateRejectReason(reason: unknown): string | null {
  const s = typeof reason === "string" ? reason.trim() : "";
  if (s.length < 3) return "Rejection reason is required (minimum 3 characters)";
  if (s.length > 500) return "Reason must be at most 500 characters";
  return null;
}

export function validateEmployeePayload(payload: Record<string, unknown>): string | null {
  const phoneErr = validatePhone10(payload.primaryContact);
  if (phoneErr) return phoneErr;

  for (const [field, val] of [
    ["alternateContact", payload.alternateContact],
    ["emergencyContact", payload.emergencyContact],
  ] as const) {
    const err = validateOptionalPhone(val, field);
    if (err) return err;
  }

  for (const [field, val] of [
    ["personalEmail", payload.personalEmail],
    ["officialEmail", payload.officialEmail],
  ] as const) {
    const err = validateEmail(val, field);
    if (err) return err;
  }

  const dobErr = validateEmployeeDob(payload.dob);
  if (dobErr) return dobErr;

  const aadharErr = validateAadhar(payload.aadhar);
  if (aadharErr) return aadharErr;

  const panErr = validatePan(payload.pan);
  if (panErr) return panErr;

  if (Array.isArray(payload.companies) && payload.companies.length === 0) {
    return "At least one company / unit access is required";
  }

  const department =
    typeof payload.department === "string" ? payload.department.trim().toLowerCase() : "";
  if (department && HR_EMPLOYEE_EXCLUDED_ROLE_KEYS.has(department)) {
    return "Owner, Admin, and Master roles cannot be assigned during employee onboarding.";
  }

  return null;
}
