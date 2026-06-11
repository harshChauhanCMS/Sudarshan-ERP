import dayjs from "dayjs";

export type PayrollSheetRow = {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  designation: string;
  doj: string;
  pfUan: string;
  esiIp: string;
  accountNo: string;
  ifsc: string;
  monthDays: number;
  present: number;
  leave: number;
  lwp: number;
  payDays: number;
  ctc: number;
  gross: number;
  bonus: number;
  incentives: number;
  deductions: number;
  reimbursement: number;
  netPay: number;
  status: "draft" | "approved" | "disbursed" | "pending";
  remarks: string;
};

export type SalarySheetSource = {
  _id?: string;
  employeeId: string;
  employeeName?: string;
  department?: string;
  designation?: string;
  grossSalary?: number;
  workingDays?: number;
  daysPresent?: number;
  leaveDays?: number;
  unpaidLeaveDays?: number;
  leaveDeduction?: number;
  pfEmployee?: number;
  esi?: number;
  tds?: number;
  otherDeductions?: number;
  overtimeAmount?: number;
  specialBonus?: number;
  netPayable?: number;
  status?: string;
  notes?: string;
};

export type EmployeePayrollSource = {
  employeeId: string;
  dateJoining?: string;
  pfUan?: string;
  esiIp?: string;
  accountNo?: string;
  ifscCode?: string;
  annualCtc?: number;
};

export function monthDaysInCycle(cycle: string): number {
  const [year, month] = cycle.split("-").map(Number);
  if (!year || !month) return 0;
  return new Date(year, month, 0).getDate();
}

export function formatPayrollDoj(raw?: string): string {
  if (!raw?.trim()) return "—";
  const parsed = dayjs(raw.trim());
  if (parsed.isValid()) return parsed.format("DD-MMM-YYYY");
  return raw.trim();
}

export function mapToPayrollSheetRow(
  sheet: SalarySheetSource,
  emp: EmployeePayrollSource | undefined,
  cycle: string,
): PayrollSheetRow {
  const monthDays = monthDaysInCycle(cycle);
  const present = sheet.daysPresent || 0;
  const leave = sheet.leaveDays || 0;
  const lwp = sheet.unpaidLeaveDays || 0;
  const isPending = sheet.status === "pending";
  const payDays = isPending ? 0 : present + leave;
  const deductions =
    (sheet.pfEmployee || 0) +
    (sheet.esi || 0) +
    (sheet.tds || 0) +
    (sheet.leaveDeduction || 0) +
    (sheet.otherDeductions || 0);

  const status = (sheet.status || "pending") as PayrollSheetRow["status"];

  return {
    id: String(sheet._id || sheet.employeeId),
    employeeId: String(sheet.employeeId),
    name: sheet.employeeName || "",
    department: sheet.department || "",
    designation: sheet.designation || "",
    doj: formatPayrollDoj(emp?.dateJoining),
    pfUan: emp?.pfUan?.trim() || "—",
    esiIp: emp?.esiIp?.trim() || "—",
    accountNo: emp?.accountNo?.trim() || "—",
    ifsc: emp?.ifscCode?.trim() || "—",
    monthDays,
    present,
    leave,
    lwp,
    payDays,
    ctc: emp?.annualCtc || 0,
    gross: sheet.grossSalary || 0,
    bonus: sheet.specialBonus || 0,
    incentives: sheet.overtimeAmount || 0,
    deductions,
    reimbursement: 0,
    netPay: sheet.netPayable || 0,
    status,
    remarks:
      sheet.notes?.trim() ||
      (isPending ? "Salary not generated" : ""),
  };
}

export function getPayrollSheetKpi(rows: PayrollSheetRow[]) {
  const generated = rows.filter((r) => r.status !== "pending");
  return {
    employees: rows.length,
    gross: generated.reduce((a, r) => a + r.gross, 0),
    deductions: generated.reduce((a, r) => a + r.deductions, 0),
    netPay: generated.reduce((a, r) => a + r.netPay, 0),
  };
}

export const formatPayrollInr = (n: number) =>
  `₹${(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
