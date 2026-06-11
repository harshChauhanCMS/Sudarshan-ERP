import { connectDB } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";
import Employee from "@/lib/models/Employee";
import SalarySheet from "@/lib/models/SalarySheet";
import { filterRowsForHrViewer } from "@/lib/hr-staff-visibility";
import { getSession } from "@/lib/session";
import { canManagePayroll } from "@/lib/hrms-access";

const MONTHLY_CTC = "Monthly CTC";

function employeeGross(emp: {
  monthlyGross?: number;
  basicSalary?: number;
  da?: number;
  hra?: number;
  otherConveyance?: number;
  specialBonus?: number;
}): number {
  const fromParts =
    (emp.basicSalary || 0) +
    (emp.da || 0) +
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
    locationUnit?: string;
    compensationType?: string;
    basicSalary?: number;
    da?: number;
    hra?: number;
    otherConveyance?: number;
    specialBonus?: number;
    monthlyGross?: number;
  },
  cycle: string
) {
  const gross = employeeGross(emp);
  return {
    employeeId: String(emp.employeeId),
    employeeName: emp.fullName,
    cycle,
    department: emp.department || "",
    designation: emp.designation || "",
    locationUnit: emp.locationUnit || "",
    compensationType: emp.compensationType || MONTHLY_CTC,
    basicSalary: emp.basicSalary || 0,
    da: emp.da || 0,
    hra: emp.hra || 0,
    otherConveyance: emp.otherConveyance || 0,
    specialBonus: emp.specialBonus || 0,
    grossSalary: gross,
    workingDays: 0,
    daysPresent: 0,
    leaveDays: 0,
    unpaidLeaveDays: 0,
    leaveDeduction: 0,
    overtimeHours: 0,
    overtimeAmount: 0,
    pfEmployee: 0,
    pfEmployer: 0,
    esi: 0,
    tds: 0,
    otherDeductions: 0,
    netPayable: gross,
    status: "pending",
    _id: `pending-${emp.employeeId}`,
  };
}

async function getMonthlyCycleRows(
  cycle: string,
  department: string | null,
  status: string | null
) {
  const employees = await Employee.find({ compensationType: MONTHLY_CTC })
    .sort({ fullName: 1 })
    .lean();

  const sheetQuery: Record<string, string> = { cycle };
  if (department) sheetQuery.department = department;

  const sheets = await SalarySheet.find(sheetQuery).lean();
  const sheetByEmployee = new Map(
    sheets.map((sheet) => [String(sheet.employeeId), sheet])
  );

  let rows = employees.map((emp) => {
    const sheet = sheetByEmployee.get(String(emp.employeeId));
    if (sheet) {
      return { ...sheet, _id: String(sheet._id) };
    }
    return pendingRow(emp, cycle);
  });

  if (status === "pending") {
    rows = rows.filter((row) => row.status === "pending");
  } else if (status === "paid") {
    rows = rows.filter((row) => row.status === "disbursed");
  } else if (status) {
    rows = rows.filter((row) => row.status === status);
  }

  return rows;
}

export async function GET(request: Request) {
  try {
    await connectDB();
    const session = await getSession();
    if (!session.isLoggedIn || !session.user) return fail("Unauthorized", 401);
    const viewerRole = session.user.role;
    const payrollAccess = canManagePayroll(session.user);

    const url = new URL(request.url);
    const cycle = url.searchParams.get("cycle");
    const department = url.searchParams.get("department");
    const status = url.searchParams.get("status");
    const monthly = url.searchParams.get("monthly") !== "0";

    if (cycle && monthly) {
      let rows = await getMonthlyCycleRows(cycle, department, status);
      if (!payrollAccess && session.user.employeeId) {
        rows = rows.filter(
          (row) => String(row.employeeId) === String(session.user!.employeeId),
        );
      } else if (!payrollAccess) {
        rows = [];
      }
      const visible = await filterRowsForHrViewer(rows, viewerRole);
      return ok(visible);
    }

    const q: Record<string, string> = {};
    if (cycle) q.cycle = cycle;
    if (department) q.department = department;
    if (status && status !== "paid" && status !== "pending") q.status = status;

    const sheets = await SalarySheet.find(q).sort({ employeeName: 1 }).lean();
    const normalized = sheets.map((sheet) => ({
      ...sheet,
      _id: String(sheet._id),
      employeeId: String(sheet.employeeId),
    }));
    let scoped = normalized;
    if (!payrollAccess && session.user.employeeId) {
      scoped = normalized.filter(
        (row) => String(row.employeeId) === String(session.user!.employeeId),
      );
    } else if (!payrollAccess) {
      scoped = [];
    }
    const visible = await filterRowsForHrViewer(scoped, viewerRole);
    return ok(visible);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed", 500);
  }
}
