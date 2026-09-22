"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Spin, message } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";

import { DashHead } from "@/components/erp/dashboards";
import InvoiceVerificationForm from "@/components/procurement/InvoiceVerificationForm";
import {
  fetchInvoiceDetail,
  manualVerifyInvoice,
  type ManualVerificationPayload,
} from "@/lib/procurement-api";
import {
  INVOICE_STATUS_LABELS,
  type InvoiceStatus,
} from "@/lib/procurement-workflow";
import { sendPoFailureNotice } from "@/lib/po-failure-notice";
import type { Invoice, PurchaseOrder } from "@/lib/entity-types";

const LIST = "/procurement/invoices";

/**
 * Re-checking an invoice that already exists — one that failed the first check
 * or went back to the vendor. The first check happens on /procurement/
 * invoices/new, where the invoice record is created.
 */
export default function VerifyInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchInvoiceDetail(id);
      setInvoice(data.invoice);
      setPo(data.po);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load this invoice");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // Initial fetch on mount; `load` is stable for a given invoice id.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  /**
   * A failed invoice goes back to the vendor: emailed when the purchase order
   * carries an address, downloaded as a stamped PDF when it does not.
   */
  const notifyVendorOfFailure = async (
    order: PurchaseOrder,
    invoiceRef: string,
    reason: string,
  ) => {
    const result = await sendPoFailureNotice({ po: order, invoiceRef, reason });
    if (result.kind === "emailed") {
      message.success(`Failure notice emailed to ${result.email}.`, 6);
    } else if (result.reason === "no-email") {
      message.warning(
        "No vendor email on this purchase order — the stamped PDF was downloaded to send manually.",
        7,
      );
    } else {
      message.warning(
        `Could not email the vendor (${result.detail}) — the stamped PDF was downloaded instead.`,
        7,
      );
    }
  };

  const submit = async (payload: ManualVerificationPayload) => {
    setSaving(true);
    try {
      const { invoice: saved, receipt } = await manualVerifyInvoice(id, payload);
      message.success(
        `Invoice ${saved.vendorInvoiceNo || saved.id} marked ${
          INVOICE_STATUS_LABELS[saved.status as InvoiceStatus] ?? saved.status
        }.`,
      );
      if (receipt) {
        message.success(
          `${receipt.qty} ${receipt.unit} of ${receipt.name} received — stock ${receipt.previousStock} → ${receipt.newStock}.`,
          6,
        );
      } else if (payload.status === "verified") {
        message.warning(
          "Verified, but no inventory item matched the PO's material code — stock was not changed.",
          6,
        );
      }
      if (payload.status === "failed" && po) {
        await notifyVendorOfFailure(po, saved.id, payload.note ?? "");
      }
      router.push(LIST);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (loadError || !invoice) {
    return (
      <>
        <DashHead title="Verify invoice" sub={id} />
        <div className="card" style={{ padding: 32, textAlign: "center" }}>
          <p style={{ color: "var(--danger)" }}>{loadError ?? "Invoice not found."}</p>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(LIST)}>
            Back to invoices
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <DashHead
        title={`Verify ${invoice.vendorInvoiceNo || "invoice"}`}
        sub={`Against purchase order ${invoice.po} · ${invoice.vendor}`}
      >
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(LIST)}>
          Back
        </Button>
      </DashHead>

      <InvoiceVerificationForm
        po={po}
        invoice={invoice}
        readOnly={invoice.status === "verified"}
        submitting={saving}
        onCancel={() => router.push(LIST)}
        onSubmit={submit}
      />
    </>
  );
}
