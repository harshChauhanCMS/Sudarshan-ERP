/**
 * Regression checks for the payroll arithmetic.
 * Run: npx tsx scripts/verify-salary-calc.ts
 *
 * Each case pins a defect found in the Sept 2026 payroll audit. The maths here
 * is subtle enough that it silently regresses — keep these passing.
 */
import { calcSalary } from "@/lib/salary-calc";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${name}`);
  if (!ok) console.log(`        expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const base = {
  basicSalary: 26000, hra: 0, otherConveyance: 0, specialBonus: 0,
  workingDays: 26, workingHoursPerDay: 8, overtimeHours: 0,
  overtimeApplicable: false, approvedLeaveDays: 0, unpaidLeaveDays: 0,
  holidayDays: 0, deductions: [],
};
// ₹26,000 over 26 working days = ₹1,000/day

console.log("\n[P1] unpaid leave must be deducted once, not twice");
{
  const r = calcSalary({ ...base, daysPresent: 24, unpaidLeaveDays: 2 });
  check("2 unpaid days -> 2 deduction days", r.totalDeductionDays, 2);
  check("2 unpaid days -> ₹2,000 deducted", r.leaveDeduction, 2000);
  check("net ₹24,000", r.netPayable, 24000);
  check("absentDays excludes leave-covered days", r.absentDays, 0);

  const absent = calcSalary({ ...base, daysPresent: 24 });
  check("unpaid leave costs the same as plain absence",
    r.netPayable, absent.netPayable);

  const paid = calcSalary({ ...base, daysPresent: 24, approvedLeaveDays: 2 });
  check("paid leave still deducts nothing", paid.netPayable, 26000);
}

console.log("\n[P1] deduction can never exceed the month");
{
  const r = calcSalary({ ...base, daysPresent: 0, unpaidLeaveDays: 26 });
  check("full month unpaid -> 26 days, not 52", r.totalDeductionDays, 26);
  check("net ₹0", r.netPayable, 0);

  // A leave whose stored `days` is a calendar span can exceed working days.
  const over = calcSalary({ ...base, daysPresent: 0, unpaidLeaveDays: 31 });
  check("over-long leave capped at workingDays", over.totalDeductionDays, 26);
  check("deduction capped at gross", over.leaveDeduction, 26000);
}

console.log("\n[regression] mixed month: present + paid + unpaid + holiday");
{
  // 26 working days: 20 present, 2 paid leave, 2 unpaid, 1 holiday, 1 unexplained
  const r = calcSalary({
    ...base, daysPresent: 20, approvedLeaveDays: 2, unpaidLeaveDays: 2, holidayDays: 1,
  });
  check("unexplained absence = 1", r.absentDays, 1);
  check("deduction days = 1 absent + 2 unpaid", r.totalDeductionDays, 3);
  check("deduction ₹3,000", r.leaveDeduction, 3000);
  check("net ₹23,000", r.netPayable, 23000);
}

console.log("\n[regression] holidays stay paid");
{
  const r = calcSalary({ ...base, daysPresent: 24, holidayDays: 2 });
  check("2 unworked holidays cost nothing", r.netPayable, 26000);
  check("no absence recorded", r.absentDays, 0);
}

console.log("\n[regression] perfect month is untouched");
{
  const r = calcSalary({ ...base, daysPresent: 26 });
  check("full attendance -> full pay", r.netPayable, 26000);
  check("no deduction days", r.totalDeductionDays, 0);
}

console.log("\n[regression] overtime");
{
  const r = calcSalary({ ...base, daysPresent: 26, overtimeHours: 10, overtimeApplicable: true });
  // hourly = 26000 / (26*8) = 125; OT paid at 2x = 250/hr; 10h = 2500
  check("10 OT hours at 2x = ₹2,500", r.overtimeAmount, 2500);
  check("net = gross + OT", r.netPayable, 28500);
  const off = calcSalary({ ...base, daysPresent: 26, overtimeHours: 10, overtimeApplicable: false });
  check("OT ignored when not applicable", off.overtimeAmount, 0);
}

console.log("\n[edge] malformed inputs must not poison the sheet");
{
  const nan = calcSalary({ ...base, daysPresent: 20, unpaidLeaveDays: NaN as number });
  check("NaN leave days -> finite net", Number.isFinite(nan.netPayable), true);
  const neg = calcSalary({ ...base, daysPresent: 20, unpaidLeaveDays: -5 });
  check("negative leave days treated as 0", neg.totalDeductionDays, 6);
  // Infinity is garbage, not "infinite leave" — it is rejected to 0 so the
  // employee is charged only for genuine unexplained absence (26 - 20 = 6),
  // never a whole month on the strength of a bad value.
  const inf = calcSalary({ ...base, daysPresent: 20, unpaidLeaveDays: Infinity });
  check("Infinity rejected to 0, not charged as leave", inf.totalDeductionDays, 6);
  const undef = calcSalary({ ...base, daysPresent: 26, basicSalary: undefined as unknown as number });
  check("missing basic -> finite gross", Number.isFinite(undef.grossSalary), true);
}

console.log("\n[edge] zero working days must not divide by zero");
{
  const r = calcSalary({ ...base, workingDays: 0, daysPresent: 0 });
  check("no NaN in deduction", Number.isFinite(r.leaveDeduction), true);
  check("no NaN in net", Number.isFinite(r.netPayable), true);
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
