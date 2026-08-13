import { connectDB } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";
import Employee from "@/lib/models/Employee";
import SalarySheet from "@/lib/models/SalarySheet";
import { filterRowsForHrViewer } from "@/lib/hr-staff-visibility";
import { getSession } from "@/lib/session";
import { mapToPayrollSheetRow } from "@/lib/payroll-sheet";
import { canManagePayroll, filterRowsByHrScope } from "@/lib/hrms-access";

const MONTHLY_CTC = "Monthly CTC";

function employeeGross(emp: {
  monthlyGross?: number;
  basicSalary?: number;
  hra?: number;
  otherConveyance?: number;
  specialBonus?: number;
}): number {
  const fromParts =
    (emp.basicSalary || 0) +
    (emp.hra || 0) +
    (emp.otherConveyance || 0) +
    (emp.specialBonus || 0);
  return emp.monthlyGross || fromParts || 0;
}

function pendingRow(
  emp: {
    employeeId: string;
    fullName: string;
    department?: string;
    designation?: string;
    basicSalary?: number;
    hra?: number;
    otherConveyance?: number;
    specialBonus?: number;
    monthlyGross?: number;
  },
  cycle: string,
) {
  const gross = employeeGross(emp);
  return {
    employeeId: String(emp.employeeId),
    employeeName: emp.fullName,
    cycle,
    department: emp.department || "",
    designation: emp.designation || "",
    grossSalary: gross,
    workingDays: 0,
    daysPresent: 0,
    leaveDays: 0,
    unpaidLeaveDays: 0,
    leaveDeduction: 0,
    overtimeAmount: 0,
    specialBonus: emp.specialBonus || 0,
    pfEmployee: 0,
    esi: 0,
    tds: 0,
    advance: 0,
    otherDeductions: 0,
    netPayable: gross,
    status: "pending",
    _id: `pending-${emp.employeeId}`,
  };
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.user) return fail("Unauthorized", 401);
  const payrollAccess = canManagePayroll(session.user);

  try {
    await connectDB();

    const url = new URL(request.url);
    const cycle = url.searchParams.get("cycle")?.trim() || "";
    const status = url.searchParams.get("status")?.trim() || "all";

    if (!/^\d{4}-\d{2}$/.test(cycle)) {
      return fail("cycle must be YYYY-MM", 400);
    }

    const employees = await Employee.find({ compensationType: MONTHLY_CTC })
      .select({
        employeeId: 1,
        fullName: 1,
        department: 1,
        designation: 1,
        dateJoining: 1,
        pfUan: 1,
        esiIp: 1,
        accountNo: 1,
        ifscCode: 1,
        annualCtc: 1,
        basicSalary: 1,
        hra: 1,
        otherConveyance: 1,
        specialBonus: 1,
        monthlyGross: 1,
      })
      .sort({ fullName: 1 })
      .lean();

    const sheets = await SalarySheet.find({ cycle }).lean();
    const sheetByEmployee = new Map(
      sheets.map((sheet) => [String(sheet.employeeId), sheet]),
    );
    const employeeById = new Map(
      employees.map((emp) => [String(emp.employeeId), emp]),
    );

    let rows = employees.map((emp) => {
      const eid = String(emp.employeeId);
      const sheet = sheetByEmployee.get(eid);
      const source = sheet
        ? { ...sheet, _id: String(sheet._id) }
        : pendingRow(emp, cycle);
      return mapToPayrollSheetRow(source, emp, cycle);
    });

    if (status !== "all") {
      if (status === "paid") {
        rows = rows.filter((row) => row.status === "disbursed");
      } else {
        rows = rows.filter((row) => row.status === status);
      }
    }

    let scoped = rows;
    if (!payrollAccess && session.user.employeeId) {
      scoped = filterRowsByHrScope(rows, {
        mode: "self",
        employeeId: String(session.user.employeeId),
      });
    } else if (!payrollAccess) {
      scoped = [];
    }
    const visible = await filterRowsForHrViewer(scoped, session.user.role);
    return ok(visible);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to load payroll sheet", 500);
  }
}
