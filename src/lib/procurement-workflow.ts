/**
 * Purchase-order → vendor → invoice lifecycle.
 *
 *   create PO ─┬─ owner/admin ──────────────► approved
 *              └─ others ─► pending_verification ─┬─ approve ─► approved
 *                                                 └─ reject ──► rejected
 *   approved ─► sent_to_vendor ─┬─ vendor accepts ─► vendor_accepted
 *                               └─ vendor rejects ─► vendor_rejected
 *   vendor_accepted ─► (vendor raises invoice) ─► invoiced ─► closed
 *
 *   invoice: pending_verification ─┬─ matches ──► verified   (ready for payment)
 *                                  └─ mismatch ─► mismatch ─► (resubmit) ─┐
 *                                       ▲                                 │
 *                                       └─────────────────────────────────┘
 *
 * Both machines live here so a transition can only be expressed one way, and
 * every API route validates against the same table rather than its own ifs.
 */

// ---------------------------------------------------------------------------
// Purchase orders
// ---------------------------------------------------------------------------

export const PO_STATUSES = [
  "draft",
  "pending_verification",
  "approved",
  "rejected",
  "sent_to_vendor",
  "vendor_accepted",
  "vendor_rejected",
  "invoiced",
  /** Some of the ordered quantity has been received; the rest is outstanding. */
  "partially_received",
  /** Everything ordered has arrived, but the order has not been closed yet. */
  "fully_received",
  "closed",
] as const;

export type PoStatus = (typeof PO_STATUSES)[number];

export const PO_STATUS_LABELS: Record<PoStatus, string> = {
  draft: "Draft",
  pending_verification: "Pending verification",
  approved: "Approved",
  rejected: "Rejected",
  sent_to_vendor: "Sent to vendor",
  vendor_accepted: "Vendor accepted",
  vendor_rejected: "Vendor rejected",
  invoiced: "Invoiced",
  partially_received: "Partially received",
  fully_received: "Fully received",
  // Closed by hand once everything has been received — the order is finished.
  closed: "Completed",
};

/** Which status each PO action may move *from*. */
const PO_TRANSITIONS: Record<string, readonly PoStatus[]> = {
  approve: ["pending_verification"],
  reject: ["pending_verification"],
  // A partially received order can be re-sent for the balance, which is what
  // the resend flow does — the order keeps its number and its receipts.
  send: ["approved", "partially_received"],
  // Closing is a deliberate act by a person, never a side effect of receiving:
  // an order stays open while anything is still outstanding.
  close: ["invoiced", "fully_received"],
  vendor_accept: ["sent_to_vendor"],
  vendor_reject: ["sent_to_vendor"],
  invoice: ["vendor_accepted"],
};

export type PoAction = keyof typeof PO_TRANSITIONS;

/**
 * Seed/legacy rows predate this machine and carry statuses like "pending" or
 * "received". They are normalised on read so an old row is still actionable
 * rather than stuck in a status no transition accepts.
 */
const LEGACY_PO_STATUS: Record<string, PoStatus> = {
  pending: "pending_verification",
  submitted: "pending_verification",
  received: "invoiced",
  completed: "closed",
  partial: "partially_received",
};

export function normalizePoStatus(status: string | undefined): PoStatus {
  const raw = (status ?? "").trim();
  if ((PO_STATUSES as readonly string[]).includes(raw)) return raw as PoStatus;
  return LEGACY_PO_STATUS[raw] ?? "draft";
}

export function canPoTransition(status: string | undefined, action: PoAction): boolean {
  return PO_TRANSITIONS[action]?.includes(normalizePoStatus(status)) ?? false;
}

/** Human-readable reason a transition was refused, for the 409 body. */
export function poTransitionError(status: string | undefined, action: PoAction): string {
  const from = PO_STATUS_LABELS[normalizePoStatus(status)];
  const allowed = (PO_TRANSITIONS[action] ?? [])
    .map((s) => PO_STATUS_LABELS[s])
    .join(", ");
  return `Cannot ${action.replace("_", " ")} a purchase order that is "${from}" — allowed from: ${allowed}.`;
}

/**
 * A purchase order that can carry an invoice. Verification starts from the PO
 * itself, so every issued order qualifies — the invoice arrives whenever the
 * vendor sends it, which is not always after a formal acceptance was recorded
 * in the system. Only orders that were never issued, or were turned down, are
 * excluded.
 */
const NOT_INVOICEABLE: readonly PoStatus[] = [
  "draft",
  "rejected",
  "vendor_rejected",
  // Everything ordered has been received — a further invoice needs a new order.
  "closed",
];

export function canPoBeInvoiced(status: string | undefined): boolean {
  return !NOT_INVOICEABLE.includes(normalizePoStatus(status));
}

export function poInvoiceableError(status: string | undefined): string {
  return `A purchase order that is "${
    PO_STATUS_LABELS[normalizePoStatus(status)]
  }" cannot be invoiced.`;
}

/**
 * Where an order stands against what was ordered. Receipts are cumulative, so
 * this is derived from the total received rather than stored as an opinion.
 */
export type PoReceiptState = {
  orderedQty: number;
  receivedQty: number;
  remainingQty: number;
  /**
   * Where receiving has got to. Never "closed": receiving goods does not end
   * an order — a person closes it, once everything has arrived.
   */
  status: Extract<PoStatus, "partially_received" | "fully_received">;
  complete: boolean;
};

