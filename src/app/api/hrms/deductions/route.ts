import { connectDB } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";
import Deduction from "@/lib/models/Deduction";
import { requireSession, requirePermission, isAdminOrOwner } from "@/lib/api-auth";
import { validateDeductionBody } from "@/lib/deduction-utils";
import { BUILT_IN_DEDUCTIONS } from "@/lib/deduction-defaults";

export const dynamic = "force-dynamic";

/**
 * Backfills the built-in payslip rows, one row at a time.
 *
 * Deliberately not an "insert everything if the collection is empty" seed: a
 * database seeded when the list was shorter would never receive rows added
 * later, which is exactly how installs ended up with only PF and ESIC. Rows
 * created before `seedKey` existed are adopted by name so they aren't
 * duplicated, and only the missing ones are inserted — an admin's edits to an
 * existing row (rate, cap, active flag) are never overwritten.
 */
async function ensureBuiltIns() {
  // The whole collection, not a filtered query: names are matched
  // case-insensitively (the create API already treats them that way) and there
  // are only ever a handful of deduction masters.
  const existing = await Deduction.find({}, { seedKey: 1, name: 1 }).lean<
    { _id: unknown; seedKey?: string; name: string }[]
  >();

  const bySeedKey = new Set(existing.map((d) => d.seedKey).filter(Boolean));
  const byName = new Map(existing.map((d) => [d.name.toLowerCase(), d]));

  const missing = [];
  for (const builtIn of BUILT_IN_DEDUCTIONS) {
    if (bySeedKey.has(builtIn.seedKey)) continue;

    const legacy = byName.get(builtIn.name.toLowerCase());
    if (legacy) {
      // Pre-`seedKey` row: stamp it so it is recognised as built-in from now on.
      await Deduction.updateOne({ _id: legacy._id }, { $set: { seedKey: builtIn.seedKey } });
      continue;
    }
    missing.push(builtIn);
  }

  if (!missing.length) return;
  try {
    await Deduction.insertMany(missing, { ordered: false });
  } catch (e) {
    // A duplicate name means a concurrent request seeded it first — harmless.
    // (Unordered inserts report it as code 11000, or as E11000 in the message.)
    const err = e as { code?: number; message?: string };
    if (err?.code !== 11000 && !String(err?.message ?? "").includes("E11000")) throw e;
  }
}

export async function GET(request: Request) {
  const { error } = await requireSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("active") === "1";

  try {
    await connectDB();
    await ensureBuiltIns();
    const query = activeOnly ? { isActive: true } : {};
    const deductions = await Deduction.find(query).sort({ name: 1 }).lean();
    return ok(deductions);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to load deductions", 500);
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

    const invalid = validateDeductionBody(body);
    if (invalid) return fail(invalid, 400);

    const name = String(body.name).trim();
    // Case-insensitive: "Provident Fund" and "provident fund" are one rule.
    const clash = await Deduction.findOne({
      name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });
    if (clash) return fail(`A deduction named "${name}" already exists`, 409);

    const deduction = await Deduction.create({
      name,
      percentage: Number(body.percentage),
      basis: body.basis === "basic" ? "basic" : "gross",
      maxAmount: Number(body.maxAmount) || 0,
      applicableUpToGross: Number(body.applicableUpToGross) || 0,
      isDefault: body.isDefault === true,
      isActive: body.isActive !== false,
      description:
        typeof body.description === "string" ? body.description.trim().slice(0, 300) : "",
    });

    return ok({ deduction }, 201);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to create deduction", 500);
  }
}
