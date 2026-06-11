import { isDbConfigured } from "@/lib/mongodb";
import { ok, fail } from "@/lib/api-response";
import { OTP_EXPIRY_MS, sendForgotPasswordOtp } from "@/lib/forgot-password";
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

  if (!email) {
    return fail("Email is required.", 400);
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  const rl = checkRateLimit(`forgot:${ip}:${email}`, 5, 15 * 60 * 1000);
  if (!rl.ok) {
    return fail(`Too many requests. Try again in ${rl.retryAfterSec}s.`, 429);
  }

  try {
    const result = await sendForgotPasswordOtp(email);

    if (!result.sent) {
      if (result.reason === "email_not_configured") {
        return fail(
          "Email service is not configured. Contact your administrator.",
          503,
        );
      }
      return fail("Could not send verification code. Please try again.", 500);
    }

    const expiresMinutes = OTP_EXPIRY_MS / (60 * 1000);
    return ok({
      sent: true,
      message: "If an account exists for this email, a verification code was sent.",
      expiresMinutes,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to send reset code";
    return fail(message, 500);
  }
}
