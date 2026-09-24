"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Select, Table, Tag, Tooltip } from "antd";
import {
  AuditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  PlusOutlined,
  SendOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useErpData } from "@/context/erp-data-provider";
import { useInvoices } from "@/hooks/use-invoices";
import { fmtINRFull } from "@/components/erp/ui";
import { DashHead } from "@/components/erp/dashboards";
import StatCard, { ErpStatGrid } from "@/components/common/StatCard";
import { ERP_TABLE_PROPS, invoiceStatusBadge } from "@/components/common/erpStatusBadges";
import PageFilterPanel from "@/components/common/PageFilterPanel";
import {
  INVOICE_STATUS_LABELS,
  MANUAL_INVOICE_STATUSES,
  canPoBeInvoiced,
  normalizeInvoiceStatus,
  poReceiptState,
} from "@/lib/procurement-workflow";
import type { Invoice, PurchaseOrder } from "@/lib/entity-types";

/**
 * One row per purchase order: the order shows here the moment it is raised,
 * and its invoice details fill in once someone verifies it. The invoice number
 * is generated at verification, so until then that column says so rather than
 * disappearing.
 */
type Row = {
  key: string;
  po: PurchaseOrder;
  invoice: Invoice | null;
  /** Invoice status, or "awaiting" while no invoice has been raised. */
  status: string;
  /** Sort key — newest activity first. */
  at: number;
  /**
   * True when this row is the place to start the next invoice for its order:
   * the order is still open and nothing on it is waiting to be checked.
   */
  canAddInvoice: boolean;
  /** Still to be received on the order this row belongs to. */
  remainingQty: number;
};

const AWAITING = "awaiting";

