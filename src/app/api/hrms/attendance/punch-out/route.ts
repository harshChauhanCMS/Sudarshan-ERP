import { connectDB } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";
import { getUserFromRequest } from "@/lib/api-request-auth";
import { resolveSessionEmployee } from "@/lib/resolve-session-employee";
import AttendancePunch from "@/lib/models/AttendancePunch";
import { enrichLocation } from "@/lib/reverse-geocode";
import { notifyAttendancePunch } from "@/lib/hrms-punch-notifications";
import { notifyOnsitePunchLocation } from "@/lib/field-visit-notifications";

type LocationPayload = {
  lat: number; lng: number; accuracy?: number;
  address?: string; city?: string; state?: string; country?: string;
};

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function validateLocation(loc: unknown): { value: LocationPayload } | { error: string } {
  if (!loc || typeof loc !== "object") return { error: "location is required" };
  const anyLoc = loc as Record<string, unknown>;
  if (!isFiniteNumber(anyLoc.lat) || !isFiniteNumber(anyLoc.lng)) {
    return { error: "location.lat and location.lng are required numbers" };
  }
  return {
    value: {
      lat: anyLoc.lat as number,
      lng: anyLoc.lng as number,
      accuracy: isFiniteNumber(anyLoc.accuracy) ? (anyLoc.accuracy as number) : undefined,
      address: typeof anyLoc.address === "string" ? anyLoc.address.trim() : undefined,
      city:    typeof anyLoc.city    === "string" ? anyLoc.city.trim()    : undefined,
      state:   typeof anyLoc.state   === "string" ? anyLoc.state.trim()   : undefined,
      country: typeof anyLoc.country === "string" ? anyLoc.country.trim() : undefined,
    },
  };
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user?.email) return fail("Unauthorized", 401);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return fail("Invalid body", 400);

  const sourceRaw = (body as any).source;
  const source =
    sourceRaw === "mobile" || sourceRaw === "machine" ? sourceRaw : "web";

  const rawLocation = (body as { location?: unknown }).location;
  if (source === "mobile" && rawLocation == null) {
    return fail("location is required", 400);
  }

  let location: Awaited<ReturnType<typeof enrichLocation>> | undefined;
  if (rawLocation != null) {
    const locRes = validateLocation(rawLocation);
    if ("error" in locRes) return fail(locRes.error, 400);
    location = await enrichLocation(locRes.value);
  }

  const notes = typeof (body as any).notes === "string" ? (body as any).notes.trim() : "";
  // Legacy fallback only: workLocationType is now the employee's own assigned
  // value from their HR profile, not a per-punch client choice.
  const clientWorkSite =
    (body as any).workSite === "field" ? "field" : "office";

  try {
    await connectDB();

    const email = user.email.trim().toLowerCase();
    const employee = await resolveSessionEmployee(user);

    const workLocationType = employee?.workLocationType
      ? String(employee.workLocationType)
      : clientWorkSite === "field"
        ? "Field"
        : "Onsite";
    const punchNotes = [
      notes,
      workLocationType === "Field" ? "Field" : "",
    ]
      .filter(Boolean)
      .join(" · ");

    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const identityFilter = employee?.employeeId
      ? { $or: [{ employeeId: employee.employeeId }, { userEmail: email }] }
      : { userEmail: email };

    const last = await AttendancePunch.findOne({
      ...identityFilter,
      punchedAt: { $gte: start, $lte: end },
    })
      .sort({ punchedAt: -1 })
      .lean();

    if (!last || last.punchType !== "in") return fail("No active punch-in found", 409);

    const created = await AttendancePunch.create({
      employeeId: employee?.employeeId,
      userId: user.id,
      userEmail: email,
      punchType: "out",
      punchedAt: now,
      source,
      ...(location ? { location } : {}),
      notes: punchNotes || undefined,
    });

    void notifyAttendancePunch({
      employeeId: employee?.employeeId ? String(employee.employeeId) : undefined,
      employeeName: employee?.fullName ? String(employee.fullName) : undefined,
      userEmail: email,
      punchType: "out",
      punchedAt: now,
      source,
      punchId: String(created._id),
    });

    if (
      (workLocationType === "Onsite" || workLocationType === "Field") &&
      location?.lat != null &&
      location?.lng != null
    ) {
      void notifyOnsitePunchLocation({
        employeeId: employee?.employeeId ? String(employee.employeeId) : undefined,
        employeeName: employee?.fullName ? String(employee.fullName) : email,
        punchedAt: now,
        address: location.address,
        city: location.city,
        lat: location.lat,
        lng: location.lng,
        workLocationType,
        punchType: "out",
      });
    }

    return ok({ punch: created }, 201);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Punch-out failed", 500);
  }
}

