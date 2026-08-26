import { connectDB } from "@/lib/db";
import Employee from "@/lib/models/Employee";
import AttendancePunch from "@/lib/models/AttendancePunch";
import LeaveRequest from "@/lib/models/LeaveRequest";
import { ok, fail } from "@/lib/api-response";
import {
  assertCanAccessEmployee,
  resolveHrDataScope,
  scopeEmployeeFilter,
} from "@/lib/hrms-access";
import { getSession } from "@/lib/session";
import { escapeRegex } from "@/lib/escape-regex";
import { getHolidayMap } from "@/lib/holiday-service";
import { isWeeklyOffDate } from "@/lib/shift-utils";

/**
 * The classic monthly muster roll: one row per employee, one column per
 * calendar day, plus the paid/unpaid day-type tallies HR reconciles payroll
 * against. Distinct from the extended attendance report because that report
 * skips weekly-off days and doesn't resolve leave type per day — a muster
 * needs every single day represented exactly once.
 */

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date)   { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** `"7/1/2026"` — matches the muster's conventional unpadded US date header. */
function headerDate(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function allDaysBetween(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(startOfDay(from));
  const end = startOfDay(to);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

/** `2.5` hours → `"2:30"`. */
function formatHoursMinutes(hours: number): string {
  const totalMinutes = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

const LEAVE_TYPE_CODE: Record<string, string> = {
  privilege: "PL",
  casual: "CL",
  sick: "SL",
  compOff: "Comp Off",
  unpaid: "A", // Unpaid leave is a non-attendance, non-paid day — same as absent for muster purposes.
};

export async function GET(request: Request) {
  try {
    await connectDB();

    const url = new URL(request.url);
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");
    if (!fromParam || !toParam) {
      return fail("Query params from and to are required", 400);
    }
    const fromD = startOfDay(new Date(fromParam));
    const toD = endOfDay(new Date(toParam));
    if (Number.isNaN(fromD.getTime()) || Number.isNaN(toD.getTime())) {
      return fail("Invalid from/to dates", 400);
    }

    const department = url.searchParams.get("department")?.trim() || null;
    const shift = url.searchParams.get("shift")?.trim() || null;
    const locationUnit =
      url.searchParams.get("locationUnit")?.trim() ||
      url.searchParams.get("unit")?.trim() ||
      null;
    const employeeId = url.searchParams.get("employeeId")?.trim() || null;

    const session = await getSession();
    const dataScope = await resolveHrDataScope(session.user);

    if (employeeId) {
      const access = await assertCanAccessEmployee(session.user, employeeId);
      if (!access.ok) return fail(access.message, 403);
    }

    const empQuery: Record<string, unknown> = {};
    if (department) {
      empQuery.department = { $regex: `^${escapeRegex(department)}$`, $options: "i" };
    }
    if (shift) {
      empQuery.primaryShift = { $regex: escapeRegex(shift), $options: "i" };
    }
    if (locationUnit) {
      empQuery.locationUnit = { $regex: `^${escapeRegex(locationUnit)}$`, $options: "i" };
    }
    if (employeeId) {
      empQuery.employeeId = employeeId;
    } else {
      const scopeFilter = scopeEmployeeFilter(dataScope);
      if (scopeFilter) Object.assign(empQuery, scopeFilter);
    }

    const employees = await Employee.find(empQuery)
      .select({
        employeeId: 1, fullName: 1, department: 1, designation: 1,
        locationUnit: 1, primaryShift: 1, workingHours: 1,
        overtimeApplicable: 1, weeklyOff: 1,
      })
      .sort({ fullName: 1 })
      .lean();

    const empIds = employees.map((e) => String(e.employeeId));
    const days = allDaysBetween(fromD, toD);
    const dateColumns = days.map((d) => headerDate(d));

    const [punches, holidayMap, leaves] = await Promise.all([
      empIds.length
        ? AttendancePunch.find({
            employeeId: { $in: empIds },
            punchedAt: { $gte: fromD, $lte: toD },
          }).sort({ punchedAt: 1 }).lean()
        : Promise.resolve([]),
      getHolidayMap(fromD, toD),
      empIds.length
        ? LeaveRequest.find({
            employeeId: { $in: empIds },
            status: { $in: ["approved", "completed"] },
            fromDate: { $lte: toD },
            toDate: { $gte: fromD },
          }).lean()
        : Promise.resolve([]),
    ]);

    // (employeeId, day) -> { inAt, outAt }
    type PunchEntry = { inAt: Date | null; outAt: Date | null };
    const punchByDay = new Map<string, PunchEntry>();
    for (const p of punches) {
      const eid = String(p.employeeId || "");
      if (!eid) continue;
      const k = `${eid}|${dayKey(new Date(p.punchedAt))}`;
      const cur = punchByDay.get(k) ?? { inAt: null, outAt: null };
      const t = new Date(p.punchedAt);
      if (p.punchType === "in" && (!cur.inAt || t < cur.inAt)) cur.inAt = t;
      if (p.punchType === "out" && (!cur.outAt || t > cur.outAt)) cur.outAt = t;
      punchByDay.set(k, cur);
    }

    // (employeeId, day) -> { leaveType, halfDay }
    // Only a single-day request can be resolved as a half day: the schema
    // doesn't persist which specific date within a multi-day range was the
    // half, so a multi-day leave marks every day with its full leave type.
    const leaveByDay = new Map<string, { leaveType: string; halfDay: boolean }>();
    for (const l of leaves) {
      const eid = String(l.employeeId);
      const start = startOfDay(new Date(l.fromDate));
      const end = startOfDay(new Date(l.toDate));
      const isSingleDay = start.getTime() === end.getTime();
      const halfDay = isSingleDay && Number(l.days) === 0.5;
      const cur = new Date(Math.max(start.getTime(), fromD.getTime()));
      const last = new Date(Math.min(end.getTime(), toD.getTime()));
      while (cur <= last) {
        leaveByDay.set(`${eid}|${dayKey(cur)}`, { leaveType: l.leaveType, halfDay });
        cur.setDate(cur.getDate() + 1);
      }
    }

    const rows = employees.map((emp) => {
      const eid = String(emp.employeeId);
      const expectedHours = typeof emp.workingHours === "number" ? emp.workingHours : 8;
      const isOtApplicable = emp.overtimeApplicable === true;

      let present = 0, halfDay = 0, weekoff = 0, pl = 0, cl = 0, sl = 0, compOff = 0, absent = 0;
      let otHours = 0;
      const cells: string[] = [];

      for (const day of days) {
        const key = dayKey(day);
        const punch = punchByDay.get(`${eid}|${key}`);
        const isPresent = !!punch?.inAt;

        if (isPresent) {
          let workedHours = 0;
          if (punch?.inAt && punch.outAt) {
            workedHours = Math.max(0, (punch.outAt.getTime() - punch.inAt.getTime()) / 36e5);
          }
          let overtime = 0;
          if (isOtApplicable && workedHours > 0) {
            overtime = Math.max(0, workedHours - expectedHours);
          }
          present += 1;
          otHours += overtime;
          cells.push(overtime > 0 ? `P,${formatHoursMinutes(overtime)}` : "P");
          continue;
        }

        const leave = leaveByDay.get(`${eid}|${key}`);
        if (leave) {
          if (leave.halfDay) {
            halfDay += 1;
            cells.push("HD");
            continue;
          }
          const code = LEAVE_TYPE_CODE[leave.leaveType] ?? leave.leaveType;
          if (leave.leaveType === "privilege") pl += 1;
          else if (leave.leaveType === "casual") cl += 1;
          else if (leave.leaveType === "sick") sl += 1;
          else if (leave.leaveType === "compOff") compOff += 1;
          else absent += 1; // unpaid leave — no pay, same bucket as absent
          cells.push(code);
          continue;
        }

        // Holidays have no dedicated muster column in this format, so an
        // unworked holiday is treated the same as a weekly off: a paid,
        // non-working day.
        const isHoliday = holidayMap.has(key);
        const isOff = isHoliday || isWeeklyOffDate(day, emp.weeklyOff);
        if (isOff) {
          weekoff += 1;
          cells.push("WO");
          continue;
        }

        absent += 1;
        cells.push("A");
      }

      const paydays = present + weekoff + pl + cl + sl + compOff + halfDay * 0.5;

      return {
        employeeId: eid,
        employeeName: emp.fullName,
        department: emp.department || "",
        designation: emp.designation || "",
        locationUnit: emp.locationUnit || "",
        cells,
        present,
        halfDay,
        weekoff,
        pl,
        cl,
        sl,
        compOff,
        absent,
        otHours: formatHoursMinutes(otHours),
        paydays,
      };
    });

    return ok({
      from: dayKey(fromD),
      to: dayKey(toD),
      dateColumns,
      rows,
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Muster report failed", 500);
  }
}
