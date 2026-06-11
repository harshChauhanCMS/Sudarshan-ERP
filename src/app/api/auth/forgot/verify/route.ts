import { isDbConfigured } from "@/lib/mongodb";
import { ok, fail } from "@/lib/api-response";
import { verifyForgotPasswordOtp } from "@/lib/forgot-password";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return fail(
      "Database not configured. Set MONGODB_URI in .env and run npm run seed.",
      503,
    );
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const otp = typeof body.otp === "string" ? body.otp : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  const confirmPassword =
    typeof body.confirmPassword === "string" ? body.confirmPassword : "";

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  const rl = checkRateLimit(`forgot-verify:${ip}:${email}`, 8, 15 * 60 * 1000);
  if (!rl.ok) {
    return fail(`Too many attempts. Try again in ${rl.retryAfterSec}s.`, 429);
  }

  try {
    const result = await verifyForgotPasswordOtp({
      email,
      otp,
      newPassword,
      confirmPassword,
    });

    if (!result.ok) {
      return fail(result.message, result.status);
    }

    return ok({
      reset: true,
      message: "Password updated successfully. You can sign in with your new password.",
      next: "/login",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Password reset failed";
    return fail(message, 500);
  }
}
