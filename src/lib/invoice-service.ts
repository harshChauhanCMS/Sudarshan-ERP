import {
  appendEntityItem,
  getEntityItems,
  updateEntityItem,
} from "@/lib/db-entities";
import type { Invoice, InvoiceEvent, PurchaseOrder } from "@/lib/entity-types";
import {
  canInvoiceTransition,
  canPoBeInvoiced,
  poInvoiceableError,
  compareInvoiceToPo,
  invoiceTransitionError,
  normalizeInvoiceStatus,
  normalizePoStatus,
  poInvoiceColumn,
  poReceiptState,
  INVOICE_STATUS_ACTION,
  INVOICE_STATUS_LABELS,
  MANUAL_INVOICE_STATUSES,
  type InvoiceAction,
  type InvoiceStatus,
} from "@/lib/procurement-workflow";
import { type StockReceipt } from "@/lib/inventory-receipt";
import {
  applyGrnToStock,
  createGrnForVerifiedInvoice,
  getGrnForInvoice,
  listGrnsForPo,
  receivedQtyForPo,
  type GrnRecord,
} from "@/lib/grn-service";

export type Actor = { email: string; name?: string };

/** Thrown for business-rule failures so routes can map them to 4xx, not 500. */
export class WorkflowError extends Error {
  status: number;
  constructor(message: string, status = 409) {
    super(message);
    this.name = "WorkflowError";
    this.status = status;
  }
}

const MAX_NOTE = 1000;

function trimNote(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, MAX_NOTE) : "";
}

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : NaN;
}

function event(
  action: string,
  actor: Actor,
  extra: Partial<InvoiceEvent> = {}
): InvoiceEvent {
  return {
    action,
    at: new Date().toISOString(),
    byEmail: actor.email,
    byName: actor.name,
    ...extra,
  };
}

export async function listInvoices(): Promise<Invoice[]> {
  return getEntityItems<Invoice>("invoices");
}

export async function listPurchaseOrders(): Promise<PurchaseOrder[]> {
  return getEntityItems<PurchaseOrder>("purchaseOrders");
}

async function findInvoice(id: string): Promise<Invoice> {
  const invoices = await listInvoices();
  const invoice = invoices.find((i) => i.id === id);
  if (!invoice) throw new WorkflowError("Invoice not found", 404);
  return invoice;
}

async function findPo(id: string): Promise<PurchaseOrder> {
  const pos = await listPurchaseOrders();
  const po = pos.find((p) => p.id === id);
  if (!po) throw new WorkflowError("Purchase order not found", 404);
  return po;
}

/**
 * `INV-<PO number>-<revision>` keeps the invoice traceable to its PO by id
 * alone, which the flat entity store cannot express with a foreign key.
 */
