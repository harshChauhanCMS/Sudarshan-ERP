"use client";

import { use, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Spin, Tag, message } from "antd";
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
import { sendPoToVendor } from "@/lib/procurement-api";
import { loadPoLogo, type PoPdfInput } from "@/lib/po-pdf";
import PoPdfPreview from "@/components/procurement/PoPdfPreview";
import {
  INVOICE_STATUS_LABELS,
  PO_STATUS_LABELS,
  canPoTransition,
  normalizeInvoiceStatus,
  normalizePoStatus,
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
  const [opening, setOpening] = useState(false);
  const [sending, setSending] = useState(false);

  const po = useMemo(
    () => purchaseOrders.find((p) => p.id === id) ?? null,
    [purchaseOrders, id],
  );
  const vendor = useMemo(
    () => (po ? vendors.find((v) => v.name === po.vendor) ?? null : null),
    [vendors, po],
  );

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
          <Btn variant="primary" size="sm" icon="send" onClick={() => void handleSend()} disabled={sending}>
            {sending ? "Sending…" : "Send to vendor"}
          </Btn>
        ) : null}
      </DashHead>

      {/* Headline figures, so the order reads at a glance. */}
      <div className="po-detail__summary">
        <div>
          <span>Order value</span>
          <strong>{fmtINRFull(po.total)}</strong>
        </div>
        <div>
          <span>Quantity</span>
          <strong>
            {qty ? `${qty}` : "—"} <em>{po.unit ?? ""}</em>
          </strong>
        </div>
        <div>
          <span>PO status</span>
          <strong>{erpStatusBadge(status)}</strong>
        </div>
        <div>
          <span>Invoice</span>
          <strong>{erpStatusBadge(po.invoice)}</strong>
        </div>
        <div>
          <span>Expected delivery</span>
          <strong>{fmtDate(po.expectedDelivery)}</strong>
        </div>
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
          <span className="muted" style={{ fontSize: 11 }}>
            {invoicesLoading
              ? "Loading…"
              : poInvoices.length
                ? `${poInvoices.length} invoice${poInvoices.length === 1 ? "" : "s"} against this order`
                : "No invoice raised yet"}
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
    </>
  );
}

/** One invoice against the order, with every event recorded on it. */
function InvoiceCard({
  invoice,
  poTotal,
  onViewPdf,
}: {
  invoice: Invoice;
  poTotal: number;
  onViewPdf: () => void;
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
          {invoice.inventoryUpdated ? (
            <Tag color="green" style={{ margin: 0 }}>
              Stock received
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
