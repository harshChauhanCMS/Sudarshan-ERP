/**
 * Salary calculation utilities.
 * All monetary values are in INR (rupees), rounded to 2 decimal places.
 */

import {
  computeDeductionLines,
  type DeductionLine,
  type DeductionRule,
} from "./deduction-utils";

export interface SalaryInputs {
  // Earnings from Employee record
  basicSalary: number;
  hra: number;
  otherConveyance: number;
  specialBonus: number;

  // Attendance for the period
  workingDays: number;      // total working days in the period (excl. Sundays)
  daysPresent: number;      // days employee actually punched in
  overtimeHours: number;    // total OT hours logged
  workingHoursPerDay: number; // from Employee.workingHours (default 8)
  overtimeApplicable: boolean;

  // Approved leaves
  approvedLeaveDays: number;  // paid leaves (casual / sick / privilege) — do NOT deduct
  unpaidLeaveDays: number;    // explicitly unpaid approved leaves

  /**
   * Company holidays falling inside the period that the employee did not work.
   * Paid days: they are neither leave nor absence, so they must never produce
   * a deduction. Optional and defaulting to 0 so existing callers are
   * unaffected. See `holiday-rules.ts` for the rule this implements.
   */
  holidayDays?: number;

  /** One-off dues paid with this cycle. Added to take-home, not to gross. */
  arrears?: number;

  /**
   * Deduction masters applied to this employee (`Employee.deductionIds`
   * resolved against the Deduction collection). This replaced the hardcoded
   * PF/ESI calculation — an employee with none assigned has no statutory
   * deductions, by design.
   */
  deductions?: DeductionRule[];

  // Manual overrides (HR can set these)
  tds?: number;
  otherDeductions?: number;
}

