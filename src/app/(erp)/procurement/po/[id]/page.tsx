"use client";

import { use, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Modal, Spin, Tag, Tooltip, message } from "antd";
import dayjs from "dayjs";

import { DashHead } from "@/components/erp/dashboards";
import { Btn, fmtINRFull } from "@/components/erp/ui";
import {
  erpStatusBadge,
  invoiceStatusBadge,
} from "@/components/common/erpStatusBadges";
import { usePurchaseOrders } from "@/hooks/use-purchase-orders";
import { useVendors } from "@/hooks/use-vendors";
import { useInvoices } from "@/hooks/use-invoices";
import { closePurchaseOrder, sendPoToVendor } from "@/lib/procurement-api";
import { loadPoLogo, type PoPdfInput } from "@/lib/po-pdf";
import PoPdfPreview from "@/components/procurement/PoPdfPreview";
import InvoicePdfPreview from "@/components/procurement/InvoicePdfPreview";
import type { InvoicePdfInput } from "@/lib/invoice-pdf";
import {
  INVOICE_STATUS_LABELS,
  PO_STATUS_LABELS,
  canPoTransition,
  normalizeInvoiceStatus,
  normalizePoStatus,
  poCloseBlockedReason,
  poReceiptState,
} from "@/lib/procurement-workflow";
import type { Invoice, InvoiceEvent } from "@/lib/entity-types";

const LIST = "/procurement/po";

function fmtDate(value?: string) {
  if (!value) return "—";
  const d = dayjs(value);
  return d.isValid() ? d.format("DD MMM YYYY") : value;
}

function fmtDateTime(value?: string) {
  if (!value) return "—";
  const d = dayjs(value);
  return d.isValid() ? d.format("DD MMM YYYY, hh:mm A") : value;
}

/** Plain-English name for each recorded invoice event. */
const EVENT_LABELS: Record<string, string> = {
  raised: "Invoice raised",
  verify: "Verified",
  mismatch: "Marked failed",
  resend: "Resent to vendor",
  hold: "Put back to pending",
  resubmit: "Corrected and resubmitted",
  cancel: "Cancelled",
};

function Section({
  title,
  meta,
  children,
  flush,
}: {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  flush?: boolean;
}) {
  return (
    <section className="card po-detail__section">
      <div className="card-head">
        <div className="card-title">{title}</div>
        {meta}
      </div>
      <div className="card-body" style={flush ? { padding: 0 } : undefined}>
        {children}
      </div>
    </section>
  );
}

/** One headline figure, with a colour strip naming what it is. */
function SummaryTile({
  tone,
  label,
  value,
  unit,
}: {
  tone: "value" | "ordered" | "received" | "remaining" | "status" | "danger" | "muted";
  label: string;
  value: ReactNode;
  unit?: string;
}) {
  return (
    <div className={`po-detail__tile po-detail__tile--${tone}`}>
      <span className="po-detail__tile-label">{label}</span>
      <span className="po-detail__tile-value">
        {value}
        {unit ? <em>{unit}</em> : null}
      </span>
    </div>
  );
}

function Fields({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <div className="po-detail__fields">
      {items.map((f) => (
        <div key={f.label}>
          <span className="subtle">{f.label}</span>
          <span>{f.value ?? "—"}</span>
        </div>
      ))}
    </div>
  );
}

