// @ts-nocheck
'use client';


import React, { useMemo, useState } from "react";
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
import { useDATA } from "./data";
import { Btn, Badge, StatusBadge, Avatar, Bar, Sparkline, Kpi, Modal, fmtINR, fmtINRFull, fmtNum, AreaChart, BarChart, Donut } from "./ui";
import { buildInventoryItemDetailView } from "@/lib/inventory-mobile";
import { DashHead, SectionH } from "./dashboards";

/* ============================================================
   MODULES PART 4 — Spare Parts + shared add modals
   ============================================================ */


/* ============================================================
   SPARE PARTS INVENTORY
   ============================================================ */
const SparePartsInventory = () => {
  const router = useRouter();
  const DATA = useDATA();
  const [viewItem, setViewItem] = useState(null);
  const [tab, setTab] = useState("all");

  const viewDetail = useMemo(() => {
    if (!viewItem) return null;
    return buildInventoryItemDetailView("spare-part", viewItem.code, DATA);
  }, [viewItem, DATA]);

  const filtered = tab === "all" ? DATA.SPARE_PARTS
    : tab === "low" ? DATA.SPARE_PARTS.filter(p => p.status === "low" || p.status === "critical")
    : tab === "critical" ? DATA.SPARE_PARTS.filter(p => p.critical)
    : DATA.SPARE_PARTS;

  const totalValue = DATA.SPARE_PARTS.reduce((s, p) => s + p.value, 0);
  const lowCount = DATA.SPARE_PARTS.filter(p => p.status === "low").length;
  const critCount = DATA.SPARE_PARTS.filter(p => p.status === "critical").length;
  const criticalSKUs = DATA.SPARE_PARTS.filter(p => p.critical).length;

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
        dataIndex: "lastIssued",
        key: "lastIssued",
        render: (v) => <span className="muted">{v}</span>,
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
        width: 88,
        align: "center",
        render: (_, p) => (
          <ViewEditActions
            onView={() => setViewItem(p)}
            editHref={`/inventory/spare-parts/add?code=${encodeURIComponent(p.code)}`}
          />
        ),
      },
    ],
    []
  );

  return (
    <>
      <DashHead title="Spare Parts Inventory" sub="Mechanical, electrical & instrumentation spares · reorder & breakdown alerts">
        <Btn size="sm" icon="filter">Filters</Btn>
        <Btn size="sm" icon="download">Export</Btn>
        <Btn variant="primary" size="sm" icon="plus" onClick={() => router.push("/inventory/spare-parts/add")}>Add spare part</Btn>
      </DashHead>

      <ErpStatGrid cols={4}>
        <StatCard
          icon={SettingOutlined}
          label="Total SKUs"
          value={DATA.SPARE_PARTS.length}
          hint={`${criticalSKUs} marked critical`}
        />
        <StatCard
          icon={DollarOutlined}
          label="Stock value"
          value={totalValue > 0 ? fmtINR(totalValue) : "—"}
          hint={`${DATA.SPARE_PARTS.length} SKUs`}
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
            <span className={`tab ${tab === "all" ? "active" : ""}`} onClick={() => setTab("all")}>All <span className="tab-count">{DATA.SPARE_PARTS.length}</span></span>
            <span className={`tab ${tab === "low" ? "active" : ""}`} onClick={() => setTab("low")}>Reorder / critical <span className="tab-count">{lowCount + critCount}</span></span>
            <span className={`tab ${tab === "critical" ? "active" : ""}`} onClick={() => setTab("critical")}>Critical SKUs <span className="tab-count">{criticalSKUs}</span></span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <select className="input" style={{ height: 30, width: 140 }}>
              <option>All categories</option>
              {DATA.SPARE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <input className="input" placeholder="Search SKU, part name…" style={{ height: 30, width: 220 }} />
          </div>
        </div>
        <div style={{ padding: 16 }}>
          <CommonTable
            {...ERP_TABLE_PROPS}
            columns={columns}
            dataSource={filtered}
            rowKey="code"
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
    </>
  );
};

export { SparePartsInventory };
