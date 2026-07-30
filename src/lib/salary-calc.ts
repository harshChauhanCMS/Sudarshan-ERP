/**
 * Salary calculation utilities.
 * All monetary values are in INR (rupees), rounded to 2 decimal places.
 */

export interface SalaryInputs {
  // Earnings from Employee record
  basicSalary: number;
  da: number;
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
  totalDeductions: number;
  netPayable: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** PF is 12% of basic, employee share capped at ₹1800/month */
export function calcPF(basicSalary: number): { employee: number; employer: number } {
  const employee = round2(Math.min(basicSalary * 0.12, 1800));
  const employer = round2(Math.min(basicSalary * 0.12, 1800));
  return { employee, employer };
}

/** ESI: 0.75% of gross if gross ≤ ₹21,000 */
export function calcESI(grossSalary: number): number {
  if (grossSalary > 21000) return 0;
  return round2(grossSalary * 0.0075);
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
    basicSalary, da, hra, otherConveyance, specialBonus,
    workingDays, daysPresent, approvedLeaveDays,
    overtimeHours, workingHoursPerDay,
    overtimeApplicable, unpaidLeaveDays,
    holidayDays = 0,
    tds = 0, otherDeductions: otherDed = 0,
  } = inputs;

  const grossSalary = round2(basicSalary + da + hra + otherConveyance + specialBonus);

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

  const pf = calcPF(earnedBasic);
  const esi = calcESI(earnedGross);

  const totalDeductions = round2(pf.employee + esi + tds + otherDed + leaveDeduction);

  const netPayable = round2(
    Math.max(0, grossSalary + overtimeAmount - totalDeductions)
  );

  return {
    grossSalary,
    overtimeAmount,
    holidayDays,
    absentDays,
    totalDeductionDays,
    leaveDeduction,
    pfEmployee: pf.employee,
    pfEmployer: pf.employer,
    esi,
    tds: round2(tds),
    otherDeductions: round2(otherDed),
    totalDeductions,
    netPayable,
  };
}
