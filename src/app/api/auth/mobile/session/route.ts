import { ok, fail } from "@/lib/api-response";
import { getUserFromRequest } from "@/lib/api-request-auth";
import { connectDB, isDbConfigured } from "@/lib/mongodb";
import { User } from "@/models/User";
import { resolvePermissionsForRole } from "@/lib/resolve-user-permissions";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return fail("Unauthorized", 401);

  let mustResetPassword = false;
  if (isDbConfigured()) {
    try {
      await connectDB();
      const dbUser = await User.findOne({ email: user.email.trim().toLowerCase() })
        .select({ requiresPasswordReset: 1, role: 1, employeeId: 1, name: 1 })
        .lean();
      if (dbUser) {
        mustResetPassword = Boolean(dbUser.requiresPasswordReset);
        const permissions = await resolvePermissionsForRole(dbUser.role);
        return ok({
          user: {
            ...user,
            name: dbUser.name ?? user.name,
            employeeId: dbUser.employeeId ? String(dbUser.employeeId) : user.employeeId,
            permissions,
            mustResetPassword,
          },
        });
      }
    } catch {
      // fall through with token user only
    }
  }

  return ok({ user: { ...user, mustResetPassword } });
}
