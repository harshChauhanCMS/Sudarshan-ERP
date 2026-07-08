import { ok, fail } from "@/lib/api-response";
import { getUserFromRequest } from "@/lib/api-request-auth";
import { loadErpDataFromDb } from "@/lib/db-entities";
import { EMPTY_ERP_DATA } from "@/lib/empty-erp-data";
import { useMockDataEnabled } from "@/lib/bootstrap-meta";
import {
  buildInventoryItemDetailView,
  buildPackagingView,
  isInventoryKind,
} from "@/lib/inventory-mobile";
import { isDbConfigured } from "@/lib/mongodb";
import { canAccessDashboard } from "@/lib/nav-permissions";
import { getPackagingByCode } from "@/lib/packaging-service";
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
  context: { params: Promise<{ kind: string; code: string }> },
) {
  const user = await getUserFromRequest(request);
  if (!user) return fail("Unauthorized", 401);
  if (!canAccessDashboard(user.role)) {
    return fail("Forbidden", 403);
  }

  const { kind, code } = await context.params;
  if (!isInventoryKind(kind)) {
    return fail("Unknown inventory type", 404);
  }

  try {
    if (kind === "packaging") {
      if (!isDbConfigured()) return fail("Item not found", 404);
      const item = await getPackagingByCode(decodeURIComponent(code).trim());
      if (!item) return fail("Item not found", 404);
      return ok(buildPackagingView(item));
    }

    const erpData = await loadErpData();
    const view = buildInventoryItemDetailView(kind, code, erpData);
    if (!view) return fail("Item not found", 404);
    return ok(view);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to load inventory item";
    return fail(message, 500);
  }
}
