import { ok, fail } from "@/lib/api-response";
import { requireSession, requirePermission } from "@/lib/api-auth";
import { isDbConfigured } from "@/lib/mongodb";
import { getEntityItems, updateEntityItem } from "@/lib/db-entities";
import type { PurchaseOrder } from "@/lib/entity-types";
import { poCloseBlockedReason, poReceiptState } from "@/lib/procurement-workflow";
import { receivedQtyForPo } from "@/lib/grn-service";

/**
 * PATCH /api/procurement/po/[id]/close — close a purchase order by hand.
 *
 * Receiving goods never closes an order on its own: an order stays open while
 * anything is outstanding, so the balance can still be invoiced and received.
 * Closing is the person's decision, once everything has arrived.
 */
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDbConfigured()) return fail("Database not configured", 503);

  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requirePermission(user, "procurement_po", "edit");
  if (permErr) return permErr;

  const { id } = await params;

  try {
    const items = await getEntityItems<PurchaseOrder>("purchaseOrders");
    const po = items.find((p) => p.id === id);
    if (!po) return fail("Purchase order not found", 404);

    // Counted from the receipts on record, not from the copy on the order, so
    // a stale figure can never let an order be closed early.
    const received = await receivedQtyForPo(po.id);
    const receipt = poReceiptState(po.quantity, received);

    const blocked = poCloseBlockedReason(po.status, receipt);
    if (blocked) return fail(blocked, 409);

    const updated = await updateEntityItem("purchaseOrders", id, {
      status: "closed",
      receivedQty: receipt.receivedQty,
      remainingQty: receipt.remainingQty,
      closedAt: new Date().toISOString(),
      closedBy: user.email,
    });

    return ok({ updated: true, item: updated });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Close failed", 500);
  }
}
