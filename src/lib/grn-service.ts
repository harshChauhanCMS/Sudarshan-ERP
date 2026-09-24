import { connectDB } from "@/lib/mongodb";
import GrnModel from "@/lib/models/Grn";
import { receiveStock } from "@/lib/inventory-receipt";

/**
 * Goods receipts.
 *
 * A GRN is raised at exactly one moment: an invoice passing verification. The
 * rules that must hold no matter how the request arrives — retried, duplicated,
 * or racing another — are enforced by the database rather than by checks in
 * application code:
 *
 *  - one GRN per invoice, via the unique index on `invoiceId`;
 *  - one number per GRN, for all time, via the unique index on `grnNo`;
 *  - stock added at most once, via an atomic claim on `stockApplied`.
 *
 * The entity store that holds invoices and purchase orders is a
 * read-modify-write document, so it cannot take part in a transaction with
 * these writes. Instead the sequence is ordered so that it is safe to repeat:
 * the receipt is created first and everything after it is idempotent, which
 * means an interrupted verification heals itself the next time it runs.
 */

export type GrnRecord = {
  grnNo: string;
  invoiceId: string;
  invoiceNo: string;
  poId: string;
  vendor: string;
  materialCode: string;
  materialName: string;
  receivedQty: number;
  unit: string;
  rate: number;
  amount: number;
  receivedAt: string;
  receivedByEmail: string;
  receivedByName: string;
  stockApplied: boolean;
  stockCode: string;
  stockKind: string;
  stockPrevious?: number;
  stockNew?: number;
};

type GrnDoc = Record<string, unknown>;

function toRecord(doc: GrnDoc): GrnRecord {
  return {
    grnNo: String(doc.grnNo ?? ""),
    invoiceId: String(doc.invoiceId ?? ""),
    invoiceNo: String(doc.invoiceNo ?? ""),
    poId: String(doc.poId ?? ""),
    vendor: String(doc.vendor ?? ""),
    materialCode: String(doc.materialCode ?? ""),
    materialName: String(doc.materialName ?? ""),
    receivedQty: Number(doc.receivedQty) || 0,
    unit: String(doc.unit ?? ""),
    rate: Number(doc.rate) || 0,
    amount: Number(doc.amount) || 0,
    receivedAt: doc.receivedAt ? new Date(doc.receivedAt as string).toISOString() : "",
    receivedByEmail: String(doc.receivedByEmail ?? ""),
    receivedByName: String(doc.receivedByName ?? ""),
    stockApplied: Boolean(doc.stockApplied),
    stockCode: String(doc.stockCode ?? ""),
    stockKind: String(doc.stockKind ?? ""),
    stockPrevious: doc.stockPrevious as number | undefined,
    stockNew: doc.stockNew as number | undefined,
  };
}

/** `GRN-YYYY-0001`, counting within the calendar year of the receipt. */
async function nextGrnNo(year: number): Promise<string> {
  const prefix = `GRN-${year}-`;
  const latest = await GrnModel.findOne({ grnNo: { $regex: `^${prefix}` } })
    .sort({ grnNo: -1 })
    .select({ grnNo: 1 })
    .lean();
  const lastSeq = latest
    ? parseInt(String((latest as { grnNo: string }).grnNo).slice(prefix.length), 10)
    : 0;
  return `${prefix}${String((Number.isFinite(lastSeq) ? lastSeq : 0) + 1).padStart(4, "0")}`;
}

export type GrnInput = {
  invoiceId: string;
  invoiceNo?: string;
  poId: string;
  vendor?: string;
  materialCode?: string;
  materialName?: string;
  receivedQty: number;
  unit?: string;
  rate?: number;
  amount?: number;
  receivedAt?: Date;
  receivedByEmail?: string;
  receivedByName?: string;
  notes?: string;
};

export async function getGrnForInvoice(invoiceId: string): Promise<GrnRecord | null> {
  await connectDB();
  const doc = await GrnModel.findOne({ invoiceId }).lean();
  return doc ? toRecord(doc as GrnDoc) : null;
}

export async function listGrnsForPo(poId: string): Promise<GrnRecord[]> {
  await connectDB();
  const docs = await GrnModel.find({ poId }).sort({ receivedAt: 1 }).lean();
  return (docs as GrnDoc[]).map(toRecord);
}

