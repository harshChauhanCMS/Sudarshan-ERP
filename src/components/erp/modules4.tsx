// @ts-nocheck
'use client';


import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button as AntButton } from "antd";
import {
  AlertOutlined,
  AppstoreOutlined,
  CarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  MoreOutlined,
  SettingOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import CommonTable from "@/components/common/CommonTable";
import StatCard, { ErpStatGrid } from "@/components/common/StatCard";
import { ERP_TABLE_PROPS, inventoryStatusBadge } from "@/components/common/erpStatusBadges";
import { Icon } from "./icons";
import { useDATA } from "./data";
import { Btn, Badge, StatusBadge, Avatar, Bar, Sparkline, Kpi, Modal, fmtINR, fmtINRFull, fmtNum, AreaChart, BarChart, Donut } from "./ui";
import { EntityFormModal, FormField, FormGrid, FormInput, FormSelect, useFormState, requireFields } from "@/components/forms";
import { useEntityMutation } from "@/hooks/use-entity-mutation";
import { formatDisplayDate } from "@/lib/id-generators";
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
  const { update, saving, error, clearError } = useEntityMutation();
  const [issueOpen, setIssueOpen] = useState(null);
  const [issueQty, setIssueQty] = useState("1");
  const [tab, setTab] = useState("all");
  const issueSpare = async () => {
    if (!issueOpen) return;
    const qty = parseInt(issueQty, 10) || 0;
    const newStock = Math.max(0, issueOpen.stock - qty);
    let status = "ok";
    if (newStock === 0) status = "critical";
    else if (newStock <= issueOpen.reorder) status = "low";
    await update("spareParts", issueOpen.code, {
      stock: newStock,
      status,
      lastIssued: formatDisplayDate(),
    }, "code");
    setIssueOpen(null);
    setIssueQty("1");
  };

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
        width: 110,
        align: "center",
        render: (_, p) => (
          <div style={{ display: "flex", gap: 4, alignItems: "center", justifyContent: "center" }}>
            <AntButton type="link" size="small" onClick={() => setIssueOpen(p)}>
              Issue
            </AntButton>
            <AntButton type="text" size="small" icon={<MoreOutlined />} aria-label="More actions" />
          </div>
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
        <Btn variant="primary" size="sm" icon="plus" onClick={() => { clearError(); router.push("/inventory/spare-parts/add"); }}>Add spare part</Btn>
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

      <EntityFormModal open={!!issueOpen} onClose={() => setIssueOpen(null)} title={issueOpen ? `Issue ${issueOpen.name}` : ""} sub={issueOpen ? `In stock: ${issueOpen.stock} ${issueOpen.unit}` : ""} submitLabel="Issue & update stock" saving={saving} error={error} onSubmit={issueSpare}>
        <FormGrid>
          <FormField label="Quantity"><FormInput value={issueQty} onChange={setIssueQty} /></FormField>
        </FormGrid>
      </EntityFormModal>
    </>
  );
};

export { SparePartsInventory };
