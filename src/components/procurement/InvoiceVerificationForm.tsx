"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { Modal, message } from "antd";
import dayjs from "dayjs";

import { Btn, fmtINRFull } from "@/components/erp/ui";
import { invoiceStatusBadge } from "@/components/common/erpStatusBadges";
import { useFormState } from "@/components/forms";
import {
  INVOICE_STATUS_LABELS,
  MANUAL_INVOICE_STATUSES,
} from "@/lib/procurement-workflow";
import { buildInvoiceChecks } from "@/lib/invoice-match";
import type { ManualVerificationPayload } from "@/lib/procurement-api";
import type { Invoice, PurchaseOrder } from "@/lib/entity-types";

/** Outcomes that reach the vendor, so the reason has to be written down. */
const NOTE_REQUIRED = ["failed", "resent_to_vendor"];

/** What confirming does, per outcome, shown with the mismatch list. */
const CONFIRM_ACTION: Record<string, { ok: string; danger: boolean; effect: string }> = {
  verified: {
    ok: "Verify anyway",
    danger: true,
    effect: "Verifying receives the quantity into inventory and closes the purchase order.",
  },
  failed: {
    ok: "Mark failed",
    danger: true,
    effect: "The vendor is sent the reason with the purchase order stamped FAILED.",
  },
  resent_to_vendor: {
    ok: "Resend to vendor",
    danger: false,
    effect: "The invoice goes back to the vendor with your note.",
  },
  pending_verification: {
    ok: "Save as pending",
    danger: false,
    effect: "The invoice stays on the queue to be checked again later.",
  },
};

const STATUS_HINT: Record<string, string> = {
  verified: "Receives the quantity into inventory and closes the purchase order.",
  failed: "Notifies the vendor with the reason so they can correct and resend.",
  resent_to_vendor: "Sends it back for correction — the note goes to the vendor.",
  pending_verification: "Parks it back on the queue to check later.",
};

function initialValues(invoice: Invoice | null) {
  const today = dayjs().format("YYYY-MM-DD");
  return {
    invoiceVendorName: invoice?.invoiceVendorName ?? "",
    vendorInvoiceNo: invoice?.vendorInvoiceNo ?? "",
    invDate: invoice?.invDate ? dayjs(invoice.invDate).format("YYYY-MM-DD") : today,
    materialName: invoice?.materialName ?? "",
    quantityReceived:
      invoice?.quantityReceived !== undefined ? String(invoice.quantityReceived) : "",
    unit: invoice?.unit ?? "",
    rate: invoice?.rate !== undefined ? String(invoice.rate) : "",
    subtotal: invoice?.subtotal !== undefined ? String(invoice.subtotal) : "",
    taxAmount: invoice?.taxAmount !== undefined ? String(invoice.taxAmount) : "",
    invAmt: invoice?.invAmt !== undefined ? String(invoice.invAmt) : "",
    challanNo: invoice?.challanNo ?? "",
    receivedDate: invoice?.receivedDate
      ? dayjs(invoice.receivedDate).format("YYYY-MM-DD")
      : today,
    status: "",
    note: "",
  };
}

const numberOrUndefined = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Blank stays blank — an empty amount is "not entered", not zero. */
function money(value: number | undefined): string {
  return value === undefined ? "" : String(round2(value));
}

/**
 * Taxable value = quantity × rate, and the invoice total = taxable value + tax.
 * They are recalculated whenever a figure above them changes, and are ordinary
 * inputs otherwise: typing over either one is kept, because the printed
 * invoice — discounts, freight, rounding — wins over the arithmetic.
 */
function deriveAmounts(values: {
  quantityReceived: string;
  rate: string;
  subtotal: string;
  taxAmount: string;
  invAmt: string;
}): { subtotal: string; invAmt: string } {
  const qty = numberOrUndefined(values.quantityReceived);
  const rate = numberOrUndefined(values.rate);
  const tax = numberOrUndefined(values.taxAmount) ?? 0;
  const subtotal =
    qty !== undefined && rate !== undefined ? round2(qty * rate) : undefined;

  if (subtotal === undefined) return { subtotal: values.subtotal, invAmt: values.invAmt };
  return { subtotal: money(subtotal), invAmt: money(round2(subtotal + tax)) };
}

export type InvoiceVerificationFormProps = {
  /** The purchase order being checked; null until one is chosen. */
  po: PurchaseOrder | null;
  /** The invoice record, when re-checking one that already exists. */
  invoice?: Invoice | null;
  /** Rendered above the form — the PO picker on the first-check screen. */
  poSelector?: ReactNode;
  readOnly?: boolean;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (payload: ManualVerificationPayload) => void | Promise<void>;
};

