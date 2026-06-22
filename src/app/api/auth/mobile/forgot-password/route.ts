import { ok, fail } from "@/lib/api-response";
import { isDbConfigured } from "@/lib/mongodb";
import { checkRateLimit } from "@/lib/rate-limit";
import { resetPasswordWithTemporaryCredentials } from "@/lib/temporary-password-reset";

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return fail("Database not configured.", 503);
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  const rl = checkRateLimit(`mobile-forgot:${ip}:${email || "unknown"}`, 8, 15 * 60 * 1000);
  if (!rl.ok) {
    return fail(`Too many attempts. Try again in ${rl.retryAfterSec}s.`, 429);
  }

  try {
    const result = await resetPasswordWithTemporaryCredentials({
      email,
      temporaryPassword:
        typeof body.temporaryPassword === "string" ? body.temporaryPassword : "",
      newPassword: typeof body.newPassword === "string" ? body.newPassword : "",
      confirmPassword:
        typeof body.confirmPassword === "string" ? body.confirmPassword : "",
    });

    if (!result.ok) {
      return fail(result.message, result.status);
    }

    return ok({
      reset: true,
      message: "Password updated successfully. You can now sign in with your new password.",
      user: result.user,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Password reset failed";
    return fail(message, 500);
  }
}
