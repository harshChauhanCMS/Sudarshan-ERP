import {
  appendEntityItem,
  getEntityItems,
  updateEntityItem,
} from "@/lib/db-entities";
import type { Invoice, InvoiceEvent, PurchaseOrder } from "@/lib/entity-types";
import {
  canInvoiceTransition,
  canPoTransition,
  compareInvoiceToPo,
  invoiceTransitionError,
  normalizeInvoiceStatus,
  normalizePoStatus,
  poInvoiceColumn,
  poTransitionError,
  type InvoiceAction,
} from "@/lib/procurement-workflow";

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
      status: "mismatch",
      reason,
      mismatchNote: reason,
      verifiedAt: new Date().toISOString(),
      verifiedByEmail: actor.email,
    },
    actor,
    { note: reason }
  );

  await updateEntityItem("purchaseOrders", existing.po, {
    invoice: poInvoiceColumn("mismatch"),
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
