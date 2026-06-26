import { ok, fail } from "@/lib/api-response";
import { getUserFromRequest } from "@/lib/api-request-auth";
import { loadErpDataFromDb } from "@/lib/db-entities";
import { EMPTY_ERP_DATA } from "@/lib/empty-erp-data";
import { useMockDataEnabled } from "@/lib/bootstrap-meta";
import { isDbConfigured } from "@/lib/mongodb";
import {
  buildOwnerDetailView,
  isOwnerDetailKey,
} from "@/lib/owner-dashboard-detail";
import { SEED_DATA } from "@/lib/seed-data";
import { canAccessDashboard } from "@/lib/nav-permissions";

export const dynamic = "force-dynamic";

async function loadErpData() {
  if (!isDbConfigured()) {
    return useMockDataEnabled() ? SEED_DATA : EMPTY_ERP_DATA;
  }
  return loadErpDataFromDb();
}

export async function GET(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  const user = await getUserFromRequest(request);
  if (!user) return fail("Unauthorized", 401);
  if (!canAccessDashboard(user.role)) {
    return fail("Forbidden", 403);
  }

  const { key } = await context.params;
  if (!isOwnerDetailKey(key)) {
    return fail("Unknown section", 404);
  }

  try {
    const erpData = await loadErpData();
    const view = await buildOwnerDetailView(key, erpData);
    return ok(view);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to load dashboard section";
    return fail(message, 500);
  }
}
