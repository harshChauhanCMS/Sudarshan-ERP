import { connectDB } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";
import AttendancePunch from "@/lib/models/AttendancePunch";
import Employee from "@/lib/models/Employee";
import { verifyBiometricRequest } from "@/lib/biometric-auth";
import { notifyAttendancePunch } from "@/lib/hrms-punch-notifications";

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function validateLocation(loc: unknown) {
  if (loc == null) return null;
  if (!loc || typeof loc !== "object") throw new Error("location must be an object");
  const anyLoc = loc as Record<string, unknown>;
  if (!isFiniteNumber(anyLoc.lat) || !isFiniteNumber(anyLoc.lng)) {
    throw new Error("location.lat and location.lng are required numbers");
  }
  if ("accuracy" in anyLoc && anyLoc.accuracy != null && !isFiniteNumber(anyLoc.accuracy)) {
    throw new Error("location.accuracy must be a number");
  }
  return {
    lat: anyLoc.lat as number,
    lng: anyLoc.lng as number,
    accuracy: anyLoc.accuracy as number | undefined,
  };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const auth = verifyBiometricRequest(request, rawBody);
  if (!auth.ok) return fail(auth.error, 401);

  const body = rawBody ? JSON.parse(rawBody) : null;
  if (!body || typeof body !== "object") return fail("Invalid body", 400);

  const employeeId = typeof body.employeeId === "string" ? body.employeeId.trim() : "";
  const punchType = body.punchType === "in" || body.punchType === "out" ? body.punchType : null;
  const punchedAt = body.punchedAt ? new Date(body.punchedAt) : new Date();
  const source = body.source === "machine" || body.source === "mobile" ? body.source : "machine";
  const deviceId = typeof body.deviceId === "string" ? body.deviceId.trim() : undefined;
  const notes = typeof body.notes === "string" ? body.notes.trim() : undefined;

  if (!employeeId) return fail("employeeId is required", 400);
  if (!punchType) return fail("punchType must be 'in' or 'out'", 400);
  if (Number.isNaN(punchedAt.getTime())) return fail("punchedAt must be a valid date", 400);

  try {
    const location = validateLocation(body.location);
    await connectDB();
    const employee = await Employee.findOne({ employeeId })
      .select({ fullName: 1 })
      .lean();

    const created = await AttendancePunch.create({
      employeeId,
      punchType,
      punchedAt,
      source,
      deviceId,
      location: location ?? undefined,
      notes: notes || undefined,
      raw: body.raw ?? body,
    });

    void notifyAttendancePunch({
      employeeId,
      employeeName: employee?.fullName ? String(employee.fullName) : undefined,
      punchType,
      punchedAt,
      source,
      punchId: String(created._id),
    });

    return ok({ punch: created, auth: auth.mode }, 201);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Ingestion failed", 500);
  }
}