/**
 * The manual check: the invoice typed in from the vendor's copy, against the
 * purchase order shown alongside. Only the vendor name is checked as it is
 * typed — everything else is compared when the verifier confirms, and any
 * difference can still be accepted, because short deliveries and agreed rate
 * revisions are real.
 */
export default function InvoiceVerificationForm({
  po,
  invoice = null,
  poSelector,
  readOnly = false,
  submitting,
  onCancel,
  onSubmit,
}: InvoiceVerificationFormProps) {
  const form = useFormState(initialValues(invoice));
  const [error, setError] = useState<string | null>(null);
  /** The vendor-name toast fires on leaving the field, not on every keypress. */
  const warnedVendor = useRef("");

  const status = form.values.status;

  /**
   * Updates one amount field and refills whatever follows from it. Nothing has
   * to be clicked: the totals keep themselves current, and typing straight
   * into one simply replaces it until its inputs change again.
   */
  const setAmountField = (
    key: "quantityReceived" | "rate" | "taxAmount" | "subtotal" | "invAmt",
    value: string,
  ) => {
    form.setValues((current) => {
      const next = { ...current, [key]: value };

      // Quantity or rate moved — both figures below follow.
      if (key === "quantityReceived" || key === "rate") {
        return { ...next, ...deriveAmounts(next) };
      }
      // Tax or a hand-entered taxable value — the total follows.
      if (key === "taxAmount" || key === "subtotal") {
        const subtotal = numberOrUndefined(next.subtotal);
        const tax = numberOrUndefined(next.taxAmount) ?? 0;
        return {
          ...next,
          invAmt: subtotal === undefined ? next.invAmt : money(round2(subtotal + tax)),
        };
      }
      // The total itself was typed — nothing follows it.
      return next;
    });
  };

  const checks = useMemo(
    () =>
      buildInvoiceChecks(po, {
        vendorName: form.values.invoiceVendorName,
        materialName: form.values.materialName,
        quantity: numberOrUndefined(form.values.quantityReceived),
        unit: form.values.unit,
        rate: numberOrUndefined(form.values.rate),
        amount: numberOrUndefined(form.values.invAmt),
      }),
    [po, form.values],
  );

  const checkVendorName = () => {
    const typed = form.values.invoiceVendorName.trim();
    if (!typed || !po || warnedVendor.current === typed) return;
    warnedVendor.current = typed;
    const vendorCheck = checks.find((c) => c.key === "vendor");
    if (vendorCheck && vendorCheck.matches === false) {
      message.warning(
        `Vendor name mismatch — the purchase order is for "${po.vendor}".`,
        5,
      );
    }
  };

  const validate = (): string | null => {
    if (!po) return "Pick the purchase order this invoice is against.";
    if (!form.values.invoiceVendorName.trim()) return "Vendor name is required.";
    if (!form.values.vendorInvoiceNo.trim()) return "Vendor invoice number is required.";
    if (!form.values.materialName.trim()) return "Material / description is required.";
    if (numberOrUndefined(form.values.quantityReceived) === undefined) {
      return "Quantity is required.";
    }
    if (numberOrUndefined(form.values.invAmt) === undefined) {
      return "Invoice total is required.";
    }
    if (!form.values.status) return "Pick the verification result.";
    if (NOTE_REQUIRED.includes(form.values.status) && !form.values.note.trim()) {
      return "A note is required so the vendor knows what to correct.";
    }
    return null;
  };

  const payload = (): ManualVerificationPayload => ({
    status: form.values.status,
    invoiceVendorName: form.values.invoiceVendorName.trim(),
    materialName: form.values.materialName.trim(),
    vendorInvoiceNo: form.values.vendorInvoiceNo.trim(),
    invDate: form.values.invDate,
    receivedDate: form.values.receivedDate,
    challanNo: form.values.challanNo.trim(),
    quantityReceived: numberOrUndefined(form.values.quantityReceived),
    unit: form.values.unit.trim(),
    rate: numberOrUndefined(form.values.rate),
    subtotal: numberOrUndefined(form.values.subtotal),
    taxAmount: numberOrUndefined(form.values.taxAmount),
    invAmt: numberOrUndefined(form.values.invAmt),
    note: form.values.note.trim(),
  });

  const submit = () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      message.error(validationError);
      return;
    }
    setError(null);

    const differing = checks.filter((c) => c.matches === false);

    // Whatever the outcome, the differences against the purchase order are put
    // in front of the verifier before it is recorded — and can be accepted.
    if (differing.length > 0) {
      const action = CONFIRM_ACTION[form.values.status] ?? CONFIRM_ACTION.verified;
      Modal.confirm({
        title: `${differing.length} detail${differing.length === 1 ? "" : "s"} do not match ${po?.id}`,
        width: 560,
        okText: action.ok,
        okButtonProps: { danger: action.danger },
        cancelText: "Go back",
        content: (
          <div className="invoice-mismatch-confirm">
            <table>
              <thead>
                <tr>
                  <th>Detail</th>
                  <th>Purchase order</th>
                  <th>Invoice</th>
                </tr>
              </thead>
              <tbody>
                {differing.map((c) => (
                  <tr key={c.key}>
                    <td>{c.label}</td>
                    <td>{c.poValue}</td>
                    <td className="is-diff">{c.invoiceValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>{action.effect}</p>
          </div>
        ),
        onOk: () => onSubmit(payload()),
      });
      return;
    }

    void onSubmit(payload());
  };

  const fieldsDisabled = readOnly || submitting;

  return (
    <div className="po-create">
      {poSelector ? <div className="card po-create-picker">{poSelector}</div> : null}

      <div className="po-create-layout">
        <div className="card">
          <div className="card-head">
            <div className="card-title">Invoice details</div>
            {invoice ? invoiceStatusBadge(invoice.status) : null}
          </div>
          <div className="card-body">
            <form
              className="po-create-form"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <div className="po-create-section">
                <div className="po-create-section-title">Vendor & invoice</div>
                <div className="po-create-row-2">
                  <div className="field">
                    <label className="field-label" htmlFor="invoiceVendorName">
                      Vendor name on invoice
                    </label>
                    <input
                      id="invoiceVendorName"
                      className="input"
                      value={form.values.invoiceVendorName}
                      onChange={(e) => form.setField("invoiceVendorName", e.target.value)}
                      onBlur={checkVendorName}
                      placeholder="As printed on the invoice"
                      disabled={fieldsDisabled}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="vendorInvoiceNo">
                      Vendor invoice no.
                    </label>
                    <input
                      id="vendorInvoiceNo"
                      className="input"
                      value={form.values.vendorInvoiceNo}
                      onChange={(e) => form.setField("vendorInvoiceNo", e.target.value)}
                      placeholder="Invoice number"
                      disabled={fieldsDisabled}
                    />
                  </div>
                </div>
                <div className="po-create-row-2">
                  <div className="field">
                    <label className="field-label" htmlFor="invDate">
                      Invoice date
                    </label>
                    <input
                      id="invDate"
                      className="input"
                      type="date"
                      value={form.values.invDate}
                      onChange={(e) => form.setField("invDate", e.target.value)}
                      disabled={fieldsDisabled}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="challanNo">
                      Challan / GRN no.
                    </label>
                    <input
                      id="challanNo"
                      className="input"
                      value={form.values.challanNo}
                      onChange={(e) => form.setField("challanNo", e.target.value)}
                      placeholder="Delivery reference"
                      disabled={fieldsDisabled}
                    />
                  </div>
                </div>
              </div>

              <div className="po-create-section">
                <div className="po-create-section-title">Material & quantity</div>
                <div className="field">
                  <label className="field-label" htmlFor="materialName">
                    Material / description
                  </label>
                  <input
                    id="materialName"
                    className="input"
                    value={form.values.materialName}
                    onChange={(e) => form.setField("materialName", e.target.value)}
                    placeholder="As described on the invoice"
                    disabled={fieldsDisabled}
                  />
                </div>
                <div className="po-create-row-3">
                  <div className="field">
                    <label className="field-label" htmlFor="quantityReceived">
                      Quantity received
                    </label>
                    <input
                      id="quantityReceived"
                      className="input"
                      type="number"
                      min={0}
                      step="any"
                      value={form.values.quantityReceived}
                      onChange={(e) => setAmountField("quantityReceived", e.target.value)}
                      disabled={fieldsDisabled}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="unit">
                      Unit
                    </label>
                    <input
                      id="unit"
                      className="input"
                      value={form.values.unit}
                      onChange={(e) => form.setField("unit", e.target.value)}
                      placeholder="MT, KG, Nos…"
                      disabled={fieldsDisabled}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="receivedDate">
                      Goods received on
                    </label>
                    <input
                      id="receivedDate"
                      className="input"
                      type="date"
                      value={form.values.receivedDate}
                      onChange={(e) => form.setField("receivedDate", e.target.value)}
                      disabled={fieldsDisabled}
                    />
                  </div>
                </div>
              </div>

              <div className="po-create-section">
                <div className="po-create-section-title">Amounts</div>
                <div className="po-create-row-2">
                  <div className="field">
                    <label className="field-label" htmlFor="rate">
                      Rate (₹ per unit)
                    </label>
                    <input
                      id="rate"
                      className="input"
                      type="number"
                      min={0}
                      step="any"
                      value={form.values.rate}
                      onChange={(e) => setAmountField("rate", e.target.value)}
                      disabled={fieldsDisabled}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="subtotal">
                      Taxable value (₹)
                    </label>
                    <input
                      id="subtotal"
                      className="input"
                      type="number"
                      min={0}
                      step="any"
                      value={form.values.subtotal}
                      onChange={(e) => setAmountField("subtotal", e.target.value)}
                      disabled={fieldsDisabled}
                      placeholder="Quantity × rate"
                    />
                    <span className="field-hint">
                      Calculated as quantity × rate — you can type over it.
                    </span>
                  </div>
                </div>
                <div className="po-create-row-2">
                  <div className="field">
                    <label className="field-label" htmlFor="taxAmount">
                      Tax / GST (₹)
                    </label>
                    <input
                      id="taxAmount"
                      className="input"
                      type="number"
                      min={0}
                      step="any"
                      value={form.values.taxAmount}
                      onChange={(e) => setAmountField("taxAmount", e.target.value)}
                      disabled={fieldsDisabled}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="invAmt">
                      Invoice total (₹)
                    </label>
                    <input
                      id="invAmt"
                      className="input"
                      type="number"
                      min={0}
                      step="any"
                      value={form.values.invAmt}
                      onChange={(e) => setAmountField("invAmt", e.target.value)}
                      disabled={fieldsDisabled}
                      placeholder="Taxable value + tax"
                    />
                    <span className="field-hint">
                      Calculated as taxable value + tax — you can type over it.
                    </span>
                  </div>
                </div>
              </div>

              <div className="po-create-section">
                <div className="po-create-section-title">Verification</div>
                <div className="field">
                  <label className="field-label" htmlFor="status">
                    Verification result
                  </label>
                  <select
                    id="status"
                    className="input"
                    value={form.values.status}
                    onChange={(e) => form.setField("status", e.target.value)}
                    disabled={fieldsDisabled}
                  >
                    <option value="">Select a status</option>
                    {MANUAL_INVOICE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {INVOICE_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  {status ? (
                    // What the chosen outcome will actually do is called out
                    // rather than whispered — it sends email and moves stock.
                    <p className={`status-effect status-effect--${status}`}>
                      <span className="status-effect__icon" aria-hidden="true">
                        {status === "verified" ? "✓" : status === "pending_verification" ? "•" : "!"}
                      </span>
                      <span>{STATUS_HINT[status]}</span>
                    </p>
                  ) : (
                    <span className="field-hint">
                      You decide the outcome. Differences against the purchase
                      order are shown before anything is recorded.
                    </span>
                  )}
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="note">
                    Note{status && NOTE_REQUIRED.includes(status) ? " *" : " (optional)"}
                  </label>
                  <textarea
                    id="note"
                    className="input po-create-textarea"
                    rows={3}
                    maxLength={1000}
                    value={form.values.note}
                    onChange={(e) => form.setField("note", e.target.value)}
                    placeholder="What you checked, or what is wrong with this invoice"
                    disabled={fieldsDisabled}
                  />
                </div>
              </div>

              {error ? (
                <p style={{ color: "var(--danger)", fontSize: 12, margin: 0 }}>{error}</p>
              ) : null}

              <div className="po-create-actions">
                <Btn
                  variant="primary"
                  type="submit"
                  disabled={readOnly || submitting}
                >
                  {readOnly ? "Already verified" : submitting ? "Saving…" : "Continue"}
                </Btn>
                <Btn variant="secondary" type="button" onClick={onCancel} disabled={submitting}>
                  Cancel
                </Btn>
              </div>
            </form>
          </div>
        </div>

        <div className="po-create-side">
          <div className="card">
            <div className="card-head">
              <div className="card-title">Purchase order {po?.id ?? ""}</div>
            </div>
            <div className="card-body invoice-verify-page__po-grid">
              <div>
                <span>Vendor</span>
                <strong>{po?.vendor || "—"}</strong>
              </div>
              <div>
                <span>Material</span>
                <strong>{po?.materialName || "—"}</strong>
              </div>
              <div>
                <span>Material code</span>
                <strong>{po?.materialCode || "—"}</strong>
              </div>
              <div>
                <span>Quantity ordered</span>
                <strong>
                  {po?.quantity ?? "—"} {po?.unit ?? ""}
                </strong>
              </div>
              <div>
                <span>Rate</span>
                <strong>{fmtINRFull(Number(po?.rate) || 0)}</strong>
              </div>
              <div>
                <span>PO amount</span>
                <strong>{fmtINRFull(Number(po?.total) || 0)}</strong>
              </div>
              <div>
                <span>PO date</span>
                <strong>{po?.date || "—"}</strong>
              </div>
              <div>
                <span>Expected delivery</span>
                <strong>
                  {po?.expectedDelivery
                    ? dayjs(po.expectedDelivery).format("DD MMM YYYY")
                    : "—"}
                </strong>
              </div>
              <div>
                <span>Vendor email</span>
                <strong>{po?.vendorEmail || "Not provided"}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
