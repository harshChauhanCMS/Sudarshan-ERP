import { connectDB } from "@/lib/db";
import Employee from "@/lib/models/Employee";
import AttendancePunch from "@/lib/models/AttendancePunch";
import { ok, fail } from "@/lib/api-response";
import {
  assertCanAccessEmployee,
  filterRowsByHrScope,
  resolveHrDataScope,
  scopeEmployeeFilter,
} from "@/lib/hrms-access";
import { getSession } from "@/lib/session";

function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
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
  return d.toISOString().slice(0, 10);
}

function msToHours(ms: number) {
  return Math.round((ms / 36e5) * 100) / 100;
}

export async function GET(request: Request) {
  try {
    await connectDB();

    const url = new URL(request.url);
    const from = parseDateParam(url.searchParams.get("from"));
    const to = parseDateParam(url.searchParams.get("to"));
    if (!from || !to) return fail("Query params from and to are required (ISO date)", 400);

    const employeeId = url.searchParams.get("employeeId")?.trim() || null;
    const session = await getSession();
    if (!session.isLoggedIn || !session.user) return fail("Unauthorized", 401);
    const dataScope = await resolveHrDataScope(session.user);

    if (employeeId) {
      const access = await assertCanAccessEmployee(session.user, employeeId);
      if (!access.ok) return fail(access.message, 403);
    }

    const fromD = startOfDay(from);
    const toD = endOfDay(to);

    const query: Record<string, any> = { punchedAt: { $gte: fromD, $lte: toD } };
    if (employeeId) {
      query.employeeId = employeeId;
    } else {
      const scopeFilter = scopeEmployeeFilter(dataScope);
      if (scopeFilter) Object.assign(query, scopeFilter);
    }

    const punches = await AttendancePunch.find(query).sort({ punchedAt: 1 }).lean();

    // (employee, day) -> { in: Date|null, out: Date|null }
    const map = new Map<string, { employeeId: string; day: string; inAt: Date | null; outAt: Date | null }>();

    for (const p of punches) {
      const emp = String(p.employeeId || "");
      if (!emp) continue; // reports are employee based
      const d = dayKey(new Date(p.punchedAt));
      const k = `${emp}|${d}`;
      const cur = map.get(k) ?? { employeeId: emp, day: d, inAt: null, outAt: null };

      const punchedAt = new Date(p.punchedAt);
      if (p.punchType === "in") {
        if (!cur.inAt || punchedAt < cur.inAt) cur.inAt = punchedAt;
      } else if (p.punchType === "out") {
        if (!cur.outAt || punchedAt > cur.outAt) cur.outAt = punchedAt;
      }

      map.set(k, cur);
    }

    const employeeIds = Array.from(new Set(Array.from(map.values()).map((x) => x.employeeId)));
    const employees = await Employee.find({ employeeId: { $in: employeeIds } })
      .select({ employeeId: 1, fullName: 1, department: 1, designation: 1, locationUnit: 1 })
      .lean();

    const empById = new Map<string, any>();
    for (const e of employees) empById.set(String(e.employeeId), e);

    const daily = Array.from(map.values())
      .sort((a, b) => (a.employeeId === b.employeeId ? a.day.localeCompare(b.day) : a.employeeId.localeCompare(b.employeeId)))
      .map((x) => {
        const workedMs = x.inAt && x.outAt ? Math.max(0, x.outAt.getTime() - x.inAt.getTime()) : 0;
        const emp = empById.get(x.employeeId);
        return {
          employeeId: x.employeeId,
          employeeName: emp?.fullName ?? null,
          department: emp?.department ?? null,
          designation: emp?.designation ?? null,
          locationUnit: emp?.locationUnit ?? null,
          day: x.day,
          inAt: x.inAt?.toISOString() ?? null,
          outAt: x.outAt?.toISOString() ?? null,
          workedHours: workedMs ? msToHours(workedMs) : 0,
        };
      });

    const summaryByEmp = new Map<string, { employeeId: string; daysPresent: number; totalWorkedHours: number }>();
    for (const d of daily) {
      const cur = summaryByEmp.get(d.employeeId) ?? { employeeId: d.employeeId, daysPresent: 0, totalWorkedHours: 0 };
      if (d.inAt) cur.daysPresent += 1;
      cur.totalWorkedHours += d.workedHours;
      summaryByEmp.set(d.employeeId, cur);
    }

    const summary = Array.from(summaryByEmp.values()).map((s) => {
      const emp = empById.get(s.employeeId);
      return {
        employeeId: s.employeeId,
        employeeName: emp?.fullName ?? null,
        department: emp?.department ?? null,
        designation: emp?.designation ?? null,
        locationUnit: emp?.locationUnit ?? null,
        daysPresent: s.daysPresent,
        totalWorkedHours: Math.round(s.totalWorkedHours * 100) / 100,
      };
    });

    const scopedDaily = filterRowsByHrScope(daily, dataScope);
    const scopedSummary = filterRowsByHrScope(summary, dataScope);

    return ok({
      from: fromD.toISOString(),
      to: toD.toISOString(),
      employeeId,
      summary: scopedSummary,
      daily: scopedDaily,
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to build report", 500);
  }
}

