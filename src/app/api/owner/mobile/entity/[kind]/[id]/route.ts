import { ok, fail } from "@/lib/api-response";
import { getUserFromRequest } from "@/lib/api-request-auth";
import { loadErpDataFromDb } from "@/lib/db-entities";
import { EMPTY_ERP_DATA } from "@/lib/empty-erp-data";
import { useMockDataEnabled } from "@/lib/bootstrap-meta";
import { isDbConfigured } from "@/lib/mongodb";
import {
  buildOwnerEntityDetailView,
  isOwnerEntityKind,
} from "@/lib/owner-entity-mobile";
import { canAccessDashboard } from "@/lib/nav-permissions";
import { SEED_DATA } from "@/lib/seed-data";

export const dynamic = "force-dynamic";

async function loadErpData() {
  if (!isDbConfigured()) {
    return useMockDataEnabled() ? SEED_DATA : EMPTY_ERP_DATA;
  }
  return loadErpDataFromDb();
}

export async function GET(
  request: Request,
  context: { params: Promise<{ kind: string; id: string }> },
) {
  const user = await getUserFromRequest(request);
  if (!user) return fail("Unauthorized", 401);
  if (!canAccessDashboard(user.role)) {
    return fail("Forbidden", 403);
  }

  const { kind, id } = await context.params;
  if (!isOwnerEntityKind(kind)) {
    return fail("Unknown entity type", 404);
  }

  try {
    const erpData = await loadErpData();
    const view = await buildOwnerEntityDetailView(kind, id, erpData);
    if (!view) return fail("Record not found", 404);
    return ok(view);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to load entity details";
    return fail(message, 500);
  }
}