export default function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { purchaseOrders, loading, reload } = usePurchaseOrders();
  const { items: vendors } = useVendors();
  const { invoices, loading: invoicesLoading } = useInvoices();
  const [preview, setPreview] = useState<PoPdfInput | null>(null);
  const [invoicePreview, setInvoicePreview] = useState<InvoicePdfInput | null>(null);
  const [opening, setOpening] = useState(false);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);

  const po = useMemo(
    () => purchaseOrders.find((p) => p.id === id) ?? null,
    [purchaseOrders, id],
  );
  const vendor = useMemo(
    () => (po ? vendors.find((v) => v.name === po.vendor) ?? null : null),
    [vendors, po],
  );

  /** An order takes another invoice while it is open and none is pending. */
  const canAddInvoice = useMemo(() => {
    if (!po || normalizePoStatus(po.status) === "closed") return false;
    return !invoices.some(
      (inv) => inv.po === id && normalizeInvoiceStatus(inv.status) === "pending_verification",
    );
  }, [po, invoices, id]);

  /** Every invoice raised against this order, newest first. */
  const poInvoices = useMemo(() => {
    return invoices
      .filter((inv) => inv.po === id)
      .map((inv) => ({ ...inv, status: normalizeInvoiceStatus(inv.status) }))
      .sort(
        (a, b) =>
          new Date(b.raisedAt ?? b.invDate ?? 0).getTime() -
          new Date(a.raisedAt ?? a.invDate ?? 0).getTime(),
      );
  }, [invoices, id]);

  /** Ordered / received / remaining, from the receipts actually recorded. */
  const receiptState = useMemo(
    () => poReceiptState(po?.quantity, po?.receivedQty),
    [po?.quantity, po?.receivedQty],
  );

  const openInvoiceDoc = async (invoice: Invoice) => {
    try {
      setInvoicePreview({
        invoice,
        po,
        vendor,
        logoDataUrl: await loadPoLogo(),
      });
    } catch {
      message.error("Could not generate the invoice document.");
    }
  };

  const openPdf = async () => {
    if (!po) return;
    setOpening(true);
    try {
      setPreview({ po, vendor, logoDataUrl: await loadPoLogo() });
    } catch {
      message.error("Could not generate the purchase order PDF.");
    } finally {
      setOpening(false);
    }
  };

  /**
   * The document that belongs to one invoice: this order, and — when the
   * invoice failed — the same order stamped FAILED with the reason, which is
   * exactly what the vendor was sent.
   */
  const openInvoicePdf = async (invoice: Invoice) => {
    if (!po) return;
    try {
      setPreview({
        po,
        vendor,
        logoDataUrl: await loadPoLogo(),
        ...(invoice.status === "failed"
          ? {
              failure: {
                reason: invoice.verificationNote || invoice.mismatchNote || invoice.reason || "",
                invoiceRef: invoice.vendorInvoiceNo || invoice.id,
                at: invoice.verifiedAt ? new Date(invoice.verifiedAt) : undefined,
              },
            }
          : {}),
      });
    } catch {
      message.error("Could not generate the PDF.");
    }
  };

  /** Closing is manual: everything received, and someone signs it off. */
  const closeBlocked = po ? poCloseBlockedReason(po.status, receiptState) : "Loading…";

  const handleClose = () => {
    if (!po) return;
    Modal.confirm({
      title: `Close purchase order ${po.id}?`,
      content: `All ${receiptState.receivedQty} ${po.unit ?? ""} ordered have been received. Closing it stops any further invoice being recorded against this order.`,
      okText: "Close purchase order",
      cancelText: "Keep open",
      onOk: async () => {
        setClosing(true);
        try {
          await closePurchaseOrder(po.id);
          message.success(`${po.id} closed.`);
          await reload();
        } catch (e) {
          message.error(e instanceof Error ? e.message : "Could not close the purchase order");
          throw e;
        } finally {
          setClosing(false);
        }
      },
    });
  };

  const handleSend = async () => {
    if (!po) return;
    setSending(true);
    try {
      await sendPoToVendor(po.id);
      message.success("Purchase order sent to vendor.");
      await reload();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to send purchase order");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!po) {
    return (
      <>
        <DashHead title="Purchase order" sub={id} />
        <div className="card" style={{ padding: 32, textAlign: "center" }}>
          <p className="danger">Purchase order not found.</p>
          <Btn variant="secondary" size="sm" onClick={() => router.push(LIST)}>
            Back to purchase orders
          </Btn>
        </div>
      </>
    );
  }

  const status = normalizePoStatus(po.status);
  const qty = Number(po.quantity) || 0;

  return (
    <>
      <DashHead
        title={`Purchase order ${po.id}`}
        sub={`${po.vendor} · ${PO_STATUS_LABELS[status]}`}
      >
        <Btn variant="secondary" size="sm" icon="menu" onClick={() => router.push(LIST)}>
          Purchase orders
        </Btn>
        <Btn size="sm" icon="download" onClick={() => void openPdf()} disabled={opening}>
          {opening ? "Opening…" : "View PDF"}
        </Btn>
        {canPoTransition(po.status, "send") ? (
          <Btn size="sm" icon="send" onClick={() => void handleSend()} disabled={sending}>
            {sending ? "Sending…" : "Send to vendor"}
          </Btn>
        ) : null}
        {canAddInvoice ? (
          <Btn
            size="sm"
            icon="plus"
            onClick={() =>
              router.push(`/procurement/invoices/new?po=${encodeURIComponent(po.id)}`)
            }
          >
            New invoice
          </Btn>
        ) : null}
        {normalizePoStatus(po.status) !== "closed" ? (
          <Tooltip title={closeBlocked ?? "Close this purchase order"}>
            <span>
              <Btn
                variant="primary"
                size="sm"
                icon="check"
                onClick={handleClose}
                disabled={Boolean(closeBlocked) || closing}
              >
                {closing ? "Closing…" : "Close PO"}
              </Btn>
            </span>
          </Tooltip>
        ) : null}
      </DashHead>

      {/* Headline figures, so the order reads at a glance. */}
      {/* Each tile carries a colour strip for what it says: money, quantities
          ordered and received, what is still outstanding, and where the order
          and its invoice stand. */}
      <div className="po-detail__summary">
        <SummaryTile tone="value" label="Order value" value={fmtINRFull(po.total)} />
        <SummaryTile
          tone="ordered"
          label="Ordered"
          value={qty ? String(qty) : "—"}
          unit={po.unit}
        />
        <SummaryTile
          tone={receiptState.receivedQty > 0 ? "received" : "muted"}
          label="Received"
          value={String(receiptState.receivedQty)}
          unit={po.unit}
        />
        <SummaryTile
          tone={receiptState.remainingQty > 0 ? "remaining" : "received"}
          label="Remaining"
          value={String(receiptState.remainingQty)}
          unit={po.unit}
        />
        <SummaryTile
          tone={
            status === "closed"
              ? "received"
              : status === "partially_received"
                ? "remaining"
                : "status"
          }
          label="PO status"
          value={erpStatusBadge(status)}
        />
        <SummaryTile
          tone={
            po.invoice === "verified"
              ? "received"
              : po.invoice === "failed"
                ? "danger"
                : "status"
          }
          label="Invoice"
          value={erpStatusBadge(po.invoice)}
        />
        <SummaryTile
          tone="muted"
          label="Expected delivery"
          value={fmtDate(po.expectedDelivery)}
        />
      </div>

      <div className="po-detail__grid">
        <Section title="Order">
          <Fields
            items={[
              { label: "PO number", value: <span className="mono strong">{po.id}</span> },
              { label: "PO date", value: fmtDate(po.poDate || po.date) },
              { label: "Material", value: po.materialName || "—" },
              { label: "Material code", value: <span className="mono">{po.materialCode || "—"}</span> },
              { label: "Grade", value: po.grade || "—" },
              { label: "Quantity", value: qty ? `${qty} ${po.unit ?? ""}`.trim() : "—" },
              { label: "Rate", value: po.rate != null ? fmtINRFull(po.rate) : "—" },
              { label: "Total", value: <strong>{fmtINRFull(po.total)}</strong> },
              { label: "Delivery location", value: po.deliveryLocation || "—" },
              { label: "Notes", value: po.notes || "—" },
            ]}
          />
        </Section>

        <Section title="Vendor">
          <Fields
            items={[
              { label: "Vendor", value: vendor?.name || po.vendor },
              { label: "Contact person", value: vendor?.contactPerson || "—" },
              { label: "Phone", value: vendor?.phone || "—" },
              { label: "Email", value: po.vendorEmail || vendor?.email || "—" },
              { label: "GSTIN", value: vendor?.gstin || "—" },
              { label: "Payment terms", value: vendor?.paymentTerms || "—" },
              { label: "Address", value: vendor?.address || "—" },
            ]}
          />
        </Section>
      </div>

      {/* ── Invoices raised against this order ───────────────────────────── */}
      <Section
        title="Invoice history"
        meta={
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="muted" style={{ fontSize: 11 }}>
              {invoicesLoading
                ? "Loading…"
                : poInvoices.length
                  ? `${poInvoices.length} invoice${poInvoices.length === 1 ? "" : "s"} against this order`
                  : "No invoice raised yet"}
            </span>
            {canAddInvoice && poInvoices.length ? (
              <Btn
                size="sm"
                variant="secondary"
                icon="plus"
                onClick={() =>
                  router.push(`/procurement/invoices/new?po=${encodeURIComponent(po.id)}`)
                }
              >
                {receiptState.remainingQty > 0
                  ? `Invoice the balance (${receiptState.remainingQty} ${po.unit ?? ""})`
                  : "New invoice"}
              </Btn>
            ) : null}
          </span>
        }
      >
        {poInvoices.length ? (
          <div className="po-invoices">
            {poInvoices.map((inv) => (
              <InvoiceCard
                key={inv.id}
                invoice={inv}
                poTotal={Number(po.total) || 0}
                onViewPdf={() => void openInvoicePdf(inv)}
                onViewInvoiceDoc={() => void openInvoiceDoc(inv)}
              />
            ))}
          </div>
        ) : (
          <div className="po-invoices__empty">
            <p className="muted" style={{ margin: 0 }}>
              No invoice has been recorded for this order. The invoice number is
              generated when it is verified.
            </p>
            <Btn
              size="sm"
              variant="primary"
              onClick={() =>
                router.push(`/procurement/invoices/new?po=${encodeURIComponent(po.id)}`)
              }
            >
              Verify invoice
            </Btn>
          </div>
        )}
      </Section>

      <PoPdfPreview
        input={preview}
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
      />
      <InvoicePdfPreview
        input={invoicePreview}
        open={Boolean(invoicePreview)}
        onClose={() => setInvoicePreview(null)}
      />
    </>
  );
}

