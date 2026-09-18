import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Employee from "@/lib/models/Employee";
import SalarySheet from "@/lib/models/SalarySheet";
import { fail } from "@/lib/api-response";
import { filterRowsForHrViewer } from "@/lib/hr-staff-visibility";
import { getSession } from "@/lib/session";
import { canManagePayroll, filterRowsByHrScope } from "@/lib/hrms-access";
import { formatPayrollDoj, monthDaysInCycle } from "@/lib/payroll-sheet";

const MONTHLY_CTC = "Monthly CTC";

type Num = number | undefined;

/** The salary-sheet fields this register reads, as stored on the document. */
type SheetDoc = {
  employeeName?: string;
  department?: string;
  designation?: string;
  locationUnit?: string;
  compensationType?: string;
  status?: string;
  notes?: string;
  basicSalary?: number;
  hra?: number;
  otherConveyance?: number;
  specialBonus?: number;
  arrears?: number;
  grossSalary?: number;
  overtimeHours?: number;
  overtimeAmount?: number;
  workingDays?: number;
  daysPresent?: number;
  holidayDays?: number;
  absentDays?: number;
  leaveDays?: number;
  unpaidLeaveDays?: number;
  leaveDeduction?: number;
  pfEmployee?: number;
  esi?: number;
  tds?: number;
  advance?: number;
  otherDeductions?: number;
  netPayable?: number;
};

const n = (v: Num): number => Number(v || 0);

/**
 * Every column the salary module holds, in the order HR reads them: who the
 * employee is, their statutory identifiers, the contracted structure, the
 * month's attendance, then earnings → deductions → net.
 */
const COLUMNS: { header: string; pick: (r: ExportRow) => string | number }[] = [
  { header: "Employee Code", pick: (r) => r.employeeId },
  { header: "Employee Name", pick: (r) => r.employeeName },
  { header: "Department", pick: (r) => r.department },
  { header: "Designation", pick: (r) => r.designation },
  { header: "Location / Unit", pick: (r) => r.locationUnit },
  { header: "Date of Joining", pick: (r) => r.doj },
  { header: "UAN No.", pick: (r) => r.pfUan },
  { header: "ESIC No.", pick: (r) => r.esiIp },
  { header: "Bank A/C No.", pick: (r) => r.accountNo },
  { header: "IFSC", pick: (r) => r.ifsc },
  { header: "Compensation Type", pick: (r) => r.compensationType },
  { header: "Cycle", pick: (r) => r.cycle },

  { header: "Annual CTC", pick: (r) => n(r.annualCtc) },
  { header: "Monthly CTC", pick: (r) => n(r.monthlyCtc) },
  { header: "Basic Salary", pick: (r) => n(r.basicSalary) },
  { header: "HRA", pick: (r) => n(r.hra) },
  { header: "Other / Conveyance", pick: (r) => n(r.otherConveyance) },
  { header: "Special / Bonus", pick: (r) => n(r.specialBonus) },

  { header: "Month Days", pick: (r) => n(r.monthDays) },
  { header: "Working Days", pick: (r) => n(r.workingDays) },
  { header: "Days Present", pick: (r) => n(r.daysPresent) },
  { header: "Paid Holidays", pick: (r) => n(r.holidayDays) },
  { header: "Paid Leave Days", pick: (r) => n(r.leaveDays) },
  { header: "Absent Days", pick: (r) => n(r.absentDays) },
  { header: "LWP Days", pick: (r) => n(r.unpaidLeaveDays) },
  { header: "Pay Days", pick: (r) => n(r.payDays) },

  { header: "Gross Salary", pick: (r) => n(r.grossSalary) },
  { header: "Overtime Hours", pick: (r) => n(r.overtimeHours) },
  { header: "Overtime Amount", pick: (r) => n(r.overtimeAmount) },
  { header: "Arrears", pick: (r) => n(r.arrears) },
  { header: "Total Earnings", pick: (r) => n(r.totalEarnings) },

  { header: "Leave / LWP Deduction", pick: (r) => n(r.leaveDeduction) },
  { header: "PF", pick: (r) => n(r.pfEmployee) },
  { header: "ESI", pick: (r) => n(r.esi) },
  { header: "TDS", pick: (r) => n(r.tds) },
  { header: "Advance", pick: (r) => n(r.advance) },
  { header: "Other Deductions", pick: (r) => n(r.otherDeductions) },
  { header: "Total Deductions", pick: (r) => n(r.totalDeductions) },

  { header: "Net Payable", pick: (r) => n(r.netPayable) },
  { header: "Status", pick: (r) => r.statusLabel },
  { header: "Remarks", pick: (r) => r.remarks },
];

