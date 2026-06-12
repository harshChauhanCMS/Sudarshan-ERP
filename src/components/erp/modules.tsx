// @ts-nocheck
'use client';


import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button as AntButton } from "antd";
import { DownloadOutlined, MoreOutlined } from "@ant-design/icons";
import CommonTable from "@/components/common/CommonTable";
import { ERP_TABLE_PROPS, erpStatusBadge, inventoryStatusBadge } from "@/components/common/erpStatusBadges";
import { ErpViewAction, TableActionIcon } from "@/components/common/TableActionIcons";
import { Icon } from "./icons";
import { useDATA } from "./data";
import { Btn, Badge, StatusBadge, Avatar, Bar, Sparkline, Kpi, Modal, fmtINR, fmtINRFull, fmtNum, AreaChart, BarChart, Donut } from "./ui";
import { EntityFormModal, FormField, FormGrid, FormInput, FormSelect, useFormState, requireFields } from "@/components/forms";
import { useEntityMutation } from "@/hooks/use-entity-mutation";
import { nextDispatchId, formatDisplayDate } from "@/lib/id-generators";
import { DashHead, SectionH } from "./dashboards";

/* ============================================================
   MODULE SCREENS — Inventory, Procurement, Dispatch, Users, DS
   ============================================================ */


/* ============================================================
   RAW MATERIAL INVENTORY
   ============================================================ */
