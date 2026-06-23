import { connectDB } from "@/lib/db";
import Employee from "@/lib/models/Employee";
import AttendancePunch from "@/lib/models/AttendancePunch";
import { ok, fail } from "@/lib/api-response";
import { getSession } from "@/lib/session";
import { filterRowsByHrScope, resolveHrDataScope } from "@/lib/hrms-access";
import { enrichLocation, shortAddressFromLocation, type GeoLocation } from "@/lib/reverse-geocode";

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(d: Date): string {
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function msToHours(ms: number) {
  return Math.round((ms / 36e5) * 100) / 100;
}

function geoKey(lat: number, lng: number) {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

function needsGeocode(loc: any): loc is { lat: number; lng: number } {
  if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number") return false;
  return !loc.address?.trim() && !loc.city?.trim() && !loc.state?.trim();
}

export async function GET(request: Request) {
  try {
    await connectDB();

    const url = new URL(request.url);
    const mineOnly = url.searchParams.get("mine") === "1";
    const session = await getSession();
    if (!session.isLoggedIn || !session.user) return fail("Unauthorized", 401);
    const dataScope = await resolveHrDataScope(session.user);
    if (mineOnly && !session.user.email) {
      return fail("Unauthorized", 401);
    }
    const sessionEmail = session?.user?.email?.trim().toLowerCase();

    const now = new Date();
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end   = new Date(now); end.setHours(23, 59, 59, 999);

    const punches = await AttendancePunch.find({ punchedAt: { $gte: start, $lte: end } })
      .sort({ punchedAt: 1 })
      .lean();

    // Resolve addresses for punches that only have lat/lng (cache + backfill DB)
    const geoCache = new Map<string, GeoLocation>();
    const punchIdsByKey = new Map<string, unknown[]>();

    for (const p of punches) {
      if (!needsGeocode(p.location)) continue;
      const key = geoKey(p.location.lat, p.location.lng);
      const ids = punchIdsByKey.get(key) ?? [];
      ids.push(p._id);
      punchIdsByKey.set(key, ids);
    }

    let geoIndex = 0;
    for (const [key, ids] of punchIdsByKey) {
      if (geoIndex > 0) await new Promise((r) => setTimeout(r, 1100));
      geoIndex++;
      const [lat, lng] = key.split(",").map(Number);
      const enriched = await enrichLocation({ lat, lng });
      geoCache.set(key, enriched);
      for (const id of ids) {
        if (enriched.address) {
          AttendancePunch.updateOne({ _id: id }, { $set: { location: enriched } }).catch(() => {});
        }
      }
    }

    const resolveLocation = (loc: any): any => {
      if (!loc) return null;
      if (!needsGeocode(loc)) return loc;
      return geoCache.get(geoKey(loc.lat, loc.lng)) ?? loc;
    };

    const enrichedPunches = punches.map((p) => ({
      ...p,
      location: resolveLocation(p.location),
    }));

    const emailSet      = new Set<string>();
    const employeeIdSet = new Set<string>();
    for (const p of enrichedPunches) {
      if (p.userEmail)   emailSet.add(String(p.userEmail));
      if (p.employeeId)  employeeIdSet.add(String(p.employeeId));
    }

    const employees = await Employee.find({
      $or: [
        { employeeId:    { $in: Array.from(employeeIdSet) } },
        { officialEmail: { $in: Array.from(emailSet) } },
        { personalEmail: { $in: Array.from(emailSet) } },
      ],
    }).select({ employeeId: 1, fullName: 1, officialEmail: 1, personalEmail: 1 }).lean();

    const byEmployeeId = new Map<string, any>();
    const byEmail      = new Map<string, any>();
    for (const e of employees) {
      byEmployeeId.set(String(e.employeeId), e);
      if (e.officialEmail) byEmail.set(String(e.officialEmail).toLowerCase(), e);
      if (e.personalEmail) byEmail.set(String(e.personalEmail).toLowerCase(), e);
    }

    type LogEntry = { type: "in" | "out"; time: string; dateTime: string; isoTime: string; address: string; fullAddress: string; source: string };
    type PersonAgg = {
      key: string;
      employeeId?: string;
      userEmail?: string;
      firstIn?: Date;
      lastOut?: Date;
      inLocation?: any;
      outLocation?: any;
      source: string;
      punchLog: LogEntry[];
    };

    const byPerson = new Map<string, PersonAgg>();

    for (const p of enrichedPunches) {
      const key = p.employeeId ? `emp:${p.employeeId}` : p.userEmail ? `email:${p.userEmail}` : null;
      if (!key) continue;

      const cur: PersonAgg = byPerson.get(key) ?? {
        key,
        employeeId: p.employeeId ? String(p.employeeId) : undefined,
        userEmail:  p.userEmail  ? String(p.userEmail)  : undefined,
        source:     String(p.source || "web"),
        punchLog:   [],
      };

      const punchedAt = new Date(p.punchedAt);
      const addrShort = shortAddressFromLocation(p.location);
      const addrFull  = p.location?.address || "";

      if (p.punchType === "in") {
        if (!cur.firstIn || punchedAt < cur.firstIn) {
          cur.firstIn    = punchedAt;
          cur.inLocation = p.location ?? null;
        }
      } else if (p.punchType === "out") {
        if (!cur.lastOut || punchedAt > cur.lastOut) {
          cur.lastOut     = punchedAt;
          cur.outLocation = p.location ?? null;
        }
      }

      cur.source = String(p.source || cur.source || "web");

      cur.punchLog.push({
        type:        p.punchType as "in" | "out",
        time:        formatTime(punchedAt),
        dateTime:    formatDateTime(punchedAt),
        isoTime:     punchedAt.toISOString(),
        address:     addrShort,
        fullAddress: addrFull,
        source:      String(p.source || "web"),
      });

      byPerson.set(key, cur);
    }

    let people = Array.from(byPerson.values());
    let sessionEmployee: { employeeId?: string; primaryShift?: string } | null =
      null;
    if (mineOnly && sessionEmail) {
      sessionEmployee = await Employee.findOne({
        $or: [
          { officialEmail: sessionEmail },
          { personalEmail: sessionEmail },
        ],
      })
        .select({ employeeId: 1, primaryShift: 1 })
        .lean();
      const myEmpId = sessionEmployee?.employeeId
        ? String(sessionEmployee.employeeId)
        : null;
      people = people.filter(
        (p) =>
          (myEmpId && p.employeeId === myEmpId) ||
          (p.userEmail && p.userEmail.toLowerCase() === sessionEmail)
      );
    }

    if (!mineOnly && dataScope.mode !== "all") {
      const allowedIds = new Set(
        filterRowsByHrScope(
          people
            .filter((p) => p.employeeId)
            .map((p) => ({ employeeId: String(p.employeeId) })),
          dataScope,
        ).map((p) => p.employeeId),
      );
      people = people.filter(
        (p) => p.employeeId && allowedIds.has(String(p.employeeId)),
      );
    }

    const rows = people.map((p) => {
      const employee = p.employeeId
        ? byEmployeeId.get(String(p.employeeId))
        : p.userEmail ? byEmail.get(String(p.userEmail).toLowerCase()) : null;

      const method = p.source === "machine" ? "Bio-Metric" : p.source === "mobile" ? "Mobile App" : "Web";
      const workedMs = p.firstIn && p.lastOut ? Math.max(0, p.lastOut.getTime() - p.firstIn.getTime()) : 0;

      return {
        key:            p.key,
        id:             employee?.employeeId ?? p.employeeId ?? "-",
        name:           employee?.fullName ?? p.userEmail ?? "Unknown",
        inTime:         p.firstIn  ? formatDateTime(p.firstIn)  : null,
        outTime:        p.lastOut  ? formatDateTime(p.lastOut)  : null,
        workedHours:    workedMs ? msToHours(workedMs) : 0,
        status:         p.firstIn && !p.lastOut ? "In" : p.firstIn && p.lastOut ? "Out" : "—",
        method,
        inAddress:      shortAddressFromLocation(p.inLocation),
        inFullAddress:  p.inLocation?.address || "",
        outAddress:     shortAddressFromLocation(p.outLocation),
        outFullAddress: p.outLocation?.address || "",
        punchLog:       p.punchLog,
      };
    });

    let punchMeta: {
      punchInBlocked: boolean;
      punchInBlockReason: string | null;
      primaryShift: string | null;
    } | undefined;

    if (mineOnly && sessionEmail) {
      const primaryShift = sessionEmployee?.primaryShift
        ? String(sessionEmployee.primaryShift)
        : null;
      // 4-hour late punch-in validation disabled
      // const punchInBlocked = isPunchInLateAbsent(now, primaryShift);
      const punchInBlocked = false;
      punchMeta = {
        punchInBlocked,
        punchInBlockReason: null,
        // punchInBlockReason: punchInBlocked ? PUNCH_IN_LATE_ABSENT_MESSAGE : null,
        primaryShift,
      };
    }

    return ok({
      date: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`,
      rows,
      ...(punchMeta ? { meta: punchMeta } : {}),
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to load today attendance", 500);
  }
}