export interface SalaryResult {
  grossSalary: number;
  overtimeAmount: number;
  holidayDays: number;        // paid holidays credited in this period
  absentDays: number;         // days neither present, on paid leave, nor a holiday
  totalDeductionDays: number; // unpaidLeaveDays + absentDays
  leaveDeduction: number;     // deduction for totalDeductionDays
  pfEmployee: number;
  pfEmployer: number;
  esi: number;
  tds: number;
  otherDeductions: number;
  advance: number;
  totalDeductions: number;
  netPayable: number;
  /** Per-rule amounts, in the order the rules were supplied. */
  deductionLines: DeductionLine[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The payslip prints a fixed set of deduction rows, so each applied rule is
 * routed to its row by name; anything unrecognised lands in "Other deduction".
 */
const PF_NAME = /provident|^pf\b/i;
const ESI_NAME = /^esic?\b|employee state insurance/i;
const TDS_NAME = /\btds\b|tax deducted/i;
const ADVANCE_NAME = /\badvance\b/i;

/** The built-in "Other Deduction" rule — the fixed row itself, not a custom one. */
const OTHER_NAME = /^other\s*deduction/i;

export type DeductionBuckets = {
  pf: number;
  esi: number;
  tds: number;
  advance: number;
  other: number;
};

/**
 * Which fixed payslip row a rule's name belongs to. `"other"` covers both the
 * built-in "Other Deduction" row and any custom rule HR defines, which the
 * payslip tells apart with `isCustomDeductionName`.
 */
export function classifyDeductionName(name: string): keyof DeductionBuckets {
  if (PF_NAME.test(name)) return "pf";
  if (ESI_NAME.test(name)) return "esi";
  if (TDS_NAME.test(name)) return "tds";
  if (ADVANCE_NAME.test(name)) return "advance";
  return "other";
}

/** True for a rule that has no fixed payslip row and needs one of its own. */
export function isCustomDeductionName(name: string): boolean {
  return classifyDeductionName(name) === "other" && !OTHER_NAME.test(name);
}

/** Splits computed deduction lines into the payslip's fixed rows. */
export function bucketDeductionLines(lines: DeductionLine[]): DeductionBuckets {
  const buckets: DeductionBuckets = { pf: 0, esi: 0, tds: 0, advance: 0, other: 0 };
  for (const line of lines) {
    buckets[classifyDeductionName(line.name || "")] += line.amount;
  }
  return {
    pf: round2(buckets.pf),
    esi: round2(buckets.esi),
    tds: round2(buckets.tds),
    advance: round2(buckets.advance),
    other: round2(buckets.other),
  };
}

/** OT rate = basic / (workingDays * workingHoursPerDay) * 2 per hour */
export function calcOvertimeAmount(
  basicSalary: number,
  workingDays: number,
  workingHoursPerDay: number,
  overtimeHours: number
): number {
  if (workingDays <= 0 || workingHoursPerDay <= 0 || overtimeHours <= 0) return 0;
  const hourlyRate = basicSalary / (workingDays * workingHoursPerDay);
  return round2(hourlyRate * 2 * overtimeHours);
}

/**
 * Deduction for days not worked and not covered by paid leave.
 * deductionDays = unpaidLeaveDays + absentDays (absent = not present + not on paid leave)
 */
export function calcLeaveDeduction(
  grossSalary: number,
  workingDays: number,
  deductionDays: number
): number {
  if (workingDays <= 0 || deductionDays <= 0) return 0;
  return round2((grossSalary / workingDays) * deductionDays);
}

export function calcSalary(inputs: SalaryInputs): SalaryResult {
  const {
    basicSalary, hra, otherConveyance, specialBonus,
    workingDays, daysPresent, approvedLeaveDays,
    overtimeHours, workingHoursPerDay,
    overtimeApplicable, unpaidLeaveDays,
    holidayDays = 0,
    arrears = 0,
    deductions = [],
    tds = 0, otherDeductions: otherDed = 0,
  } = inputs;

  const grossSalary = round2(basicSalary + hra + otherConveyance + specialBonus);

  // Days covered = present + paid leave + company holidays (capped to workingDays).
  // Holidays are counted here — and nowhere else — so they are paid without
  // being recorded as leave or absence, and without changing the per-day rate
  // (gross / workingDays), which stays exactly as it was.
  const coveredDays = Math.min(
    daysPresent + approvedLeaveDays + holidayDays,
    workingDays
  );
  // Absent = working days not covered by attendance, paid leave, or a holiday
  const absentDays = Math.max(0, workingDays - coveredDays);
  // Total days to deduct = absent + explicitly unpaid leaves
  const totalDeductionDays = round2(absentDays + unpaidLeaveDays);

  const leaveDeduction = calcLeaveDeduction(grossSalary, workingDays, totalDeductionDays);

  const overtimeAmount = overtimeApplicable
    ? calcOvertimeAmount(basicSalary, workingDays, workingHoursPerDay, overtimeHours)
    : 0;

  const earnedBasic = Math.max(0, basicSalary - calcLeaveDeduction(basicSalary, workingDays, totalDeductionDays));
  const earnedGross = Math.max(0, grossSalary - leaveDeduction);

  // Rules are priced on *earned* pay, so a month with unpaid days deducts
  // proportionally rather than on the full contractual salary.
  const { lines } = computeDeductionLines(deductions, {
    gross: earnedGross,
    basic: earnedBasic,
  });
  const buckets = bucketDeductionLines(lines);

  // Manual figures on the sheet add to the computed ones — HR can top up a
  // rule-driven TDS without the rule silently overwriting their entry.
  const tdsTotal = round2(buckets.tds + tds);
  const otherTotal = round2(buckets.other + otherDed);

  const totalDeductions = round2(
    buckets.pf + buckets.esi + tdsTotal + buckets.advance + otherTotal + leaveDeduction
  );

  const netPayable = round2(
    Math.max(0, grossSalary + overtimeAmount + arrears - totalDeductions)
  );

  return {
    grossSalary,
    overtimeAmount,
    holidayDays,
    absentDays,
    totalDeductionDays,
    leaveDeduction,
    // Employer PF is not deducted from the employee; it mirrors the employee
    // share so CTC figures elsewhere keep working.
    pfEmployee: buckets.pf,
    pfEmployer: buckets.pf,
    esi: buckets.esi,
    tds: tdsTotal,
    advance: buckets.advance,
    otherDeductions: otherTotal,
    totalDeductions,
    netPayable,
    deductionLines: lines,
  };
}
