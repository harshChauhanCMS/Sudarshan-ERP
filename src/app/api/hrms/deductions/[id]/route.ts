import { connectDB } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";
import Deduction from "@/lib/models/Deduction";
import Employee from "@/lib/models/Employee";
import { requireSession, requirePermission, isAdminOrOwner } from "@/lib/api-auth";
import { validateDeductionBody } from "@/lib/deduction-utils";

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
    const deduction = await Deduction.findById(id).lean();
    if (!deduction) return fail("Deduction not found", 404);
    return ok(deduction);
  } catch {
    return fail("Deduction not found", 404);
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

    const existing = await Deduction.findById(id);
    if (!existing) return fail("Deduction not found", 404);

    const invalid = validateDeductionBody(body, { partial: true });
    if (invalid) return fail(invalid, 400);

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      const clash = await Deduction.findOne({
        name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        _id: { $ne: existing._id },
      });
      if (clash) return fail(`A deduction named "${name}" already exists`, 409);
      existing.name = name;
    }

    if (body.percentage !== undefined) existing.percentage = Number(body.percentage);
    if (body.basis !== undefined) existing.basis = body.basis === "basic" ? "basic" : "gross";
    if (body.maxAmount !== undefined) existing.maxAmount = Number(body.maxAmount) || 0;
    if (body.applicableUpToGross !== undefined) {
      existing.applicableUpToGross = Number(body.applicableUpToGross) || 0;
    }
    if (body.isDefault !== undefined) existing.isDefault = Boolean(body.isDefault);
    if (body.isActive !== undefined) existing.isActive = Boolean(body.isActive);
    if (body.description !== undefined) {
      existing.description = String(body.description).trim().slice(0, 300);
    }

    await existing.save();
    return ok({ deduction: existing.toObject() });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update deduction", 500);
  }
}

/**
 * Deductions assigned to employees are deactivated rather than deleted, so an
 * employee never ends up pointing at a rule that no longer exists (which would
 * silently drop that deduction from their next payslip with no audit trail).
 * The built-in payslip rows are deactivated too — deleting one would only have
 * it re-created by the next backfill. Everything else is removed outright.
 */
export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const auth = await requireHrWrite("edit");
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const deduction = await Deduction.findById(id);
    if (!deduction) return fail("Deduction not found", 404);

    const assigned = await Employee.countDocuments({
      "deductionRates.deductionId": String(id),
    });

    if (assigned > 0 || deduction.seedKey) {
      deduction.isActive = false;
      await deduction.save();
      return ok({
        deactivated: true,
        assigned,
        message: assigned
          ? `${assigned} employee(s) have this deduction applied — it has been deactivated instead of deleted.`
          : `${deduction.name} is a standard payslip row — it has been deactivated instead of deleted.`,
      });
    }

    await deduction.deleteOne();
    return ok({ deleted: true });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to delete deduction", 500);
  }
}