function timeValue(...stamps: (string | undefined)[]): number {
  for (const stamp of stamps) {
    if (!stamp) continue;
    const parsed = dayjs(stamp).valueOf();
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

export default function InvoiceVerificationPage() {
  const router = useRouter();
  // The bootstrap snapshot is fetched once per session and nothing refreshes it
  // after a purchase order is created, so this page pulls it again on entry —
  // otherwise a PO raised in the same session never appears here.
  const { data: DATA, refresh: refreshErp, loading: erpLoading } = useErpData();
  const { invoices, loading, reload } = useInvoices();

  useEffect(() => {
    void refreshErp();
  }, [refreshErp]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const rows = useMemo<Row[]>(() => {
    // An order can carry several invoices over its life — a balance delivery,
    // a replacement for one that failed, a resend. Each gets its own row.
    const byPo = new Map<string, Invoice[]>();
    for (const inv of invoices) {
      const list = byPo.get(inv.po) ?? [];
      list.push({ ...inv, status: normalizeInvoiceStatus(inv.status) });
      byPo.set(inv.po, list);
    }

    const list: Row[] = [];
    for (const po of DATA.PURCHASE_ORDERS) {
      const open = canPoBeInvoiced(po.status);
      const poInvoices = (byPo.get(po.id) ?? []).sort(
        (a, b) =>
          timeValue(a.verifiedAt, a.raisedAt, a.invDate) -
          timeValue(b.verifiedAt, b.raisedAt, b.invDate),
      );
      const state = poReceiptState(po.quantity, po.receivedQty);
      const hasPending = poInvoices.some((i) => i.status === "pending_verification");

      if (!poInvoices.length) {
        if (!open) continue;
        list.push({
          key: po.id,
          po,
          invoice: null,
          status: AWAITING,
          at: timeValue(po.poDate, po.date),
          canAddInvoice: false,
          remainingQty: state.remainingQty,
        });
        continue;
      }

      poInvoices.forEach((invoice, i) => {
        list.push({
          key: invoice.id,
          po,
          invoice,
          status: invoice.status,
          at: timeValue(invoice.verifiedAt, invoice.raisedAt, invoice.invDate),
          // Offered once per order, on its newest invoice.
          canAddInvoice: open && !hasPending && i === poInvoices.length - 1,
          remainingQty: state.remainingQty,
        });
      });
    }

    // Newest first — a just-created PO lands at the top, ready to verify.
    list.sort((a, b) => b.at - a.at);
    return list;
  }, [DATA.PURCHASE_ORDERS, invoices]);

  const awaitingCount = rows.filter((r) => r.status === AWAITING).length;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!term) return true;
      return [
        row.invoice?.id ?? "",
        row.po.id,
        row.po.vendor,
        row.invoice?.vendorInvoiceNo ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [rows, search, statusFilter]);

  const counts = useMemo(
    () => ({
      verified: rows.filter((r) => r.status === "verified").length,
      failed: rows.filter((r) => r.status === "failed").length,
      resent: rows.filter((r) => r.status === "resent_to_vendor").length,
    }),
    [rows],
  );

  const openRow = (row: Row) => {
    router.push(
      row.invoice
        ? `/procurement/invoices/${encodeURIComponent(row.invoice.id)}`
        : `/procurement/invoices/new?po=${encodeURIComponent(row.po.id)}`,
    );
  };

  const columns = [
    {
      title: "Invoice #",
      key: "invoiceNo",
      width: 150,
      // The vendor's own invoice number, as typed in from their copy — that is
      // what people look an invoice up by, not our internal id.
      render: (_: unknown, row: Row) =>
        row.invoice?.vendorInvoiceNo ? (
          <span className="mono strong">{row.invoice.vendorInvoiceNo}</span>
        ) : (
          <Tooltip
            title={
              row.invoice
                ? "No invoice number was recorded for this invoice"
                : "Entered when this purchase order's invoice is verified"
            }
          >
            <span className="muted" style={{ fontSize: 12 }}>
              {row.invoice ? "—" : "Not added"}
            </span>
          </Tooltip>
        ),
    },
    {
      title: "PO",
      key: "po",
      width: 130,
      render: (_: unknown, row: Row) => (
        <div>
          <div className="mono strong">{row.po.id}</div>
          <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>
            {row.po.date || row.po.poDate || ""}
          </div>
        </div>
      ),
    },
    {
      title: "Vendor",
      key: "vendor",
      width: 210,
      render: (_: unknown, row: Row) => row.po.vendor,
    },
    {
      title: "GRN",
      key: "grn",
      width: 140,
      // Raised only when an invoice is verified — never shown as a placeholder.
      render: (_: unknown, row: Row) =>
        row.invoice?.grnNo ? (
          <Tooltip
            title={`${row.invoice.quantityReceived ?? ""} ${row.invoice.unit ?? ""} received on ${
              row.invoice.grnAt ? dayjs(row.invoice.grnAt).format("DD MMM YYYY") : ""
            }`}
          >
            <Tag color="green" style={{ margin: 0, fontWeight: 700 }}>
              {row.invoice.grnNo}
            </Tag>
          </Tooltip>
        ) : (
          <span className="muted" style={{ fontSize: 12 }}>
            —
          </span>
        ),
    },
    {
      title: "Material",
      key: "material",
      width: 200,
      render: (_: unknown, row: Row) => {
        const state = poReceiptState(row.po.quantity, row.po.receivedQty);
        return (
          <div>
            <div>{row.po.materialName ?? "—"}</div>
            <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>
              {row.po.quantity ?? "—"} {row.po.unit ?? ""}
              {state.receivedQty > 0 ? (
                <>
                  {" · "}
                  <span className={state.complete ? "" : "warning"}>
                    {state.receivedQty} received
                    {state.remainingQty > 0 ? `, ${state.remainingQty} due` : ""}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        );
      },
    },
    {
      title: "PO ₹",
      key: "poAmt",
      align: "right" as const,
      width: 120,
      render: (_: unknown, row: Row) => (
        <span className="num">{fmtINRFull(Number(row.po.total) || 0)}</span>
      ),
    },
    {
      title: "Invoice ₹",
      key: "invAmt",
      align: "right" as const,
      width: 120,
      render: (_: unknown, row: Row) =>
        row.invoice ? (
          <span className="num">{fmtINRFull(Number(row.invoice.invAmt) || 0)}</span>
        ) : (
          <span className="muted">—</span>
        ),
    },
    {
      title: "Diff",
      key: "diff",
      align: "right" as const,
      width: 110,
      render: (_: unknown, row: Row) => {
        if (!row.invoice) return <span className="muted">—</span>;
        const diff =
          (Number(row.invoice.invAmt) || 0) - (Number(row.invoice.poAmt) || 0);
        if (Math.abs(diff) < 1) return <span className="muted">—</span>;
        return (
          <span
            className="num"
            style={{ color: diff > 0 ? "var(--danger)" : "var(--warning)", fontWeight: 600 }}
          >
            {diff > 0 ? "+" : "−"}₹{Math.abs(diff).toLocaleString("en-IN")}
          </span>
        );
      },
    },
    {
      title: "Stock",
      key: "stock",
      width: 110,
      render: (_: unknown, row: Row) =>
        row.invoice?.inventoryUpdated ? (
          <Tooltip
            title={`${row.invoice.inventoryQty} added to ${row.invoice.inventoryCode} on ${
              row.invoice.inventoryUpdatedAt
                ? dayjs(row.invoice.inventoryUpdatedAt).format("DD MMM YYYY")
                : ""
            }`}
          >
            <Tag color="green" style={{ margin: 0 }}>
              In stock
            </Tag>
          </Tooltip>
        ) : (
          <span className="muted">—</span>
        ),
    },
    {
      title: "Status",
      key: "status",
      width: 200,
      render: (_: unknown, row: Row) =>
        row.status === AWAITING ? (
          <Tag color="default" style={{ margin: 0, whiteSpace: "nowrap" }}>
            Awaiting verification
          </Tag>
        ) : (
          invoiceStatusBadge(row.status)
        ),
    },
    {
      title: "Action",
      key: "action",
      width: 150,
      fixed: "right" as const,
      render: (_: unknown, row: Row) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <Button
            size="small"
            type={row.status === "verified" ? "default" : "primary"}
            icon={<AuditOutlined />}
            onClick={() => openRow(row)}
          >
            {row.status === AWAITING ? "Verify" : row.status === "verified" ? "View" : "Re-check"}
          </Button>
          {row.canAddInvoice ? (
            <Tooltip
              title={
                row.remainingQty > 0
                  ? `Record another invoice on ${row.po.id} — ${row.remainingQty} ${row.po.unit ?? ""} still to receive`
                  : `Record another invoice on ${row.po.id}`
              }
            >
              <Button
                size="small"
                icon={<PlusOutlined />}
                onClick={() =>
                  router.push(
                    `/procurement/invoices/new?po=${encodeURIComponent(row.po.id)}`,
                  )
                }
              />
            </Tooltip>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <>
      <DashHead
        title="Invoice Verification"
        sub="Every purchase order and its invoice, checked by hand against the order"
      />

      <ErpStatGrid cols={4}>
        <StatCard
          icon={FileTextOutlined}
          label="Awaiting verification"
          value={awaitingCount}
          hint="Purchase orders with no invoice yet"
        />
        <StatCard
          icon={CheckCircleOutlined}
          label="Verified"
          value={counts.verified}
          hint="Received into inventory"
          hintTone="positive"
        />
        <StatCard
          icon={CloseCircleOutlined}
          label="Failed"
          value={counts.failed}
          hint="Did not match the PO"
          hintTone="negative"
        />
        <StatCard
          icon={SendOutlined}
          label="Resent to vendor"
          value={counts.resent}
          hint="Awaiting a corrected invoice"
          hintTone="warning"
        />
      </ErpStatGrid>

      <PageFilterPanel
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search PO, vendor or invoice number…"
        activeFilterCount={statusFilter !== "all" ? 1 : 0}
        onApply={() => {
          void reload();
          void refreshErp();
        }}
        onClear={() => {
          setSearch("");
          setStatusFilter("all");
        }}
        loading={loading || erpLoading}
      >
        <div className="arf-item">
          <span className="arf-label">Status</span>
          <Select
            className="w-full"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "All statuses" },
              { value: AWAITING, label: "Awaiting verification" },
              ...MANUAL_INVOICE_STATUSES.map((s) => ({
                value: s,
                label: INVOICE_STATUS_LABELS[s],
              })),
            ]}
          />
        </div>
      </PageFilterPanel>

      <div className="card" style={{ padding: 0 }}>
        <Table<Row>
          {...ERP_TABLE_PROPS}
          rowKey="key"
          loading={loading || erpLoading}
          dataSource={filtered}
          columns={columns}
          scroll={{ x: 1550 }}
          pagination={{ pageSize: 12, showTotal: (n) => `${n} purchase orders` }}
          locale={{
            emptyText: loading || erpLoading
              ? "Loading…"
              : "No purchase orders to verify — raise one from Procurement › Purchase Orders.",
          }}
        />
      </div>
    </>
  );
}
