/**
 * The five deduction rows the printed payslip has always had.
 *
 * They are backfilled into the Deduction collection on read (see the deductions
 * API), keyed by `seedKey` so adding a row here reaches databases that were
 * seeded before it existed. Built-ins can be edited or deactivated but not
 * hard-deleted — a deleted one would simply reappear on the next backfill.
 */
export type BuiltInDeduction = {
  seedKey: string;
  name: string;
  percentage: number;
  basis: "gross" | "basic";
  maxAmount?: number;
  applicableUpToGross?: number;
  isDefault: boolean;
  description: string;
};

export const BUILT_IN_DEDUCTIONS: BuiltInDeduction[] = [
  {
    seedKey: "tds",
    name: "Tax Deducted at Source (TDS)",
    percentage: 0,
    basis: "gross",
    isDefault: true,
    description: "Income tax withheld at source. Rate set per employee.",
  },
  {
    seedKey: "pf",
    name: "Provident Fund",
    percentage: 12,
    basis: "basic",
    maxAmount: 1800,
    isDefault: true,
    description: "Employee PF contribution — 12% of basic, capped at ₹1,800/month.",
  },
  {
    seedKey: "esic",
    name: "ESIC",
    percentage: 0.75,
    basis: "gross",
    applicableUpToGross: 21000,
    isDefault: true,
    description: "Employee State Insurance — 0.75% of gross, only while gross ≤ ₹21,000.",
  },
  {
    seedKey: "advance",
    name: "Advance",
    percentage: 0,
    basis: "gross",
    isDefault: true,
    description: "Recovery of a salary advance. Rate set per employee.",
  },
  {
    seedKey: "other",
    name: "Other Deduction",
    percentage: 0,
    basis: "gross",
    isDefault: true,
    description: "Anything not covered by the other rows. Rate set per employee.",
  },
];
