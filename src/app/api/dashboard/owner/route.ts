import { ok, fail } from "@/lib/api-response";
import { getUserFromRequest } from "@/lib/api-request-auth";
import { loadErpDataFromDb } from "@/lib/db-entities";
import { EMPTY_ERP_DATA } from "@/lib/empty-erp-data";
import { useMockDataEnabled } from "@/lib/bootstrap-meta";
import { isDbConfigured } from "@/lib/mongodb";
import { buildOwnerDashboardView } from "@/lib/owner-dashboard-data";
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
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");
    let referenceDate = new Date();
    if (yearParam && monthParam) {
      const year = Number(yearParam);
      const month = Number(monthParam);
      if (
        Number.isFinite(year) &&
        Number.isFinite(month) &&
        month >= 1 &&
        month <= 12
      ) {
        referenceDate = new Date(year, month - 1, 1);
      }
    }
    const view = await buildOwnerDashboardView(erpData, referenceDate);
    return ok(view);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load owner dashboard";
    return fail(message, 500);
  }
}
