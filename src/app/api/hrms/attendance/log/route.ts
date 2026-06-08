import { connectDB } from "@/lib/db";
import Employee from "@/lib/models/Employee";
import AttendancePunch from "@/lib/models/AttendancePunch";
import { ok, fail } from "@/lib/api-response";
import { resolveManagerScope } from "@/lib/manager-scope";
import { getSession } from "@/lib/session";
import { enrichLocation, shortAddressFromLocation, type GeoLocation } from "@/lib/reverse-geocode";

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date)   { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(d: Date): string {
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
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

async function enrichPunchLocations(punches: any[]) {
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

  return punches.map((p) => {
    if (!p.location || !needsGeocode(p.location)) return p;
    return { ...p, location: geoCache.get(geoKey(p.location.lat, p.location.lng)) ?? p.location };
  });
}

export async function GET(request: Request) {
  try {
    await connectDB();

    const url = new URL(request.url);
    const fromParam = url.searchParams.get("from");
    const toParam   = url.searchParams.get("to");

    const now = new Date();
    let start: Date;
    let end: Date;

    if (fromParam && toParam) {
      start = startOfDay(new Date(fromParam));
      end   = endOfDay(new Date(toParam));
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return fail("Invalid from/to dates", 400);
      }
    } else {
      start = startOfDay(now);
      end   = endOfDay(now);
    }

    const punches = await AttendancePunch.find({ punchedAt: { $gte: start, $lte: end } })
      .sort({ punchedAt: 1 })
      .lean();

    const enrichedPunches = await enrichPunchLocations(punches);

    const emailSet      = new Set<string>();
    const employeeIdSet = new Set<string>();
    for (const p of enrichedPunches) {
      if (p.userEmail)  emailSet.add(String(p.userEmail));
      if (p.employeeId) employeeIdSet.add(String(p.employeeId));
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

    type LogEntry = {
      type: "in" | "out";
      time: string;
      dateTime: string;
      isoTime: string;
      address: string;
      fullAddress: string;
      source: string;
    };

    type DayAgg = {
      key: string;
      personKey: string;
      day: string;
      employeeId?: string;
      userEmail?: string;
      firstIn?: Date;
      lastOut?: Date;
      inLocation?: any;
      outLocation?: any;
      source: string;
      punchLog: LogEntry[];
    };

    const byPersonDay = new Map<string, DayAgg>();

    for (const p of enrichedPunches) {
      const personKey = p.employeeId ? `emp:${p.employeeId}` : p.userEmail ? `email:${p.userEmail}` : null;
      if (!personKey) continue;

      const punchedAt = new Date(p.punchedAt);
      const day = dayKey(punchedAt);
      const rowKey = `${personKey}|${day}`;

      const cur: DayAgg = byPersonDay.get(rowKey) ?? {
        key: rowKey,
        personKey,
        day,
        employeeId: p.employeeId ? String(p.employeeId) : undefined,
        userEmail:  p.userEmail  ? String(p.userEmail)  : undefined,
        source:     String(p.source || "web"),
        punchLog:   [],
      };

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

      byPersonDay.set(rowKey, cur);
    }

    const session = await getSession();
    const managerScope = await resolveManagerScope(session.user);

    let dayRows = Array.from(byPersonDay.values());
    if (managerScope.restricted) {
      dayRows = dayRows.filter(
        (p) =>
          p.employeeId &&
          managerScope.teamEmployeeIds.includes(String(p.employeeId))
      );
    }

    const rows = dayRows
      .map((p) => {
        const employee = p.employeeId
          ? byEmployeeId.get(String(p.employeeId))
          : p.userEmail ? byEmail.get(String(p.userEmail).toLowerCase()) : null;

        const method = p.source === "machine" ? "Bio-Metric" : p.source === "mobile" ? "Mobile App" : "Web";
        const workedMs = p.firstIn && p.lastOut ? Math.max(0, p.lastOut.getTime() - p.firstIn.getTime()) : 0;
        const dayDate  = new Date(`${p.day}T12:00:00`);

        return {
          key:            p.key,
          day:            p.day,
          date:           formatDate(dayDate),
          id:             employee?.employeeId ?? p.employeeId ?? "-",
          name:           employee?.fullName ?? p.userEmail ?? "Unknown",
          inTime:         p.firstIn  ? formatDateTime(p.firstIn)  : null,
          outTime:        p.lastOut  ? formatDateTime(p.lastOut)  : null,
          workedHours:    workedMs ? msToHours(workedMs) : 0,
          status:         p.firstIn && !p.lastOut ? "In" : p.firstIn && p.lastOut ? "Out" : "—",
          method,
          inAddress:      shortAddressFromLocation(p.inLocation),
          inFullAddress:  p.inLocation?.address || "",
          inLat:          typeof p.inLocation?.lat === "number" ? p.inLocation.lat : null,
          inLng:          typeof p.inLocation?.lng === "number" ? p.inLocation.lng : null,
          outAddress:     shortAddressFromLocation(p.outLocation),
          outFullAddress: p.outLocation?.address || "",
          outLat:         typeof p.outLocation?.lat === "number" ? p.outLocation.lat : null,
          outLng:         typeof p.outLocation?.lng === "number" ? p.outLocation.lng : null,
          punchLog:       p.punchLog,
        };
      })
      .sort((a, b) => b.day.localeCompare(a.day) || a.name.localeCompare(b.name));

    return ok({ from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10), rows });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to load attendance log", 500);
  }
}