function nextInvoiceIdForPo(poId: string, existing: Invoice[]): string {
  const base = `INV-${poId.replace(/^PO-/, "")}`;
  const taken = new Set(existing.map((i) => i.id));
  let n = 1;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export type RaiseInvoiceInput = {
  poId: string;
  invAmt: unknown;
  vendorInvoiceNo?: unknown;
  invDate?: unknown;
  notes?: unknown;
};

/**
 * Step 5 of the flow: the vendor has accepted the PO, supplied the goods and
 * raised an invoice against it. Lands in `pending_verification` — never
 * auto-verified, even when the amount matches, because someone has to confirm
 * the goods actually arrived.
 */
export async function raiseInvoiceForPo(
  input: RaiseInvoiceInput,
  actor: Actor
): Promise<{ invoice: Invoice; po: PurchaseOrder }> {
  const poId = String(input.poId ?? "").trim();
  if (!poId) throw new WorkflowError("poId is required", 400);

  const po = await findPo(poId);
  if (!canPoBeInvoiced(po.status)) {
    throw new WorkflowError(poInvoiceableError(po.status), 409);
  }

  const open = (await listInvoices()).find(
    (i) => i.po === poId && normalizeInvoiceStatus(i.status) === "pending_verification",
  );
  if (open) {
    throw new WorkflowError(
      `Invoice ${open.vendorInvoiceNo || open.id} on ${poId} is still awaiting verification. Settle it before recording another.`,
      409
    );
  }

  const invAmt = toNumber(input.invAmt);
  if (Number.isNaN(invAmt) || invAmt < 0) {
    throw new WorkflowError("invAmt must be a number ≥ 0", 400);
  }

  const invoices = await listInvoices();
  const poAmt = Number(po.total) || 0;
  const match = compareInvoiceToPo(invAmt, poAmt);
  const now = new Date().toISOString();

  const invoice: Invoice = {
    id: nextInvoiceIdForPo(poId, invoices),
    po: poId,
    vendor: po.vendor,
    invDate: trimNote(input.invDate) || now.slice(0, 10),
    invAmt,
    poAmt,
    status: "pending_verification",
    reason: match.summary,
    vendorInvoiceNo: trimNote(input.vendorInvoiceNo),
    notes: trimNote(input.notes),
    raisedAt: now,
    raisedByEmail: actor.email,
    revision: 1,
    history: [event("raised", actor, { to: "pending_verification" })],
  };

  const created = (await appendEntityItem(
    "invoices",
    invoice as unknown as Record<string, unknown>
  )) as unknown as Invoice;

  const updatedPo = (await updateEntityItem("purchaseOrders", poId, {
    status: "invoiced",
    invoice: poInvoiceColumn("pending_verification"),
    invoiceId: created.id,
  })) as unknown as PurchaseOrder;

  return { invoice: created, po: updatedPo };
}

async function transition(
  id: string,
  action: InvoiceAction,
  patch: Record<string, unknown>,
  actor: Actor,
  eventExtra: Partial<InvoiceEvent> = {}
): Promise<Invoice> {
  const invoice = await findInvoice(id);
  if (!canInvoiceTransition(invoice.status, action)) {
    throw new WorkflowError(invoiceTransitionError(invoice.status, action), 409);
  }

  const history = [
    ...(invoice.history ?? []),
    event(action, actor, {
      from: normalizeInvoiceStatus(invoice.status),
      to: patch.status as string,
      ...eventExtra,
    }),
  ];

  return (await updateEntityItem("invoices", id, {
    ...patch,
    history,
  })) as unknown as Invoice;
}

/** Invoice matches the PO → verified, ready for payment. */
export async function verifyInvoice(
  id: string,
  note: unknown,
  actor: Actor
): Promise<{ invoice: Invoice; grn: GrnRecord | null }> {
  const existing = await findInvoice(id);

  // Verification is one path, whichever screen asks for it: it raises the GRN,
  // receives the stock and advances the order. This entry point simply takes
  // the quantity already recorded on the invoice, or the whole order.
  const { invoice, grn } = await recordManualVerification(
    id,
    {
      status: "verified",
      note,
      quantityReceived: existing.quantityReceived,
      vendorInvoiceNo: existing.vendorInvoiceNo,
    },
    actor
  );

  return { invoice, grn };
}

/**
 * Invoice does not match the PO. The note is mandatory — it is the only thing
 * telling the vendor what to correct before resubmitting.
 */
export async function flagInvoiceMismatch(
  id: string,
  note: unknown,
  actor: Actor
): Promise<{ invoice: Invoice }> {
  const reason = trimNote(note);
  if (!reason) {
    throw new WorkflowError("A mismatch note is required", 400);
  }

  const existing = await findInvoice(id);
  const invoice = await transition(
    id,
    "mismatch",
    {
      status: "failed",
      reason,
      mismatchNote: reason,
      verifiedAt: new Date().toISOString(),
      verifiedByEmail: actor.email,
    },
    actor,
    { note: reason }
  );

  await updateEntityItem("purchaseOrders", existing.po, {
    invoice: poInvoiceColumn("failed"),
  });

  return { invoice };
}

/**
 * Vendor corrected a mismatched invoice and resent it. The amount may change,
 * so it is re-compared and the revision counter advances.
 */
export async function resubmitInvoice(
  id: string,
  input: { invAmt?: unknown; vendorInvoiceNo?: unknown; notes?: unknown },
  actor: Actor
): Promise<{ invoice: Invoice }> {
  const existing = await findInvoice(id);

  let invAmt = Number(existing.invAmt) || 0;
  if (input.invAmt !== undefined && input.invAmt !== null && input.invAmt !== "") {
    const parsed = toNumber(input.invAmt);
    if (Number.isNaN(parsed) || parsed < 0) {
      throw new WorkflowError("invAmt must be a number ≥ 0", 400);
    }
    invAmt = parsed;
  }

  const match = compareInvoiceToPo(invAmt, Number(existing.poAmt) || 0);
  const vendorInvoiceNo = trimNote(input.vendorInvoiceNo);

  const invoice = await transition(
    id,
    "resubmit",
    {
      status: "pending_verification",
      invAmt,
      reason: match.summary,
      notes: trimNote(input.notes) || existing.notes || "",
      ...(vendorInvoiceNo ? { vendorInvoiceNo } : {}),
      resubmittedAt: new Date().toISOString(),
      revision: (Number(existing.revision) || 1) + 1,
      mismatchNote: "",
    },
    actor,
    { note: trimNote(input.notes) }
  );

  await updateEntityItem("purchaseOrders", existing.po, {
    invoice: poInvoiceColumn("pending_verification"),
  });

  return { invoice };
}

/**
 * The receipt half of a verification: raise the GRN, move the stock, then bring
 * the purchase order's received/remaining figures up to date.
 *
 * Every step is safe to repeat. The GRN is keyed on the invoice, the stock
 * claim is atomic, and the order's totals are recomputed from the receipts on
 * record rather than incremented — so a retried or duplicated verification
 * lands on exactly the same result as the first one.
 */
async function receiveAgainstPo(
  po: PurchaseOrder,
  invoiceId: string,
  vendorInvoiceNo: string,
  receivedQty: number,
  actor: Actor,
  at: Date,
): Promise<{ grn: GrnRecord; stock: StockReceipt | null }> {
  const { grn } = await createGrnForVerifiedInvoice({
    invoiceId,
    invoiceNo: vendorInvoiceNo,
    poId: po.id,
    vendor: po.vendor,
    materialCode: String(po.materialCode ?? ""),
    materialName: String(po.materialName ?? ""),
    receivedQty,
    unit: String(po.unit ?? ""),
    rate: Number(po.rate) || 0,
    amount: Math.round((Number(po.rate) || 0) * receivedQty * 100) / 100,
    receivedAt: at,
    receivedByEmail: actor.email,
    receivedByName: actor.name ?? "",
  });

  // Returns null when this receipt's stock was already applied — by the first
  // run of an interrupted verification, or by a request that raced this one.
  const applied = await applyGrnToStock(grn.grnNo);
  const finalGrn = applied ?? grn;

  const totalReceived = await receivedQtyForPo(po.id);
  const state = poReceiptState(po.quantity, totalReceived);
  const grnNos = (await listGrnsForPo(po.id)).map((g) => g.grnNo);

  await updateEntityItem("purchaseOrders", po.id, {
    status: state.status,
    receivedQty: state.receivedQty,
    remainingQty: state.remainingQty,
    grnNos,
    lastReceivedAt: at.toISOString(),
    invoice: poInvoiceColumn("verified"),
    invoiceId,
  });

  return {
    grn: finalGrn,
    stock:
      applied && applied.stockCode
        ? {
            kind: (applied.stockKind || "rawMaterial") as StockReceipt["kind"],
            code: applied.stockCode,
            name: applied.materialName || applied.stockCode,
            qty: applied.receivedQty,
            previousStock: applied.stockPrevious ?? 0,
            newStock: applied.stockNew ?? 0,
            unit: applied.unit,
            receivedAt: applied.receivedAt,
          }
        : null,
  };
}

/** Everything the manual verification screen collects, all optional but status. */
export type ManualVerificationInput = {
  status: unknown;
  /** Vendor name and material as printed on the invoice — the match check. */
  invoiceVendorName?: unknown;
  materialName?: unknown;
  rate?: unknown;
  vendorInvoiceNo?: unknown;
  invDate?: unknown;
  invAmt?: unknown;
  subtotal?: unknown;
  taxAmount?: unknown;
  quantityReceived?: unknown;
  unit?: unknown;
  receivedDate?: unknown;
  challanNo?: unknown;
  note?: unknown;
};

function optionalNumber(value: unknown, label: string): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = toNumber(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new WorkflowError(`${label} must be a number ≥ 0`, 400);
  }
  return parsed;
}