/** Total quantity received against a purchase order, across every receipt. */
export async function receivedQtyForPo(poId: string): Promise<number> {
  const grns = await listGrnsForPo(poId);
  const total = grns.reduce((sum, grn) => sum + grn.receivedQty, 0);
  return Math.round(total * 100) / 100;
}

/**
 * The receipt for a verified invoice.
 *
 * Returns the existing one when the invoice already has a GRN — a repeated
 * verification never mints a second number, and never adds stock again.
 */
export async function createGrnForVerifiedInvoice(
  input: GrnInput,
): Promise<{ grn: GrnRecord; created: boolean }> {
  await connectDB();

  const existing = await GrnModel.findOne({ invoiceId: input.invoiceId }).lean();
  if (existing) return { grn: toRecord(existing as GrnDoc), created: false };

  const receivedAt = input.receivedAt ?? new Date();
  const payload = {
    invoiceId: input.invoiceId,
    invoiceNo: input.invoiceNo ?? "",
    poId: input.poId,
    vendor: input.vendor ?? "",
    materialCode: String(input.materialCode ?? "").trim().toUpperCase(),
    materialName: input.materialName ?? "",
    receivedQty: Math.max(0, Number(input.receivedQty) || 0),
    unit: input.unit ?? "",
    rate: Number(input.rate) || 0,
    amount: Number(input.amount) || 0,
    receivedAt,
    receivedByEmail: input.receivedByEmail ?? "",
    receivedByName: input.receivedByName ?? "",
    notes: input.notes ?? "",
  };

  // Two requests can reach this line at once, and a number can be taken
  // between reading the latest and inserting. Either collision surfaces as a
  // duplicate-key error, so it is retried rather than guessed at.
  let doc: GrnDoc | null = null;
  for (let attempt = 0; attempt < 5 && !doc; attempt += 1) {
    const grnNo = await nextGrnNo(receivedAt.getFullYear());
    try {
      const created = await GrnModel.create({ ...payload, grnNo });
      doc = created.toObject();
    } catch (e) {
      if (!isDuplicateKey(e)) throw e;
      // Lost the race on `invoiceId` — the other request's GRN is the one.
      const other = await GrnModel.findOne({ invoiceId: input.invoiceId }).lean();
      if (other) return { grn: toRecord(other as GrnDoc), created: false };
      // Lost the race on `grnNo` — take the next number and try again.
    }
  }

  if (!doc) throw new Error("Could not allocate a GRN number — please retry.");
  return { grn: toRecord(doc), created: true };
}

/**
 * Adds the received quantity to stock, once and only once for this receipt.
 *
 * The claim is atomic: the request that flips `stockApplied` from false to
 * true is the one that moves stock, and any other request — a retry, a double
 * click, a second server — gets nothing to do.
 */
export async function applyGrnToStock(grnNo: string): Promise<GrnRecord | null> {
  await connectDB();

  const claimed = await GrnModel.findOneAndUpdate(
    { grnNo, stockApplied: false },
    { $set: { stockApplied: true } },
    { new: true },
  ).lean();
  if (!claimed) return null;

  const grn = toRecord(claimed as GrnDoc);
  try {
    const receipt = await receiveStock(grn.materialCode, grn.receivedQty, {
      poId: grn.poId,
      invoiceNo: grn.invoiceNo,
      grnNo: grn.grnNo,
      at: new Date(grn.receivedAt),
    });
    if (!receipt) {
      // Nothing in inventory carries this code (it may have been deleted).
      // The receipt still stands; the claim stays taken so it is not retried
      // endlessly, and the caller reports that stock was not changed.
      return { ...grn, stockApplied: true };
    }
    const updated = await GrnModel.findOneAndUpdate(
      { grnNo },
      {
        $set: {
          stockCode: receipt.code,
          stockKind: receipt.kind,
          stockPrevious: receipt.previousStock,
          stockNew: receipt.newStock,
        },
      },
      { new: true },
    ).lean();
    return updated ? toRecord(updated as GrnDoc) : { ...grn, stockApplied: true };
  } catch (e) {
    // Releasing the claim lets the next attempt apply the stock, rather than
    // leaving a receipt whose goods never reached inventory.
    await GrnModel.updateOne({ grnNo }, { $set: { stockApplied: false } });
    throw e;
  }
}

function isDuplicateKey(e: unknown): boolean {
  return Boolean(e && typeof e === "object" && (e as { code?: number }).code === 11000);
}
