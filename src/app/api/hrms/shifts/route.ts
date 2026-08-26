import { connectDB } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";
import Shift from "@/lib/models/Shift";
import { requireSession, requirePermission, isAdminOrOwner } from "@/lib/api-auth";
import {
  crossesMidnight,
  validateShiftBody,
  validateShiftDuration,
} from "@/lib/shift-utils";

export const dynamic = "force-dynamic";

/** Sensible starting set so the employee form is never an empty dropdown. */
const DEFAULT_SHIFTS = [
  { code: "A", name: "Shift A", startMinutes: 360, endMinutes: 840, breakMinutes: 30, weeklyOff: "Sunday" },
  { code: "B", name: "Shift B", startMinutes: 840, endMinutes: 1320, breakMinutes: 30, weeklyOff: "Sunday" },
  { code: "C", name: "Shift C", startMinutes: 1320, endMinutes: 360, breakMinutes: 30, weeklyOff: "Rotating", isNightShift: true },
  { code: "GEN", name: "General", startMinutes: 540, endMinutes: 1080, breakMinutes: 60, weeklyOff: "Sunday" },
];

async function seedIfEmpty() {
  if ((await Shift.countDocuments()) === 0) {
    await Shift.insertMany(DEFAULT_SHIFTS);
  }
}

export async function GET(request: Request) {
  const { error } = await requireSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("active") === "1";

  try {
    await connectDB();
    await seedIfEmpty();
    const query = activeOnly ? { isActive: true } : {};
    const shifts = await Shift.find(query).sort({ startMinutes: 1 }).lean();
    return ok(shifts);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to load shifts", 500);
  }
}

export async function POST(request: Request) {
  const { user, error } = await requireSession();
  if (error) return error;
  if (!isAdminOrOwner(user.role)) {
    const permErr = requirePermission(user, "hr", "add");
    if (permErr) return permErr;
  }

  try {
    await connectDB();
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return fail("Invalid request body", 400);

    const invalid = validateShiftBody(body);
    if (invalid) return fail(invalid, 400);

    const start = Number(body.startMinutes);
    const end = Number(body.endMinutes);
    const breakMinutes = Number(body.breakMinutes ?? 0);
    const durationError = validateShiftDuration({
      startMinutes: start,
      endMinutes: end,
      breakMinutes,
    });
    if (durationError) return fail(durationError, 400);

    const code = String(body.code).trim().toUpperCase();
    if (await Shift.findOne({ code })) {
      return fail(`A shift with code ${code} already exists`, 409);
    }

    const shift = await Shift.create({
      code,
      name: String(body.name).trim(),
      startMinutes: start,
      endMinutes: end,
      breakMinutes,
      weeklyOff: typeof body.weeklyOff === "string" ? body.weeklyOff : "Sunday",
      // Derived, not trusted from the client — a shift that ends before it
      // starts has crossed midnight by definition.
      isNightShift: crossesMidnight(start, end),
      isActive: body.isActive !== false,
      description:
        typeof body.description === "string" ? body.description.trim().slice(0, 300) : "",
    });

    return ok({ shift }, 201);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to create shift", 500);
  }
}
