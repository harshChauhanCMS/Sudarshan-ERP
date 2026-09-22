"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Select, Table, Tag, Tooltip } from "antd";
import {
  AuditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
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
    const byPo = new Map<string, Invoice>();
    for (const inv of invoices) {
      byPo.set(inv.po, { ...inv, status: normalizeInvoiceStatus(inv.status) });
    }

    const list = DATA.PURCHASE_ORDERS.filter((po) => canPoBeInvoiced(po.status)).map(
      (po) => {
        const invoice = byPo.get(po.id) ?? null;
        return {
          key: invoice?.id ?? po.id,
          po,
          invoice,
          status: invoice ? invoice.status : AWAITING,
          at: invoice
            ? timeValue(invoice.verifiedAt, invoice.raisedAt, invoice.invDate)
            : timeValue(po.poDate, po.date),
        };
      },
    );

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
      title: "Material",
      key: "material",
      width: 200,
      render: (_: unknown, row: Row) => (
        <div>
          <div>{row.po.materialName ?? "—"}</div>
          <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>
            {row.po.quantity ?? "—"} {row.po.unit ?? ""}
          </div>
        </div>
      ),
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
              Received
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
        <Button
          size="small"
          type={row.status === "verified" ? "default" : "primary"}
          icon={<AuditOutlined />}
          onClick={() => openRow(row)}
        >
          {row.status === "verified" ? "View" : "Verify"}
        </Button>
      ),
    },
  ];

  return (
    <>
      <DashHead
        title="Invoice Verification"
        sub="Every purchase order and its invoice, checked by hand against the order"
      >
        <Button
          type="primary"
          icon={<AuditOutlined />}
          disabled={awaitingCount === 0}
          onClick={() => router.push("/procurement/invoices/new")}
        >
          Verify invoice{awaitingCount > 0 ? ` (${awaitingCount})` : ""}
        </Button>
      </DashHead>

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
