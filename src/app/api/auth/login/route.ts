import bcrypt from "bcryptjs";
import { connectDB, isDbConfigured } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getSession } from "@/lib/session";
import { ok, fail } from "@/lib/api-response";
import { resolvePermissionsForRole } from "@/lib/resolve-user-permissions";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return fail("Email and password are required", 400);
  }

  if (!isDbConfigured()) {
    return fail(
      "Database not configured. Set MONGODB_URI in .env and run npm run seed.",
      503
    );
  }

  try {
    await connectDB();
    const user = await User.findOne({ email }).lean();
    if (!user) return fail("Invalid credentials", 401);
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return fail("Invalid credentials", 401);

    if (user.requiresPasswordReset && user.passwordResetDeadline) {
      const deadline = new Date(user.passwordResetDeadline);
      if (Date.now() > deadline.getTime()) {
        return fail(
          "Your temporary password has expired. Please contact HR to receive new login credentials.",
          403
        );
      }
    }

    const permissions = await resolvePermissionsForRole(user.role);

    const session = await getSession();
    const mustResetPassword = Boolean(user.requiresPasswordReset);

    session.user = {
      id: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
      permissions,
      mustResetPassword,
    };
    session.isLoggedIn = true;
    await session.save();

    return ok({
      user: session.user,
      next: mustResetPassword ? "/reset-password" : "/select-company",
      mustResetPassword,
      passwordResetDeadline: user.passwordResetDeadline ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Login failed";
    return fail(message, 500);
  }
}
