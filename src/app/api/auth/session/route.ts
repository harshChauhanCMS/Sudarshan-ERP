import { connectDB, isDbConfigured } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getSession } from "@/lib/session";
import { ok } from "@/lib/api-response";
import { resolvePermissionsForRole } from "@/lib/resolve-user-permissions";

export async function GET() {
  const session = await getSession();

  if (session.isLoggedIn && session.user?.email && isDbConfigured()) {
    try {
      await connectDB();
      if (session.user.role) {
        session.user.permissions = await resolvePermissionsForRole(session.user.role);
      }
      const dbUser = await User.findOne({ email: session.user.email })
        .select("requiresPasswordReset employeeId role")
        .lean();
      if (dbUser) {
        session.user.mustResetPassword = Boolean(dbUser.requiresPasswordReset);
        session.user.employeeId = dbUser.employeeId
          ? String(dbUser.employeeId)
          : undefined;
        session.user.role = dbUser.role || session.user.role;
      }
      await session.save();
    } catch {
      // Keep existing session if permission refresh fails
    }
  }

  return ok({
    isLoggedIn: session.isLoggedIn ?? false,
    user: session.user ?? null,
  });
}
