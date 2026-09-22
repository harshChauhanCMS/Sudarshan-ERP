import type { ErpData } from "@/lib/seed-data";
import type { Invoice, PurchaseOrder, Vendor } from "@/lib/entity-types";

/**
 * Goods-receipt history for one stock item.
 *
 * Each receipt is a verified vendor invoice: verification is the only thing
 * that adds stock, and it stamps the invoice with what it received. So the
 * history is read back off the invoices rather than kept as a second ledger
 * that could drift from them.
 */

export type InventoryReceipt = {
  invoiceId: string;
  /** The vendor's own invoice number, as typed in during verification. */
  invoiceNo: string;
  /** ISO timestamp of when the stock was added. */
  receivedAt: string;
  qty: number;
  unit: string;
  poId: string;
  vendorName: string;
  /** Present when the purchase order still exists, for the PDF. */
  po: PurchaseOrder | null;
  vendor: Vendor | null;
};

export function buildInventoryReceipts(
  materialCode: string,
  data: Pick<ErpData, "INVOICES" | "PURCHASE_ORDERS" | "VENDORS">,
): InventoryReceipt[] {
  const code = String(materialCode ?? "").trim().toUpperCase();
  if (!code) return [];

  const poById = new Map((data.PURCHASE_ORDERS ?? []).map((po) => [po.id, po]));
  const vendorByName = new Map(
    (data.VENDORS ?? []).map((v) => [v.name.trim().toLowerCase(), v]),
  );

  const receipts = (data.INVOICES ?? [])
    .filter((inv: Invoice) => {
      if (!inv.inventoryUpdated) return false;
      const stamped = String(inv.inventoryCode ?? inv.materialCode ?? "").trim().toUpperCase();
      return stamped === code;
    })
    .map((inv: Invoice) => {
      const po = poById.get(inv.po) ?? null;
      const vendorName = (po?.vendor || inv.vendor || "").trim();
      return {
        invoiceId: inv.id,
        invoiceNo: inv.vendorInvoiceNo || "",
        receivedAt: inv.inventoryUpdatedAt || inv.verifiedAt || inv.invDate || "",
        qty: Number(inv.inventoryQty ?? inv.quantityReceived ?? 0) || 0,
        unit: inv.unit || po?.unit || "",
        poId: inv.po,
        vendorName,
        po,
        vendor: vendorByName.get(vendorName.toLowerCase()) ?? null,
      };
    });

  // Newest receipt first — the last delivery is the one people look for.
  receipts.sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
  );
  return receipts;
}
