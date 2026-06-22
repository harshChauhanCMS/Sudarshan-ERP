import { ok, fail } from "@/lib/api-response";
import { requireSession, requirePermission } from "@/lib/api-auth";
import {
  adminUpdateDispatchLocation,
  validateLocationInput,
} from "@/lib/dispatch-check-in-service";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requirePermission(user, "dispatch", "edit");
  if (permErr) return permErr;

  const { id } = await params;
  if (!id?.trim()) return fail("Dispatch id is required", 400);

  const body = (await request.json().catch(() => null)) as {
    location?: unknown;
  } | null;
  const validated = validateLocationInput(body?.location);
  if ("error" in validated) return fail(validated.error, 400);

  try {
    const result = await adminUpdateDispatchLocation(id.trim(), validated.value);
    return ok({
      dispatchId: result.dispatch.id,
      lastLocation: result.lastLocation,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update location";
    const status =
      message === "Database not configured"
        ? 503
        : message === "Dispatch not found"
          ? 404
          : 400;
    return fail(message, status);
  }
}