const RawMaterialInventory = () => {
  const router = useRouter();
  const DATA = useDATA();
  const { update, saving, error } = useEntityMutation();
  const [adjustOpen, setAdjustOpen] = useState(null);
  const [adjustQty, setAdjustQty] = useState("0");

  const saveAdjustment = async () => {
    if (!adjustOpen) return;
    const delta = parseFloat(adjustQty) || 0;
    const newStock = Math.max(0, adjustOpen.stock + delta);
    const reorder = adjustOpen.reorder;
    const minStock = adjustOpen.minStock ?? 0;
    let status = "ok";
    if (newStock <= 0 || (minStock > 0 && newStock <= minStock)) status = "critical";
    else if (newStock <= reorder) status = "low";
    await update("rawMaterials", adjustOpen.code, {
      stock: newStock,
      status,
      value: Math.round((newStock / Math.max(adjustOpen.stock, 1)) * adjustOpen.value),
    }, "code");
    setAdjustOpen(null);
    setAdjustQty("0");
  };

  const totalValue = DATA.RAW_MATERIALS.reduce((s, r) => s + r.value, 0);
  const lowCount = DATA.RAW_MATERIALS.filter(r => r.status === "low").length;
  const critCount = DATA.RAW_MATERIALS.filter(r => r.status === "critical").length;

  const columns = useMemo(
    () => [
      {
        title: "SKU",
        dataIndex: "code",
        key: "code",
        render: (code) => <span className="mono strong">{code}</span>,
      },
      {
        title: "Material",
        dataIndex: "name",
        key: "name",
        render: (name) => <span className="strong">{name}</span>,
      },
      { title: "Grade", dataIndex: "grade", key: "grade", render: (v) => <span className="muted">{v}</span> },
      { title: "Location", dataIndex: "location", key: "location", render: (v) => <span className="muted">{v}</span> },
      {
        title: "Stock",
        key: "stock",
        align: "right",
        render: (_, r) => (
          <>
            <span className="mono strong">{r.stock}</span>{" "}
            <span className="subtle" style={{ fontSize: 11 }}>{r.unit}</span>
          </>
        ),
      },
      {
        title: "Reorder at",
        key: "reorder",
        render: (_, r) => <span className="mono subtle">{r.reorder} {r.unit}</span>,
      },
      {
        title: "Stock level",
        key: "level",
        width: 120,
        render: (_, r) => {
          const pct = Math.min(100, (r.stock / (r.reorder * 3)) * 100);
          const tone = r.status === "critical" ? "danger" : r.status === "low" ? "warning" : "success";
          return <Bar value={pct} tone={tone} />;
        },
      },
      {
        title: "Value",
        dataIndex: "value",
        key: "value",
        align: "right",
        render: (v) => <span className="mono">{fmtINR(v)}</span>,
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
        render: (_, r) => (
          <div style={{ display: "flex", gap: 4, alignItems: "center", justifyContent: "center" }}>
            <AntButton type="link" size="small" onClick={() => setAdjustOpen(r)}>
              Adjust
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
      <DashHead title="Raw Material Inventory" sub="Minerals and chemicals · live stock & alerts">
        <Btn icon="filter" size="sm">Filters</Btn>
        <Btn icon="download" size="sm">Export</Btn>
        <Btn variant="primary" size="sm" icon="plus" onClick={() => router.push("/inventory/raw-material/add")}>Add stock</Btn>
      </DashHead>

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <div className="kpi">
          <div className="kpi-label"><Icon name="box" size={13} className="ico" />Total SKUs</div>
          <div className="kpi-value tabular">{DATA.RAW_MATERIALS.length}</div>
          <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>6 minerals · 4 chemicals</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="money" size={13} className="ico" />Inventory value</div>
          <div className="kpi-value">{fmtINR(totalValue)}</div>
          <div style={{ fontSize: 11, color: "var(--success)" }}>+4.8% vs last week</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="alert" size={13} className="ico" />Low stock</div>
          <div className="kpi-value" style={{ color: lowCount > 0 ? "var(--warning)" : "var(--fg)" }}>{lowCount}</div>
          <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>Reorder recommended</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="alert" size={13} className="ico" />Critical</div>
          <div className="kpi-value" style={{ color: "var(--danger)" }}>{critCount}</div>
          <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>Affects 2 active orders</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--border)" }}>
          <div className="tabs" style={{ border: "none", marginBottom: -1 }}>
            <span className="tab active">All <span className="tab-count">10</span></span>
            <span className="tab">Minerals <span className="tab-count">6</span></span>
            <span className="tab">Chemicals <span className="tab-count">4</span></span>
            <span className="tab">Alerts <span className="tab-count">3</span></span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ position: "relative" }}>
              <Icon name="search" size={13} style={{ position: "absolute", left: 10, top: 9, color: "var(--fg-subtle)" }} />
              <input className="input" style={{ paddingLeft: 30, width: 220, height: 30 }} placeholder="Search SKU, name, grade…" />
            </div>
            <Btn size="sm" icon="sort">Sort</Btn>
          </div>
        </div>
        <div style={{ padding: 16 }}>
          <CommonTable
            {...ERP_TABLE_PROPS}
            columns={columns}
            dataSource={DATA.RAW_MATERIALS}
            rowKey="code"
          />
        </div>
      </div>

      <EntityFormModal open={!!adjustOpen} onClose={() => setAdjustOpen(null)} title={adjustOpen ? `Adjust stock · ${adjustOpen.name}` : ""} sub={adjustOpen ? `Current: ${adjustOpen.stock} ${adjustOpen.unit}` : ""} submitLabel="Save adjustment" saving={saving} error={error} onSubmit={saveAdjustment}>
        <FormGrid>
          <FormField label="Adjustment (+/- qty)"><FormInput value={adjustQty} onChange={setAdjustQty} /></FormField>
        </FormGrid>
      </EntityFormModal>
    </>
  );
};

/* ============================================================
   VENDORS & PROCUREMENT (Vendors list + POs)
   ============================================================ */
