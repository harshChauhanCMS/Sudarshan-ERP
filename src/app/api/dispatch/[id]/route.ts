import { ok, fail } from "@/lib/api-response";
import { requireSession, requirePermission } from "@/lib/api-auth";
import { getDispatchDetail } from "@/lib/dispatch-check-in-service";
import {
  getDispatchPlanEdit,
  updateDispatchPlan,
} from "@/lib/dispatch-planning-service";
import type { DispatchPlanningPayload, PlanStatus } from "@/lib/dispatch-planning-types";

const PLAN_STATUSES = new Set<PlanStatus>(["ready", "pack", "vehicle", "delayed"]);

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requirePermission(user, "dispatch", "view");
  if (permErr) return permErr;

  const { id } = await params;
  if (!id?.trim()) return fail("Dispatch id is required", 400);

  const url = new URL(request.url);
  if (url.searchParams.get("edit") === "1") {
    try {
      const edit = await getDispatchPlanEdit(id.trim());
      if (!edit) return fail("Dispatch not found", 404);
      return ok(edit);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load dispatch for edit";
      const status = message === "Database not configured" ? 503 : 500;
      return fail(message, status);
    }
  }

  try {
    const detail = await getDispatchDetail(id.trim());
    if (!detail) return fail("Dispatch not found", 404);
    return ok(detail);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load dispatch";
    const status = message === "Database not configured" ? 503 : 500;
    return fail(message, status);
  }
}

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

  const body = (await request.json().catch(() => null)) as DispatchPlanningPayload | null;
  if (!body?.sourceLocation?.trim()) return fail("sourceLocation is required", 400);
  if (!body.deliveryLocation?.trim()) return fail("deliveryLocation is required", 400);
  if (!body.dispatchDate?.trim()) return fail("dispatchDate is required", 400);
  if (!body.quantity?.trim()) return fail("quantity is required", 400);
  if (!body.planStatus || !PLAN_STATUSES.has(body.planStatus)) {
    return fail("Invalid planStatus", 400);
  }
  if (body.orderId?.trim() && /^DSP-\d+/i.test(body.orderId.trim())) {
    return fail("orderId must be a sales order (SO-…), not a dispatch number", 400);
  }

  try {
    const result = await updateDispatchPlan(id.trim(), body);
    return ok(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update dispatch";
    const status =
      message === "Database not configured"
        ? 503
        : message === "Dispatch not found"
          ? 404
          : 400;
    return fail(message, status);
  }
}
