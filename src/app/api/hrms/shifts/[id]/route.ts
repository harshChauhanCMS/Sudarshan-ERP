import { connectDB } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";
import Shift from "@/lib/models/Shift";
import Employee from "@/lib/models/Employee";
import { requireSession, requirePermission, isAdminOrOwner } from "@/lib/api-auth";
import {
  crossesMidnight,
  validateShiftBody,
  validateShiftDuration,
} from "@/lib/shift-utils";

type Params = { params: Promise<{ id: string }> };

async function requireHrWrite(action: "edit" | "add") {
  const { user, error } = await requireSession();
  if (error) return { error };
  if (!isAdminOrOwner(user.role)) {
    const permErr = requirePermission(user, "hr", action);
    if (permErr) return { error: permErr };
  }
  return { user };
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await requireSession();
  if (error) return error;

  try {
    await connectDB();
    const shift = await Shift.findById(id).lean();
    if (!shift) return fail("Shift not found", 404);
    return ok(shift);
  } catch {
    return fail("Shift not found", 404);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const auth = await requireHrWrite("edit");
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return fail("Invalid request body", 400);

    const existing = await Shift.findById(id);
    if (!existing) return fail("Shift not found", 404);

    const invalid = validateShiftBody(body, { partial: true });
    if (invalid) return fail(invalid, 400);

    // Validate the merged result, not just the incoming fields — editing only
    // the break must still leave a shift longer than that break.
    const startMinutes = body.startMinutes ?? existing.startMinutes;
    const endMinutes = body.endMinutes ?? existing.endMinutes;
    const breakMinutes = body.breakMinutes ?? existing.breakMinutes ?? 0;
    const durationError = validateShiftDuration({
      startMinutes,
      endMinutes,
      breakMinutes,
    });
    if (durationError) return fail(durationError, 400);

    if (body.code) {
      const code = String(body.code).trim().toUpperCase();
      const clash = await Shift.findOne({ code, _id: { $ne: existing._id } });
      if (clash) return fail(`A shift with code ${code} already exists`, 409);
      existing.code = code;
    }

    if (body.name !== undefined) existing.name = String(body.name).trim();
    existing.startMinutes = startMinutes;
    existing.endMinutes = endMinutes;
    existing.breakMinutes = breakMinutes;
    existing.isNightShift = crossesMidnight(startMinutes, endMinutes);
    if (body.weeklyOff !== undefined) existing.weeklyOff = String(body.weeklyOff);
    if (body.isActive !== undefined) existing.isActive = Boolean(body.isActive);
    if (body.description !== undefined) {
      existing.description = String(body.description).trim().slice(0, 300);
    }

    await existing.save();
    return ok({ shift: existing.toObject() });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update shift", 500);
  }
}

/**
 * Shifts assigned to employees are deactivated rather than deleted, so an
 * employee record never ends up pointing at a shift that no longer exists.
 * Unassigned shifts are removed outright.
 */
export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const auth = await requireHrWrite("edit");
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const shift = await Shift.findById(id);
    if (!shift) return fail("Shift not found", 404);

    const label = new RegExp(`^${shift.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    const assigned = await Employee.countDocuments({ primaryShift: label });

    if (assigned > 0) {
      shift.isActive = false;
      await shift.save();
      return ok({
        deactivated: true,
        assigned,
        message: `${assigned} employee(s) are on this shift — it has been deactivated instead of deleted.`,
      });
    }

    await shift.deleteOne();
    return ok({ deleted: true });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to delete shift", 500);
  }
}
