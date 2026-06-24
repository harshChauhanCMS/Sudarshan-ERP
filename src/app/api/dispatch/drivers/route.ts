import { connectDB, isDbConfigured } from "@/lib/mongodb";
import { ok, fail } from "@/lib/api-response";
import Driver from "@/lib/models/Driver";
import { requireSession, requirePermission } from "@/lib/api-auth";
import { normalizeDriverPayload, validateDriverForm } from "@/lib/driver-validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requirePermission(user, "dispatch", "view");
  if (permErr) return permErr;

  if (!isDbConfigured()) return fail("Database not configured", 503);

  try {
    await connectDB();
    const drivers = await Driver.find({ status: "active" }).sort({ name: 1 }).lean();
    return ok(drivers);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to load drivers", 500);
  }
}

export async function POST(request: Request) {
  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requirePermission(user, "dispatch", "add");
  if (permErr) return permErr;

  if (!isDbConfigured()) return fail("Database not configured", 503);

  try {
    await connectDB();
    const body = await request.json().catch(() => null);
    if (!body) return fail("Invalid request body", 400);

    const validationError = validateDriverForm({
      name: String(body.name ?? ""),
      email: String(body.email ?? ""),
      mobile: String(body.mobile ?? ""),
      vehicleNumber: String(body.vehicleNumber ?? ""),
      vehicleCategory: String(body.vehicleCategory ?? ""),
    });
    if (validationError) return fail(validationError, 400);

    const { name, email, mobile, vehicleNumber, vehicleCategory } = normalizeDriverPayload({
      name: String(body.name ?? ""),
      email: String(body.email ?? ""),
      mobile: String(body.mobile ?? ""),
      vehicleNumber: String(body.vehicleNumber ?? ""),
      vehicleCategory: String(body.vehicleCategory ?? ""),
    });

    const existing = await Driver.findOne({
      $or: [{ email }, { mobile }, { vehicleNumber }],
    }).lean();
    if (existing) {
      if (existing.email === email) return fail("A driver with this email already exists", 409);
      if (existing.mobile === mobile) return fail("A driver with this mobile already exists", 409);
      if (existing.vehicleNumber === vehicleNumber) {
        return fail("A driver with this vehicle number already exists", 409);
      }
    }

    const driver = await Driver.create({
      name,
      email,
      mobile,
      vehicleNumber,
      vehicleCategory,
    });

    return ok({ driver }, 201);
  } catch (e) {
    if (e instanceof Error && e.message.includes("duplicate key")) {
      return fail("A driver with this email, mobile, or vehicle already exists", 409);
    }
    return fail(e instanceof Error ? e.message : "Failed to save driver", 500);
  }
}
