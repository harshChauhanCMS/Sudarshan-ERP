import { connectDB } from "@/lib/db";
import Employee from "@/lib/models/Employee";
import { ok, fail } from "@/lib/api-response";
import { getSession } from "@/lib/session";
import AttendancePunch from "@/lib/models/AttendancePunch";
import { enrichLocation } from "@/lib/reverse-geocode";
import { notifyAttendancePunch } from "@/lib/hrms-punch-notifications";

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
  const session = await getSession();
  if (!session.isLoggedIn || !session.user?.email) return fail("Unauthorized", 401);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return fail("Invalid body", 400);

  const locRes = validateLocation((body as any).location);
  if ("error" in locRes) return fail(locRes.error, 400);

  const notes = typeof (body as any).notes === "string" ? (body as any).notes.trim() : "";
  const workSite =
    (body as any).workSite === "field" ? "field" : "office";
  const sourceRaw = (body as any).source;
  const source =
    sourceRaw === "mobile" || sourceRaw === "machine" ? sourceRaw : "web";
  const punchNotes = [
    notes,
    workSite === "field" ? "Field" : "",
  ]
    .filter(Boolean)
    .join(" · ");

  try {
    await connectDB();

    const email = session.user.email.trim().toLowerCase();
    const employee = await Employee.findOne({
      $or: [{ officialEmail: email }, { personalEmail: email }],
    }).lean();

    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const identityQuery = employee?.employeeId
      ? { employeeId: employee.employeeId }
      : { userEmail: email };

    const last = await AttendancePunch.findOne({
      ...identityQuery,
      punchedAt: { $gte: start, $lte: end },
    })
      .sort({ punchedAt: -1 })
      .lean();

    if (!last || last.punchType !== "in") return fail("No active punch-in found", 409);

    const location = await enrichLocation(locRes.value);

    const created = await AttendancePunch.create({
      employeeId: employee?.employeeId,
      userId: session.user.id,
      userEmail: email,
      punchType: "out",
      punchedAt: now,
      source,
      location,
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

    return ok({ punch: created }, 201);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Punch-out failed", 500);
  }
}

