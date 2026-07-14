import { ok, fail } from "@/lib/api-response";
import { requireSession, requirePermission } from "@/lib/api-auth";
import { isDbConfigured } from "@/lib/mongodb";
import { getEntityItems, updateEntityItem } from "@/lib/db-entities";
import { notifyPoDecision } from "@/lib/po-approval-notifications";

type PoItem = {
  id: string;
  vendor: string;
  total: number;
  status: string;
  createdByEmail?: string;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDbConfigured()) return fail("Database not configured", 503);

  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requirePermission(user, "procurement_po", "approve");
  if (permErr) return permErr;

  const { id } = await params;

  try {
    const items = await getEntityItems<PoItem>("purchaseOrders");
    const po = items.find((p) => p.id === id);
    if (!po) return fail("Purchase order not found", 404);
    if (po.status !== "pending_verification") {
      return fail(`Cannot approve a purchase order in status: ${po.status}`, 409);
    }

    const updated = await updateEntityItem("purchaseOrders", id, {
      status: "approved",
      verifiedBy: user.email,
      verifiedAt: new Date().toISOString(),
    });

    void notifyPoDecision(po, "approved", po.createdByEmail, user.email);

    return ok({ updated: true, item: updated });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Approve failed", 500);
  }
}
