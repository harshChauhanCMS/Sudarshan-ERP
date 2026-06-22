import { ok, fail } from "@/lib/api-response";
import { requireSession, requirePermission } from "@/lib/api-auth";
import { getDispatchDetail } from "@/lib/dispatch-check-in-service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requirePermission(user, "dispatch", "view");
  if (permErr) return permErr;

  const { id } = await params;
  if (!id?.trim()) return fail("Dispatch id is required", 400);

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
