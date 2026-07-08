import { ok, fail } from "@/lib/api-response";
import { getUserFromRequest } from "@/lib/api-request-auth";
import { loadErpDataFromDb } from "@/lib/db-entities";
import { EMPTY_ERP_DATA } from "@/lib/empty-erp-data";
import { useMockDataEnabled } from "@/lib/bootstrap-meta";
import { isDbConfigured } from "@/lib/mongodb";
import { listPackaging } from "@/lib/packaging-service";
import { buildProductionDashboardView } from "@/lib/production-dashboard-data";
import { SEED_DATA } from "@/lib/seed-data";
import { canAccessDashboard } from "@/lib/nav-permissions";

export const dynamic = "force-dynamic";

async function loadErpData() {
  if (!isDbConfigured()) {
    return useMockDataEnabled() ? SEED_DATA : EMPTY_ERP_DATA;
  }
  return loadErpDataFromDb();
}

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return fail("Unauthorized", 401);
  if (!canAccessDashboard(user.role)) {
    return fail("Forbidden", 403);
  }

  try {
    const erpData = await loadErpData();
    // Packaging lives in its own collection, not the bootstrap ErpData blob.
    const packaging = isDbConfigured() ? await listPackaging() : erpData.PACKAGING;
    const view = buildProductionDashboardView(erpData, packaging);
    return ok(view);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load production dashboard";
    return fail(message, 500);
  }
}