export function poReceiptState(orderedQty: unknown, receivedQty: unknown): PoReceiptState {
  const ordered = Math.max(0, Number(orderedQty) || 0);
  const received = Math.max(0, Number(receivedQty) || 0);
  const remaining = Math.round(Math.max(0, ordered - received) * 100) / 100;
  // An order with no quantity on it (services, legacy rows) is finished as
  // soon as anything is received against it.
  const complete = ordered <= 0 ? received > 0 : received + 0.001 >= ordered;
  return {
    orderedQty: ordered,
    receivedQty: Math.round(received * 100) / 100,
    remainingQty: remaining,
    status: complete ? "fully_received" : "partially_received",
    complete,
  };
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export const INVOICE_STATUSES = [
  "pending_verification",
  "verified",
  "failed",
  "resent_to_vendor",
  "cancelled",
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  pending_verification: "Pending",
  verified: "Verified",
  failed: "Failed",
  resent_to_vendor: "Resent to vendor",
  cancelled: "Cancelled",
};

/** The statuses a verifier may pick by hand, in the order the dropdown shows. */
export const MANUAL_INVOICE_STATUSES = [
  "verified",
  "failed",
  "resent_to_vendor",
  "pending_verification",
] as const satisfies readonly InvoiceStatus[];

const INVOICE_TRANSITIONS: Record<string, readonly InvoiceStatus[]> = {
  // Verification is done by hand against the PO, so it may also clear an
  // invoice that previously failed or went back to the vendor. It is never
  // undone: verifying receives the goods into inventory.
  verify: ["pending_verification", "failed", "resent_to_vendor"],
  // "mismatch" is the historical name of this action; the status is "failed".
  mismatch: ["pending_verification", "resent_to_vendor"],
  resend: ["pending_verification", "failed"],
  /** Park it back on the queue — used when the verifier picks "Pending". */
  hold: ["failed", "resent_to_vendor"],
  // A vendor who corrected their invoice puts it back in the queue.
  resubmit: ["failed", "resent_to_vendor"],
  cancel: ["pending_verification", "failed", "resent_to_vendor"],
};

/** Which action moves an invoice into the status a verifier picked. */
export const INVOICE_STATUS_ACTION: Record<string, InvoiceAction> = {
  verified: "verify",
  failed: "mismatch",
  resent_to_vendor: "resend",
  pending_verification: "hold",
};

export type InvoiceAction = keyof typeof INVOICE_TRANSITIONS;

/** `matched`/`awaiting` came from the pre-workflow screens. */
const LEGACY_INVOICE_STATUS: Record<string, InvoiceStatus> = {
  matched: "verified",
  approved: "verified",
  awaiting: "pending_verification",
  pending: "pending_verification",
  // "mismatch" was this status's old name — rows written before the rename
  // still carry it.
  mismatch: "failed",
  rejected: "failed",
};

export function normalizeInvoiceStatus(status: string | undefined): InvoiceStatus {
  const raw = (status ?? "").trim();
  if ((INVOICE_STATUSES as readonly string[]).includes(raw)) {
    return raw as InvoiceStatus;
  }
  return LEGACY_INVOICE_STATUS[raw] ?? "pending_verification";
}

export function canInvoiceTransition(
  status: string | undefined,
  action: InvoiceAction
): boolean {
  return INVOICE_TRANSITIONS[action]?.includes(normalizeInvoiceStatus(status)) ?? false;
}

export function invoiceTransitionError(
  status: string | undefined,
  action: InvoiceAction
): string {
  const from = INVOICE_STATUS_LABELS[normalizeInvoiceStatus(status)];
  const allowed = (INVOICE_TRANSITIONS[action] ?? [])
    .map((s) => INVOICE_STATUS_LABELS[s])
    .join(", ");
  return `Cannot ${action} an invoice that is "${from}" — allowed from: ${allowed}.`;
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

/**
 * Amounts are rupee figures entered by hand, so an exact-equality check would
 * flag rounding noise as a mismatch. One rupee of tolerance keeps the
 * suggestion useful; the verifier still makes the actual call.
 */
export const INVOICE_MATCH_TOLERANCE = 1;

export type InvoiceMatch = {
  matches: boolean;
  diff: number;
  summary: string;
};

export function compareInvoiceToPo(invAmt: number, poAmt: number): InvoiceMatch {
  const diff = Math.round((invAmt - poAmt) * 100) / 100;
  const matches = Math.abs(diff) <= INVOICE_MATCH_TOLERANCE;
  const money = (n: number) => `₹${Math.abs(n).toLocaleString("en-IN")}`;
  return {
    matches,
    diff,
    summary: matches
      ? "Invoice amount matches the purchase order."
      : `Invoice is ${money(diff)} ${diff > 0 ? "above" : "below"} the purchase order.`,
  };
}

/** Mirrors the invoice state onto `PurchaseOrder.invoice` for list columns. */
/** `partially_received` is a receiving state, so it still accepts invoices. */
/** Can this order be closed by hand right now, and if not, why not. */
export function poCloseBlockedReason(
  status: string | undefined,
  receipt: PoReceiptState,
): string | null {
  const current = normalizePoStatus(status);
  if (current === "closed") return "This purchase order is already closed.";
  if (!receipt.complete) {
    return `${receipt.remainingQty} ${"of the ordered quantity"} is still outstanding — an order is closed once everything has been received.`;
  }
  if (!canPoTransition(status, "close")) {
    return poTransitionError(status, "close");
  }
  return null;
}

export function poInvoiceColumn(status: InvoiceStatus): string {
  if (status === "verified") return "verified";
  if (status === "failed") return "failed";
  if (status === "resent_to_vendor") return "resent";
  if (status === "cancelled") return "awaiting";
  return "pending";
}
