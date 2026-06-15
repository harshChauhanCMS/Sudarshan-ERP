import { connectDB } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";
import Employee from "@/lib/models/Employee";
import SalarySheet from "@/lib/models/SalarySheet";
import { assertEmployeeVisibleToViewer } from "@/lib/hr-staff-visibility";
import { getSession } from "@/lib/session";
import { canManagePayroll } from "@/lib/hrms-access";
import { SALARY_PATCH_FIELDS, pickAllowedFields } from "@/lib/field-allowlists";
import { mapToPayrollSheetRow, monthDaysInCycle } from "@/lib/payroll-sheet";

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

function pendingSource(
  emp: {
    employeeId: string;
    fullName: string;
    department?: string;
    designation?: string;
    basicSalary?: number;
    da?: number;
    hra?: number;
    otherConveyance?: number;
    specialBonus?: number;
    monthlyGross?: number;
  },
  cycle: string,
) {
  const gross = employeeGross(emp);
  const monthDays = monthDaysInCycle(cycle);
  return {
    _id: `pending-${emp.employeeId}`,
    employeeId: String(emp.employeeId),
    employeeName: emp.fullName,
    cycle,
    department: emp.department || "",
    designation: emp.designation || "",
    basicSalary: emp.basicSalary || 0,
    da: emp.da || 0,
    hra: emp.hra || 0,
    otherConveyance: emp.otherConveyance || 0,
    specialBonus: emp.specialBonus || 0,
    grossSalary: gross,
    workingDays: monthDays,
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
    notes: "Salary not generated",
  };
}

async function buildSheetPayload(id: string, cycle: string | null) {
  if (id.startsWith("pending-")) {
    if (!cycle || !/^\d{4}-\d{2}$/.test(cycle)) {
      return { error: "cycle query param (YYYY-MM) is required for pending rows" as const };
    }
    const employeeId = id.slice("pending-".length);
    const emp = await Employee.findOne({
      employeeId,
      compensationType: MONTHLY_CTC,
    }).lean();
    if (!emp) return { error: "Employee not found" as const };

    const existing = await SalarySheet.findOne({ cycle, employeeId }).lean();
    if (existing) {
      return {
        sheet: { ...existing, _id: String(existing._id) },
        payrollRow: mapToPayrollSheetRow(
          { ...existing, _id: String(existing._id) },
          emp,
          cycle,
        ),
        editable: existing.status === "draft",
        pending: false,
      };
    }

    const pending = pendingSource(emp, cycle);
    return {
      sheet: pending,
      payrollRow: mapToPayrollSheetRow(pending, emp, cycle),
      editable: true,
      pending: true,
    };
  }

  const sheet = await SalarySheet.findById(id).lean();
  if (!sheet) return { error: "Salary sheet not found" as const };

  const emp = await Employee.findOne({ employeeId: sheet.employeeId }).lean();
  const sheetCycle = String(sheet.cycle);
  return {
    sheet: { ...sheet, _id: String(sheet._id) },
    payrollRow: mapToPayrollSheetRow(
      { ...sheet, _id: String(sheet._id) },
      emp ?? undefined,
      sheetCycle,
    ),
    editable: sheet.status === "draft",
    pending: false,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.user) return fail("Unauthorized", 401);
  if (!canManagePayroll(session.user)) return fail("Forbidden", 403);

  try {
    await connectDB();
    const { id } = await params;
    const cycle = new URL(request.url).searchParams.get("cycle")?.trim() || null;
    const payload = await buildSheetPayload(id, cycle);

    if ("error" in payload) {
      const status = payload.error.includes("cycle") ? 400 : 404;
      return fail(payload.error, status);
    }

    const access = await assertEmployeeVisibleToViewer(
      session.user?.role,
      String(payload.sheet.employeeId),
    );
    if (!access.ok) return fail(access.message, 403);

    return ok(payload);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to load salary sheet", 500);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.user) return fail("Unauthorized", 401);
  if (!canManagePayroll(session.user)) return fail("Forbidden", 403);

  try {
    await connectDB();
    const { id } = await params;
    const cycle = new URL(request.url).searchParams.get("cycle")?.trim() || "";
    const raw = await request.json().catch(() => null);
    if (!raw) return fail("Invalid body", 400);
    const body = pickAllowedFields(raw as Record<string, unknown>, SALARY_PATCH_FIELDS);

    if (id.startsWith("pending-")) {
      if (!cycle || !/^\d{4}-\d{2}$/.test(cycle)) {
        return fail("cycle query param (YYYY-MM) is required", 400);
      }
      const employeeId = id.slice("pending-".length);
      const emp = await Employee.findOne({
        employeeId,
        compensationType: MONTHLY_CTC,
      }).lean();
      if (!emp) return fail("Employee not found", 404);

      const access = await assertEmployeeVisibleToViewer(
        session.user?.role,
        employeeId,
      );
      if (!access.ok) return fail(access.message, 403);

      const sheetData = {
        ...body,
        employeeId,
        employeeName:
          (typeof body.employeeName === "string" && body.employeeName.trim()) ||
          emp.fullName,
        department:
          (typeof body.department === "string" && body.department) ||
          emp.department ||
          "",
        designation:
          (typeof body.designation === "string" && body.designation) ||
          emp.designation ||
          "",
        locationUnit: emp.locationUnit || "",
        compensationType: MONTHLY_CTC,
        cycle,
        status: "draft",
      };

      const sheet = await SalarySheet.findOneAndUpdate(
        { cycle, employeeId },
        { $set: sheetData },
        { upsert: true, new: true, runValidators: true },
      );
      return ok({ sheet });
    }

    const existing = await SalarySheet.findById(id).lean();
    if (!existing) return fail("Salary sheet not found", 404);

    if (existing.status !== "draft") {
      return fail(`Cannot edit salary in status: ${existing.status}`, 409);
    }

    const access = await assertEmployeeVisibleToViewer(
      session.user?.role,
      String(existing.employeeId),
    );
    if (!access.ok) return fail(access.message, 403);

    const sheet = await SalarySheet.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true },
    );
    if (!sheet) return fail("Salary sheet not found", 404);
    return ok({ sheet });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Update failed", 500);
  }
}