type ExportRow = {
  employeeId: string;
  employeeName: string;
  department: string;
  designation: string;
  locationUnit: string;
  doj: string;
  pfUan: string;
  esiIp: string;
  accountNo: string;
  ifsc: string;
  compensationType: string;
  cycle: string;
  annualCtc: Num;
  monthlyCtc: Num;
  basicSalary: Num;
  hra: Num;
  otherConveyance: Num;
  specialBonus: Num;
  monthDays: Num;
  workingDays: Num;
  daysPresent: Num;
  holidayDays: Num;
  leaveDays: Num;
  absentDays: Num;
  unpaidLeaveDays: Num;
  payDays: Num;
  grossSalary: Num;
  overtimeHours: Num;
  overtimeAmount: Num;
  arrears: Num;
  totalEarnings: Num;
  leaveDeduction: Num;
  pfEmployee: Num;
  esi: Num;
  tds: Num;
  advance: Num;
  otherDeductions: Num;
  totalDeductions: Num;
  netPayable: Num;
  statusLabel: string;
  remarks: string;
  status: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  draft: "Salary Generated",
  approved: "Approved",
  disbursed: "Disbursed",
};

type ExportFilters = {
  /** Payroll month, YYYY-MM. */
  cycle: string;
  /** "all", a sheet status, or "paid" (= disbursed), as the page sends it. */
  status: string;
  /** Exact department name, or "" for every department. */
  department: string;
  /**
   * Employee codes to restrict the register to — the rows ticked on the page,
   * or the rows its search/filters left visible. Empty means "no restriction".
   */
  employeeIds: string[];
};

