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
import { Select, message } from "antd";

/* ============================================================
   MODULES PART 4 — Spare Parts + shared add modals
   ============================================================ */


/* ============================================================
   SPARE PARTS INVENTORY
   ============================================================ */
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
        width: 120,
        align: "center",
        render: (_, p) => (
          <ViewEditActions
            onView={() => setViewItem(p)}
            editHref={`/inventory/spare-parts/add?code=${encodeURIComponent(p.code)}`}
            showDelete
            onDelete={() => deleteSparePart(p.code)}
            deleteLabel={deletingCode === p.code ? "Deleting…" : "Delete"}
            deleteConfirmTitle={`Delete ${p.code}? This cannot be undone.`}
          />
        ),
      },
    ],
    [deletingCode, deleteSparePart]
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
    </>
  );
};

export { SparePartsInventory };