/** Outcomes that reach the vendor, so the reason has to be recorded. */
const NOTE_REQUIRED: readonly string[] = ["failed", "resent_to_vendor"];

function requireManualStatus(value: unknown): InvoiceStatus {
  const status = String(value ?? "").trim() as InvoiceStatus;
  if (!(MANUAL_INVOICE_STATUSES as readonly string[]).includes(status)) {
    throw new WorkflowError(
      `status must be one of: ${MANUAL_INVOICE_STATUSES.join(", ")}`,
      400
    );
  }
  return status;
}

/**
 * First verification of a purchase order's invoice.
 *
 * There is no invoice record until this runs: the verifier reads the vendor's
 * paper invoice, types it in against the PO and picks the outcome, and only
 * then is the invoice raised — carrying its generated `INV-<po>-<n>` number
 * and the chosen status in one step. Verifying receives the goods into
 * inventory.
 */
export async function verifyPoInvoice(
  poId: string,
  input: ManualVerificationInput,
  actor: Actor
): Promise<{ invoice: Invoice; receipt: StockReceipt | null; grn: GrnRecord | null }> {
  const id = String(poId ?? "").trim();
  if (!id) throw new WorkflowError("poId is required", 400);

  const status = requireManualStatus(input.status);
  const po = await findPo(id);
  if (!canPoBeInvoiced(po.status)) {
    throw new WorkflowError(poInvoiceableError(po.status), 409);
  }

  // A purchase order can carry several invoices over its life — a resend, a
  // replacement for a failed one, or a second delivery against the balance.
  // What it must not carry is two invoices waiting to be checked at once.
  const poInvoices = (await listInvoices()).filter((i) => i.po === id);
  const openInvoice = poInvoices.find(
    (i) => normalizeInvoiceStatus(i.status) === "pending_verification",
  );
  if (openInvoice) {
    throw new WorkflowError(
      `Invoice ${openInvoice.vendorInvoiceNo || openInvoice.id} on ${id} is still awaiting verification. Settle it before recording another.`,
      409
    );
  }

  const note = trimNote(input.note);
  if (NOTE_REQUIRED.includes(status) && !note) {
    throw new WorkflowError(
      "A note is required so the vendor knows what to correct.",
      400
    );
  }

  const invAmt = optionalNumber(input.invAmt, "Invoice amount");
  if (invAmt === undefined) {
    throw new WorkflowError("Invoice amount is required", 400);
  }
  const quantityReceived = optionalNumber(input.quantityReceived, "Quantity received");
  const poAmt = Number(po.total) || 0;
  const match = compareInvoiceToPo(invAmt, poAmt);
  const now = new Date().toISOString();

  const action = INVOICE_STATUS_ACTION[status];

  const invoice: Invoice = {
    id: nextInvoiceIdForPo(id, poInvoices),
    po: id,
    vendor: po.vendor,
    invDate: trimNote(input.invDate) || now.slice(0, 10),
    invAmt,
    poAmt,
    // Verified is only written once the receipt behind it exists (below), so a
    // failure in between leaves an invoice still waiting rather than one that
    // claims goods nobody received.
    status: status === "verified" ? "pending_verification" : status,
    reason: note || match.summary,
    vendorInvoiceNo: trimNote(input.vendorInvoiceNo),
    invoiceVendorName: trimNote(input.invoiceVendorName),
    materialName: trimNote(input.materialName) || po.materialName || "",
    materialCode: po.materialCode ?? "",
    rate: optionalNumber(input.rate, "Rate"),
    subtotal: optionalNumber(input.subtotal, "Taxable value"),
    taxAmount: optionalNumber(input.taxAmount, "Tax amount"),
    quantityReceived,
    unit: trimNote(input.unit) || po.unit || "",
    receivedDate: trimNote(input.receivedDate),
    challanNo: trimNote(input.challanNo),
    verificationNote: note,
    mismatchNote: status === "verified" ? "" : note,
    raisedAt: now,
    raisedByEmail: actor.email,
    verifiedAt: now,
    verifiedByEmail: actor.email,
    verifiedByName: actor.name ?? "",
    revision: 1,
    history: [
      event("raised", actor, { to: "pending_verification" }),
      event(action, actor, { from: "pending_verification", to: status }),
    ],
    ...(status === "resent_to_vendor" ? { resentAt: now } : {}),
  };

  const created = (await appendEntityItem(
    "invoices",
    invoice as unknown as Record<string, unknown>
  )) as unknown as Invoice;

  if (status !== "verified") {
    await updateEntityItem("purchaseOrders", id, {
      status: "invoiced",
      invoice: poInvoiceColumn(status),
      invoiceId: created.id,
    });
    return { invoice: created, receipt: null, grn: null };
  }

  // Verified: the goods are received through a GRN, which is what moves stock
  // and what advances the order's received/remaining figures.
  const qty =
    quantityReceived !== undefined && quantityReceived > 0
      ? quantityReceived
      : Number(po.quantity) || 0;
  const received = await receiveAgainstPo(
    po,
    created.id,
    trimNote(input.vendorInvoiceNo),
    qty,
    actor,
    new Date(now),
  );

  const settled = (await updateEntityItem("invoices", created.id, {
    status: "verified",
    grnNo: received.grn.grnNo,
    grnAt: received.grn.receivedAt,
    quantityReceived: received.grn.receivedQty,
    materialCode: received.grn.materialCode,
    materialName: invoice.materialName || received.grn.materialName,
    unit: invoice.unit || received.grn.unit,
    ...(received.grn.stockCode
      ? {
          inventoryUpdated: true,
          inventoryUpdatedAt: received.grn.receivedAt,
          inventoryQty: received.grn.receivedQty,
          inventoryCode: received.grn.stockCode,
          inventoryKind: received.grn.stockKind,
        }
      : {}),
  })) as unknown as Invoice;

  return { invoice: settled, receipt: received.stock, grn: received.grn };
}