const Vendors = ({ defaultTab = "vendors" }: { defaultTab?: "vendors" | "po" }) => {
  const router = useRouter();
  const DATA = useDATA();
  const [tab, setTab] = useState(defaultTab);
  const vendorColumns = useMemo(
    () => [
      {
        title: "ID",
        dataIndex: "id",
        key: "id",
        render: (id) => <span className="mono strong">{id}</span>,
      },
      {
        title: "Vendor",
        dataIndex: "name",
        key: "name",
        render: (name, row, index) => (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar name={name} color={(index % 5) + 1} />
            <div>
              <div className="strong">{name}</div>
              <div className="subtle" style={{ fontSize: 11 }}>
                {row.city}
              </div>
            </div>
          </div>
        ),
      },
      {
        title: "Category",
        dataIndex: "category",
        key: "category",
        render: (category) => (
          <Badge
            tone={
              category === "Raw Material"
                ? "primary"
                : category === "Chemical"
                  ? "info"
                  : category === "Packaging"
                    ? "gold"
                    : "default"
            }
          >
            {category}
          </Badge>
        ),
      },
      {
        title: "Rating",
        dataIndex: "rating",
        key: "rating",
        align: "center",
        render: (rating) => (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: "var(--secondary)" }}>★</span>
            <span className="mono strong">{rating}</span>
          </div>
        ),
      },
      {
        title: "POs YTD",
        dataIndex: "poCount",
        key: "poCount",
        render: (poCount) => <span className="mono">{poCount}</span>,
      },
      {
        title: "YTD Spend",
        dataIndex: "ytd",
        key: "ytd",
        align: "right",
        render: (ytd) => <span className="num">{fmtINR(ytd)}</span>,
      },
      {
        title: "Actions",
        key: "actions",
        width: 72,
        align: "center",
        render: () => <ErpViewAction />,
      },
    ],
    []
  );

  const poColumns = useMemo(
    () => [
      {
        title: "PO #",
        dataIndex: "id",
        key: "id",
        render: (id) => <span className="mono strong">{id}</span>,
      },
      { title: "Vendor", dataIndex: "vendor", key: "vendor" },
      {
        title: "Items",
        dataIndex: "items",
        key: "items",
        render: (items) => <span className="mono subtle">{items} items</span>,
      },
      {
        title: "Date",
        dataIndex: "date",
        key: "date",
        render: (date) => <span className="muted">{date}</span>,
      },
      {
        title: "Total",
        dataIndex: "total",
        key: "total",
        align: "right",
        render: (total) => <span className="num">{fmtINRFull(total)}</span>,
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (status) => erpStatusBadge(status),
      },
      {
        title: "Invoice",
        dataIndex: "invoice",
        key: "invoice",
        render: (invoice) => erpStatusBadge(invoice),
      },
      {
        title: "Actions",
        key: "actions",
        width: 88,
        align: "center",
        render: () => (
          <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>
            <ErpViewAction label="View purchase order" />
            <TableActionIcon icon={<DownloadOutlined />} label="Download purchase order" />
          </div>
        ),
      },
    ],
    []
  );

  return (
    <>
      <DashHead title="Vendors & Procurement" sub="Manage vendors, purchase orders, and supplier history">
        <Btn icon="upload" size="sm">Import</Btn>
        <Btn icon="download" size="sm">Export</Btn>
        {tab === "vendors" ? (
          <Btn variant="primary" size="sm" icon="plus" onClick={() => router.push("/procurement/vendors/add")}>Add vendor</Btn>
        ) : (
          <Btn variant="primary" size="sm" icon="plus" onClick={() => router.push("/procurement/po/add")}>Create PO</Btn>
        )}
      </DashHead>

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <div className="kpi">
          <div className="kpi-label"><Icon name="users" size={13} className="ico" />Active vendors</div>
          <div className="kpi-value tabular">{DATA.VENDORS.length}</div>
          <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>2 added this month</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="cart" size={13} className="ico" />Open POs</div>
          <div className="kpi-value tabular">{DATA.PURCHASE_ORDERS.filter((p) => p.status !== "received").length}</div>
          <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>{DATA.PURCHASE_ORDERS.filter((p) => p.status === "pending").length} pending</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="money" size={13} className="ico" />PO spend · MTD</div>
          <div className="kpi-value">{fmtINR(DATA.PURCHASE_ORDERS.reduce((s, p) => s + p.total, 0))}</div>
          <div style={{ fontSize: 11, color: "var(--success)" }}>From database</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="alert" size={13} className="ico" />Invoice mismatches</div>
          <div className="kpi-value" style={{ color: "var(--danger)" }}>{DATA.INVOICES.filter((i) => i.status === "mismatch").length}</div>
          <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>Needs verification</div>
        </div>
      </div>

      <div className="card">
        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
          <div className="tabs" style={{ border: "none", marginBottom: -1 }}>
            <span className={`tab ${tab === "vendors" ? "active" : ""}`} onClick={() => setTab("vendors")}>
              Vendors <span className="tab-count">{DATA.VENDORS.length}</span>
            </span>
            <span className={`tab ${tab === "po" ? "active" : ""}`} onClick={() => setTab("po")}>
              Purchase Orders <span className="tab-count">{DATA.PURCHASE_ORDERS.length}</span>
            </span>
          </div>
        </div>
        {tab === "vendors" && (
          <div style={{ padding: 16 }}>
            <CommonTable
              {...ERP_TABLE_PROPS}
              columns={vendorColumns}
              dataSource={DATA.VENDORS}
              rowKey="id"
            />
          </div>
        )}
        {tab === "po" && (
          <div style={{ padding: 16 }}>
            <CommonTable
              {...ERP_TABLE_PROPS}
              columns={poColumns}
              dataSource={DATA.PURCHASE_ORDERS}
              rowKey="id"
            />
          </div>
        )}
      </div>
    </>
  );
};

