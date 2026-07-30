import { ok, fail } from "@/lib/api-response";
import { requireSession, requirePermission } from "@/lib/api-auth";
import { isDbConfigured } from "@/lib/mongodb";
import { getEntityItems, updateEntityItem } from "@/lib/db-entities";
import type { PurchaseOrder } from "@/lib/entity-types";
import { canPoTransition, poTransitionError } from "@/lib/procurement-workflow";
import { notifyPoVendorResponse } from "@/lib/po-approval-notifications";

/**
 * PATCH /api/procurement/po/[id]/vendor-response — record whether the vendor
 * accepted or declined the PO.
 *
 * Vendors have no login in this system, so procurement records the response on
 * their behalf after the vendor confirms out-of-band (call / email / portal).
 * That is why this is `procurement_po:edit` and not a vendor-authenticated
 * endpoint.
 *
 * Body: { accepted: boolean, note?: string }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDbConfigured()) return fail("Database not configured", 503);

  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requirePermission(user, "procurement_po", "edit");
  if (permErr) return permErr;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (typeof body?.accepted !== "boolean") {
    return fail("Body must include accepted: boolean", 400);
  }

  const note =
    typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
  if (!body.accepted && !note) {
    return fail("A note is required when the vendor declines", 400);
  }

  const action = body.accepted ? "vendor_accept" : "vendor_reject";

  try {
    const items = await getEntityItems<PurchaseOrder>("purchaseOrders");
    const po = items.find((p) => p.id === id);
    if (!po) return fail("Purchase order not found", 404);
    if (!canPoTransition(po.status, action)) {
      return fail(poTransitionError(po.status, action), 409);
    }

    const updated = await updateEntityItem("purchaseOrders", id, {
      status: body.accepted ? "vendor_accepted" : "vendor_rejected",
      vendorRespondedAt: new Date().toISOString(),
      vendorResponseNote: note,
    });

    void notifyPoVendorResponse(po, body.accepted, note, po.createdByEmail);

    return ok({ updated: true, item: updated });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Update failed", 500);
  }
}