/**
 * Re-checking an invoice that already exists — one that previously failed or
 * went back to the vendor. Same manual entry, same outcomes; verifying is what
 * receives the goods, and only once.
 */
export async function recordManualVerification(
  id: string,
  input: ManualVerificationInput,
  actor: Actor
): Promise<{ invoice: Invoice; receipt: StockReceipt | null; grn: GrnRecord | null }> {
  const status = requireManualStatus(input.status);
  const existing = await findInvoice(id);
  const action = INVOICE_STATUS_ACTION[status];
  if (normalizeInvoiceStatus(existing.status) === status) {
    // Verifying an already-verified invoice is the shape a retry takes. It
    // returns the receipt that exists rather than raising a second one, so the
    // call is idempotent; any other repeat is a mistake worth reporting.
    if (status === "verified") {
      const settled = await getGrnForInvoice(existing.id);
      if (settled) return { invoice: existing, receipt: null, grn: settled };
    }
    throw new WorkflowError(
      `This invoice is already ${INVOICE_STATUS_LABELS[status]}.`,
      409
    );
  }
  if (!canInvoiceTransition(existing.status, action)) {
    throw new WorkflowError(invoiceTransitionError(existing.status, action), 409);
  }

  const note = trimNote(input.note);
  if (NOTE_REQUIRED.includes(status) && !note) {
    throw new WorkflowError(
      "A note is required so the vendor knows what to correct.",
      400
    );
  }

  const invAmt =
    optionalNumber(input.invAmt, "Invoice amount") ?? (Number(existing.invAmt) || 0);
  const poAmt = Number(existing.poAmt) || 0;
  const match = compareInvoiceToPo(invAmt, poAmt);
  const now = new Date().toISOString();

  const quantityReceived =
    optionalNumber(input.quantityReceived, "Quantity received") ??
    (typeof existing.quantityReceived === "number" ? existing.quantityReceived : undefined);

  const patch: Record<string, unknown> = {
    status,
    invAmt,
    reason: note || match.summary,
    verificationNote: note,
    verifiedAt: now,
    verifiedByEmail: actor.email,
    verifiedByName: actor.name ?? "",
    vendorInvoiceNo: trimNote(input.vendorInvoiceNo) || existing.vendorInvoiceNo || "",
    invoiceVendorName:
      trimNote(input.invoiceVendorName) || existing.invoiceVendorName || "",
    materialName: trimNote(input.materialName) || existing.materialName || "",
    rate: optionalNumber(input.rate, "Rate") ?? existing.rate,
    invDate: trimNote(input.invDate) || existing.invDate,
    subtotal: optionalNumber(input.subtotal, "Taxable value") ?? existing.subtotal,
    taxAmount: optionalNumber(input.taxAmount, "Tax amount") ?? existing.taxAmount,
    quantityReceived,
    unit: trimNote(input.unit) || existing.unit || "",
    receivedDate: trimNote(input.receivedDate) || existing.receivedDate || "",
    challanNo: trimNote(input.challanNo) || existing.challanNo || "",
    mismatchNote: status === "verified" ? "" : note,
    ...(status === "resent_to_vendor" ? { resentAt: now } : {}),
  };

  // Goods are received through a GRN, never straight into stock. The receipt
  // is raised first and everything after it is repeatable, so an interrupted
  // verification finishes itself on the next attempt instead of half-applying.
  let receipt: StockReceipt | null = null;
  let grn: GrnRecord | null = null;
  if (status === "verified") {
    const po = await findPo(existing.po);
    const qty =
      quantityReceived !== undefined && quantityReceived > 0
        ? quantityReceived
        : Number(po.quantity) || 0;
    const received = await receiveAgainstPo(
      po,
      existing.id,
      (patch.vendorInvoiceNo as string) || existing.vendorInvoiceNo || "",
      qty,
      actor,
      new Date(now),
    );
    grn = received.grn;
    receipt = received.stock;

    patch.grnNo = grn.grnNo;
    patch.grnAt = grn.receivedAt;
    patch.quantityReceived = grn.receivedQty;
    patch.materialCode = grn.materialCode;
    patch.materialName = (patch.materialName as string) || grn.materialName;
    patch.unit = patch.unit || grn.unit;
    if (grn.stockCode) {
      patch.inventoryUpdated = true;
      patch.inventoryUpdatedAt = grn.receivedAt;
      patch.inventoryQty = grn.receivedQty;
      patch.inventoryCode = grn.stockCode;
      patch.inventoryKind = grn.stockKind;
    }
  }

  const invoice = await transition(id, action, patch, actor, { note });

  // A verified invoice already had the order updated by the receipt step; any
  // other outcome only mirrors the invoice state onto the order.
  if (status !== "verified") {
    await updateEntityItem("purchaseOrders", existing.po, {
      invoice: poInvoiceColumn(status),
    });
  }

  return { invoice, receipt, grn };
}

/** Read model for the verification screen: invoice plus its PO side-by-side. */
export async function getInvoiceWithPo(id: string) {
  const invoice = await findInvoice(id);
  const pos = await listPurchaseOrders();
  const po = pos.find((p) => p.id === invoice.po) ?? null;
  return {
    invoice: { ...invoice, status: normalizeInvoiceStatus(invoice.status) },
    po: po ? { ...po, status: normalizePoStatus(po.status) } : null,
    match: compareInvoiceToPo(
      Number(invoice.invAmt) || 0,
      Number(invoice.poAmt) || 0
    ),
  };
}
