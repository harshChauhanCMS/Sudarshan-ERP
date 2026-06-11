import Employee from "@/lib/models/Employee";

export type EmployeeUniquePayload = {
  personalEmail?: string | null;
  officialEmail?: string | null;
  primaryContact?: string | null;
  alternateContact?: string | null;
  aadhar?: string | null;
  pan?: string | null;
  accountNo?: string | null;
};

export type EmployeeUniqueConflict = {
  field: string;
  label: string;
  existingEmployeeId: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

function normalizePan(value: string) {
  return value.trim().toUpperCase();
}

function hasValue(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

async function findEmailConflict(
  email: string,
  excludeEmployeeId?: string
): Promise<{ employeeId: string } | null> {
  const normalized = normalizeEmail(email);
  const filter: Record<string, unknown> = {
    $or: [{ personalEmail: normalized }, { officialEmail: normalized }],
  };
  if (excludeEmployeeId) {
    filter.employeeId = { $ne: excludeEmployeeId };
  }
  return Employee.findOne(filter).select("employeeId").lean();
}

async function findFieldConflict(
  field: keyof EmployeeUniquePayload,
  rawValue: string,
  normalize: (value: string) => string,
  excludeEmployeeId?: string
): Promise<{ employeeId: string } | null> {
  const normalized = normalize(rawValue);
  if (!normalized) return null;

  const filter: Record<string, unknown> = excludeEmployeeId
    ? { employeeId: { $ne: excludeEmployeeId } }
    : {};

  const candidates = await Employee.find({
    ...filter,
    [field]: { $exists: true, $nin: [null, ""] },
  })
    .select(`employeeId ${field}`)
    .lean();

  for (const candidate of candidates) {
    const existingValue = candidate[field as keyof typeof candidate];
    if (
      typeof existingValue === "string" &&
      normalize(existingValue) === normalized
    ) {
      return { employeeId: String(candidate.employeeId) };
    }
  }

  return null;
}

const UNIQUE_FIELD_CHECKS: Array<{
  field: keyof EmployeeUniquePayload;
  label: string;
  normalize: (value: string) => string;
}> = [
  { field: "primaryContact", label: "Primary contact number", normalize: normalizeDigits },
  { field: "alternateContact", label: "Alternate contact number", normalize: normalizeDigits },
  { field: "aadhar", label: "Aadhar number", normalize: normalizeDigits },
  { field: "pan", label: "PAN", normalize: normalizePan },
  { field: "accountNo", label: "Bank account number", normalize: normalizeDigits },
];

export async function findEmployeeUniqueConflict(
  payload: EmployeeUniquePayload,
  excludeEmployeeId?: string
): Promise<EmployeeUniqueConflict | null> {
  const emailsToCheck = new Set<string>();
  if (hasValue(payload.personalEmail)) {
    emailsToCheck.add(normalizeEmail(payload.personalEmail!));
  }
  if (hasValue(payload.officialEmail)) {
    emailsToCheck.add(normalizeEmail(payload.officialEmail!));
  }

  for (const email of emailsToCheck) {
    const existing = await findEmailConflict(email, excludeEmployeeId);
    if (existing) {
      return {
        field: "email",
        label: "Email",
        existingEmployeeId: existing.employeeId,
      };
    }
  }

  for (const check of UNIQUE_FIELD_CHECKS) {
    const raw = payload[check.field];
    if (!hasValue(raw)) continue;

    const existing = await findFieldConflict(
      check.field,
      raw!,
      check.normalize,
      excludeEmployeeId
    );
    if (existing) {
      return {
        field: check.field,
        label: check.label,
        existingEmployeeId: existing.employeeId,
      };
    }
  }

  return null;
}

export function employeeUniqueConflictMessage(conflict: EmployeeUniqueConflict) {
  return `${conflict.label} is already registered to employee ${conflict.existingEmployeeId}`;
}
