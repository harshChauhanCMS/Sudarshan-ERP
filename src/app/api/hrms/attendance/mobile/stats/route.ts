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
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function msToHours(ms: number) {
  return Math.round((ms / 36e5) * 100) / 100;
}

function sumWorkedMsForPunches(
  dayPunches: Array<{ punchType: string; punchedAt: Date }>,
): number {
  const sorted = [...dayPunches].sort(
    (a, b) => new Date(a.punchedAt).getTime() - new Date(b.punchedAt).getTime(),
  );
  let total = 0;
  let openIn: Date | null = null;

  for (const punch of sorted) {
    const at = new Date(punch.punchedAt);
    if (punch.punchType === "in") {
      openIn = at;
    } else if (punch.punchType === "out" && openIn) {
      total += Math.max(0, at.getTime() - openIn.getTime());
      openIn = null;
    }
  }

  return total;
}

function statusFromLastPunch(
  dayPunches: Array<{ punchType: string; punchedAt: Date }>,
): string {
  if (!dayPunches.length) return "Absent";
  const last = [...dayPunches].sort(
    (a, b) => new Date(b.punchedAt).getTime() - new Date(a.punchedAt).getTime(),
  )[0];
  if (last.punchType === "in") return "In";
  return "Out";
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
    const email = user.email.trim().toLowerCase();
    const punches = await AttendancePunch.find({
      $or: [{ employeeId: resolvedEmployeeId }, { userEmail: email }],
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
    const todayPunches = punches.filter((p) => dayKey(new Date(p.punchedAt)) === todayKey);
    const todayAgg = byDay.get(todayKey);
    const todayWorkedMs = sumWorkedMsForPunches(
      todayPunches.map((p) => ({
        punchType: String(p.punchType),
        punchedAt: new Date(p.punchedAt),
      })),
    );
    const todayStatus = statusFromLastPunch(
      todayPunches.map((p) => ({
        punchType: String(p.punchType),
        punchedAt: new Date(p.punchedAt),
      })),
    );

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
      const dayPunches = punches.filter((p) => dayKey(new Date(p.punchedAt)) === row.day);
      const workedMs = sumWorkedMsForPunches(
        dayPunches.map((p) => ({
          punchType: String(p.punchType),
          punchedAt: new Date(p.punchedAt),
        })),
      );
      const hours = workedMs ? msToHours(workedMs) : 0;
      if (row.inAt) daysPresent += 1;
      totalWorkedHours += hours;

      if (recentDays.length < 7) {
        recentDays.push({
          day: row.day,
          inAt: row.inAt?.toISOString() ?? null,
          outAt: row.outAt?.toISOString() ?? null,
          workedHours: hours,
          status: statusFromLastPunch(
            dayPunches.map((p) => ({
              punchType: String(p.punchType),
              punchedAt: new Date(p.punchedAt),
            })),
          ),
        });
      }
    }

    const monthLabel = now.toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });

    const latestPunchIn = [...todayPunches]
      .filter((p) => p.punchType === "in")
      .sort(
        (a, b) =>
          new Date(b.punchedAt).getTime() - new Date(a.punchedAt).getTime(),
      )[0];
    const latestPunchOut = [...todayPunches]
      .filter((p) => p.punchType === "out")
      .sort(
        (a, b) =>
          new Date(b.punchedAt).getTime() - new Date(a.punchedAt).getTime(),
      )[0];
    const punchInLoc = latestPunchIn?.location as
      | {
          address?: string;
          city?: string;
          state?: string;
          lat?: number;
          lng?: number;
        }
      | undefined;
    const punchOutLoc = latestPunchOut?.location as
      | {
          address?: string;
          city?: string;
          state?: string;
          lat?: number;
          lng?: number;
        }
      | undefined;

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
        status: todayStatus,
        punchInLocation: punchInLoc
          ? {
              address: punchInLoc.address,
              city: punchInLoc.city,
              state: punchInLoc.state,
              lat: punchInLoc.lat,
              lng: punchInLoc.lng,
            }
          : null,
        punchOutLocation: punchOutLoc
          ? {
              address: punchOutLoc.address,
              city: punchOutLoc.city,
              state: punchOutLoc.state,
              lat: punchOutLoc.lat,
              lng: punchOutLoc.lng,
            }
          : null,
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
