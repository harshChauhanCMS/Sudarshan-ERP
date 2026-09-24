import {
  getRawMaterialByCode,
  updateRawMaterialByCode,
} from "@/lib/raw-material-service";
import {
  getPackagingByCode,
  updatePackagingByCode,
} from "@/lib/packaging-service";
import {
  getSparePartByCode,
  updateSparePartByCode,
} from "@/lib/spare-part-service";

/**
 * Goods receipt: a verified vendor invoice means the material actually
 * arrived, so its quantity is added to whichever inventory holds that code.
 * A purchase order only carries `materialCode`, so the code is looked up in
 * each inventory in turn — the three code spaces do not overlap.
 */

export type InventoryKind = "rawMaterial" | "packaging" | "sparePart";

export type StockReceipt = {
  kind: InventoryKind;
  code: string;
  name: string;
  qty: number;
  previousStock: number;
  newStock: number;
  unit: string;
  /** When the receipt was recorded — same stamp written onto the item. */
  receivedAt: string;
};

const KIND_LABELS: Record<InventoryKind, string> = {
  rawMaterial: "Raw material",
  packaging: "Packaging",
  sparePart: "Spare part",
};

export function inventoryKindLabel(kind: InventoryKind): string {
  return KIND_LABELS[kind];
}

/** Where the stock came from — stamped on the item for the inventory screen. */
export type ReceiptSource = {
  poId?: string;
  /** The vendor's own invoice number, as typed in during verification. */
  invoiceNo?: string;
  /** The goods receipt this stock movement belongs to. */
  grnNo?: string;
  at?: Date;
};

/**
 * Adds `qty` to the stock of `materialCode`, and records when it arrived and
 * against which order. Returns what changed, or `null` when the code matches
 * nothing — a PO can name a material that was since deleted, and that must not
 * block the invoice from being verified.
 */
export async function receiveStock(
  materialCode: string,
  qty: number,
  source: ReceiptSource = {},
): Promise<StockReceipt | null> {
  const code = String(materialCode ?? "").trim().toUpperCase();
  const quantity = Number(qty);
  if (!code || !Number.isFinite(quantity) || quantity <= 0) return null;

  const receivedAt = source.at ?? new Date();
  const trail = {
    lastReceivedAt: receivedAt,
    lastReceivedQty: quantity,
    lastReceivedPo: source.poId ?? "",
    lastReceivedInvoiceNo: source.invoiceNo ?? "",
    lastReceivedGrn: source.grnNo ?? "",
  };

  const raw = await getRawMaterialByCode(code);
  if (raw) {
    const previousStock = Number(raw.stock) || 0;
    const newStock = round2(previousStock + quantity);
    await updateRawMaterialByCode(code, { stock: newStock, ...trail });
    return {
      kind: "rawMaterial",
      code,
      name: raw.name,
      qty: quantity,
      previousStock,
      newStock,
      unit: raw.unit,
      receivedAt: receivedAt.toISOString(),
    };
  }

  const pack = await getPackagingByCode(code);
  if (pack) {
    const previousStock = Number(pack.stock) || 0;
    const newStock = round2(previousStock + quantity);
    await updatePackagingByCode(code, { stock: newStock, ...trail });
    return {
      kind: "packaging",
      code,
      name: pack.name,
      qty: quantity,
      previousStock,
      newStock,
      unit: pack.unit,
      receivedAt: receivedAt.toISOString(),
    };
  }

  const spare = await getSparePartByCode(code);
  if (spare) {
    const previousStock = Number(spare.stock) || 0;
    const newStock = round2(previousStock + quantity);
    await updateSparePartByCode(code, { stock: newStock, ...trail });
    return {
      kind: "sparePart",
      code,
      name: spare.name,
      qty: quantity,
      previousStock,
      newStock,
      unit: spare.unit,
      receivedAt: receivedAt.toISOString(),
    };
  }

  return null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
