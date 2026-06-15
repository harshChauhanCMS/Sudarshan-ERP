import { connectDB } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";
import Employee from "@/lib/models/Employee";
import AttendancePunch from "@/lib/models/AttendancePunch";
import { getSession } from "@/lib/session";
import { canManagePayroll } from "@/lib/hrms-access";
import {
  DAILY_WAGE_COMPENSATION,
  buildAttendanceStats,
  employeeToDailyWageWorker,
  localDayKey,
  parsePayPeriod,
} from "@/lib/hrms-daily-wage";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.user) return fail("Unauthorized", 401);
  if (!canManagePayroll(session.user)) return fail("Forbidden", 403);

  try {
    await connectDB();

    const url = new URL(request.url);
    const period =
      url.searchParams.get("period")?.trim() ||
      `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

    const range = parsePayPeriod(period);
    if (!range) return fail("period must be YYYY-MM", 400);

    const employees = await Employee.find({
      compensationType: DAILY_WAGE_COMPENSATION,
    })
      .select({
        employeeId: 1,
        fullName: 1,
        designation: 1,
        locationUnit: 1,
        dailyWageRate: 1,
        skillCategory: 1,
        tradeJobRole: 1,
        engagedVia: 1,
        paymentMode: 1,
        payFrequency: 1,
        workingHours: 1,
        overtimeApplicable: 1,
      })
      .sort({ fullName: 1 })
      .lean();

    const empIds = employees.map((e) => String(e.employeeId));

    const punchDayMap = new Map<
      string,
      { inAt: Date | null; outAt: Date | null }
    >();

    if (empIds.length > 0) {
      const punches = await AttendancePunch.find({
        employeeId: { $in: empIds },
        punchedAt: { $gte: range.start, $lte: range.end },
      })
        .sort({ punchedAt: 1 })
        .lean();

      for (const p of punches) {
        const eid = String(p.employeeId || "");
        if (!eid) continue;
        const d = localDayKey(new Date(p.punchedAt));
        const k = `${eid}|${d}`;
        const cur = punchDayMap.get(k) ?? { inAt: null, outAt: null };
        const t = new Date(p.punchedAt);
        if (p.punchType === "in" && (!cur.inAt || t < cur.inAt)) cur.inAt = t;
        if (p.punchType === "out" && (!cur.outAt || t > cur.outAt))
          cur.outAt = t;
        punchDayMap.set(k, cur);
      }
    }

    const workers = employees.map((emp) => {
      const eid = String(emp.employeeId);
      const expectedHours =
        typeof emp.workingHours === "number" && emp.workingHours > 0
          ? emp.workingHours
          : 8;
      const stats = buildAttendanceStats(
        eid,
        punchDayMap,
        range.start,
        range.end,
        expectedHours,
        emp.overtimeApplicable === true
      );
      return employeeToDailyWageWorker(emp, stats);
    });

    const units = [
      ...new Set(workers.map((w) => w.unit).filter((u) => u && u !== "—")),
    ].sort();
    const contractors = [
      ...new Set(workers.map((w) => w.contractor).filter(Boolean)),
    ].sort();

    return ok({
      period,
      workers,
      units,
      contractors,
      total: workers.length,
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to load daily wage", 500);
  }
}
