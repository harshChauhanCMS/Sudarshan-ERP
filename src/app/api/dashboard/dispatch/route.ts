import { ok, fail } from "@/lib/api-response";
import { getUserFromRequest } from "@/lib/api-request-auth";
import { loadErpDataFromDb } from "@/lib/db-entities";
import { EMPTY_ERP_DATA } from "@/lib/empty-erp-data";
import { useMockDataEnabled } from "@/lib/bootstrap-meta";
import { isDbConfigured } from "@/lib/mongodb";
import { listPackaging } from "@/lib/packaging-service";
import { buildDispatchDashboardView } from "@/lib/dispatch-dashboard-data";
import { SEED_DATA } from "@/lib/seed-data";
import { canAccessDashboard } from "@/lib/nav-permissions";

export const dynamic = "force-dynamic";

async function loadErpData() {
  if (!isDbConfigured()) {
    // Not a React hook despite the name — it reads the mock-data env flag.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useMockDataEnabled() ? SEED_DATA : EMPTY_ERP_DATA;
  }
  return loadErpDataFromDb();
}

/**
 * GET /api/dashboard/dispatch?from=YYYY-MM-DD&to=YYYY-MM-DD — every section of
 * `/dashboard/dispatch` in one aggregate, derived from ORDERS + DISPATCHES +
 * PACKAGING.
 *
 * `from`/`to` scope the "Overdue & due orders" section only; the KPI row and
 * the calendar stay anchored to today. Both are optional. Read-only; the
 * dispatch write paths live under /api/dispatch/planning.
 */
export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return fail("Unauthorized", 401);
  if (!canAccessDashboard(user.role)) return fail("Forbidden", 403);

  const { searchParams } = new URL(request.url);

  try {
    const erpData = await loadErpData();
    // Packaging lives in its own collection, not the bootstrap ErpData blob.
    const packaging = isDbConfigured() ? await listPackaging() : erpData.PACKAGING;
    const view = buildDispatchDashboardView(erpData, packaging, {
      from: searchParams.get("from"),
      to: searchParams.get("to"),
    });
    return ok(view);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to load dispatch dashboard";
    return fail(message, 500);
  }
}
