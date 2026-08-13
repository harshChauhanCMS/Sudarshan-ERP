/**
 * Shared rules for percentage-based salary deductions.
 *
 * Used by the deductions API (validation), the employee form (live preview) and
 * payroll generation (the real amounts), so all three agree on the arithmetic.
 */

export type DeductionBasis = "gross" | "basic";

export type DeductionRule = {
  _id?: string;
  name: string;
  percentage: number;
  basis: DeductionBasis;
  maxAmount?: number;
  applicableUpToGross?: number;
  isDefault?: boolean;
  isActive?: boolean;
  description?: string;
};

/** What an employee stores: which deduction, and at what rate for them. */
export type EmployeeDeductionRate = {
  deductionId: string;
  percentage: number;
};

export type DeductionLine = {
  deductionId?: string;
  name: string;
  percentage: number;
  basis: DeductionBasis;
  amount: number;
};

export const DEDUCTION_BASIS_OPTIONS: { value: DeductionBasis; label: string }[] = [
  { value: "gross", label: "% of gross salary" },
  { value: "basic", label: "% of basic salary" },
];

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Validates an incoming deduction payload. Returns an error message, or null. */
export function validateDeductionBody(
  body: Record<string, unknown>,
  opts: { partial?: boolean } = {}
): string | null {
  const partial = opts.partial === true;

  if (!partial || body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return "Deduction name is required";
    if (name.length > 60) return "Deduction name must be 60 characters or fewer";
  }

  if (!partial || body.percentage !== undefined) {
    const pct = Number(body.percentage);
    if (!Number.isFinite(pct)) return "Percentage must be a number";
    if (pct < 0) return "Percentage cannot be negative";
    if (pct > 100) return "Percentage cannot exceed 100";
  }

  if (body.basis !== undefined && body.basis !== "gross" && body.basis !== "basic") {
    return "Basis must be either gross or basic";
  }

  for (const key of ["maxAmount", "applicableUpToGross"] as const) {
    if (body[key] === undefined || body[key] === null || body[key] === "") continue;
    const value = Number(body[key]);
    if (!Number.isFinite(value) || value < 0) {
      return `${key === "maxAmount" ? "Maximum amount" : "Applicable up to gross"} must be zero or more`;
    }
  }

  return null;
}

/**
 * Amount deducted for one rule.
 * Returns 0 when the employee's gross is above the rule's eligibility ceiling.
 */
export function calcDeductionAmount(
  rule: DeductionRule,
  salary: { gross: number; basic: number }
): number {
  const ceiling = rule.applicableUpToGross || 0;
  if (ceiling > 0 && salary.gross > ceiling) return 0;

  const base = rule.basis === "basic" ? salary.basic : salary.gross;
  const raw = (base || 0) * ((rule.percentage || 0) / 100);
  const cap = rule.maxAmount || 0;
  return round2(cap > 0 ? Math.min(raw, cap) : raw);
}

/** Amounts for every assigned rule, plus their total. */
export function computeDeductionLines(
  rules: DeductionRule[],
  salary: { gross: number; basic: number }
): { lines: DeductionLine[]; total: number } {
  const lines = rules.map((rule) => ({
    deductionId: rule._id ? String(rule._id) : undefined,
    name: rule.name,
    percentage: rule.percentage,
    basis: rule.basis,
    amount: calcDeductionAmount(rule, salary),
  }));
  return { lines, total: round2(lines.reduce((sum, l) => sum + l.amount, 0)) };
}

/**
 * Merges the employee's own percentages onto the deduction masters.
 * The master supplies the basis, cap and eligibility ceiling; the employee
 * supplies the rate. A rate of 0 means the deduction doesn't apply to them, so
 * it is dropped rather than producing a zero line on their payslip.
 */
export function resolveEmployeeDeductions(
  masters: DeductionRule[],
  rates: EmployeeDeductionRate[] | undefined
): DeductionRule[] {
  const byId = new Map((rates ?? []).map((r) => [String(r.deductionId), r]));
  return masters
    .map((master) => {
      const rate = byId.get(String(master._id));
      if (!rate) return null;
      const percentage = Number(rate.percentage) || 0;
      if (percentage <= 0) return null;
      return { ...master, percentage };
    })
    .filter((d): d is DeductionRule => d !== null);
}

/** Human-readable rule, e.g. "12% of basic · max ₹1,800". */
export function formatDeductionBasis(rule: DeductionRule): string {
  const parts = [`of ${rule.basis} salary`];
  if (rule.maxAmount) parts.push(`max ₹${rule.maxAmount.toLocaleString("en-IN")}`);
  if (rule.applicableUpToGross) {
    parts.push(`gross ≤ ₹${rule.applicableUpToGross.toLocaleString("en-IN")}`);
  }
  return parts.join(" · ");
}

export function formatDeductionRule(rule: DeductionRule): string {
  const parts = [`${rule.percentage}% of ${rule.basis}`];
  if (rule.maxAmount) parts.push(`max ₹${rule.maxAmount.toLocaleString("en-IN")}`);
  if (rule.applicableUpToGross) {
    parts.push(`gross ≤ ₹${rule.applicableUpToGross.toLocaleString("en-IN")}`);
  }
  return parts.join(" · ");
}
