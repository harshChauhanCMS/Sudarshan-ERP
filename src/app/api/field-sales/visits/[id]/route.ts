import { ok, fail } from "@/lib/api-response";
import { getUserFromRequest } from "@/lib/api-request-auth";
import {
  acceptFieldVisit,
  cancelFieldVisit,
  completeFieldVisit,
} from "@/lib/field-visit-service";
import type { FieldVisitLocation } from "@/lib/field-visit-types";

export const dynamic = "force-dynamic";

function parseLocation(raw: unknown): FieldVisitLocation | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const loc = raw as Record<string, unknown>;
  const lat = Number(loc.lat);
  const lng = Number(loc.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  return {
    lat,
    lng,
    accuracy: Number.isFinite(Number(loc.accuracy)) ? Number(loc.accuracy) : undefined,
    address: typeof loc.address === "string" ? loc.address : undefined,
    city: typeof loc.city === "string" ? loc.city : undefined,
    state: typeof loc.state === "string" ? loc.state : undefined,
  };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request);
  if (!user) return fail("Unauthorized", 401);

  const { id } = await params;
  if (!id?.trim()) return fail("Visit id is required", 400);

  const body = (await request.json().catch(() => null)) as {
    action?: string;
    reason?: string;
    notes?: string;
    location?: unknown;
  } | null;

  const action = body?.action?.trim();
  if (!action) return fail("action is required", 400);

  try {
    if (action === "accept") {
      const visit = await acceptFieldVisit(
        id,
        { email: user.email, employeeId: user.employeeId },
        parseLocation(body?.location)
      );
      return ok(visit);
    }
    if (action === "complete") {
      const visit = await completeFieldVisit(id, { email: user.email }, body?.notes);
      return ok(visit);
    }
    if (action === "cancel") {
      const visit = await cancelFieldVisit(
        id,
        { email: user.email },
        body?.reason ?? ""
      );
      return ok(visit);
    }
    return fail("Invalid action", 400);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update visit", 400);
  }
}
