import { connectDB } from "@/lib/db";
import Employee from "@/lib/models/Employee";
import AttendancePunch from "@/lib/models/AttendancePunch";
import { ok, fail } from "@/lib/api-response";
import {
  assertManagerCanAccessEmployee,
  managerTeamEmployeeFilter,
  resolveManagerScope,
} from "@/lib/manager-scope";
import { getSession } from "@/lib/session";

function parseDateParam(v: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d: Date)   { const x = new Date(d); x.setHours(23,59,59,999); return x; }
function dayKey(d: Date)     { return d.toISOString().slice(0,10); }
function msToHours(ms: number) { return Math.round((ms/36e5)*100)/100; }

/** Parse "Shift A — 06:00 to 14:00" → hour in local terms */
function shiftStartHour(primaryShift: string): number | null {
  const m = primaryShift?.match(/(\d{2}):(\d{2})\s*to/i);
  if (!m) return null;
  return parseInt(m[1], 10) + parseInt(m[2], 10) / 60;
}

export async function GET(request: Request) {
  try {
    await connectDB();

    const url = new URL(request.url);
    const from = parseDateParam(url.searchParams.get("from"));
    const to   = parseDateParam(url.searchParams.get("to"));
    if (!from || !to) return fail("Query params from and to are required", 400);

    const department = url.searchParams.get("department")?.trim() || null;
    const shift      = url.searchParams.get("shift")?.trim() || null;
    const employeeId = url.searchParams.get("employeeId")?.trim() || null;
    const session = await getSession();
    const managerScope = await resolveManagerScope(session.user);

    if (employeeId && managerScope.restricted) {
      const access = await assertManagerCanAccessEmployee(
        session.user,
        employeeId
      );
      if (!access.ok) return fail(access.message, 403);
    }

    const fromD = startOfDay(from);
    const toD   = endOfDay(to);

    // Build employee filter
    const empQuery: Record<string, any> = {};
    if (department) empQuery.department = department;
    if (shift)      empQuery.primaryShift = { $regex: shift, $options: "i" };
    if (employeeId) {
      empQuery.employeeId = employeeId;
    } else {
      const teamFilter = managerTeamEmployeeFilter(managerScope);
      if (teamFilter) Object.assign(empQuery, teamFilter);
    }

    const employees = await Employee.find(empQuery)
      .select({ employeeId:1, fullName:1, department:1, designation:1, locationUnit:1,
                primaryShift:1, workingHours:1, overtimeApplicable:1, dateJoining:1 })
      .lean();

    const empIds = employees.map((e) => String(e.employeeId));
    const empById = new Map(employees.map((e) => [String(e.employeeId), e]));

    // Fetch all punches in range
    const punchQuery: Record<string, any> = { punchedAt: { $gte: fromD, $lte: toD } };
    if (empIds.length > 0) punchQuery.employeeId = { $in: empIds };

    const punches = await AttendancePunch.find(punchQuery).sort({ punchedAt: 1 }).lean();

    // (employeeId, day) -> { inAt, outAt }
    type DayEntry = { employeeId: string; day: string; inAt: Date|null; outAt: Date|null };
    const dayMap = new Map<string, DayEntry>();

    for (const p of punches) {
      const eid = String(p.employeeId || "");
      if (!eid) continue;
      const d = dayKey(new Date(p.punchedAt));
      const k = `${eid}|${d}`;
      const cur = dayMap.get(k) ?? { employeeId: eid, day: d, inAt: null, outAt: null };
      const t = new Date(p.punchedAt);
      if (p.punchType === "in"  && (!cur.inAt  || t < cur.inAt))  cur.inAt  = t;
      if (p.punchType === "out" && (!cur.outAt || t > cur.outAt)) cur.outAt = t;
      dayMap.set(k, cur);
    }

    // Build set of (employeeId, day) that have punches
    const punchedSet = new Set(dayMap.keys());

    // Enumerate all expected days (Mon-Sat default; skip if employee has weeklyOff matching)
    const allDays: string[] = [];
    const cur = new Date(fromD);
    while (cur <= toD) {
      allDays.push(dayKey(cur));
      cur.setDate(cur.getDate() + 1);
    }

    const GRACE_MINUTES = 15;

    const daily: any[] = [];
    const summaryMap = new Map<string, any>();

    for (const emp of employees) {
      const eid = String(emp.employeeId);
      const shiftHour = shiftStartHour(String(emp.primaryShift || ""));
      const expectedHours = typeof emp.workingHours === "number" ? emp.workingHours : 8;
      const isOtApplicable = emp.overtimeApplicable === true;

      for (const day of allDays) {
        const dow = new Date(day).getDay(); // 0=Sun
        if (dow === 0) continue; // skip Sundays (simplest default)

        const k = `${eid}|${day}`;
        const entry = dayMap.get(k);
        const isPresent = !!entry?.inAt;

        let isLate = false;
        let workedHours = 0;
        let shortfall = 0;
        let overtime = 0;

        if (entry?.inAt) {
          workedHours = entry.outAt
            ? msToHours(Math.max(0, entry.outAt.getTime() - entry.inAt.getTime()))
            : 0;

          if (shiftHour !== null) {
            const punchHour = entry.inAt.getHours() + entry.inAt.getMinutes() / 60;
            isLate = punchHour > shiftHour + GRACE_MINUTES / 60;
          }

          if (workedHours > 0) {
            shortfall = Math.max(0, round2(expectedHours - workedHours));
            overtime  = isOtApplicable ? Math.max(0, round2(workedHours - expectedHours)) : 0;
          }
        }

        daily.push({
          employeeId: eid,
          employeeName: emp.fullName,
          department: emp.department,
          designation: emp.designation,
          locationUnit: emp.locationUnit,
          primaryShift: emp.primaryShift,
          day,
          inAt:  entry?.inAt?.toISOString()  ?? null,
          outAt: entry?.outAt?.toISOString() ?? null,
          present: isPresent,
          absent: !isPresent,
          late: isLate,
          workedHours,
          expectedHours,
          shortfall,
          overtime,
        });

        // Accumulate summary
        const s = summaryMap.get(eid) ?? {
          employeeId: eid, employeeName: emp.fullName,
          department: emp.department, designation: emp.designation,
          locationUnit: emp.locationUnit, primaryShift: emp.primaryShift,
          dateJoining: emp.dateJoining,
          totalDays: 0, presentDays: 0, absentDays: 0, lateDays: 0,
          totalWorkedHours: 0, totalShortfall: 0, totalOvertime: 0,
        };
        s.totalDays++;
        if (isPresent) { s.presentDays++; s.totalWorkedHours += workedHours; }
        else s.absentDays++;
        if (isLate) s.lateDays++;
        s.totalShortfall += shortfall;
        s.totalOvertime  += overtime;
        summaryMap.set(eid, s);
      }
    }

    // Round summary
    const summary = Array.from(summaryMap.values()).map((s) => ({
      ...s,
      totalWorkedHours: round2(s.totalWorkedHours),
      totalShortfall:   round2(s.totalShortfall),
      totalOvertime:    round2(s.totalOvertime),
    }));

    // KPI totals
    const kpi = {
      totalEmployees: employees.length,
      presentDays:  summary.reduce((a,s) => a + s.presentDays,  0),
      absentDays:   summary.reduce((a,s) => a + s.absentDays,   0),
      lateDays:     summary.reduce((a,s) => a + s.lateDays,     0),
      totalShortfall: round2(summary.reduce((a,s) => a + s.totalShortfall, 0)),
      totalOvertime:  round2(summary.reduce((a,s) => a + s.totalOvertime,  0)),
    };

    let gpsPunches = 0;
    let biometricPunches = 0;
    let mobilePunches = 0;
    for (const p of punches) {
      if (p.source === "machine") biometricPunches++;
      else if (p.source === "mobile") mobilePunches++;
      else gpsPunches++;
    }
    const totalPunchEvents = punches.length || 1;
    const gpsSummary = {
      gpsPunches: gpsPunches + mobilePunches,
      biometricPunches,
      mobilePunches,
      gpsPercent: Math.round(((gpsPunches + mobilePunches) / totalPunchEvents) * 100),
    };

    const workingDays = allDays.filter((d) => new Date(d).getDay() !== 0).length;

    return ok({
      from: fromD.toISOString(),
      to: toD.toISOString(),
      workingDays,
      kpi,
      gpsSummary,
      summary,
      daily,
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Report failed", 500);
  }
}

function round2(n: number) { return Math.round(n * 100) / 100; }
