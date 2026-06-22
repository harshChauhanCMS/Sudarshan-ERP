import { connectDB } from "@/lib/db";
import Employee from "@/lib/models/Employee";
import AttendancePunch from "@/lib/models/AttendancePunch";
import { ok, fail } from "@/lib/api-response";
import {
  buildLateEarlyReport,
  filterLateEarlyEmployees,
} from "@/lib/hrms-late-early-report";
import {
  resolveHrDataScope,
  scopeEmployeeFilter,
} from "@/lib/hrms-access";
import { escapeRegex } from "@/lib/escape-regex";
import { getSession } from "@/lib/session";

function parseDateParam(v: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET(request: Request) {
  try {
    await connectDB();

    const url = new URL(request.url);
    const from = parseDateParam(url.searchParams.get("from"));
    const to = parseDateParam(url.searchParams.get("to"));
    if (!from || !to) return fail("Query params from and to are required", 400);

    const department = url.searchParams.get("department")?.trim() || null;
    const shift = url.searchParams.get("shift")?.trim() || null;
    const unit = url.searchParams.get("unit")?.trim() || null;
    const reportType = url.searchParams.get("reportType")?.trim() || "both";
    const minMinutes = Number(url.searchParams.get("minMinutes") ?? "0");

    const session = await getSession();
    const dataScope = await resolveHrDataScope(session.user);

    const fromD = startOfDay(from);
    const toD = endOfDay(to);

    const empQuery: Record<string, unknown> = {};
    if (department && department !== "all") empQuery.department = department;
    if (shift && shift !== "all") {
      empQuery.primaryShift = {
        $regex: escapeRegex(shift),
        $options: "i",
      };
    }
    const scopeFilter = scopeEmployeeFilter(dataScope);
    if (scopeFilter) Object.assign(empQuery, scopeFilter);

    const employees = await Employee.find(empQuery)
      .select({
        employeeId: 1,
        fullName: 1,
        department: 1,
        locationUnit: 1,
        primaryShift: 1,
      })
      .lean();

    const empIds = employees.map((e) => String(e.employeeId));
    const punchQuery: Record<string, unknown> = {
      punchedAt: { $gte: fromD, $lte: toD },
    };
    if (empIds.length > 0) punchQuery.employeeId = { $in: empIds };

    const punches = await AttendancePunch.find(punchQuery)
      .sort({ punchedAt: 1 })
      .lean();

    type DayEntry = {
      employeeId: string;
      inAt: Date | null;
      outAt: Date | null;
    };
    const dayMap = new Map<string, DayEntry>();

    for (const p of punches) {
      const eid = String(p.employeeId || "");
      if (!eid) continue;
      const d = dayKey(new Date(p.punchedAt));
      const k = `${eid}|${d}`;
      const cur = dayMap.get(k) ?? { employeeId: eid, inAt: null, outAt: null };
      const t = new Date(p.punchedAt);
      if (p.punchType === "in" && (!cur.inAt || t < cur.inAt)) cur.inAt = t;
      if (p.punchType === "out" && (!cur.outAt || t > cur.outAt)) cur.outAt = t;
      dayMap.set(k, cur);
    }

    const allDays: string[] = [];
    const cur = new Date(fromD);
    while (cur <= toD) {
      allDays.push(dayKey(cur));
      cur.setDate(cur.getDate() + 1);
    }
    const workingDays = allDays.filter((d) => new Date(d).getDay() !== 0).length;

    if (empIds.length === 0 || punches.length === 0) {
      return ok({
        from: `${fromD.getFullYear()}-${String(fromD.getMonth() + 1).padStart(2, "0")}-${String(fromD.getDate()).padStart(2, "0")}`,
        to: `${toD.getFullYear()}-${String(toD.getMonth() + 1).padStart(2, "0")}-${String(toD.getDate()).padStart(2, "0")}`,
        workingDays,
        kpi: { totalEmployees: 0, lateDays: 0, earlyDays: 0, totalLateMinutes: 0, totalEarlyMinutes: 0 },
        employees: [],
        departments: [],
        shifts: [],
        units: [],
        filterDepartments: [],
      });
    }

    const report = buildLateEarlyReport(
      employees.map((e) => ({
        employeeId: String(e.employeeId),
        fullName: String(e.fullName),
        department: e.department ? String(e.department) : undefined,
        locationUnit: e.locationUnit ? String(e.locationUnit) : undefined,
        primaryShift: e.primaryShift ? String(e.primaryShift) : undefined,
      })),
      Array.from(dayMap.values()),
      workingDays,
      Number.isFinite(minMinutes) ? minMinutes : 0
    );

    const filteredEmployees = filterLateEarlyEmployees(report.employees, {
      department: department || "all",
      shift: shift || "all",
      unit: unit || "all",
      reportType,
      minMinutes: Number.isFinite(minMinutes) ? minMinutes : 0,
    });

    return ok({
      from: `${fromD.getFullYear()}-${String(fromD.getMonth() + 1).padStart(2, "0")}-${String(fromD.getDate()).padStart(2, "0")}`,
      to: `${toD.getFullYear()}-${String(toD.getMonth() + 1).padStart(2, "0")}-${String(toD.getDate()).padStart(2, "0")}`,
      workingDays,
      kpi: report.kpi,
      employees: filteredEmployees,
      departments: report.departments,
      shifts: report.shifts,
      units: report.units,
      filterDepartments: report.filterDepartments,
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Report failed", 500);
  }
}
