import { ok, fail } from "@/lib/api-response";
import { requireSession, requirePermission } from "@/lib/api-auth";
import { isDbConfigured } from "@/lib/mongodb";
import { getEntityItems, updateEntityItem } from "@/lib/db-entities";
import type { PurchaseOrder } from "@/lib/entity-types";
import { canPoTransition, poTransitionError } from "@/lib/procurement-workflow";
import { notifyPoSentToVendor } from "@/lib/po-approval-notifications";

/**
 * PATCH /api/procurement/po/[id]/send — issue an approved PO to the vendor.
 * Only approved POs can be sent, so an unverified one can never reach a vendor.
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
    if (!canPoTransition(po.status, "send")) {
      return fail(poTransitionError(po.status, "send"), 409);
    }

    const updated = await updateEntityItem("purchaseOrders", id, {
      status: "sent_to_vendor",
      sentToVendorAt: new Date().toISOString(),
      sentToVendorBy: user.email,
    });

    void notifyPoSentToVendor(po, user.email);

    return ok({ updated: true, item: updated });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Send failed", 500);
  }
}
