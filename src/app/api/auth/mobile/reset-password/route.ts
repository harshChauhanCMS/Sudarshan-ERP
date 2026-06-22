import { ok, fail } from "@/lib/api-response";
import { isDbConfigured } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/api-request-auth";
import { resetPasswordWithTemporaryCredentials } from "@/lib/temporary-password-reset";

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return fail("Database not configured.", 503);
  }

  const authUser = await getUserFromRequest(request);
  if (!authUser?.email) {
    return fail("You must be signed in to reset your password.", 401);
  }

  const body = await request.json().catch(() => ({}));

  try {
    const result = await resetPasswordWithTemporaryCredentials({
      email: authUser.email,
      temporaryPassword:
        typeof body.temporaryPassword === "string" ? body.temporaryPassword : "",
      newPassword: typeof body.newPassword === "string" ? body.newPassword : "",
      confirmPassword:
        typeof body.confirmPassword === "string" ? body.confirmPassword : "",
    });

    if (!result.ok) {
      return fail(result.message, result.status);
    }

    return ok({ reset: true, user: result.user });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Password reset failed";
    return fail(message, 500);
  }
}
