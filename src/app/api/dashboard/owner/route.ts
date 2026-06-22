import { NextResponse } from "next/server";
import { fail } from "@/lib/api-response";
import { getUserFromRequest } from "@/lib/api-request-auth";
import { loadErpDataFromDb } from "@/lib/db-entities";
import { EMPTY_ERP_DATA } from "@/lib/empty-erp-data";
import { useMockDataEnabled } from "@/lib/bootstrap-meta";
import { isDbConfigured } from "@/lib/mongodb";
import { buildOwnerDashboardView } from "@/lib/owner-dashboard-data";
import { SEED_DATA } from "@/lib/seed-data";

function canViewOwnerDashboard(role?: string): boolean {
  const r = role?.toLowerCase();
  return r === "owner" || r === "admin";
}

async function loadErpData() {
  if (!isDbConfigured()) {
    return useMockDataEnabled() ? SEED_DATA : EMPTY_ERP_DATA;
  }
  return loadErpDataFromDb();
}

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return fail("Unauthorized", 401);
  if (!canViewOwnerDashboard(user.role)) {
    return fail("Forbidden", 403);
  }

  try {
    const data = await loadErpData();
    const view = buildOwnerDashboardView(data);
    return NextResponse.json({ success: true, data: view });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load owner dashboard";
    return fail(message, 500);
  }
}
