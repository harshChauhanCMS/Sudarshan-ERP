import bcrypt from "bcryptjs";
import { connectDB, isDbConfigured } from "@/lib/mongodb";
import { User } from "@/models/User";
import { ok, fail } from "@/lib/api-response";
import {
  isAdminOrOwner,
  requirePermission,
  requireSession,
} from "@/lib/api-auth";

export async function POST(request: Request) {
  const { user, error } = await requireSession();
  if (error) return error;
  if (!isAdminOrOwner(user!.role)) {
    const permErr = requirePermission(user!, "user_management", "add");
    if (permErr) return permErr;
  }

  if (!isDbConfigured()) {
    return fail("Database not configured. Set MONGODB_URI and run npm run seed.", 503);
  }

  const body = await request.json().catch(() => ({}));
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const role = typeof body.role === "string" ? body.role.trim() : "admin";
  const employeeId =
    typeof body.employeeId === "string" ? body.employeeId.trim() : "";
  const password =
    typeof body.password === "string" && body.password.length >= 8
      ? body.password
      : "";
  if (!password) {
    return fail("Password is required (minimum 8 characters)", 400);
  }

  if (!email || !name) {
    return fail("Email and name are required", 400);
  }

  try {
    await connectDB();
    const existing = await User.findOne({ email }).lean();
    if (existing) return fail("User with this email already exists", 409);

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      name,
      role,
      employeeId: employeeId || undefined,
      passwordHash,
    });

    return ok({
      created: true,
      user: {
        id: String(user._id),
        email: user.email,
        name: user.name,
        role: user.role,
        employeeId: user.employeeId,
      },
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Create user failed", 500);
  }
}
