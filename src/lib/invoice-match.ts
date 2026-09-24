import type { PurchaseOrder } from "@/lib/entity-types";
import { INVOICE_MATCH_TOLERANCE } from "@/lib/procurement-workflow";

/**
 * Line-by-line comparison of what the vendor's invoice says against what the
 * purchase order ordered. The verifier types the invoice side in; this only
 * reports where the two disagree — it never decides the outcome, which stays
 * the verifier's call.
 */

export type CheckKind = "text" | "quantity" | "money";

export type InvoiceCheck = {
  key: string;
  label: string;
  kind: CheckKind;
  poValue: string;
  invoiceValue: string;
  /** null when nothing was entered yet, so it is neither a match nor a miss. */
  matches: boolean | null;
  /** Signed difference for numeric checks — invoice minus PO. */
  diff?: number;
};

/** Quantities are typed to two decimals at most; anything finer is noise. */
const QTY_TOLERANCE = 0.01;

export type InvoiceSideValues = {
  vendorName?: string;
  materialName?: string;
  quantity?: number;
  unit?: string;
  rate?: number;
  amount?: number;
};

const clean = (v: unknown) => String(v ?? "").trim();
const sameText = (a: string, b: string) =>
  a.toLowerCase().replace(/\s+/g, " ") === b.toLowerCase().replace(/\s+/g, " ");

const money = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

function textCheck(
  key: string,
  label: string,
  poValue: string,
  invoiceValue: string,
): InvoiceCheck {
  const entered = clean(invoiceValue);
  return {
    key,
    label,
    kind: "text",
    poValue: clean(poValue) || "—",
    invoiceValue: entered || "—",
    matches: entered ? sameText(entered, clean(poValue)) : null,
  };
}

function numberCheck(
  key: string,
  label: string,
  kind: Exclude<CheckKind, "text">,
  poValue: number | undefined,
  invoiceValue: number | undefined,
  tolerance: number,
  format: (n: number) => string,
): InvoiceCheck {
  const po = Number(poValue) || 0;
  const entered =
    invoiceValue === undefined || invoiceValue === null || Number.isNaN(Number(invoiceValue))
      ? null
      : Number(invoiceValue);
  const diff = entered === null ? undefined : Math.round((entered - po) * 100) / 100;
  return {
    key,
    label,
    kind,
    poValue: format(po),
    invoiceValue: entered === null ? "—" : format(entered),
    matches: entered === null ? null : Math.abs(entered - po) <= tolerance,
    diff,
  };
}

/** Every check the verification screen shows, in reading order. */
export function buildInvoiceChecks(
  po: PurchaseOrder | null,
  invoice: InvoiceSideValues,
): InvoiceCheck[] {
  if (!po) return [];
  const qtyUnit = (n: number) => `${n.toLocaleString("en-IN")} ${po.unit ?? ""}`.trim();

  // Once part of an order has been received, the quantity to check against is
  // what is still outstanding — a second invoice covering the balance matches,
  // rather than reading as short against the original order.
  const ordered = Number(po.quantity) || 0;
  const alreadyReceived = Number(po.receivedQty) || 0;
  const outstanding =
    alreadyReceived > 0 ? Math.round(Math.max(0, ordered - alreadyReceived) * 100) / 100 : ordered;

  return [
    textCheck("vendor", "Vendor name", po.vendor ?? "", invoice.vendorName ?? ""),
    textCheck(
      "material",
      "Material / description",
      po.materialName ?? po.materialCode ?? "",
      invoice.materialName ?? "",
    ),
    numberCheck(
      "quantity",
      alreadyReceived > 0 ? "Quantity outstanding" : "Quantity",
      "quantity",
      outstanding,
      invoice.quantity,
      QTY_TOLERANCE,
      qtyUnit,
    ),
    textCheck("unit", "Unit", po.unit ?? "", invoice.unit ?? ""),
    numberCheck(
      "rate",
      "Rate",
      "money",
      Number(po.rate) || 0,
      invoice.rate,
      INVOICE_MATCH_TOLERANCE,
      money,
    ),
    numberCheck(
      "amount",
      alreadyReceived > 0 ? "Amount outstanding" : "Total amount",
      "money",
      outstanding === ordered || ordered <= 0
        ? Number(po.total) || 0
        : Math.round((Number(po.rate) || 0) * outstanding * 100) / 100,
      invoice.amount,
      INVOICE_MATCH_TOLERANCE,
      money,
    ),
  ];
}

export type CheckSummary = {
  checked: number;
  matched: number;
  differing: number;
  /** True only when every check has a value entered and all of them agree. */
  allMatch: boolean;
};

export function summarizeChecks(checks: InvoiceCheck[]): CheckSummary {
  const answered = checks.filter((c) => c.matches !== null);
  const matched = answered.filter((c) => c.matches).length;
  return {
    checked: answered.length,
    matched,
    differing: answered.length - matched,
    allMatch: answered.length === checks.length && matched === checks.length,
  };
}