/** One invoice against the order, with every event recorded on it. */
function InvoiceCard({
  invoice,
  poTotal,
  onViewPdf,
  onViewInvoiceDoc,
}: {
  invoice: Invoice;
  poTotal: number;
  onViewPdf: () => void;
  onViewInvoiceDoc: () => void;
}) {
  const router = useRouter();
  const diff = (Number(invoice.invAmt) || 0) - poTotal;
  const events = [...(invoice.history ?? [])].sort(
    (a: InvoiceEvent, b: InvoiceEvent) =>
      new Date(b.at).getTime() - new Date(a.at).getTime(),
  );

  return (
    <article className="po-invoice">
      <header className="po-invoice__head">
        <div>
          <div className="po-invoice__no mono">
            {invoice.vendorInvoiceNo || "No invoice number"}
          </div>
          <div className="muted" style={{ fontSize: 11 }}>
            Recorded {fmtDateTime(invoice.raisedAt)}
          </div>
        </div>
        <div className="po-invoice__head-right">
          {/* A GRN exists only for a verified invoice, so it is shown only then. */}
          {invoice.grnNo ? (
            <Tag color="green" style={{ margin: 0, fontWeight: 700 }}>
              {invoice.grnNo}
            </Tag>
          ) : null}
          {invoiceStatusBadge(invoice.status)}
        </div>
      </header>

      <div className="po-invoice__grid">
        <div>
          <span className="subtle">Invoice date</span>
          <span>{fmtDate(invoice.invDate)}</span>
        </div>
        <div>
          <span className="subtle">Invoice amount</span>
          <span>{fmtINRFull(Number(invoice.invAmt) || 0)}</span>
        </div>
        <div>
          <span className="subtle">Difference vs PO</span>
          <span className={Math.abs(diff) >= 1 ? "danger" : ""}>
            {Math.abs(diff) < 1
              ? "—"
              : `${diff > 0 ? "+" : "−"}₹${Math.abs(diff).toLocaleString("en-IN")}`}
          </span>
        </div>
        <div>
          <span className="subtle">GRN number</span>
          <span className={invoice.grnNo ? "mono strong" : "muted"}>
            {invoice.grnNo || "Not generated"}
          </span>
        </div>
        <div>
          <span className="subtle">Quantity received</span>
          <span>
            {invoice.quantityReceived != null
              ? `${invoice.quantityReceived} ${invoice.unit ?? ""}`.trim()
              : "—"}
          </span>
        </div>
        <div>
          <span className="subtle">Taxable / tax</span>
          <span>
            {invoice.subtotal != null ? fmtINRFull(invoice.subtotal) : "—"}
            {invoice.taxAmount != null ? ` + ${fmtINRFull(invoice.taxAmount)}` : ""}
          </span>
        </div>
        <div>
          <span className="subtle">Challan / GRN</span>
          <span>{invoice.challanNo || "—"}</span>
        </div>
        <div>
          <span className="subtle">Verified by</span>
          <span>{invoice.verifiedByName || invoice.verifiedByEmail || "—"}</span>
        </div>
        <div>
          <span className="subtle">Verified at</span>
          <span>{fmtDateTime(invoice.verifiedAt)}</span>
        </div>
      </div>

      {invoice.verificationNote || invoice.reason ? (
        <p className="po-invoice__note">{invoice.verificationNote || invoice.reason}</p>
      ) : null}

      {invoice.inventoryUpdated ? (
        <p className="po-invoice__stock">
          {invoice.inventoryQty} {invoice.unit} added to{" "}
          <span className="mono">{invoice.inventoryCode}</span> on{" "}
          {fmtDate(invoice.inventoryUpdatedAt)}
        </p>
      ) : null}

      {events.length ? (
        <ol className="po-invoice__timeline">
          {events.map((event, i) => (
            <li key={`${event.action}-${event.at}-${i}`}>
              <span className="po-invoice__timeline-when">{fmtDateTime(event.at)}</span>
              <span className="po-invoice__timeline-what">
                <strong>{EVENT_LABELS[event.action] ?? event.action}</strong>
                {event.to ? (
                  <span className="muted">
                    {" "}
                    → {INVOICE_STATUS_LABELS[event.to as keyof typeof INVOICE_STATUS_LABELS] ?? event.to}
                  </span>
                ) : null}
                {event.byName || event.byEmail ? (
                  <span className="muted"> · {event.byName || event.byEmail}</span>
                ) : null}
                {event.note ? <div className="muted">{event.note}</div> : null}
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      <footer className="po-invoice__actions">
        <Btn size="sm" variant="secondary" icon="invoice" onClick={onViewInvoiceDoc}>
          {invoice.grnNo ? "Invoice + GRN" : "Invoice document"}
        </Btn>
        <Btn size="sm" variant="secondary" icon="download" onClick={onViewPdf}>
          {invoice.status === "failed" ? "View failed PDF" : "View PDF"}
        </Btn>
        <Btn
          size="sm"
          variant="secondary"
          onClick={() =>
            router.push(`/procurement/invoices/${encodeURIComponent(invoice.id)}`)
          }
        >
          {invoice.status === "verified" ? "View verification" : "Verify invoice"}
        </Btn>
      </footer>
    </article>
  );
}
