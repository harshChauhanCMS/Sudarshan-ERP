import bcrypt from "bcryptjs";
import { connectDB, isDbConfigured } from "@/lib/mongodb";
import { User } from "@/models/User";
import Employee from "@/lib/models/Employee";
import { ok, fail } from "@/lib/api-response";
import { resolvePermissionsForRole } from "@/lib/resolve-user-permissions";
import { checkRateLimit } from "@/lib/rate-limit";
import { createMobileToken } from "@/lib/mobile-auth";

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  const rl = checkRateLimit(`mobile-login:${ip}`, 10, 15 * 60 * 1000);
  if (!rl.ok) {
    return fail(`Too many login attempts. Try again in ${rl.retryAfterSec}s.`, 429);
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return fail("Email and password are required", 400);
  }

  if (!isDbConfigured()) {
    return fail(
      "Database not configured. Set MONGODB_URI in .env and run npm run seed.",
      503,
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
          403,
        );
      }
    }

    const permissions = await resolvePermissionsForRole(user.role);

    let workLocationType: string | undefined;
    if (user.employeeId) {
      const employee = await Employee.findOne({ employeeId: user.employeeId })
        .select({ workLocationType: 1 })
        .lean();
      workLocationType = employee?.workLocationType
        ? String(employee.workLocationType)
        : "Onsite";
    }

    const sessionUser = {
      id: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
      employeeId: user.employeeId ? String(user.employeeId) : undefined,
      permissions,
      mustResetPassword: Boolean(user.requiresPasswordReset),
      workLocationType,
    };

    const token = await createMobileToken(sessionUser);

    return ok({
      token,
      user: sessionUser,
      mustResetPassword: sessionUser.mustResetPassword,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Login failed";
    return fail(message, 500);
  }
}
