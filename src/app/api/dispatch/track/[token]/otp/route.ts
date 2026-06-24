import { ok, fail } from "@/lib/api-response";
import { OTP_EXPIRY_MS, sendDispatchDriverOtp } from "@/lib/dispatch-driver-otp-service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token?.trim()) return fail("Tracking token is required", 400);

  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim();
  if (!email) return fail("Email is required", 400);

  try {
    const result = await sendDispatchDriverOtp(token.trim(), email);
    if (!result.sent) {
      const message =
        result.reason === "email_not_configured"
          ? "Email is not configured on the server"
          : "Failed to send OTP. Try again.";
      return fail(message, 503);
    }
    const expiresMinutes = OTP_EXPIRY_MS / (60 * 1000);
    return ok({
      sent: true,
      message: `OTP sent to ${email}. It expires in ${expiresMinutes} minutes.`,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to send OTP";
    const status =
      message === "Database not configured"
        ? 503
        : message.includes("not found") || message.includes("Invalid")
          ? 404
          : 400;
    return fail(message, status);
  }
}
