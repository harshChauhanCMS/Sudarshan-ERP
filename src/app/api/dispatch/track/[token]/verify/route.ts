import { ok, fail } from "@/lib/api-response";
import { verifyDispatchDriverOtp } from "@/lib/dispatch-driver-otp-service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token?.trim()) return fail("Tracking token is required", 400);

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    otp?: string;
  } | null;

  const email = body?.email?.trim();
  const otp = body?.otp?.trim();
  if (!email) return fail("Email is required", 400);
  if (!otp) return fail("OTP is required", 400);

  try {
    const result = await verifyDispatchDriverOtp(token.trim(), email, otp);
    return ok(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to verify OTP";
    const status =
      message === "Database not configured"
        ? 503
        : message.includes("not found") || message.includes("Invalid dispatch")
          ? 404
          : 400;
    return fail(message, status);
  }
}
