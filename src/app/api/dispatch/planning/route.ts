import { ok, fail } from "@/lib/api-response";
import { requireSession, requirePermission } from "@/lib/api-auth";
import {
  createDispatchPlan,
  getDispatchPlanningOverview,
} from "@/lib/dispatch-planning-service";
import type { DispatchPlanningPayload, PlanStatus } from "@/lib/dispatch-planning-types";

const PLAN_STATUSES = new Set<PlanStatus>(["ready", "pack", "vehicle", "delayed"]);

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requirePermission(user, "dispatch", "view");
  if (permErr) return permErr;

  try {
    const data = await getDispatchPlanningOverview();
    return ok(data);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to load dispatch planning", 500);
  }
}

export async function POST(request: Request) {
  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requirePermission(user, "dispatch", "add");
  if (permErr) return permErr;

  const body = (await request.json().catch(() => null)) as DispatchPlanningPayload | null;
  if (!body?.orderId?.trim()) return fail("orderId is required", 400);
  if (!body.sourceLocation?.trim()) return fail("sourceLocation is required", 400);
  if (!body.deliveryLocation?.trim()) return fail("deliveryLocation is required", 400);
  if (!body.dispatchDate?.trim()) return fail("dispatchDate is required", 400);
  if (!body.quantity?.trim()) return fail("quantity is required", 400);
  if (!body.planStatus || !PLAN_STATUSES.has(body.planStatus)) {
    return fail("Invalid planStatus", 400);
  }

  try {
    const result = await createDispatchPlan(body);
    return ok(result, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create dispatch plan";
    const status = message === "Database not configured" ? 503 : 400;
    return fail(message, status);
  }
}
