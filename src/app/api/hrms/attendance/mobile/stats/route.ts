import { connectDB } from "@/lib/db";
import Employee from "@/lib/models/Employee";
import AttendancePunch from "@/lib/models/AttendancePunch";
import { ok, fail } from "@/lib/api-response";
import { getUserFromRequest } from "@/lib/api-request-auth";
import { resolveSessionEmployee } from "@/lib/resolve-session-employee";

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
  const user = await getUserFromRequest(request);
  if (!user) return fail("Unauthorized", 401);

  try {
    await connectDB();

    const employee = await resolveSessionEmployee(user);
    if (!employee) {
      return fail("No employee profile linked to your account", 404);
    }

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const monthStart = startOfDay(
      new Date(now.getFullYear(), now.getMonth(), 1),
    );
    const monthEnd = endOfDay(
      new Date(now.getFullYear(), now.getMonth() + 1, 0),
    );

    const resolvedEmployeeId = String(employee.employeeId);
    const punches = await AttendancePunch.find({
      employeeId: resolvedEmployeeId,
      punchedAt: { $gte: monthStart, $lte: monthEnd },
    })
      .sort({ punchedAt: 1 })
      .lean();

    type DayAgg = {
      day: string;
      inAt: Date | null;
      outAt: Date | null;
    };

    const byDay = new Map<string, DayAgg>();

    for (const p of punches) {
      const d = dayKey(new Date(p.punchedAt));
      const cur = byDay.get(d) ?? { day: d, inAt: null, outAt: null };
      const t = new Date(p.punchedAt);
      if (p.punchType === "in" && (!cur.inAt || t < cur.inAt)) cur.inAt = t;
      if (p.punchType === "out" && (!cur.outAt || t > cur.outAt)) cur.outAt = t;
      byDay.set(d, cur);
    }

    const todayKey = dayKey(now);
    const todayAgg = byDay.get(todayKey);
    const todayWorkedMs =
      todayAgg?.inAt && todayAgg?.outAt
        ? Math.max(0, todayAgg.outAt.getTime() - todayAgg.inAt.getTime())
        : 0;

    let daysPresent = 0;
    let totalWorkedHours = 0;
    const recentDays: Array<{
      day: string;
      inAt: string | null;
      outAt: string | null;
      workedHours: number;
      status: string;
    }> = [];

    const sortedDays = Array.from(byDay.values()).sort((a, b) =>
      b.day.localeCompare(a.day),
    );

    for (const row of sortedDays) {
      const workedMs =
        row.inAt && row.outAt
          ? Math.max(0, row.outAt.getTime() - row.inAt.getTime())
          : 0;
      const hours = workedMs ? msToHours(workedMs) : 0;
      if (row.inAt) daysPresent += 1;
      totalWorkedHours += hours;

      if (recentDays.length < 7) {
        recentDays.push({
          day: row.day,
          inAt: row.inAt?.toISOString() ?? null,
          outAt: row.outAt?.toISOString() ?? null,
          workedHours: hours,
          status: row.inAt && !row.outAt ? "In" : row.inAt ? "Present" : "—",
        });
      }
    }

    const monthLabel = now.toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });

    return ok({
      employee: {
        employeeId: String(employee.employeeId),
        fullName: employee.fullName,
        department: employee.department ?? "",
        designation: employee.designation ?? "",
        primaryShift: employee.primaryShift ?? "",
        locationUnit: employee.locationUnit ?? "",
      },
      today: {
        date: todayKey,
        inAt: todayAgg?.inAt?.toISOString() ?? null,
        outAt: todayAgg?.outAt?.toISOString() ?? null,
        workedHours: todayWorkedMs ? msToHours(todayWorkedMs) : 0,
        status:
          todayAgg?.inAt && !todayAgg?.outAt
            ? "In"
            : todayAgg?.inAt
              ? "Present"
              : "Absent",
      },
      month: {
        label: monthLabel,
        daysPresent,
        totalWorkedHours: Math.round(totalWorkedHours * 100) / 100,
        workingDaysSoFar: now.getDate(),
      },
      recentDays,
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to load attendance stats", 500);
  }
}