async function buildRegister(filters: ExportFilters) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.user) return fail("Unauthorized", 401);
  const payrollAccess = canManagePayroll(session.user);

  try {
    await connectDB();

    const { cycle, status, department } = filters;
    if (!/^\d{4}-\d{2}$/.test(cycle)) return fail("cycle must be YYYY-MM", 400);
    const wantedIds = new Set(filters.employeeIds.map((id) => String(id).trim()).filter(Boolean));

    const employeeQuery: Record<string, unknown> = { compensationType: MONTHLY_CTC };
    if (department) employeeQuery.department = department;
    if (wantedIds.size) employeeQuery.employeeId = { $in: [...wantedIds] };

    const employees = await Employee.find(employeeQuery)
      .sort({ fullName: 1 })
      .lean();
    const sheets = await SalarySheet.find({ cycle }).lean();
    const sheetByEmployee = new Map(
      sheets.map((sheet) => [String(sheet.employeeId), sheet]),
    );

    const monthDays = monthDaysInCycle(cycle);

    let rows: ExportRow[] = employees.map((emp) => {
      const employeeId = String(emp.employeeId);
      const sheet = sheetByEmployee.get(employeeId) as SheetDoc | undefined;
      const isPending = !sheet;
      const sheetStatus = isPending ? "pending" : String(sheet!.status || "draft");

      // With no sheet for the cycle, the employee master is the only source —
      // the row still exports so the register covers every payrollable head.
      const grossSalary = isPending
        ? n(emp.monthlyGross) ||
          n(emp.basicSalary) + n(emp.hra) + n(emp.otherConveyance) + n(emp.specialBonus)
        : n(sheet!.grossSalary);
      const overtimeAmount = isPending ? 0 : n(sheet!.overtimeAmount);
      const arrears = isPending ? n(emp.arrears) : n(sheet!.arrears);
      const leaveDeduction = isPending ? 0 : n(sheet!.leaveDeduction);
      const pfEmployee = isPending ? 0 : n(sheet!.pfEmployee);
      const esi = isPending ? 0 : n(sheet!.esi);
      const tds = isPending ? 0 : n(sheet!.tds);
      const advance = isPending ? 0 : n(sheet!.advance);
      const otherDeductions = isPending ? 0 : n(sheet!.otherDeductions);
      const daysPresent = isPending ? 0 : n(sheet!.daysPresent);
      const leaveDays = isPending ? 0 : n(sheet!.leaveDays);

      const totalDeductions =
        leaveDeduction + pfEmployee + esi + tds + advance + otherDeductions;

      return {
        employeeId,
        employeeName: String(sheet?.employeeName || emp.fullName || ""),
        department: String(sheet?.department || emp.department || ""),
        designation: String(sheet?.designation || emp.designation || ""),
        locationUnit: String(sheet?.locationUnit || emp.locationUnit || ""),
        doj: formatPayrollDoj(emp.dateJoining),
        pfUan: String(emp.pfUan || "").trim() || "—",
        esiIp: String(emp.esiIp || "").trim() || "—",
        accountNo: String(emp.accountNo || "").trim() || "—",
        ifsc: String(emp.ifscCode || "").trim() || "—",
        compensationType: String(sheet?.compensationType || emp.compensationType || MONTHLY_CTC),
        cycle,
        annualCtc: n(emp.annualCtc),
        monthlyCtc: emp.annualCtc ? Math.round(n(emp.annualCtc) / 12) : n(emp.monthlyGross),
        basicSalary: isPending ? n(emp.basicSalary) : n(sheet!.basicSalary),
        hra: isPending ? n(emp.hra) : n(sheet!.hra),
        otherConveyance: isPending ? n(emp.otherConveyance) : n(sheet!.otherConveyance),
        specialBonus: isPending ? n(emp.specialBonus) : n(sheet!.specialBonus),
        monthDays,
        workingDays: isPending ? 0 : n(sheet!.workingDays),
        daysPresent,
        holidayDays: isPending ? 0 : n(sheet!.holidayDays),
        leaveDays,
        absentDays: isPending ? 0 : n(sheet!.absentDays),
        unpaidLeaveDays: isPending ? 0 : n(sheet!.unpaidLeaveDays),
        // Matches the on-screen payroll sheet: a pending row has no pay days.
        payDays: isPending ? 0 : daysPresent + leaveDays,
        grossSalary,
        overtimeHours: isPending ? 0 : n(sheet!.overtimeHours),
        overtimeAmount,
        arrears,
        totalEarnings: grossSalary + overtimeAmount + arrears,
        leaveDeduction,
        pfEmployee,
        esi,
        tds,
        advance,
        otherDeductions,
        totalDeductions,
        netPayable: isPending ? grossSalary : n(sheet!.netPayable),
        statusLabel: STATUS_LABEL[sheetStatus] || sheetStatus,
        remarks:
          String(sheet?.notes || "").trim() ||
          (isPending ? "Salary not generated" : ""),
        status: sheetStatus,
      };
    });

    if (status !== "all") {
      const wanted = status === "paid" ? "disbursed" : status;
      rows = rows.filter((row) => row.status === wanted);
    }

    if (!payrollAccess && session.user.employeeId) {
      rows = filterRowsByHrScope(rows, {
        mode: "self",
        employeeId: String(session.user.employeeId),
      });
    } else if (!payrollAccess) {
      rows = [];
    }
    rows = await filterRowsForHrViewer(rows, session.user.role);

    const XLSX = await import("xlsx");
    const header = COLUMNS.map((c) => c.header);
    const body = rows.map((row) => COLUMNS.map((c) => c.pick(row)));
    const ws = XLSX.utils.aoa_to_sheet([header, ...body]);

    ws["!cols"] = header.map((h, i) => {
      let width = String(h).length;
      for (const row of body) {
        const len = String(row[i] ?? "").length;
        if (len > width) width = len;
      }
      return { wch: Math.min(Math.max(width + 2, 10), 42) };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Salary Register");
    const buffer: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="salary-register-${cycle}.xlsx"`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Export failed", 500);
  }
}

/** Direct link / bookmark form: filters come from the query string. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  return buildRegister({
    cycle: url.searchParams.get("cycle")?.trim() || "",
    status: url.searchParams.get("status")?.trim() || "all",
    department: url.searchParams.get("department")?.trim() || "",
    employeeIds:
      url.searchParams
        .get("employeeIds")
        ?.split(",")
        .map((id) => id.trim())
        .filter(Boolean) ?? [],
  });
}

/**
 * The page's own download. A selection can run to hundreds of employee codes,
 * which is more than a URL should carry, so the filters are POSTed instead.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Partial<ExportFilters> | null;
  if (!body) return fail("Invalid body", 400);
  return buildRegister({
    cycle: String(body.cycle ?? "").trim(),
    status: String(body.status ?? "all").trim() || "all",
    department: String(body.department ?? "").trim(),
    employeeIds: Array.isArray(body.employeeIds) ? body.employeeIds.map(String) : [],
  });
}