/* ============================================================
   DISPATCH & TRACKING
   ============================================================ */
const DispatchTracking = () => {
  const DATA = useDATA();
  const { append, saving, error, clearError } = useEntityMutation();
  const [openTrack, setOpenTrack] = useState(null);
  const [planOpen, setPlanOpen] = useState(false);
  const dispatchForm = useFormState({
    orderId: DATA.ORDERS[0]?.id ?? "",
    dispatchId: nextDispatchId(DATA.DISPATCHES),
    vehicle: "RJ-27-GH-4521",
    driver: "Ramesh Kumar",
    route: "Udaipur → Mumbai",
    loaded: "24 MT",
    eta: formatDisplayDate(),
  });

  const scheduleDispatch = async () => {
    const order = DATA.ORDERS.find((o) => o.id === dispatchForm.values.orderId);
    await append("dispatches", {
      id: dispatchForm.values.dispatchId || nextDispatchId(DATA.DISPATCHES),
      vehicle: dispatchForm.values.vehicle,
      driver: dispatchForm.values.driver,
      customer: order?.customer ?? "—",
      route: dispatchForm.values.route,
      loaded: dispatchForm.values.loaded,
      eta: dispatchForm.values.eta,
      progress: 0,
      status: "loading",
      lastUpdate: "just now",
    });
    setPlanOpen(false);
  };

  const inTransit = DATA.DISPATCHES.filter((d) => d.status === "in-transit").length;

  const dispatchColumns = useMemo(
    () => [
      {
        title: "Dispatch",
        dataIndex: "id",
        key: "id",
        render: (id) => <span className="mono strong">{id}</span>,
      },
      {
        title: "Vehicle",
        dataIndex: "vehicle",
        key: "vehicle",
        render: (vehicle) => <span className="mono">{vehicle}</span>,
      },
      {
        title: "Driver",
        dataIndex: "driver",
        key: "driver",
        render: (driver, row) => (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar name={driver} color={(row.id.charCodeAt(row.id.length - 1) % 5) + 1} />
            <div>{driver}</div>
          </div>
        ),
      },
      {
        title: "Customer",
        dataIndex: "customer",
        key: "customer",
        render: (customer) => <span className="muted">{customer}</span>,
      },
      {
        title: "Route",
        dataIndex: "route",
        key: "route",
        render: (route) => <span className="muted" style={{ fontSize: 12 }}>{route}</span>,
      },
      {
        title: "Load",
        dataIndex: "loaded",
        key: "loaded",
        render: (loaded) => <span className="num">{loaded}</span>,
      },
      {
        title: "Progress",
        dataIndex: "progress",
        key: "progress",
        width: 130,
        render: (progress, row) => (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Bar value={progress} tone={row.status === "near-delivery" ? "gold" : row.status === "delivered" ? "success" : "primary"} />
            <span className="mono" style={{ fontSize: 11, width: 30, textAlign: "right" }}>
              {progress}%
            </span>
          </div>
        ),
      },
      {
        title: "ETA",
        dataIndex: "eta",
        key: "eta",
        render: (eta) => <span className="mono" style={{ fontSize: 12 }}>{eta}</span>,
      },
      {
        title: "Update",
        dataIndex: "lastUpdate",
        key: "lastUpdate",
        render: (lastUpdate) => <span className="subtle" style={{ fontSize: 11 }}>{lastUpdate}</span>,
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (status) => erpStatusBadge(status),
      },
      {
        title: "Actions",
        key: "actions",
        width: 72,
        align: "center",
        render: () => <ErpViewAction label="View dispatch" />,
      },
    ],
    []
  );

  return (
    <>
      <DashHead title="Dispatch & Vehicle Tracking" sub="Live deliveries, ETAs and driver communication">
        <Btn icon="map" size="sm">Map view</Btn>
        <Btn icon="bell" size="sm">Reminders</Btn>
        <Btn variant="primary" size="sm" icon="plus" onClick={() => { clearError(); setPlanOpen(true); }}>Plan dispatch</Btn>
      </DashHead>

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <div className="kpi"><div className="kpi-label"><Icon name="truck" size={13} className="ico" />Active vehicles</div><div className="kpi-value tabular">{DATA.DISPATCHES.length}</div><div style={{ fontSize: 11, color: "var(--fg-muted)" }}>{inTransit} in transit</div></div>
        <div className="kpi"><div className="kpi-label"><Icon name="bolt" size={13} className="ico" />On-time rate</div><div className="kpi-value">94.2<span className="unit">%</span></div><div style={{ fontSize: 11, color: "var(--success)" }}>+1.2pp this month</div></div>
        <div className="kpi"><div className="kpi-label"><Icon name="alert" size={13} className="ico" />Delayed</div><div className="kpi-value" style={{ color: "var(--danger)" }}>2</div><div style={{ fontSize: 11, color: "var(--fg-muted)" }}>1 weather · 1 traffic</div></div>
        <div className="kpi"><div className="kpi-label"><Icon name="clock" size={13} className="ico" />Avg transit</div><div className="kpi-value">11.4<span className="unit">hrs</span></div><div style={{ fontSize: 11, color: "var(--success)" }}>−24 min vs Apr</div></div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 420px", marginBottom: 20 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title"><Icon name="map" size={14} /> Live fleet map</div>
            <Badge tone="success" dot>Live</Badge>
          </div>
          <div className="card-body"><FleetMap /></div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title"><Icon name="bell" size={14} /> Reminders & alerts</div>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { sev: "danger",  t: "DSP-1040 delayed by 90 min",          d: "Heavy traffic near Allahabad · ETA shifted to May 24, 07:30" },
              { sev: "warning", t: "DSP-1037 still loading at Plant A",   d: "Scheduled to leave at 14:00 · 32 min overdue" },
              { sev: "info",    t: "Driver Manoj Singh idle for 2.5 hrs", d: "Last known: Nagpur fuel stop · sent ping" },
              { sev: "success", t: "DSP-1039 near customer",              d: "Nirma Bhavnagar — 4.2 km · 12 min ETA" },
            ].map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: 10, background: "var(--bg-sunken)", borderRadius: 8 }}>
                <span style={{ width: 3, borderRadius: 2, background: `var(--${a.sev})` }}></span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{a.t}</div>
                  <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 2 }}>{a.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title"><Icon name="truck" size={14} /> All dispatches</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" placeholder="Search by ID, vehicle, driver…" style={{ width: 240, height: 30 }} />
            <Btn size="sm" icon="filter">Filter</Btn>
          </div>
        </div>
        <div style={{ padding: 16 }}>
          <CommonTable
            {...ERP_TABLE_PROPS}
            columns={dispatchColumns}
            dataSource={DATA.DISPATCHES}
            rowKey="id"
            onRow={(dispatch) => ({
              onClick: () => setOpenTrack(dispatch),
              style: { cursor: "pointer" },
            })}
          />
        </div>
      </div>

      <Modal
        open={!!openTrack}
        onClose={() => setOpenTrack(null)}
        title={openTrack ? `Track ${openTrack.id}` : ""}
        sub={openTrack ? `${openTrack.vehicle} · ${openTrack.driver}` : ""}
        wide
      >
        {openTrack && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20 }}>
            <div>
              <div className="map-frame" style={{ height: 280, marginBottom: 16 }}>
                <FleetMap />
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "var(--fg-muted)" }}>JOURNEY TIMELINE</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { t: "Loaded out", ts: "May 21, 06:42", loc: "Plant A · Udaipur", done: true },
                  { t: "Weighbridge cleared", ts: "May 21, 07:18", loc: "Udaipur Toll Plaza", done: true },
                  { t: "Last ping",  ts: openTrack.lastUpdate, loc: "Nagpur Bypass · 168 km in", done: true, active: true },
                  { t: "Customer ETA", ts: openTrack.eta, loc: openTrack.customer, done: false },
                ].map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 12 }}>
                    <div style={{ position: "relative" }}>
                      <span className={`dot ${s.done ? (s.active ? "primary pulse" : "success") : ""}`} style={{ width: 12, height: 12, border: "2px solid var(--bg-elev)", boxShadow: "0 0 0 1px var(--border)" }}></span>
                      {i < 3 && <span style={{ position: "absolute", left: 5, top: 14, bottom: -10, width: 2, background: s.done ? "var(--success)" : "var(--border)" }}></span>}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{s.t}</div>
                      <div style={{ fontSize: 11, color: "var(--fg-subtle)" }}>{s.ts} · {s.loc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="card-body" style={{ padding: 14 }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-subtle)", fontWeight: 600, marginBottom: 6 }}>Driver</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <Avatar name={openTrack.driver} color={1} size="lg" />
                    <div>
                      <div style={{ fontWeight: 600 }}>{openTrack.driver}</div>
                      <div className="subtle" style={{ fontSize: 11 }}>+91 98•••••328</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn variant="default" size="sm" icon="phone" className="grow">Call</Btn>
                    <Btn variant="default" size="sm" icon="speech" className="grow">Message</Btn>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-body" style={{ padding: 14 }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-subtle)", fontWeight: 600, marginBottom: 10 }}>Trip details</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Customer</span><span className="strong">{openTrack.customer}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Route</span><span>{openTrack.route}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Loaded</span><span className="mono strong">{openTrack.loaded}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Vehicle</span><span className="mono">{openTrack.vehicle}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">ETA</span><span className="mono">{openTrack.eta}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Status</span><StatusBadge status={openTrack.status} /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <EntityFormModal open={planOpen} onClose={() => setPlanOpen(false)} title="Plan new dispatch" sub="Assign vehicle, driver and route" wide submitLabel="Schedule dispatch" saving={saving} error={error} onSubmit={scheduleDispatch}>
        <FormGrid>
          <FormField label="Sales order">
            <FormSelect value={dispatchForm.values.orderId} onChange={(v) => dispatchForm.setField("orderId", v)}>
              {DATA.ORDERS.map((o) => <option key={o.id} value={o.id}>{o.id} · {o.customer}</option>)}
            </FormSelect>
          </FormField>
          <FormField label="Dispatch #"><FormInput value={dispatchForm.values.dispatchId} onChange={(v) => dispatchForm.setField("dispatchId", v)} /></FormField>
          <FormField label="Vehicle"><FormInput value={dispatchForm.values.vehicle} onChange={(v) => dispatchForm.setField("vehicle", v)} /></FormField>
          <FormField label="Driver"><FormInput value={dispatchForm.values.driver} onChange={(v) => dispatchForm.setField("driver", v)} /></FormField>
          <FormField label="Route"><FormInput value={dispatchForm.values.route} onChange={(v) => dispatchForm.setField("route", v)} /></FormField>
          <FormField label="Load"><FormInput value={dispatchForm.values.loaded} onChange={(v) => dispatchForm.setField("loaded", v)} /></FormField>
        </FormGrid>
      </EntityFormModal>
    </>
  );
};

