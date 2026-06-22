import { ok, fail } from "@/lib/api-response";
import {
  getDispatchTrackByToken,
  shareLocationFromTrackToken,
  validateLocationInput,
} from "@/lib/dispatch-check-in-service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token?.trim()) return fail("Tracking token is required", 400);

  try {
    const track = await getDispatchTrackByToken(token.trim());
    if (!track) return fail("Dispatch not found", 404);
    return ok(track);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load dispatch tracking";
    const status = message === "Database not configured" ? 503 : 500;
    return fail(message, status);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token?.trim()) return fail("Tracking token is required", 400);

  const body = (await request.json().catch(() => null)) as {
    location?: unknown;
  } | null;
  const validated = validateLocationInput(body?.location);
  if ("error" in validated) return fail(validated.error, 400);

  try {
    const result = await shareLocationFromTrackToken(token.trim(), validated.value);
    return ok({
      dispatchId: result.dispatch.id,
      lastLocation: result.lastLocation,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update location";
    const status =
      message === "Database not configured"
        ? 503
        : message.includes("not found") || message.includes("Invalid")
          ? 404
          : 400;
    return fail(message, status);
  }
}
