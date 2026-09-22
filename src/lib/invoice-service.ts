import {
  appendEntityItem,
  getEntityItems,
  updateEntityItem,
} from "@/lib/db-entities";
import type { Invoice, InvoiceEvent, PurchaseOrder } from "@/lib/entity-types";
import {
  canInvoiceTransition,
  canPoBeInvoiced,
  canPoTransition,
  poInvoiceableError,
  compareInvoiceToPo,
  invoiceTransitionError,
  normalizeInvoiceStatus,
  normalizePoStatus,
  poInvoiceColumn,
  poTransitionError,
  INVOICE_STATUS_ACTION,
  INVOICE_STATUS_LABELS,
  MANUAL_INVOICE_STATUSES,
  type InvoiceAction,
  type InvoiceStatus,
} from "@/lib/procurement-workflow";
import { receiveStock, type StockReceipt } from "@/lib/inventory-receipt";

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
  if (!canPoTransition(po.status, "invoice")) {
    throw new WorkflowError(poTransitionError(po.status, "invoice"), 409);
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
): Promise<{ invoice: Invoice }> {
  const existing = await findInvoice(id);
  const match = compareInvoiceToPo(
    Number(existing.invAmt) || 0,
    Number(existing.poAmt) || 0
  );

  const invoice = await transition(
    id,
    "verify",
    {
      status: "verified",
      reason: trimNote(note) || match.summary,
      verifiedAt: new Date().toISOString(),
      verifiedByEmail: actor.email,
      mismatchNote: "",
    },
    actor,
    { note: trimNote(note) }
  );

  // The PO is done once its invoice clears; the invoice column mirrors state.
  if (canPoTransition((await findPo(existing.po)).status, "close")) {
    await updateEntityItem("purchaseOrders", existing.po, {
      status: "closed",
      invoice: poInvoiceColumn("verified"),
    });
  } else {
    await updateEntityItem("purchaseOrders", existing.po, {
      invoice: poInvoiceColumn("verified"),
    });
  }

  return { invoice };
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
): Promise<{ invoice: Invoice; receipt: StockReceipt | null }> {
  const id = String(poId ?? "").trim();
  if (!id) throw new WorkflowError("poId is required", 400);

  const status = requireManualStatus(input.status);
  const po = await findPo(id);
  if (!canPoBeInvoiced(po.status)) {
    throw new WorkflowError(poInvoiceableError(po.status), 409);
  }

  const existingForPo = (await listInvoices()).find((i) => i.po === id);
  if (existingForPo) {
    throw new WorkflowError(
      `Purchase order ${id} already has invoice ${existingForPo.id}. Open that invoice to re-check it.`,
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

  // Stock first: if the receipt fails, no invoice is written and the PO is
  // left untouched, rather than recording goods that never landed.
  let receipt: StockReceipt | null = null;
  if (status === "verified") {
    const qty =
      quantityReceived !== undefined && quantityReceived > 0
        ? quantityReceived
        : Number(po.quantity) || 0;
    receipt = await receiveStock(String(po.materialCode ?? ""), qty, {
      poId: po.id,
      invoiceNo: trimNote(input.vendorInvoiceNo),
      at: new Date(now),
    });
  }

  const invoices = await listInvoices();
  const action = INVOICE_STATUS_ACTION[status];

  const invoice: Invoice = {
    id: nextInvoiceIdForPo(id, invoices),
    po: id,
    vendor: po.vendor,
    invDate: trimNote(input.invDate) || now.slice(0, 10),
    invAmt,
    poAmt,
    status,
    reason: note || match.summary,
    vendorInvoiceNo: trimNote(input.vendorInvoiceNo),
    invoiceVendorName: trimNote(input.invoiceVendorName),
    materialName: trimNote(input.materialName) || po.materialName || "",
    materialCode: po.materialCode ?? "",
    rate: optionalNumber(input.rate, "Rate"),
    subtotal: optionalNumber(input.subtotal, "Taxable value"),
    taxAmount: optionalNumber(input.taxAmount, "Tax amount"),
    quantityReceived: receipt ? receipt.qty : quantityReceived,
    unit: trimNote(input.unit) || receipt?.unit || po.unit || "",
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
      event("raised", actor, { to: status }),
      event(action, actor, { from: "pending_verification", to: status }),
    ],
    ...(receipt
      ? {
          inventoryUpdated: true,
          inventoryUpdatedAt: now,
          inventoryQty: receipt.qty,
          inventoryCode: receipt.code,
          inventoryKind: receipt.kind,
        }
      : {}),
    ...(status === "resent_to_vendor" ? { resentAt: now } : {}),
  };

  const created = (await appendEntityItem(
    "invoices",
    invoice as unknown as Record<string, unknown>
  )) as unknown as Invoice;

  // The PO goes straight to its post-invoice state: "invoiced" normally, and
  // "closed" when the invoice cleared, which is where raise-then-verify would
  // have left it.
  await updateEntityItem("purchaseOrders", id, {
    status: status === "verified" ? "closed" : "invoiced",
    invoice: poInvoiceColumn(status),
    invoiceId: created.id,
  });

  return { invoice: created, receipt };
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
): Promise<{ invoice: Invoice; receipt: StockReceipt | null }> {
  const status = requireManualStatus(input.status);
  const existing = await findInvoice(id);
  const action = INVOICE_STATUS_ACTION[status];
  if (normalizeInvoiceStatus(existing.status) === status) {
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

  // Stock moves before the status is written: if the receipt throws, the
  // invoice stays unverified rather than claiming goods that never landed.
  let receipt: StockReceipt | null = null;
  if (status === "verified" && !existing.inventoryUpdated) {
    const po = await findPo(existing.po);
    const qty =
      quantityReceived !== undefined && quantityReceived > 0
        ? quantityReceived
        : Number(po.quantity) || 0;
    const code = String(po.materialCode ?? "").trim();
    receipt = await receiveStock(code, qty, {
      poId: po.id,
      invoiceNo: (patch.vendorInvoiceNo as string) || existing.vendorInvoiceNo || "",
      at: new Date(now),
    });
    if (receipt) {
      patch.inventoryUpdated = true;
      patch.inventoryUpdatedAt = now;
      patch.inventoryQty = receipt.qty;
      patch.inventoryCode = receipt.code;
      patch.inventoryKind = receipt.kind;
      patch.materialCode = code;
      patch.materialName =
        (patch.materialName as string) || po.materialName || receipt.name;
      patch.quantityReceived = receipt.qty;
      patch.unit = patch.unit || receipt.unit;
    }
  }

  const invoice = await transition(id, action, patch, actor, { note });

  // Mirror the outcome onto the PO: a verified invoice closes it, anything
  // else just updates the invoice column.
  const po = await findPo(existing.po);
  if (status === "verified" && canPoTransition(po.status, "close")) {
    await updateEntityItem("purchaseOrders", existing.po, {
      status: "closed",
      invoice: poInvoiceColumn(status),
    });
  } else {
    await updateEntityItem("purchaseOrders", existing.po, {
      invoice: poInvoiceColumn(status),
    });
  }

  return { invoice, receipt };
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
