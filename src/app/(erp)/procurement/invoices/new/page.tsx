"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Empty, Select, message } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";

import { DashHead } from "@/components/erp/dashboards";
import { fmtINRFull } from "@/components/erp/ui";
import { useErpData } from "@/context/erp-data-provider";
import { sendPoFailureNotice } from "@/lib/po-failure-notice";
import InvoiceVerificationForm from "@/components/procurement/InvoiceVerificationForm";
import {
  verifyPoInvoice,
  type ManualVerificationPayload,
} from "@/lib/procurement-api";
import {
  INVOICE_STATUS_LABELS,
  canPoBeInvoiced,
  type InvoiceStatus,
} from "@/lib/procurement-workflow";
import { useInvoices } from "@/hooks/use-invoices";

const LIST = "/procurement/invoices";

/**
 * First check of a purchase order's invoice. No invoice record exists yet —
 * the details are typed in from the vendor's copy, checked against the PO, and
 * the invoice is raised with its generated number only once the verifier picks
 * an outcome.
 */
function VerifyNewInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: DATA, refresh: refreshErp } = useErpData();

  // Same reason as the list: a PO raised in this session is not in the cached
  // snapshot until it is fetched again.
  useEffect(() => {
    void refreshErp();
  }, [refreshErp]);

  const [poId, setPoId] = useState(() => searchParams.get("po") ?? "");
  const [saving, setSaving] = useState(false);

  const { invoices } = useInvoices();

  /** Any issued purchase order that has not been invoiced yet. */
  const invoiceablePos = useMemo(() => {
    const taken = new Set(invoices.map((i) => i.po));
    return DATA.PURCHASE_ORDERS.filter(
      (p) => canPoBeInvoiced(p.status) && !taken.has(p.id),
    );
  }, [DATA.PURCHASE_ORDERS, invoices]);

  const po = useMemo(
    () => invoiceablePos.find((p) => p.id === poId) ?? null,
    [invoiceablePos, poId],
  );

  const submit = async (payload: ManualVerificationPayload) => {
    if (!po) {
      message.error("Pick the purchase order this invoice is against.");
      return;
    }
    setSaving(true);
    try {
      const { invoice, receipt } = await verifyPoInvoice(po.id, payload);
      message.success(
        `Invoice ${invoice.vendorInvoiceNo || invoice.id} recorded against ${po.id} and marked ${
          INVOICE_STATUS_LABELS[invoice.status as InvoiceStatus] ?? invoice.status
        }.`,
        6,
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

      // A failed invoice goes back to the vendor: emailed when the PO carries
      // an address, downloaded as a stamped PDF when it does not.
      if (payload.status === "failed") {
        const result = await sendPoFailureNotice({
          po,
          invoiceRef: invoice.id,
          reason: payload.note ?? "",
        });
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
      }
      router.push(LIST);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setSaving(false);
    }
  };

  const poSelector = (
    <div className="invoice-verify-page__picker-body">
      <div>
        <label className="field-label" htmlFor="po">
          Purchase order
        </label>
        <Select
          id="po"
          className="w-full"
          showSearch
          optionFilterProp="label"
          value={poId || undefined}
          onChange={setPoId}
          placeholder="Pick the purchase order this invoice is against"
          disabled={saving}
          options={invoiceablePos.map((p) => ({
            value: p.id,
            label: `${p.id} · ${p.vendor} · ${fmtINRFull(Number(p.total) || 0)}`,
          }))}
          notFoundContent="No purchase orders are waiting for an invoice"
        />
      </div>
      <p className="invoice-verify-page__picker-hint">
        The invoice number is generated from this purchase order when you
        continue — nothing is recorded before that.
      </p>
    </div>
  );

  return (
    <>
      <DashHead
        title="Verify invoice"
        sub="Check the vendor's invoice against its purchase order"
      >
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(LIST)}>
          Back
        </Button>
      </DashHead>

      {invoiceablePos.length === 0 ? (
        <div className="card" style={{ padding: 40 }}>
          <Empty description="Every purchase order has been invoiced — nothing is waiting for verification." />
        </div>
      ) : (
        <InvoiceVerificationForm
          key={po?.id ?? "none"}
          po={po}
          poSelector={poSelector}
          submitting={saving}
          onCancel={() => router.push(LIST)}
          onSubmit={submit}
        />
      )}
    </>
  );
}

export default function VerifyNewInvoicePage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <VerifyNewInvoiceContent />
    </Suspense>
  );
}
