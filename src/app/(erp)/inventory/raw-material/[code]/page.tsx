"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { message } from "antd";
import dayjs from "dayjs";

import { DashHead } from "@/components/erp/dashboards";
import { Bar, Btn, fmtINR } from "@/components/erp/ui";
import { useDATA, useErpData } from "@/components/erp/data";
import { inventoryStatusBadge } from "@/components/common/erpStatusBadges";
import { buildInventoryItemDetailView } from "@/lib/inventory-mobile";
import { buildInventoryReceipts, type InventoryReceipt } from "@/lib/inventory-history";
import { loadPoLogo, type PoPdfInput } from "@/lib/po-pdf";
import PoPdfPreview from "@/components/procurement/PoPdfPreview";

const LIST = "/inventory/raw-material";

/**
 * One raw material: its master details and, below them, every goods receipt
 * that put stock on the shelf — each one traceable back to the purchase order
 * it arrived against.
 */
export default function RawMaterialDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = use(params);
  const code = decodeURIComponent(rawCode);
  const router = useRouter();
  const DATA = useDATA();
  const { loading } = useErpData();
  const [pdfPoId, setPdfPoId] = useState<string | null>(null);
  /** The purchase order being previewed, already assembled for the PDF. */
  const [preview, setPreview] = useState<PoPdfInput | null>(null);

  const item = useMemo(
    () => DATA.RAW_MATERIALS.find((r) => r.code === code) ?? null,
    [DATA.RAW_MATERIALS, code],
  );
  const detail = useMemo(
    () => buildInventoryItemDetailView("raw-material", code, DATA),
    [code, DATA],
  );
  const receipts = useMemo(() => buildInventoryReceipts(code, DATA), [code, DATA]);

  /** Opens the purchase order on screen; downloading is a click away there. */
  const openReceiptPo = async (receipt: InventoryReceipt) => {
    if (!receipt.po) {
      message.error(`Purchase order ${receipt.poId} is no longer on file.`);
      return;
    }
    setPdfPoId(receipt.poId);
    try {
      const company = DATA.COMPANIES?.[0];
      setPreview({
        po: receipt.po,
        vendor: receipt.vendor,
        logoDataUrl: await loadPoLogo(),
        company: company
          ? { name: company.name, addressLines: [company.plant].filter(Boolean) }
          : null,
        raisedBy: receipt.po.createdByName || receipt.po.createdByEmail,
        raisedByEmail: receipt.po.createdByEmail,
        raisedAt: receipt.po.poDate ? new Date(receipt.po.poDate) : undefined,
      });
    } catch {
      message.error("Could not open the purchase order.");
    } finally {
      setPdfPoId(null);
    }
  };

  if (!item || !detail) {
    return (
      <>
        <DashHead title="Raw material" sub={code} />
        <div className="card" style={{ padding: 32, textAlign: "center" }}>
          <p className="muted">
            {loading ? "Loading…" : `No raw material found for ${code}.`}
          </p>
          <Btn variant="secondary" size="sm" onClick={() => router.push(LIST)}>
            Back to raw materials
          </Btn>
        </div>
      </>
    );
  }

  return (
    <>
      <DashHead title={detail.name} sub={`${detail.code} · ${detail.statusLabel}`}>
        <Btn variant="secondary" size="sm" icon="menu" onClick={() => router.push(LIST)}>
          Raw materials
        </Btn>
        <Btn
          size="sm"
          icon="plus"
          onClick={() => router.push("/procurement/po/add")}
        >
          Add stock
        </Btn>
        <Btn
          variant="primary"
          size="sm"
          icon="edit"
          onClick={() =>
            router.push(`${LIST}/add?code=${encodeURIComponent(item.code)}`)
          }
        >
          Edit
        </Btn>
      </DashHead>

      <div className="rm-detail">
        <section className="card">
          <div className="card-head">
            <div className="card-title">Material details</div>
            {inventoryStatusBadge(item.status)}
          </div>
          <div className="card-body">
            <div className="rm-detail__stock">
              <div>
                <span className="muted">Stock on hand</span>
                <strong>
                  {item.stock} <span className="subtle">{item.unit}</span>
                </strong>
              </div>
              <div>
                <span className="muted">Reorder at</span>
                <strong>
                  {item.reorder} <span className="subtle">{item.unit}</span>
                </strong>
              </div>
              <div>
                <span className="muted">Inventory value</span>
                <strong>{fmtINR(item.value)}</strong>
              </div>
            </div>
            <Bar
              value={detail.stock.levelPct}
              tone={
                item.status === "critical"
                  ? "danger"
                  : item.status === "low"
                    ? "warning"
                    : "success"
              }
            />

            <div className="rm-detail__fields">
              {detail.fields.map((field) => (
                <div key={field.label}>
                  <span className="muted">{field.label}</span>
                  <span
                    className={
                      field.tone === "danger"
                        ? "danger"
                        : field.tone === "warn"
                          ? "warning"
                          : ""
                    }
                  >
                    {field.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div className="card-title">Stock history</div>
            <span className="muted" style={{ fontSize: 11 }}>
              {receipts.length
                ? `${receipts.length} receipt${receipts.length === 1 ? "" : "s"} from verified invoices`
                : "No stock received yet"}
            </span>
          </div>
          <div className="card-body" style={{ padding: receipts.length ? 0 : undefined }}>
            {receipts.length ? (
              <table className="inv-history__table">
                <thead>
                  <tr>
                    <th>Date added</th>
                    <th>Qty</th>
                    <th>Vendor</th>
                    <th>Purchase order</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((receipt) => (
                    <tr key={receipt.invoiceId}>
                      <td>
                        {receipt.receivedAt
                          ? dayjs(receipt.receivedAt).format("DD MMM YYYY")
                          : "—"}
                        {receipt.invoiceNo ? (
                          <div className="muted" style={{ fontSize: 11 }}>
                            Invoice {receipt.invoiceNo}
                          </div>
                        ) : null}
                      </td>
                      <td className="mono">
                        +{receipt.qty} {receipt.unit}
                      </td>
                      <td>{receipt.vendorName || "—"}</td>
                      <td>
                        <button
                          type="button"
                          className="inv-history__po mono"
                          onClick={() => void openReceiptPo(receipt)}
                          disabled={!receipt.po}
                          title={
                            receipt.po
                              ? `Open ${receipt.poId}`
                              : "Purchase order no longer on file"
                          }
                        >
                          {receipt.poId}
                        </button>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="inv-history__pdf"
                          onClick={() => void openReceiptPo(receipt)}
                          disabled={!receipt.po || pdfPoId === receipt.poId}
                          title={
                            receipt.po
                              ? `Preview ${receipt.poId}`
                              : "Purchase order no longer on file"
                          }
                        >
                          {pdfPoId === receipt.poId ? "Opening…" : "View PO"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
                Stock is added when a vendor invoice is verified against a
                purchase order.
              </p>
            )}
          </div>
        </section>
      </div>

      <PoPdfPreview
        input={preview}
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
      />
    </>
  );
}