const FleetMap = () => {
  const cities = [
    { x: 52, y: 38, n: "Udaipur", t: "Plant A" },
    { x: 32, y: 56, n: "Ahmedabad", t: "Plant B" },
    { x: 28, y: 78, n: "Mumbai" },
    { x: 38, y: 90, n: "Pune" },
    { x: 80, y: 78, n: "Kolkata" },
    { x: 24, y: 64, n: "Bhavnagar" },
  ];
  const routes = [
    { from: [52, 38], to: [28, 78], color: "var(--primary)", progress: 0.68 },
    { from: [32, 56], to: [28, 78], color: "var(--info)", progress: 0.42 },
    { from: [52, 38], to: [80, 78], color: "var(--primary)", progress: 0.24 },
    { from: [32, 56], to: [24, 64], color: "var(--secondary)", progress: 0.92 },
  ];
  return (
    <div className="map-frame" style={{ height: 320, position: "relative" }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
        <path d="M 20 20 Q 28 14 38 16 L 50 12 Q 62 10 72 18 L 84 22 Q 92 30 88 42 L 86 56 Q 82 72 70 82 L 56 92 Q 42 94 36 88 L 28 80 Q 20 70 18 56 L 18 38 Q 16 28 20 20 Z"
              fill="rgba(55,77,149,0.04)" stroke="rgba(55,77,149,0.15)" strokeWidth="0.4" strokeDasharray="0.6 0.6" />
        {routes.map((r, i) => (
          <g key={i}>
            <line x1={r.from[0]} y1={r.from[1]} x2={r.to[0]} y2={r.to[1]} stroke={r.color} strokeWidth="0.4" strokeDasharray="0.8 0.8" opacity="0.4" />
            <line x1={r.from[0]} y1={r.from[1]}
                  x2={r.from[0] + (r.to[0] - r.from[0]) * r.progress}
                  y2={r.from[1] + (r.to[1] - r.from[1]) * r.progress}
                  stroke={r.color} strokeWidth="0.6" strokeLinecap="round" />
          </g>
        ))}
      </svg>
      {cities.map((c, i) => (
        <div key={`d-${i}`} style={{
          position: "absolute",
          left: `${c.x}%`, top: `${c.y}%`,
          transform: "translate(-50%, -50%)",
          width: c.t ? 10 : 6, height: c.t ? 10 : 6,
          borderRadius: "50%",
          background: c.t ? "var(--primary)" : "#5a5e66",
          boxShadow: c.t ? "0 0 0 4px rgba(55,77,149,0.18)" : "0 0 0 3px rgba(90,94,102,0.18)",
          pointerEvents: "none",
        }}></div>
      ))}
      {routes.map((r, i) => (
        <div key={`m-${i}`} style={{
          position: "absolute",
          left: `${r.from[0] + (r.to[0] - r.from[0]) * r.progress}%`,
          top: `${r.from[1] + (r.to[1] - r.from[1]) * r.progress}%`,
          transform: "translate(-50%, -50%)",
          width: 12, height: 12, borderRadius: "50%",
          background: r.color,
          boxShadow: `0 0 0 5px ${r.color === "var(--secondary)" ? "rgba(232,169,1,0.22)" : "rgba(55,77,149,0.20)"}`,
          animation: "pulse 1.6s ease-in-out infinite",
          pointerEvents: "none",
        }}></div>
      ))}
      {cities.map((c, i) => (
        <div key={i} style={{
          position: "absolute", left: `${c.x}%`, top: `${c.y}%`,
          transform: "translate(10px, -50%)", fontSize: 11,
          color: c.t ? "var(--primary)" : "var(--fg-muted)",
          fontWeight: c.t ? 600 : 500, whiteSpace: "nowrap", pointerEvents: "none",
        }}>
          {c.n}{c.t && <span style={{ marginLeft: 4, color: "var(--fg-subtle)", fontWeight: 400 }}>· {c.t}</span>}
        </div>
      ))}
    </div>
  );
};

export { RawMaterialInventory, Vendors, DispatchTracking };
