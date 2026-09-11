// @ts-nocheck
'use client';


import React, { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertOutlined,
  AppstoreOutlined,
  CarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  SettingOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import CommonTable from "@/components/common/CommonTable";
import StatCard, { ErpStatGrid } from "@/components/common/StatCard";
import { ERP_TABLE_PROPS, inventoryStatusBadge } from "@/components/common/erpStatusBadges";
import { ViewEditActions } from "@/components/common/TableActionIcons";
import { Icon } from "./icons";
import { Btn, Badge, StatusBadge, Avatar, Bar, Sparkline, Kpi, Modal, fmtINR, fmtINRFull, fmtNum, AreaChart, BarChart, Donut } from "./ui";
import { buildSparePartView } from "@/lib/inventory-mobile";
import { useSpareParts } from "@/hooks/use-spare-parts";
import { useEntityList } from "@/hooks/use-entity-list";
import { DashHead, SectionH } from "./dashboards";
import PageFilterPanel from "@/components/common/PageFilterPanel";
import { Select, message, Dropdown, Tooltip, Button } from "antd";
import { ExportOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { MenuProps } from "antd";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/* ============================================================
   MODULES PART 4 — Spare Parts + shared add modals
   ============================================================ */


/* ============================================================
   SPARE PARTS INVENTORY
   ============================================================ */

/** Anything older than this reads as dead stock and is flagged in the table. */
const STALE_ISSUE_DAYS = 365;

/**
 * Renders the `lastIssuedAt` timestamp as an absolute date plus its age.
 * Falls back to the deprecated free-text `lastIssued` for rows seeded before
 * the issue ledger existed, so history is shown but visibly marked legacy.
 */
function lastIssuedCell(part) {
  if (part.lastIssuedAt) {
    const d = dayjs(part.lastIssuedAt);
    const days = dayjs().startOf("day").diff(d.startOf("day"), "day");
    const stale = days > STALE_ISSUE_DAYS;
    const age = days === 0 ? "today" : days === 1 ? "yesterday" : `${days}d ago`;
    return (
      <span style={{ display: "inline-flex", flexDirection: "column", lineHeight: 1.3 }}>
        <span className="mono" style={{ fontSize: 12 }}>{d.format("DD MMM YYYY")}</span>
        <span
          style={{ fontSize: 11, color: stale ? "var(--danger)" : "var(--muted)" }}
          title={stale ? `Not issued in over a year — possible dead stock` : undefined}
        >
          {age}
        </span>
      </span>
    );
  }
  if (part.lastIssued && part.lastIssued !== "\u2014") {
    return (
      <Tooltip title="Legacy record — predates the issue ledger">
        <span className="subtle" style={{ fontSize: 12, fontStyle: "italic" }}>
          {part.lastIssued}
        </span>
      </Tooltip>
    );
  }
  return <span className="subtle" style={{ fontSize: 12 }}>Never issued</span>;
}

function lastIssuedSortValue(part) {
  if (part.lastIssuedAt) return dayjs(part.lastIssuedAt).valueOf();
  return -1; // never-issued rows sort to the bottom
}

const SparePartsInventory = () => {
  const router = useRouter();
  const { items: sparePartItems, loading, error: loadError, reload } = useSpareParts();
  const { items: categoryItems } = useEntityList<string>("spareCategories");
  const [viewItem, setViewItem] = useState(null);
  const [tab, setTab] = useState("all");
  const [deletingCode, setDeletingCode] = useState(null);

  const viewDetail = useMemo(() => {
    if (!viewItem) return null;
    const index = sparePartItems.findIndex((p) => p.code === viewItem.code);
    return buildSparePartView(viewItem, index === 2);
  }, [viewItem, sparePartItems]);

  const deleteSparePart = useCallback(
    async (code) => {
      setDeletingCode(code);
      try {
        const res = await fetch(`/api/inventory/spare-parts/${encodeURIComponent(code)}`, {
          method: "DELETE",
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        message.success("Spare part deleted.");
        await reload();
      } catch (e) {
        message.error(e instanceof Error ? e.message : "Delete failed");
      } finally {
        setDeletingCode(null);
      }
    },
    [reload]
  );

  const [issueItem, setIssueItem] = useState(null);
  const [issueForm, setIssueForm] = useState(null);
  const [issuing, setIssuing] = useState(false);
  const [historyFor, setHistoryFor] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const openIssue = useCallback((part) => {
    setIssueItem(part);
    setIssueForm({
      qty: "",
      machineId: part.machineName ?? "",
      issuedTo: "",
      workOrder: "",
      issuedAt: dayjs().format("YYYY-MM-DD"),
      notes: "",
    });
  }, []);

  const loadHistory = useCallback(async (code) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(
        `/api/inventory/spare-parts/${encodeURIComponent(code)}/issue`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setHistory(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Could not load issue history");
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const openHistory = useCallback(
    (part) => {
      setHistoryFor(part);
      setHistory([]);
      void loadHistory(part.code);
    },
    [loadHistory]
  );

  const submitIssue = useCallback(async () => {
    if (!issueItem || !issueForm) return;
    const qty = parseFloat(issueForm.qty);
    if (!Number.isFinite(qty) || qty <= 0) {
      message.error("Enter a quantity greater than zero.");
      return;
    }
    if (qty > issueItem.stock) {
      message.error(`Only ${issueItem.stock} ${issueItem.unit} on hand.`);
      return;
    }
    if (!issueForm.issuedTo.trim()) {
      message.error("Enter who the part was issued to.");
      return;
    }
    setIssuing(true);
    try {
      const res = await fetch(
        `/api/inventory/spare-parts/${encodeURIComponent(issueItem.code)}/issue`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            qty,
            machineId: issueForm.machineId,
            issuedTo: issueForm.issuedTo,
            workOrder: issueForm.workOrder,
            issuedAt: dayjs(issueForm.issuedAt).toISOString(),
            notes: issueForm.notes,
          }),
        }
      );
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      message.success(`Issued ${qty} ${issueItem.unit} of ${issueItem.code}.`);
      setIssueItem(null);
      setIssueForm(null);
      await reload(true);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Issue failed");
    } finally {
      setIssuing(false);
    }
  }, [issueItem, issueForm, reload]);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filtered = useMemo(() => {
    return sparePartItems.filter((p) => {
      if (tab === "low" && p.status !== "low" && p.status !== "critical") return false;
      if (tab === "critical" && !p.critical) return false;

      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;

      if (search) {
        const t = search.toLowerCase();
        if (!p.code.toLowerCase().includes(t) && !p.name.toLowerCase().includes(t)) {
          return false;
        }
      }
      return true;
    });
  }, [sparePartItems, tab, search, categoryFilter]);

  const totalValue = sparePartItems.reduce((s, p) => s + p.value, 0);
  const lowCount = sparePartItems.filter(p => p.status === "low").length;
  const critCount = sparePartItems.filter(p => p.status === "critical").length;
  const criticalSKUs = sparePartItems.filter(p => p.critical).length;

  const columns = useMemo(
    () => [
      {
        title: "SKU",
        dataIndex: "code",
        key: "code",
        render: (code, p) => (
          <span className="mono strong" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {code}
            {p.critical ? <span title="Critical for plant uptime" style={{ color: "var(--danger)" }}>●</span> : null}
          </span>
        ),
      },
      {
        title: "Part",
        dataIndex: "name",
        key: "name",
        render: (name) => <span className="strong">{name}</span>,
      },
      {
        title: "Category",
        dataIndex: "category",
        key: "category",
        render: (category) => <Badge tone="default">{category}</Badge>,
      },
      {
        title: "Vendor",
        dataIndex: "vendor",
        key: "vendor",
        render: (v) => <span className="muted">{v}</span>,
      },
      {
        title: "Location",
        dataIndex: "location",
        key: "location",
        render: (v) => <span className="muted" style={{ fontSize: 12 }}>{v}</span>,
      },
      {
        title: "Stock",
        key: "stock",
        align: "right",
        render: (_, p) => (
          <>
            <span className="mono strong">{p.stock}</span>{" "}
            <span className="subtle" style={{ fontSize: 11 }}>{p.unit}</span>
          </>
        ),
      },
      {
        title: "Reorder at",
        key: "reorder",
        render: (_, p) => <span className="mono subtle">{p.reorder} {p.unit}</span>,
      },
      {
        title: "Coverage",
        key: "coverage",
        width: 120,
        render: (_, p) => {
          const tone = p.status === "critical" ? "danger" : p.status === "low" ? "warning" : "success";
          const pct = Math.min(100, (p.stock / Math.max(1, p.reorder * 3)) * 100);
          return <Bar value={pct} tone={tone} />;
        },
      },
      {
        title: "Value",
        dataIndex: "value",
        key: "value",
        align: "right",
        render: (v) => <span className="num">{v > 0 ? fmtINRFull(v) : "—"}</span>,
      },
      {
        title: "Last issued",
        key: "lastIssued",
        sorter: (a, b) => lastIssuedSortValue(a) - lastIssuedSortValue(b),
        render: (_, p) => (
          <span
            role="button"
            tabIndex={0}
            style={{ cursor: "pointer" }}
            title="View issue history"
            onClick={() => openHistory(p)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openHistory(p);
              }
            }}
          >
            {lastIssuedCell(p)}
          </span>
        ),
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (status) => inventoryStatusBadge(status),
      },
      {
        title: "Actions",
        key: "actions",
        width: 150,
        align: "center",
        render: (_, p) => (
          <>
            <Tooltip title={p.stock > 0 ? "Issue to machine" : "No stock to issue"}>
              <Button
                type="text"
                size="small"
                icon={<ExportOutlined />}
                aria-label="Issue"
                className="hrms-table-actions__btn"
                disabled={p.stock <= 0}
                onClick={() => openIssue(p)}
              />
            </Tooltip>
          <ViewEditActions
            onView={() => setViewItem(p)}
            editHref={`/inventory/spare-parts/add?code=${encodeURIComponent(p.code)}`}
            showDelete
            onDelete={() => deleteSparePart(p.code)}
            deleteLabel={deletingCode === p.code ? "Deleting…" : "Delete"}
            deleteConfirmTitle={`Delete ${p.code}? This cannot be undone.`}
          />
          </>
        ),
      },
    ],
    [deletingCode, deleteSparePart, openIssue, openHistory]
  );

  const handleExport = (type: 'xls' | 'pdf') => {
    const headers = ["SKU", "Part", "Category", "Vendor", "Location", "Stock", "Unit", "Reorder At", "Value", "Last Issued", "Status", "Critical"];
    const exportData = filtered.map(p => [
      p.code, p.name, p.category, p.vendor, p.location, p.stock, p.unit,
      p.reorder, p.value,
      p.lastIssuedAt ? dayjs(p.lastIssuedAt).format("YYYY-MM-DD") : (p.lastIssued || ""),
      p.status, p.critical ? "Yes" : "No"
    ]);
    const fileName = `spare_parts_${new Date().toISOString().split("T")[0]}`;

    if (type === 'xls') {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...exportData]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Spare Parts");
      XLSX.writeFile(wb, `${fileName}.xlsx`);
    } else {
      const doc = new jsPDF({ orientation: "landscape" });
      doc.text("Spare Parts Inventory", 14, 15);
      autoTable(doc, {
        head: [headers],
        body: exportData,
        startY: 20,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [37, 99, 235] }
      });
      doc.save(`${fileName}.pdf`);
    }
    message.success(`Exported spare parts as ${type === 'xls' ? 'Excel' : 'PDF'}`);
  };

  const exportMenuItems: MenuProps['items'] = [
    { key: "xls", label: "Export as Excel (XLSX)", onClick: () => handleExport('xls') },
    { key: "pdf", label: "Export as PDF", onClick: () => handleExport('pdf') }
  ];

  return (
    <>
      <DashHead title="Spare Parts Inventory" sub="Mechanical, electrical & instrumentation spares · reorder & breakdown alerts">
        <Btn size="sm" icon="filter">Filters</Btn>
        <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight">
          <Btn size="sm" icon="download">Export</Btn>
        </Dropdown>
        <Btn variant="primary" size="sm" icon="plus" onClick={() => router.push("/inventory/spare-parts/add")}>Add spare part</Btn>
      </DashHead>

      <ErpStatGrid cols={4}>
        <StatCard
          icon={SettingOutlined}
          label="Total SKUs"
          value={sparePartItems.length}
          hint={`${criticalSKUs} marked critical`}
        />
        <StatCard
          icon={DollarOutlined}
          label="Stock value"
          value={totalValue > 0 ? fmtINR(totalValue) : "—"}
          hint={`${sparePartItems.length} SKUs`}
          hintTone="positive"
        />
        <StatCard
          icon={WarningOutlined}
          label="Low stock"
          value={lowCount}
          hint="Reorder recommended"
          hintTone="warning"
        />
        <StatCard
          icon={AlertOutlined}
          label="Critical / out"
          value={critCount}
          hint={`${criticalSKUs} critical SKUs`}
          hintTone="negative"
        />
      </ErpStatGrid>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center" }}>
          <div className="tabs" style={{ border: "none", marginBottom: -1 }}>
            <span className={`tab ${tab === "all" ? "active" : ""}`} onClick={() => setTab("all")}>All <span className="tab-count">{sparePartItems.length}</span></span>
            <span className={`tab ${tab === "low" ? "active" : ""}`} onClick={() => setTab("low")}>Reorder / critical <span className="tab-count">{lowCount + critCount}</span></span>
            <span className={`tab ${tab === "critical" ? "active" : ""}`} onClick={() => setTab("critical")}>Critical SKUs <span className="tab-count">{criticalSKUs}</span></span>
          </div>
        </div>
        <PageFilterPanel
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search SKU, part name…"
          activeFilterCount={categoryFilter !== "all" ? 1 : 0}
          onApply={() => {}}
          onClear={() => {
            setSearch("");
            setCategoryFilter("all");
          }}
          drawerWidth={320}
        >
          <div className="arf-item">
            <span className="arf-label">Category</span>
            <Select
              className="w-full"
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: "all", label: "All categories" },
                ...categoryItems.map((c: string) => ({ value: c, label: c })),
              ]}
            />
          </div>
        </PageFilterPanel>
        <div style={{ padding: 16, paddingTop: 0 }}>
          {loadError ? (
            <p style={{ color: "var(--danger)", fontSize: 12, marginBottom: 12 }}>{loadError}</p>
          ) : null}
          <CommonTable
            {...ERP_TABLE_PROPS}
            columns={columns}
            dataSource={filtered}
            rowKey="code"
            loading={loading}
            locale={{
              emptyText: (
                <span className="muted">
                  No spare parts in the database. Run <code>npm run seed</code> or add items via the API.
                </span>
              ),
            }}
          />
        </div>
      </div>

      <Modal
        open={!!viewItem}
        onClose={() => setViewItem(null)}
        title={viewDetail?.name ?? viewItem?.name ?? "Spare part"}
        sub={viewDetail ? `${viewDetail.code} · ${viewDetail.statusLabel}` : viewItem?.code}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setViewItem(null)}>
              Close
            </Btn>
            {viewItem ? (
              <Btn
                variant="primary"
                size="sm"
                icon="edit"
                onClick={() => {
                  router.push(
                    `/inventory/spare-parts/add?code=${encodeURIComponent(viewItem.code)}`
                  );
                  setViewItem(null);
                }}
              >
                Edit
              </Btn>
            ) : null}
          </>
        }
      >
        {viewDetail ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(120px, 38%) 1fr",
              gap: "10px 16px",
              fontSize: 13,
            }}
          >
            {viewDetail.fields.map((field) => (
              <React.Fragment key={field.label}>
                <span className="muted">{field.label}</span>
                <span>{field.value}</span>
              </React.Fragment>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            Spare part details unavailable.
          </p>
        )}
      </Modal>

      {/* Issue stock out — the transaction that stamps `lastIssuedAt`. */}
      <Modal
        open={!!issueItem}
        onClose={() => {
          setIssueItem(null);
          setIssueForm(null);
        }}
        title={`Issue ${issueItem?.name ?? ""}`}
        sub={
          issueItem
            ? `${issueItem.code} · ${issueItem.stock} ${issueItem.unit} on hand`
            : undefined
        }
        footer={
          <>
            <Btn
              variant="ghost"
              onClick={() => {
                setIssueItem(null);
                setIssueForm(null);
              }}
            >
              Cancel
            </Btn>
            <Btn variant="primary" size="sm" disabled={issuing} onClick={submitIssue}>
              {issuing ? "Issuing…" : "Confirm issue"}
            </Btn>
          </>
        }
      >
        {issueForm ? (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label className="field-label" htmlFor="issue-qty">
                  Quantity ({issueItem?.unit}) *
                </label>
                <input
                  id="issue-qty"
                  className="input"
                  type="number"
                  min="0"
                  step="any"
                  max={issueItem?.stock}
                  value={issueForm.qty}
                  onChange={(e) =>
                    setIssueForm((f) => ({ ...f, qty: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="field-label" htmlFor="issue-date">
                  Issue date *
                </label>
                <input
                  id="issue-date"
                  className="input"
                  type="date"
                  max={dayjs().format("YYYY-MM-DD")}
                  value={issueForm.issuedAt}
                  onChange={(e) =>
                    setIssueForm((f) => ({ ...f, issuedAt: e.target.value }))
                  }
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label className="field-label" htmlFor="issue-to">
                  Issued to *
                </label>
                <input
                  id="issue-to"
                  className="input"
                  placeholder="Technician / department"
                  value={issueForm.issuedTo}
                  onChange={(e) =>
                    setIssueForm((f) => ({ ...f, issuedTo: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="field-label" htmlFor="issue-machine">
                  Machine
                </label>
                <input
                  id="issue-machine"
                  className="input"
                  placeholder="e.g. BM1"
                  value={issueForm.machineId}
                  onChange={(e) =>
                    setIssueForm((f) => ({ ...f, machineId: e.target.value }))
                  }
                />
              </div>
            </div>
            <div>
              <label className="field-label" htmlFor="issue-wo">
                Work order
              </label>
              <input
                id="issue-wo"
                className="input"
                placeholder="Optional reference"
                value={issueForm.workOrder}
                onChange={(e) =>
                  setIssueForm((f) => ({ ...f, workOrder: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="field-label" htmlFor="issue-notes">
                Notes
              </label>
              <textarea
                id="issue-notes"
                className="input"
                rows={2}
                value={issueForm.notes}
                onChange={(e) =>
                  setIssueForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </div>
            <p className="muted" style={{ fontSize: 12, margin: 0 }}>
              Stock drops to{" "}
              <strong>
                {Math.max(
                  0,
                  (issueItem?.stock ?? 0) - (parseFloat(issueForm.qty) || 0)
                )}{" "}
                {issueItem?.unit}
              </strong>{" "}
              and the last-issued date is set to{" "}
              {dayjs(issueForm.issuedAt).format("DD MMM YYYY")}.
            </p>
          </div>
        ) : null}
      </Modal>

      {/* Issue history — the ledger behind the Last issued column. */}
      <Modal
        open={!!historyFor}
        onClose={() => setHistoryFor(null)}
        title={`Issue history — ${historyFor?.name ?? ""}`}
        sub={historyFor?.code}
        wide
        footer={
          <Btn variant="ghost" onClick={() => setHistoryFor(null)}>
            Close
          </Btn>
        }
      >
        {historyLoading ? (
          <p className="muted" style={{ margin: 0 }}>Loading…</p>
        ) : history.length ? (
          <table className="erp-plain-table" style={{ width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Date</th>
                <th style={{ textAlign: "right" }}>Qty</th>
                <th style={{ textAlign: "left" }}>Machine</th>
                <th style={{ textAlign: "left" }}>Issued to</th>
                <th style={{ textAlign: "left" }}>Work order</th>
                <th style={{ textAlign: "left" }}>By</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="mono">{dayjs(h.issuedAt).format("DD MMM YYYY")}</td>
                  <td className="mono" style={{ textAlign: "right" }}>
                    {h.qty} {h.unit}
                  </td>
                  <td>{h.machineId || "—"}</td>
                  <td>{h.issuedTo}</td>
                  <td>{h.workOrder || "—"}</td>
                  <td className="muted">{h.issuedBy || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            No issues recorded for this part yet.
          </p>
        )}
      </Modal>
    </>
  );
};

export { SparePartsInventory };
