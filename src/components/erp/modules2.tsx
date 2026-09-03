// @ts-nocheck
'use client';


import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Select, DatePicker, Button as AntButton, message } from "antd";
import CommonTable from "@/components/common/CommonTable";
import { ERP_TABLE_PROPS, erpStatusBadge, customerStatusBadge, invoiceStatusBadge } from "@/components/common/erpStatusBadges";
import { ErpViewAction, TableActionIcon } from "@/components/common/TableActionIcons";
import {
  AlertOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  EyeOutlined,
  FileTextOutlined,
  FilterOutlined,
  LineChartOutlined,
  LoadingOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UnorderedListOutlined,
  EnvironmentOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import PageFilterPanel from "@/components/common/PageFilterPanel";
import StatCard, { ErpStatGrid, mapDashStatTone } from "@/components/common/StatCard";
import dayjs from "dayjs";
import { Icon } from "./icons";
import { useDATA } from "./data";
import { useEmployees } from "@/hooks/use-employees";
import { useFieldVisitHistory } from "@/hooks/use-field-visit-history";
import { FIELD_VISIT_STATUSES, FIELD_VISIT_TYPES } from "@/lib/field-visit-types";
import { FIELD_VISIT_COMPANY_OPTIONS } from "@/lib/field-visit-form";
import {
  formatVisitDurationMinutes,
  getVisitAcceptToCloseMinutes,
  getVisitClosingRemark,
  visitStatusLabel,
} from "@/lib/field-visit-display";
import { useCustomers } from "@/hooks/use-customers";
import { useInvoices } from "@/hooks/use-invoices";
import {
  INVOICE_STATUS_LABELS,
  canInvoiceTransition,
  canPoTransition,
} from "@/lib/procurement-workflow";
import {
  markInvoiceMismatch,
  raiseInvoice,
  resubmitInvoice as resubmitInvoiceApi,
  verifyInvoice as verifyInvoiceApi,
} from "@/lib/procurement-api";
import { Btn, Badge, StatusBadge, Avatar, Bar, Sparkline, Kpi, Modal, fmtINR, fmtINRFull, fmtNum, AreaChart, BarChart, Donut } from "./ui";
import { useOrders } from "@/hooks/use-orders";
import { FormGrid, FormField, FormInput, FormSelect, EntityFormModal, requireFields, useFormState } from "@/components/forms";
import { useEntityMutation } from "@/hooks/use-entity-mutation";
import { nextCustomerId, nextOrderId, nextFieldVisitId, formatDueDate, formatDisplayDate } from "@/lib/id-generators";
import { DashHead, SectionH } from "./dashboards";

/* ============================================================
   MODULES PART 2 — Customers, Orders, Field Sales, Invoice Verify
   ============================================================ */


function detailGrid(fields) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(120px, 38%) 1fr",
        gap: "10px 16px",
        fontSize: 13,
      }}
    >
      {fields.map((field) => (
        <React.Fragment key={field.label}>
          <span className="muted">{field.label}</span>
          <span>{field.value}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

function customerDetailFields(c) {
  const openAr = Math.round(c.ytd * 0.18);
  return [
    { label: "Customer ID", value: c.id },
    { label: "Name", value: c.name },
    { label: "City", value: c.city || "—" },
    { label: "Status", value: c.status || "active" },
    { label: "Terms", value: c.terms || "—" },
    { label: "Orders", value: String(c.orders ?? 0) },
    { label: "YTD revenue", value: fmtINR(c.ytd) },
    { label: "Open AR", value: fmtINR(openAr) },
    { label: "Contact", value: c.contact || "—" },
    { label: "Phone", value: c.phone || "—" },
    { label: "Email", value: c.email || "—" },
    { label: "GSTIN", value: c.gstin || "—" },
    { label: "PAN", value: c.pan || "—" },
    { label: "Industry", value: c.industryType || "—" },
    {
      label: "Credit limit",
      value: c.creditLimit != null ? fmtINR(c.creditLimit) : "—",
    },
    { label: "Assigned to", value: c.assignedTo || "—" },
    { label: "Billing address", value: c.billingAddress || "—" },
    { label: "Dispatch address", value: c.dispatchAddress || "—" },
    { label: "Preferred grades", value: c.preferredGrades || "—" },
    { label: "Payment terms", value: c.paymentTerms || c.terms || "—" },
    { label: "Notes", value: c.notes || "—" },
  ];
}

/* ============================================================
   CUSTOMERS
   ============================================================ */
const Customers = () => {
  const router = useRouter();
  const DATA = useDATA();
  const [tab, setTab] = useState("all");
  const [viewCustomer, setViewCustomer] = useState(null);

  const activeCount = DATA.CUSTOMERS.filter((c) => (c.status ?? "active") === "active").length;
  const holdCount = DATA.CUSTOMERS.filter((c) => c.status === "hold").length;
  const receivables = DATA.CUSTOMERS.reduce((s, c) => s + Math.round(c.ytd * 0.18), 0);

  const filtered =
    tab === "all"
      ? DATA.CUSTOMERS
      : tab === "hold"
        ? DATA.CUSTOMERS.filter((c) => c.status === "hold")
        : tab === "active"
          ? DATA.CUSTOMERS.filter((c) => (c.status ?? "active") === "active")
          : DATA.CUSTOMERS.filter((c) => c.status === "prospect");

  const customerColumns = useMemo(
    () => [
      {
        title: "ID",
        dataIndex: "id",
        key: "id",
        render: (id) => <span className="mono strong">{id}</span>,
      },
      {
        title: "Customer",
        dataIndex: "name",
        key: "name",
        render: (name, _row, index) => (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar name={name} color={(index % 5) + 1} />
            <div className="strong">{name}</div>
          </div>
        ),
      },
      {
        title: "City",
        dataIndex: "city",
        key: "city",
        render: (city) => <span className="muted">{city}</span>,
      },
      {
        title: "Terms",
        dataIndex: "terms",
        key: "terms",
        render: (terms) => <Badge sq>{terms}</Badge>,
      },
      {
        title: "Orders",
        dataIndex: "orders",
        key: "orders",
        align: "right",
        render: (orders) => <span className="num">{orders}</span>,
      },
      {
        title: "YTD revenue",
        dataIndex: "ytd",
        key: "ytd",
        align: "right",
        render: (ytd) => <span className="num">{fmtINR(ytd)}</span>,
      },
      {
        title: "Open AR",
        key: "openAr",
        align: "right",
        render: (_, c) => <span className="num">{fmtINR(Math.round(c.ytd * 0.18))}</span>,
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (status) => customerStatusBadge(status),
      },
      {
        title: "Actions",
        key: "actions",
        width: 72,
        align: "center",
        render: (_, row) => (
          <ErpViewAction label="View customer" onClick={() => setViewCustomer(row)} />
        ),
      },
    ],
    []
  );

  return (
    <>
      <DashHead title="Customers" sub="Customer master · contacts · credit terms · order history">
        <Btn icon="upload" size="sm">Import CSV</Btn>
        <Btn variant="primary" size="sm" icon="plus" onClick={() => router.push("/customers/add")}>Add customer</Btn>
      </DashHead>

      <ErpStatGrid cols={4}>
        <StatCard
          icon={TeamOutlined}
          label="Total customers"
          value={DATA.CUSTOMERS.length}
          hint={`${activeCount} active`}
        />
        <StatCard
          icon={ShoppingCartOutlined}
          label="With orders"
          value={DATA.CUSTOMERS.filter((c) => c.orders > 0).length}
          hint="From database"
          hintTone="positive"
        />
        <StatCard
          icon={DollarOutlined}
          label="Receivables"
          value={fmtINR(receivables)}
          hint="Est. 18% of YTD"
          hintTone="warning"
        />
        <StatCard
          icon={AlertOutlined}
          label="Credit holds"
          value={holdCount}
          hint="Review required"
          hintTone={holdCount ? "negative" : "default"}
        />
      </ErpStatGrid>

      <div className="card">
        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center" }}>
          <div className="tabs" style={{ border: "none", marginBottom: -1 }}>
            <span className={`tab ${tab === "all" ? "active" : ""}`} onClick={() => setTab("all")}>All <span className="tab-count">{DATA.CUSTOMERS.length}</span></span>
            <span className={`tab ${tab === "active" ? "active" : ""}`} onClick={() => setTab("active")}>Active <span className="tab-count">{activeCount}</span></span>
            <span className={`tab ${tab === "hold" ? "active" : ""}`} onClick={() => setTab("hold")}>On hold <span className="tab-count">{holdCount}</span></span>
            <span className={`tab ${tab === "prospect" ? "active" : ""}`} onClick={() => setTab("prospect")}>Prospects <span className="tab-count">{DATA.CUSTOMERS.filter((c) => c.status === "prospect").length}</span></span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <input className="input" placeholder="Search customers…" style={{ height: 30, width: 220 }} />
            <Btn size="sm" icon="filter">Filter</Btn>
          </div>
        </div>
        <div style={{ padding: 16 }}>
          <CommonTable
            {...ERP_TABLE_PROPS}
            columns={customerColumns}
            dataSource={filtered}
            rowKey="id"
            locale={{
              emptyText: (
                <span className="muted">
                  No customers yet. Add one or run <code>npm run seed</code>.
                </span>
              ),
            }}
          />
        </div>
      </div>

      <Modal
        open={!!viewCustomer}
        onClose={() => setViewCustomer(null)}
        title={viewCustomer?.name ?? "Customer"}
        sub={viewCustomer ? `${viewCustomer.id} · ${viewCustomer.city}` : ""}
        footer={
          <Btn variant="ghost" onClick={() => setViewCustomer(null)}>
            Close
          </Btn>
        }
      >
        {viewCustomer ? detailGrid(customerDetailFields(viewCustomer)) : null}
      </Modal>
    </>
  );
};

/* ============================================================
   CUSTOMER ORDERS
   ============================================================ */
const CustomerOrders = () => {
  const router = useRouter();
  const { orders, loading, error, reload } = useOrders();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");

  const handleRefresh = async () => {
    await reload();
    message.success("Refreshed");
  };

  const ORDERS_EXT = orders;
  const openOrders = ORDERS_EXT.filter((o) => o.status !== "delivered").length;
  const bookValue = ORDERS_EXT.reduce((s, o) => s + (Number(o.value) || 0), 0);
  const atRisk = ORDERS_EXT.filter((o) => o.progress < 50 && o.status !== "delivered").length;

  const tabFiltered = tab === "all" ? ORDERS_EXT : ORDERS_EXT.filter((o) => o.status === tab);
  const searchLower = search.trim().toLowerCase();
  const filtered = searchLower
    ? tabFiltered.filter(
        (o) =>
          o.id.toLowerCase().includes(searchLower) ||
          o.customer.toLowerCase().includes(searchLower) ||
          o.product.toLowerCase().includes(searchLower)
      )
    : tabFiltered;

  const orderColumns = useMemo(
    () => [
      {
        title: "SO #",
        dataIndex: "id",
        key: "id",
        render: (id) => <span className="mono strong">{id}</span>,
      },
      { title: "Customer", dataIndex: "customer", key: "customer" },
      {
        title: "Product",
        dataIndex: "product",
        key: "product",
        render: (product) => <span className="muted">{product}</span>,
      },
      {
        title: "Qty",
        dataIndex: "qty",
        key: "qty",
        align: "right",
        render: (qty) => <span className="num">{qty}</span>,
      },
      {
        title: "Value",
        dataIndex: "value",
        key: "value",
        align: "right",
        render: (value) => <span className="num">{fmtINRFull(value)}</span>,
      },
      {
        title: "Due",
        dataIndex: "due",
        key: "due",
        render: (due) => <span className="num nowrap">{due}</span>,
      },
      {
        title: "Progress",
        dataIndex: "progress",
        key: "progress",
        width: 140,
        render: (progress) => (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Bar value={progress} tone={progress === 100 ? "success" : "primary"} />
            <span className="mono" style={{ fontSize: 11, width: 32, textAlign: "right" }}>
              {progress}%
            </span>
          </div>
        ),
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
        render: (_, row) => (
          <ErpViewAction label="View order" href={`/orders/${encodeURIComponent(row.id)}`} />
        ),
      },
    ],
    []
  );

  return (
    <>
      <DashHead title="Customer Orders" sub="Sales orders loaded from database">
        <Btn
          variant="secondary"
          size="sm"
          icon={loading ? undefined : "refresh"}
          onClick={() => void handleRefresh()}
          disabled={loading}
        >
          {loading ? <LoadingOutlined spin /> : null} {loading ? "Refreshing…" : "Refresh"}
        </Btn>
        <Btn variant="primary" size="sm" icon="plus" onClick={() => router.push("/orders/add")}>New order</Btn>
      </DashHead>

      {error ? (
        <p style={{ color: "var(--danger)", fontSize: 13, margin: "0 0 1rem" }}>{error}</p>
      ) : null}

      {loading ? (
        <p style={{ color: "var(--fg-muted)", fontSize: 14, margin: "0 0 1rem" }}>Loading orders…</p>
      ) : null}

      <ErpStatGrid cols={4}>
        <StatCard
          icon={FileTextOutlined}
          label="Open orders"
          value={openOrders}
          hint={`${ORDERS_EXT.length} total`}
          hintTone="positive"
        />
        <StatCard
          icon={DollarOutlined}
          label="Order book value"
          value={fmtINR(bookValue)}
          hint="From database"
        />
        <StatCard
          icon={ThunderboltOutlined}
          label="Delivered"
          value={ORDERS_EXT.filter((o) => o.status === "delivered").length}
          hint="Completed"
          hintTone="positive"
        />
        <StatCard
          icon={WarningOutlined}
          label="At-risk orders"
          value={atRisk}
          hint="Progress under 50%"
          hintTone={atRisk ? "warning" : "default"}
        />
      </ErpStatGrid>

      <div className="card">
        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center" }}>
          <div className="tabs" style={{ border: "none", marginBottom: -1 }}>
            {[
              ["all", "All", ORDERS_EXT.length],
              ["scheduled", "Scheduled", ORDERS_EXT.filter(o => o.status === "scheduled").length],
              ["in-production", "In production", ORDERS_EXT.filter(o => o.status === "in-production").length],
              ["dispatched", "Dispatched", ORDERS_EXT.filter(o => o.status === "dispatched").length],
              ["delivered", "Delivered", ORDERS_EXT.filter(o => o.status === "delivered").length],
            ].map(([k, l, c]) => (
              <span key={k} className={`tab ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>
                {l} <span className="tab-count">{c}</span>
              </span>
            ))}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <input
              className="input"
              placeholder="Search by SO #, customer, product…"
              style={{ height: 30, width: 240 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div style={{ padding: 16 }}>
          {!loading && ORDERS_EXT.length === 0 ? (
            <p style={{ margin: 0, color: "var(--fg-muted)", fontSize: 14 }}>
              No orders in the database yet.{" "}
              <button
                type="button"
                className="link-btn"
                onClick={() => router.push("/orders/add")}
                style={{ color: "var(--primary)", background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit" }}
              >
                Create the first order
              </button>
            </p>
          ) : (
            <CommonTable
              {...ERP_TABLE_PROPS}
              columns={orderColumns}
              dataSource={filtered}
              rowKey="id"
              loading={loading}
            />
          )}
        </div>
      </div>
    </>
  );
};

/* ============================================================
   FIELD SALES / BEAT TRACKING — Activity dashboard
   ============================================================ */
const FIELD_ACTIVITY_KPIS = [
  { label: "Employees in field", value: "5", hint: "Currently out on visit", tone: "teal", icon: TeamOutlined },
  { label: "Visits completed today", value: "12", hint: "09 Mar 2025", tone: "green", icon: CheckCircleOutlined },
  { label: "Pending visit reports", value: "3", hint: "Awaiting notes/closure", tone: "amber", icon: FileTextOutlined },
  { label: "Average visit duration", value: "2h 45m", hint: "Last 7 days", tone: "teal", icon: ClockCircleOutlined },
];

const FIELD_LIVE_STATUS = [
  { name: "Rajesh Mehta", status: "IN FIELD", badge: "field" },
  { name: "Mohammed Irfan", status: "IN FIELD", badge: "field" },
  { name: "Sneha Reddy", status: "VISIT COMPLETED", badge: "done" },
  { name: "Karthik N.", status: "IN FIELD", badge: "field" },
  { name: "Priya Sharma", status: "IN OFFICE", badge: "office" },
  { name: "Vikram Singh", status: "DELAYED RETURN", badge: "delayed" },
];

const FIELD_TERRITORY_SUMMARY = [
  { area: "Rajasthan North", visits: 8 },
  { area: "Rajasthan South", visits: 4 },
  { area: "Madhya Pradesh", visits: 3 },
  { area: "Gujarat", visits: 2 },
  { area: "Others", visits: 2 },
];

const FIELD_MAP_REPS = [
  { x: 38, y: 52, name: "RM", label: "Rajesh Mehta", city: "Kota", color: "#0d9488" },
  { x: 52, y: 38, name: "MI", label: "Mohammed Irfan", city: "Jaipur", color: "#374d95" },
  { x: 48, y: 68, name: "KN", label: "Karthik N.", city: "Chittorgarh", color: "#0369a1" },
  { x: 28, y: 42, name: "SR", label: "Sneha Reddy", city: "Udaipur", color: "#16a34a" },
  { x: 62, y: 58, name: "PS", label: "Priya Sharma", city: "Jodhpur", color: "#6b7280" },
];

const FIELD_MAP_CUSTOMERS = [
  { x: 40, y: 50, n: "Asian Paints, Kota", s: "done" },
  { x: 54, y: 36, n: "Berger Paints, Jaipur", s: "done" },
  { x: 46, y: 66, n: "Minerals & Chemicals", s: "active" },
  { x: 30, y: 44, n: "Udaipur Depot", s: "next" },
  { x: 64, y: 54, n: "Gujarat Distributor", s: "next" },
];

const FIELD_VISIT_CHART_CUSTOMERS = [
  { customer: "Asian Paints", visits: 14 },
  { customer: "Berger", visits: 11 },
  { customer: "ITC", visits: 9 },
  { customer: "Pidilite", visits: 8 },
  { customer: "Nirma", visits: 6 },
  { customer: "Others", visits: 4 },
];

const FIELD_VISIT_CHART_WEEKLY = [
  { week: "W1", visits: 18, completed: 15 },
  { week: "W2", visits: 22, completed: 19 },
  { week: "W3", visits: 20, completed: 17 },
  { week: "W4", visits: 26, completed: 24 },
];

const FIELD_VISIT_TIMELINE = [
  {
    time: "11:45",
    title: "Rajesh Mehta — Asian Paints, Kota (completed)",
    sub: "Customer · 3h 30m · Order confirmed",
  },
  {
    time: "10:20",
    title: "Mohammed Irfan — Berger Paints, Jaipur (completed)",
    sub: "Customer · 2h 35m · PO expected",
  },
  {
    time: "12:30",
    title: "Sneha Reddy — Minerals & Chemicals Ltd (completed)",
    sub: "Vendor · 2h 30m · Sample collected",
  },
  {
    time: "09:30",
    title: "Karthik N. — Market survey, Chittorgarh (in progress)",
    sub: "Market · Expected return 14:00",
  },
];

const FieldSales = () => {
  const DATA = useDATA();
  const { append, saving, error, clearError } = useEntityMutation();
  const [planOpen, setPlanOpen] = useState(false);
  const { items: employees } = useEmployees();
  const salesReps = employees.filter((e) => e.department === "Sales");
  const [planRep, setPlanRep] = useState(salesReps[0]?.fullName ?? "");
  const [planDate, setPlanDate] = useState(new Date().toISOString().slice(0, 10));
  const [planTerritory, setPlanTerritory] = useState("Mumbai Metro");
  const [planVisits, setPlanVisits] = useState([
    { customer: "Asian Paints HO", slot: "10:30 AM", type: "Existing" },
    { customer: "Pidilite Andheri", slot: "12:00 PM", type: "Existing" },
  ]);
  const [planNotes, setPlanNotes] = useState("");

  const publishBeat = async (draft: boolean) => {
    let visits = [...DATA.FIELD_VISITS];
    for (const row of planVisits) {
      if (!row.customer.trim()) continue;
      const item = {
        id: nextFieldVisitId(visits),
        rep: planRep,
        customer: row.customer.trim(),
        city: planTerritory.split(" ")[0] ?? planTerritory,
        status: draft ? "scheduled" : "in-progress",
        ts: planDate,
        outcome: draft ? `Draft: ${planNotes}` : planNotes || "—",
      };
      await append("fieldVisits", item);
      visits.push(item);
    }
    setPlanOpen(false);
    setPlanVisits([{ customer: "", slot: "10:00 AM", type: "Existing" }]);
    setPlanNotes("");
  };

  return (
    <>
      <DashHead
        title="Field Activity Dashboard"
        sub="Overview of field visits, beats, and check-ins — who is on beat, late, or pending"
      >
        <Btn size="sm" icon="calendar">Today</Btn>
        <Btn size="sm" icon="map">Territories</Btn>
        <Btn variant="primary" size="sm" icon="plus" onClick={() => { clearError(); setPlanOpen(true); }}>Plan beat</Btn>
      </DashHead>

      <div className="field-activity-page">
        <ErpStatGrid cols={4}>
          {FIELD_ACTIVITY_KPIS.map((kpi) => (
            <StatCard
              key={kpi.label}
              icon={kpi.icon}
              label={kpi.label}
              value={kpi.value}
              hint={kpi.hint}
              hintTone={mapDashStatTone(kpi.tone)}
            />
          ))}
        </ErpStatGrid>

        <div className="field-activity-map-row">
          <div className="field-activity-map-main">
            <div className="field-activity-map-frame card">
              <div className="card-head">
                <div className="card-title">
                  <Icon name="map" size={14} /> Field locations · Rajasthan &amp; MP
                </div>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <FieldActivityMap />
              </div>
            </div>
          </div>

          <div className="field-activity-map-side">
            <div className="field-activity-panel">
              <div className="field-activity-panel__head field-activity-panel__head--warm">
                <Icon name="user" size={14} />
                Employee live status
              </div>
              <div className="field-activity-panel__body">
                {FIELD_LIVE_STATUS.map((row) => (
                  <div key={row.name} className="field-activity-row">
                    <span className="field-activity-row__name">{row.name}</span>
                    <span className={`field-activity-badge field-activity-badge--${row.badge}`}>
                      {row.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="field-activity-panel">
              <div className="field-activity-panel__head field-activity-panel__head--mint">
                <Icon name="map" size={14} />
                Territory / area summary
              </div>
              <div className="field-activity-panel__body">
                {FIELD_TERRITORY_SUMMARY.map((row) => (
                  <div key={row.area} className="field-activity-row">
                    <span className="field-activity-row__name">{row.area}</span>
                    <span className="field-activity-row__meta">
                      {row.visits} visit{row.visits === 1 ? "" : "s"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="field-activity-bottom-card">
          <div className="field-activity-bottom-card__head">
            <div className="field-activity-bottom-card__title">
              <Icon name="chart" size={14} />
              Customer visit frequency
            </div>
            <span className="field-activity-bottom-card__meta">Last 30 days</span>
          </div>
          <div className="field-activity-charts-grid">
            <div className="field-activity-chart-panel">
              <div className="field-activity-chart-panel__label">Visits per customer</div>
              <BarChart
                data={FIELD_VISIT_CHART_CUSTOMERS}
                keys={["visits"]}
                colors={["#0d9488"]}
                labelKey="customer"
                h={220}
              />
            </div>
            <div className="field-activity-chart-panel">
              <div className="field-activity-chart-panel__label">Weekly visits (scheduled vs completed)</div>
              <BarChart
                data={FIELD_VISIT_CHART_WEEKLY}
                keys={["visits", "completed"]}
                colors={["#94a3b8", "#16a34a"]}
                labelKey="week"
                h={220}
              />
            </div>
          </div>
          <div className="field-activity-chart-legend">
            <span><i className="field-activity-chart-legend__swatch field-activity-chart-legend__swatch--muted" /> Scheduled</span>
            <span><i className="field-activity-chart-legend__swatch field-activity-chart-legend__swatch--green" /> Completed</span>
          </div>
        </div>

        <div className="field-activity-bottom-card">
          <div className="field-activity-bottom-card__head">
            <div className="field-activity-bottom-card__title">
              <Icon name="clock" size={14} />
              Recent field visit timeline
            </div>
            <span className="field-activity-bottom-card__meta">Today</span>
          </div>
          <div className="field-activity-timeline">
            {FIELD_VISIT_TIMELINE.map((item) => (
              <div key={item.time + item.title} className="field-activity-timeline__item">
                <span className="field-activity-timeline__time">{item.time}</span>
                <span className="field-activity-timeline__dot" aria-hidden />
                <div>
                  <div className="field-activity-timeline__title">{item.title}</div>
                  <div className="field-activity-timeline__sub">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <EntityFormModal
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        title="Plan beat"
        sub="Schedule field visits for a rep"
        wide
        submitLabel="Publish beat plan"
        secondaryLabel="Save as draft"
        saving={saving}
        error={error}
        onSubmit={() => publishBeat(false)}
        onSecondary={() => publishBeat(true)}
      >
        <FormGrid cols={3}>
          <FormField label="Rep">
            <FormSelect value={planRep} onChange={setPlanRep}>
              {salesReps.map((e) => <option key={e.employeeId} value={e.fullName}>{e.fullName}</option>)}
            </FormSelect>
          </FormField>
          <FormField label="Date">
            <FormInput type="date" value={planDate} onChange={setPlanDate} />
          </FormField>
          <FormField label="Territory">
            <FormSelect value={planTerritory} onChange={setPlanTerritory}>
              <option>Mumbai Metro</option><option>Ahmedabad</option><option>Pune</option><option>Kolkata</option>
            </FormSelect>
          </FormField>
        </FormGrid>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.04em", margin: "16px 0 8px" }}>VISITS</div>
        <div className="card" style={{ borderRadius: 8, overflow: "hidden", marginBottom: 14 }}>
          <table className="tbl">
            <thead><tr><th>Customer</th><th style={{ width: 110 }}>Slot</th><th style={{ width: 130 }}>Visit type</th><th style={{ width: 30 }}></th></tr></thead>
            <tbody>
              {planVisits.map((v, i) => (
                <tr key={i}>
                  <td><input className="input" value={v.customer} onChange={(e) => { const n = [...planVisits]; n[i] = { ...n[i], customer: e.target.value }; setPlanVisits(n); }} /></td>
                  <td><input className="input" value={v.slot} onChange={(e) => { const n = [...planVisits]; n[i] = { ...n[i], slot: e.target.value }; setPlanVisits(n); }} /></td>
                  <td>
                    <select className="input" value={v.type} onChange={(e) => { const n = [...planVisits]; n[i] = { ...n[i], type: e.target.value }; setPlanVisits(n); }}>
                      <option>Existing</option><option>Prospect</option><option>Follow-up</option>
                    </select>
                  </td>
                  <td><button type="button" className="tb-iconbtn" onClick={() => setPlanVisits(planVisits.filter((_, j) => j !== i))}><Icon name="x" size={12} /></button></td>
                </tr>
              ))}
              <tr><td colSpan={4} style={{ padding: 0 }}>
                <Btn variant="ghost" size="sm" icon="plus" className="block" style={{ borderRadius: 0, justifyContent: "flex-start", padding: "8px 14px" }} onClick={() => setPlanVisits([...planVisits, { customer: "", slot: "10:00 AM", type: "Existing" }])}>Add visit</Btn>
              </td></tr>
            </tbody>
          </table>
        </div>
        <FormField label="Notes">
          <textarea className="input" rows={2} placeholder="Briefing for the rep…" value={planNotes} onChange={(e) => setPlanNotes(e.target.value)} />
        </FormField>
      </EntityFormModal>
    </>
  );
};

/* ---------- Field activity map (dummy GPS locations) ---------- */
const FieldActivityMap = () => {
  const customers = FIELD_MAP_CUSTOMERS;
  const reps = FIELD_MAP_REPS;
  return (
    <div className="map-frame field-activity-map-canvas" style={{ position: "relative" }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
        {/* Territory polygons */}
        <polygon points="8,35 48,28 58,75 12,82" fill="rgba(13,148,136,0.06)" stroke="rgba(13,148,136,0.35)" strokeWidth="0.35" strokeDasharray="1 1" />
        <polygon points="48,28 58,75 92,68 88,22" fill="rgba(55,77,149,0.05)" stroke="rgba(55,77,149,0.3)" strokeWidth="0.35" strokeDasharray="1 1" />
        <line x1="38" y1="52" x2="40" y2="50" stroke="#0d9488" strokeWidth="0.5" strokeDasharray="1 1" opacity="0.7" />
        <line x1="52" y1="38" x2="54" y2="36" stroke="#374d95" strokeWidth="0.5" strokeDasharray="1 1" opacity="0.7" />
        <line x1="48" y1="68" x2="46" y2="66" stroke="#0369a1" strokeWidth="0.5" strokeDasharray="1 1" opacity="0.7" />
      </svg>

      <div style={{ position: "absolute", left: "18%", top: "78%", fontSize: 10, color: "#0d9488", fontWeight: 600, opacity: 0.75, pointerEvents: "none" }}>KOTA · RAJESH</div>
      <div style={{ position: "absolute", left: "58%", top: "28%", fontSize: 10, color: "var(--primary)", fontWeight: 600, opacity: 0.75, pointerEvents: "none" }}>JAIPUR · MOHAMMED</div>
      <div style={{ position: "absolute", left: "52%", top: "72%", fontSize: 10, color: "#0369a1", fontWeight: 600, opacity: 0.75, pointerEvents: "none" }}>CHITTORGARH · KARTHIK</div>

      {/* Customers as pins */}
      {customers.map((c, i) => (
        <div key={i} style={{
          position: "absolute", left: `${c.x}%`, top: `${c.y}%`,
          transform: "translate(-50%, -100%)",
          pointerEvents: "none",
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: "50% 50% 50% 0",
            transform: "rotate(-45deg)",
            background: c.s === "done" ? "var(--success)" : c.s === "active" ? "var(--secondary)" : "white",
            border: c.s === "next" ? "2px solid var(--fg-muted)" : "none",
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            position: "relative",
          }}>
            <span style={{
              transform: "rotate(45deg)",
              position: "absolute", inset: 0, display: "grid", placeItems: "center",
              color: "white", fontSize: 10,
            }}>
              {c.s === "done" ? <Icon name="check" size={10} stroke={2.5} /> : null}
            </span>
          </div>
          <div style={{
            position: "absolute", left: "50%", top: "calc(100% + 4px)",
            transform: "translateX(-50%)",
            fontSize: 10, fontWeight: 500, color: "var(--fg)",
            whiteSpace: "nowrap", background: "rgba(255,255,255,0.85)",
            padding: "1px 5px", borderRadius: 3,
          }}>{c.n}</div>
        </div>
      ))}

      {/* Rep avatars (live) */}
      {reps.map((r, i) => (
        <div
          key={r.label}
          title={`${r.label} · ${r.city}`}
          style={{
            position: "absolute", left: `${r.x}%`, top: `${r.y}%`,
            transform: "translate(-50%, -50%)",
            zIndex: 5,
            pointerEvents: "none",
          }}
        >
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: r.color, color: "white",
            display: "grid", placeItems: "center",
            fontWeight: 700, fontSize: 11, border: "3px solid white",
            boxShadow: "0 4px 10px rgba(0,0,0,0.18)",
          }}>
            {r.name}
          </div>
          <div style={{
            position: "absolute", left: "50%", top: "calc(100% + 4px)",
            transform: "translateX(-50%)",
            fontSize: 9, fontWeight: 600, color: "var(--fg)",
            whiteSpace: "nowrap", background: "rgba(255,255,255,0.92)",
            padding: "2px 6px", borderRadius: 4, border: "1px solid var(--border)",
          }}>
            {r.city}
          </div>
          {i < 3 ? (
            <span style={{
              position: "absolute", inset: -6, borderRadius: "50%",
              background: r.color, opacity: 0.28,
              animation: "pulse 1.8s ease-in-out infinite",
            }} />
          ) : null}
        </div>
      ))}

      {/* Legend */}
      <div style={{
        position: "absolute", bottom: 12, right: 12,
        background: "white", border: "1px solid var(--border)",
        borderRadius: 8, padding: "8px 12px", fontSize: 11,
        display: "flex", flexDirection: "column", gap: 4,
        boxShadow: "var(--shadow-sm)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span className="dot success"></span> Customer visited</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span className="dot gold"></span> Visit in progress</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span className="dot" style={{ background: "#0d9488" }}></span> Field employee</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span className="dot" style={{ background: "white", border: "1.5px solid var(--fg-muted)" }}></span> Scheduled stop</div>
      </div>
    </div>
  );
};

/* ============================================================
   INVOICE VERIFICATION
   ============================================================ */
const InvoiceVerify = () => {
  const DATA = useDATA();
  const { invoices: INVOICES, reload: reloadInvoices } = useInvoices();
  const [open, setOpen] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [verifierNote, setVerifierNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const clearError = () => setError(null);
  const [uploadForm, setUploadForm] = useState({ po: "", invAmt: "", vendorInvoiceNo: "", invDate: "", notes: "" });

  const verified = INVOICES.filter((i) => i.status === "verified");
  const mismatched = INVOICES.filter((i) => i.status === "mismatch");
  const pending = INVOICES.filter((i) => i.status === "pending_verification");
  const passRate = INVOICES.length ? Math.round((verified.length / INVOICES.length) * 100) : 0;
  const avgDiff = mismatched.length
    ? Math.round(mismatched.reduce((s, i) => s + Math.abs(i.invAmt - i.poAmt), 0) / mismatched.length)
    : 0;

  // Only vendor-accepted POs can carry an invoice, so that is all this offers.
  const invoiceablePos = useMemo(
    () => DATA.PURCHASE_ORDERS.filter((p) => canPoTransition(p.status, "invoice")),
    [DATA.PURCHASE_ORDERS]
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredInvoices = useMemo(() => {
    return INVOICES.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (search) {
        const t = search.toLowerCase();
        if (!i.id.toLowerCase().includes(t) && !i.po.toLowerCase().includes(t) && !i.vendor.toLowerCase().includes(t)) {
          return false;
        }
      }
      return true;
    });
  }, [INVOICES, search, statusFilter]);

  const run = async (fn, successMessage) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      message.success(successMessage);
      await reloadInvoices();
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Action failed";
      setError(msg);
      message.error(msg);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const approveInvoice = async () => {
    if (!open) return;
    if (await run(() => verifyInvoiceApi(open.id, verifierNote), "Invoice verified — ready for payment.")) {
      setOpen(null);
      setVerifierNote("");
    }
  };

  // The note is what tells the vendor what to fix, so it is required here too
  // — the API enforces it, this just avoids a pointless round trip.
  const rejectInvoice = async () => {
    if (!open) return;
    if (!verifierNote.trim()) {
      setError("A mismatch note is required so the vendor knows what to correct.");
      return;
    }
    if (await run(() => markInvoiceMismatch(open.id, verifierNote), "Invoice marked as mismatch.")) {
      setOpen(null);
      setVerifierNote("");
    }
  };

  const resendInvoice = async () => {
    if (!open) return;
    if (await run(() => resubmitInvoiceApi(open.id, { notes: verifierNote }), "Invoice resubmitted for verification.")) {
      setOpen(null);
      setVerifierNote("");
    }
  };

  const uploadInvoice = async () => {
    const done = await run(
      () =>
        raiseInvoice({
          poId: uploadForm.po,
          invAmt: uploadForm.invAmt,
          vendorInvoiceNo: uploadForm.vendorInvoiceNo,
          invDate: uploadForm.invDate,
          notes: uploadForm.notes,
        }),
      "Invoice recorded — pending verification."
    );
    if (done) {
      setUploadOpen(false);
      setUploadForm({ po: "", invAmt: "", vendorInvoiceNo: "", invDate: "", notes: "" });
    }
  };

  const invoiceColumns = useMemo(
    () => [
      {
        title: "Invoice #",
        dataIndex: "id",
        key: "id",
        render: (id) => <span className="mono strong">{id}</span>,
      },
      {
        title: "PO",
        dataIndex: "po",
        key: "po",
        render: (po) => <span className="mono">{po}</span>,
      },
      { title: "Vendor", dataIndex: "vendor", key: "vendor" },
      {
        title: "Invoice date",
        dataIndex: "invDate",
        key: "invDate",
        render: (v) => <span className="muted">{v}</span>,
      },
      {
        title: "Invoice ₹",
        dataIndex: "invAmt",
        key: "invAmt",
        align: "right",
        render: (v) => <span className="num">{fmtINRFull(v)}</span>,
      },
      {
        title: "PO ₹",
        dataIndex: "poAmt",
        key: "poAmt",
        align: "right",
        render: (v) => <span className="num">{fmtINRFull(v)}</span>,
      },
      {
        title: "Diff",
        key: "diff",
        align: "right",
        render: (_, inv) => {
          const diff = inv.invAmt - inv.poAmt;
          return (
            <span
              className="num"
              style={{ color: diff > 0 ? "var(--danger)" : "var(--fg-muted)", fontWeight: diff > 0 ? 600 : 400 }}
            >
              {diff > 0 ? `+₹${diff.toLocaleString("en-IN")}` : "—"}
            </span>
          );
        },
      },
      {
        title: "Reason",
        dataIndex: "reason",
        key: "reason",
        render: (v) => <span className="muted" style={{ fontSize: 12 }}>{v}</span>,
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (status) => invoiceStatusBadge(status),
      },
      {
        title: "Actions",
        key: "actions",
        width: 72,
        align: "center",
        render: (_, inv) => (
          <div onClick={(e) => e.stopPropagation()}>
            {inv.status === "verified" ? (
              <ErpViewAction onClick={() => setOpen(inv)} />
            ) : (
              <TableActionIcon
                icon={<EyeOutlined />}
                label="Review"
                onClick={() => { setVerifierNote(""); setOpen(inv); }}
              />
            )}
          </div>
        ),
      },
    ],
    []
  );

  return (
    <>
      <DashHead title="Invoice Verification" sub="Verify vendor invoices against their purchase order">
        <Btn
          size="sm"
          icon="upload"
          disabled={invoiceablePos.length === 0}
          onClick={() => { clearError(); setUploadOpen(true); }}
        >
          Record invoice
        </Btn>
      </DashHead>

      <ErpStatGrid cols={4}>
        <StatCard
          icon={FileTextOutlined}
          label="Pending verification"
          value={pending.length}
          hint="Awaiting your check"
        />
        <StatCard
          icon={CheckCircleOutlined}
          label="Verified"
          value={verified.length}
          hint={`${passRate}% pass rate · ready for payment`}
          hintTone="positive"
        />
        <StatCard
          icon={AlertOutlined}
          label="Mismatched"
          value={mismatched.length}
          hint={`Avg diff ₹${avgDiff.toLocaleString("en-IN")}`}
          hintTone="negative"
        />
        <StatCard
          icon={DollarOutlined}
          label="Pending value"
          value={fmtINR(pending.reduce((s, i) => s + i.invAmt, 0))}
          hint="Not yet verified"
        />
      </ErpStatGrid>

      <div className="card">
        <PageFilterPanel
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search Invoice, PO, or Vendor…"
          activeFilterCount={statusFilter !== "all" ? 1 : 0}
          onApply={() => {}}
          onClear={() => {
            setSearch("");
            setStatusFilter("all");
          }}
          drawerWidth={320}
        >
          <div className="arf-item">
            <span className="arf-label">Status</span>
            <Select
              className="w-full"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All invoices" },
                { value: "pending_verification", label: INVOICE_STATUS_LABELS.pending_verification },
                { value: "verified", label: INVOICE_STATUS_LABELS.verified },
                { value: "mismatch", label: INVOICE_STATUS_LABELS.mismatch },
              ]}
            />
          </div>
        </PageFilterPanel>
        <div style={{ padding: 16, paddingTop: 0 }}>
          <CommonTable
            {...ERP_TABLE_PROPS}
            columns={invoiceColumns}
            dataSource={filteredInvoices}
            rowKey="id"
            onRow={(inv) => ({
              onClick: () => setOpen(inv),
              style: { cursor: "pointer" },
            })}
            locale={{
              emptyText: (
                <span className="muted">
                  No invoices in the database. Run <code>npm run seed</code> to load demo data.
                </span>
              ),
            }}
          />
        </div>
      </div>

      <EntityFormModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Record vendor invoice"
        sub="Against a purchase order the vendor has accepted"
        wide
        submitLabel="Save invoice"
        saving={busy}
        error={error}
        onSubmit={uploadInvoice}
      >
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
          Only vendor-accepted POs are listed — an invoice cannot exist before
          the vendor has taken the order. The PO amount is read from the PO
          itself, so it can&apos;t be typed to match.
        </p>
        <FormGrid>
          <FormField label="Purchase order" required>
            <FormSelect
              value={uploadForm.po}
              onChange={(v) => {
                const po = invoiceablePos.find((p) => p.id === v);
                setUploadForm({
                  ...uploadForm,
                  po: v,
                  invAmt: String(po?.total ?? ""),
                });
              }}
            >
              <option value="">Select PO</option>
              {invoiceablePos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} — {p.vendor} — {fmtINRFull(p.total)}
                </option>
              ))}
            </FormSelect>
          </FormField>
          <FormField label="Invoice amount (₹)" required>
            <FormInput value={uploadForm.invAmt} onChange={(v) => setUploadForm({ ...uploadForm, invAmt: v })} />
          </FormField>
          <FormField label="Vendor invoice no.">
            <FormInput value={uploadForm.vendorInvoiceNo} onChange={(v) => setUploadForm({ ...uploadForm, vendorInvoiceNo: v })} />
          </FormField>
          <FormField label="Invoice date">
            <FormInput type="date" value={uploadForm.invDate} onChange={(v) => setUploadForm({ ...uploadForm, invDate: v })} />
          </FormField>
        </FormGrid>
      </EntityFormModal>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `Verify ${open.id}` : ""} sub={open ? `vs ${open.po} · ${open.vendor} · ${INVOICE_STATUS_LABELS[open.status] ?? open.status}` : ""} wide
        footer={<>
          <Btn variant="ghost" onClick={() => setOpen(null)} disabled={busy}>Close</Btn>
          {canInvoiceTransition(open?.status, "resubmit") ? (
            <Btn variant="primary" onClick={resendInvoice} disabled={busy}>
              {busy ? "Saving…" : "Vendor resubmitted — send back for verification"}
            </Btn>
          ) : null}
          {canInvoiceTransition(open?.status, "mismatch") ? (
            <Btn variant="danger" onClick={rejectInvoice} disabled={busy}>Mark mismatch</Btn>
          ) : null}
          {canInvoiceTransition(open?.status, "verify") ? (
            <Btn variant="primary" onClick={approveInvoice} disabled={busy}>
              {busy ? "Saving…" : "Verify — ready for payment"}
            </Btn>
          ) : null}
        </>}>
        {open && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontSize: 10, color: "var(--fg-subtle)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: 10 }}>PURCHASE ORDER</div>
                <div className="mono strong" style={{ fontSize: 14, marginBottom: 4 }}>{open.po}</div>
                <div style={{ fontSize: 12, color: "var(--fg-muted)", marginBottom: 12 }}>{open.vendor}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Subtotal</span><span className="mono">₹{Math.round(open.poAmt / 1.18).toLocaleString("en-IN")}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">GST (18%)</span><span className="mono">₹{Math.round(open.poAmt * 0.18 / 1.18).toLocaleString("en-IN")}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 6, borderTop: "1px solid var(--border)" }}>
                    <span style={{ fontWeight: 600 }}>Total</span>
                    <span className="mono" style={{ fontWeight: 600 }}>₹{open.poAmt.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
              <div className="card" style={{ padding: 14, border: open.status === "mismatch" ? "1px solid var(--danger)" : "1px solid var(--border)", background: open.status === "mismatch" ? "var(--danger-soft)" : "var(--bg-elev)" }}>
                <div style={{ fontSize: 10, color: "var(--fg-subtle)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: 10 }}>VENDOR INVOICE</div>
                <div className="mono strong" style={{ fontSize: 14, marginBottom: 4 }}>{open.id}</div>
                <div style={{ fontSize: 12, color: "var(--fg-muted)", marginBottom: 12 }}>{open.invDate}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Subtotal</span><span className="mono">₹{Math.round(open.invAmt / 1.18).toLocaleString("en-IN")}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">GST (18%)</span><span className="mono">₹{Math.round(open.invAmt * 0.18 / 1.18).toLocaleString("en-IN")}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 6, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                    <span style={{ fontWeight: 600 }}>Total</span>
                    <span className="mono" style={{ fontWeight: 600, color: open.status === "mismatch" ? "var(--danger)" : "var(--fg)" }}>₹{open.invAmt.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            </div>
            {open.invAmt !== open.poAmt && (
              <div style={{ padding: 12, background: "var(--warning-soft)", border: "1px solid var(--warning)", borderRadius: 8, display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14 }}>
                <Icon name="alert" size={16} style={{ color: "var(--warning)", flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{open.reason}</div>
                  <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>
                    Verify anyway with a note explaining why, or mark it a mismatch
                    so the vendor corrects and resubmits.
                  </div>
                </div>
              </div>
            )}
            {open.status === "mismatch" && open.mismatchNote ? (
              <div style={{ padding: 12, background: "var(--danger-soft)", border: "1px solid var(--danger)", borderRadius: 8, marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Sent back to vendor</div>
                <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>
                  {open.mismatchNote}
                </div>
              </div>
            ) : null}
            {canInvoiceTransition(open.status, "verify") || canInvoiceTransition(open.status, "resubmit") ? (
              <FormField
                label={
                  canInvoiceTransition(open.status, "resubmit")
                    ? "Resubmission note"
                    : "Verifier note (required to mark mismatch)"
                }
              >
                <textarea
                  className="input"
                  rows={3}
                  maxLength={1000}
                  placeholder="What the vendor must correct — recorded in the invoice history…"
                  value={verifierNote}
                  onChange={(e) => setVerifierNote(e.target.value)}
                />
              </FormField>
            ) : null}
            {open.history?.length ? (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 10, color: "var(--fg-subtle)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: 8 }}>
                  History {open.revision > 1 ? `· revision ${open.revision}` : ""}
                </div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "var(--fg-muted)" }}>
                  {open.history.map((h, i) => (
                    <li key={`${h.action}-${h.at}-${i}`} style={{ marginBottom: 4 }}>
                      <strong>{h.action}</strong> by {h.byName || h.byEmail || "—"} ·{" "}
                      {new Date(h.at).toLocaleString("en-IN")}
                      {h.note ? ` — ${h.note}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {error ? <p style={{ color: "var(--danger)", fontSize: 12 }}>{error}</p> : null}
          </div>
        )}
      </Modal>
    </>
  );
};

/* ============================================================
   FIELD VISITS & BEAT TRACKING
   ============================================================ */
const FIELD_CHECKINS = [
  {
    employee: "Arun Sharma",
    beat: "Udaipur — Paint dealers",
    checkIn: "09 Mar 2025, 11:20",
    location: "Near Hathi Pole, Udaipur",
    status: "on-beat",
    statusLabel: "On beat",
  },
  {
    employee: "Sunita Patel",
    beat: "Ahmedabad — Cosmetics",
    checkIn: "09 Mar 2025, 10:45",
    location: "SG Highway, Ahmedabad",
    status: "on-beat",
    statusLabel: "On beat",
  },
  {
    employee: "Rakesh Meena",
    beat: "Jaipur — Paper & detergent",
    checkIn: "09 Mar 2025, 09:30",
    location: "Malviya Nagar, Jaipur",
    status: "late",
    statusLabel: "Late start",
  },
  {
    employee: "Kavita Singh",
    beat: "Makrana — Local units",
    checkIn: "08 Mar 2025, 17:00",
    location: "Makrana plant",
    status: "none",
    statusLabel: "Not checked in today",
  },
];

const FIELD_BEATS = [
  {
    name: "Udaipur — Paint dealers",
    areas: ["Hathi Pole", "Bapu Bazar", "Delhi Gate"],
    assigned: "Arun Sharma",
  },
  {
    name: "Ahmedabad — Cosmetics",
    areas: ["SG Highway", "Satellite", "Prahlad Nagar"],
    assigned: "Sunita Patel",
  },
  {
    name: "Jaipur — Paper & detergent",
    areas: ["Malviya Nagar", "Vaishali", "Bani Park"],
    assigned: "Rakesh Meena",
  },
  {
    name: "Makrana — Local units",
    areas: ["Makrana plant", "nearby industries"],
    assigned: "Kavita Singh (Sudarshan Microns)",
  },
];

const FieldVisitsBeatTracking = () => {
  const fieldCheckinColumns = useMemo(
    () => [
      {
        title: "Employee",
        dataIndex: "employee",
        key: "employee",
        render: (employee) => <span className="strong">{employee}</span>,
      },
      { title: "Beat / area", dataIndex: "beat", key: "beat" },
      {
        title: "Last check-in",
        dataIndex: "checkIn",
        key: "checkIn",
        render: (checkIn) => <span className="muted">{checkIn}</span>,
      },
      {
        title: "Location",
        dataIndex: "location",
        key: "location",
        render: (location) => <span className="field-beat-location">{location}</span>,
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (status) => erpStatusBadge(status),
      },
    ],
    []
  );

  return (
  <>
    <DashHead
      title="Field Visits & Beat Tracking"
      sub="Beats, check-in location/time, field sales and employee movement"
    />

    <div className="field-beat-page">
      <div className="field-beat-info-banner">
        <Icon name="pin" size={15} />
        <span>
          <strong>Field visit tracking.</strong> Define beats (areas to cover). Employees check in via
          phone — GPS/location or &apos;I am at this location&apos;. Alerts and key data can sync to
          WhatsApp.
        </span>
      </div>

      <div className="field-beat-card">
        <div className="field-beat-card__head">Today&apos;s field check-ins</div>
        <div style={{ padding: 16 }}>
          <CommonTable
            {...ERP_TABLE_PROPS}
            className="field-beat-table"
            columns={fieldCheckinColumns}
            dataSource={FIELD_CHECKINS}
            rowKey="employee"
          />
        </div>
      </div>

      <div className="field-beat-card">
        <div className="field-beat-card__head">Beats (areas)</div>
        <div className="field-beat-card__body">
          {FIELD_BEATS.map((beat) => (
            <div key={beat.name} className="field-beat-area-row">
              <div className="field-beat-area-row__main">
                <span className="field-beat-area-row__name">{beat.name}</span>
                <div className="field-beat-area-tags">
                  {beat.areas.map((area) => (
                    <span key={area} className="field-beat-area-tag">
                      {area}
                    </span>
                  ))}
                </div>
              </div>
              <div className="field-beat-area-row__assigned">
                <span className="field-beat-area-row__assigned-label">Assigned</span>
                <span className="field-beat-area-row__assigned-name">{beat.assigned}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </>
  );
};

/* ============================================================
   FIELD VISIT LOG (Employee view)
   ============================================================ */
const FIELD_VISIT_LOG_RECENT = [
  {
    date: "09 Mar 2025",
    party: "Asian Paints, Kota",
    meta: "Rajesh Mehta · Started 08:15 · Customer visit · Rate discussion",
    type: "Customer",
  },
  {
    date: "09 Mar 2025",
    party: "Berger Paints — Jaipur branch",
    meta: "Mohammed Irfan · Started 07:45 · Customer · Order follow-up",
    type: "Customer",
  },
  {
    date: "09 Mar 2025",
    party: "Minerals & Chemicals Ltd (Udaipur)",
    meta: "Sneha Reddy · Started 10:00 · Vendor · Quality sample collection",
    type: "Vendor",
  },
  {
    date: "09 Mar 2025",
    party: "Market survey — Chittorgarh",
    meta: "Karthik N. · Started 09:30 · Market · Competitor pricing",
    type: "Market",
  },
];

const VISIT_TYPE_OPTIONS = ["Customer", "Vendor", "Market", "Other"];

const FieldVisitLog = () => {
  const [employeeName] = useState("Rajesh Mehta");
  const [company, setCompany] = useState("smi");
  const [visitDate, setVisitDate] = useState("2025-03-09");
  const [visitType, setVisitType] = useState("Customer");
  const [partyName, setPartyName] = useState("");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [returnTime, setReturnTime] = useState("14:00");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");

  const recentByDate = FIELD_VISIT_LOG_RECENT.reduce(
    (acc, item) => {
      if (!acc[item.date]) acc[item.date] = [];
      acc[item.date].push(item);
      return acc;
    },
    {} as Record<string, typeof FIELD_VISIT_LOG_RECENT>,
  );

  return (
    <>
      <DashHead
        title="Field Visit Log (Employee view)"
        sub="Log field visits — check-in, location, and beat"
      />

      <div className="field-visit-log-page">
        <div className="field-visit-log-layout">
          <div className="field-beat-card field-visit-log-form-card">
            <div className="field-beat-card__head">New field visit</div>
            <div className="field-visit-log-form-body">
              <FormGrid>
                <FormField label="Employee name">
                  <input className="input" value={employeeName} readOnly style={{ background: "var(--bg-sunken)" }} />
                </FormField>
                <FormField label="Current company">
                  <FormSelect value={company} onChange={setCompany}>
                    <option value="smi">Sudarshan Minerals &amp; Industries (Udaipur)</option>
                    <option value="smic">Sudarshan Microns</option>
                  </FormSelect>
                </FormField>
                <FormField label="Date">
                  <FormInput type="date" value={visitDate} onChange={setVisitDate} />
                </FormField>
                <FormField label="Visit type">
                  <FormSelect value={visitType} onChange={setVisitType}>
                    {VISIT_TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </FormSelect>
                </FormField>
                <FormField label="Party name">
                  <FormInput
                    value={partyName}
                    onChange={setPartyName}
                    placeholder="Customer / vendor / contact name"
                  />
                </FormField>
                <FormField label="Location">
                  <FormInput
                    value={location}
                    onChange={setLocation}
                    placeholder="Address or area (e.g. Kota, Industrial Area)"
                  />
                </FormField>
                <FormField label="Start time">
                  <FormInput type="time" value={startTime} onChange={setStartTime} />
                </FormField>
                <FormField label="Expected return time">
                  <FormInput type="time" value={returnTime} onChange={setReturnTime} />
                </FormField>
              </FormGrid>

              <div className="field-visit-log-full">
                <FormField label="Purpose of visit">
                  <FormInput
                    value={purpose}
                    onChange={setPurpose}
                    placeholder="e.g. Follow-up on order, rate discussion, sample delivery"
                  />
                </FormField>
              </div>

              <div className="field-visit-log-full">
                <FormField label="Notes">
                  <textarea
                    className="input"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional notes..."
                  />
                </FormField>
              </div>

              <div className="field-visit-log-gps-note">
                <Icon name="pin" size={14} />
                <div>
                  <div className="field-visit-log-gps-note__title">Location capture</div>
                  <p>
                    When you tap <strong>Start Visit</strong>, the app will capture your current GPS
                    location (with your permission). This helps record where the visit started. You
                    can also type the location above if needed.
                  </p>
                </div>
              </div>

              <div className="field-visit-log-actions">
                <Btn variant="primary" size="sm" icon="pin">
                  Start Visit
                </Btn>
                <Btn variant="ghost" size="sm">
                  Save Draft
                </Btn>
              </div>
            </div>
          </div>

          <div className="field-beat-card field-visit-log-recent-card">
            <div className="field-beat-card__head">Today&apos;s recent field visits</div>
            <div className="field-visit-log-recent-body">
              {Object.entries(recentByDate).map(([date, items]) => (
                <div key={date} className="field-visit-log-date-group">
                  <div className="field-visit-log-date">{date}</div>
                  {items.map((visit) => (
                    <div key={visit.party + visit.meta} className="field-visit-log-recent-item">
                      <div className="field-visit-log-recent-item__top">
                        <span className="field-visit-log-recent-item__party">{visit.party}</span>
                        <span className={`field-visit-log-type field-visit-log-type--${visit.type.toLowerCase()}`}>
                          {visit.type}
                        </span>
                      </div>
                      <p className="field-visit-log-recent-item__meta">{visit.meta}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

/* ============================================================
   FIELD VISIT HISTORY
   ============================================================ */
const visitTypeClass = (type) => {
  const key = String(type || "").toLowerCase();
  if (key === "customer") return "customer";
  if (key === "vendor") return "vendor";
  if (key === "market") return "market";
  return "other";
};

const HISTORY_STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  ...FIELD_VISIT_STATUSES.map((s) => ({ value: s, label: visitStatusLabel(s) })),
];

const outcomeTone = (status) => {
  if (status === "completed") return "positive";
  if (status === "cancelled") return "negative";
  return "neutral";
};

/** Scheduled times, overridden by the real accept/complete stamps when present. */
const historyTime = (iso, fallback) => {
  if (iso) {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata",
    });
  }
  return fallback || "—";
};

const historyArea = (visit) =>
  visit.visitLocation?.city || visit.visitLocation?.address || visit.locationText || "—";

const toHistoryRow = (visit) => {
  const minutes = getVisitAcceptToCloseMinutes(visit);
  return {
    id: visit.id,
    visitId: visit.visitId,
    date: dayjs(visit.visitDate).isValid()
      ? dayjs(visit.visitDate).format("DD MMM YYYY")
      : visit.visitDate,
    visitDate: visit.visitDate,
    employee: visit.assignedEmployeeName,
    employeeId: visit.assignedEmployeeId,
    party: visit.partyName,
    visitType: visit.visitType,
    start: historyTime(visit.acceptedAt, visit.startTime),
    end: historyTime(visit.completedAt ?? visit.cancelledAt, visit.returnTime),
    duration:
      visit.status === "in-progress" || visit.status === "accepted"
        ? "In progress"
        : formatVisitDurationMinutes(minutes),
    area: historyArea(visit),
    outcome: visitStatusLabel(visit.status),
    outcomeTone: outcomeTone(visit.status),
    followUp: visit.purpose?.trim() || "—",
    notes:
      getVisitClosingRemark(visit) ||
      visit.notes?.trim() ||
      visit.purpose?.trim() ||
      "No notes recorded for this visit.",
  };
};

const FieldVisitHistory = () => {
  const [dateFrom, setDateFrom] = useState(dayjs().subtract(30, "day"));
  const [dateTo, setDateTo] = useState(dayjs());
  const [appliedRange, setAppliedRange] = useState({
    from: dayjs().subtract(30, "day").format("YYYY-MM-DD"),
    to: dayjs().format("YYYY-MM-DD"),
  });
  const [employee, setEmployee] = useState("all");
  const [company, setCompany] = useState("all");
  const [visitType, setVisitType] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const { visits, loading, error, reload } = useFieldVisitHistory({
    from: appliedRange.from,
    to: appliedRange.to,
    company,
  });

  const employeeOptions = useMemo(() => {
    const seen = new Map();
    visits.forEach((v) => {
      if (v.assignedEmployeeId && !seen.has(v.assignedEmployeeId)) {
        seen.set(v.assignedEmployeeId, v.assignedEmployeeName || v.assignedEmployeeId);
      }
    });
    return [
      { value: "all", label: "All employees" },
      ...[...seen.entries()].map(([value, label]) => ({ value, label })),
    ];
  }, [visits]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return visits
      .filter((v) => employee === "all" || v.assignedEmployeeId === employee)
      .filter((v) => visitType === "all" || v.visitType === visitType)
      .filter((v) => status === "all" || v.status === status)
      .map(toHistoryRow)
      .filter(
        (r) =>
          !term ||
          `${r.employee} ${r.party} ${r.area} ${r.visitId}`.toLowerCase().includes(term)
      );
  }, [visits, employee, visitType, status, search]);

  const activeFilterCount = [employee, company, visitType, status].filter((v) => v !== "all")
    .length;

  const selected = rows.find((r) => r.id === selectedId) ?? rows[0] ?? null;

  const topVisited = useMemo(() => {
    const counts = new Map();
    visits.forEach((v) => {
      const key = v.partyName?.trim();
      if (!key) return;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return [...counts.entries()]
      .map(([name, count]) => ({ name, visits: count }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 6);
  }, [visits]);

  const applyFilters = () => {
    setAppliedRange({
      from: dateFrom.format("YYYY-MM-DD"),
      to: dateTo.format("YYYY-MM-DD"),
    });
  };

  const visitHistoryColumns = useMemo(
    () => [
      {
        title: "Date",
        dataIndex: "date",
        key: "date",
        render: (date) => <span className="muted">{date}</span>,
      },
      {
        title: "Employee",
        dataIndex: "employee",
        key: "employee",
        render: (employeeName) => <span className="strong">{employeeName}</span>,
      },
      { title: "Party", dataIndex: "party", key: "party" },
      {
        title: "Visit type",
        dataIndex: "visitType",
        key: "visitType",
        render: (type) => (
          <span className={`field-visit-history-type field-visit-history-type--${visitTypeClass(type)}`}>
            {type}
          </span>
        ),
      },
      {
        title: "Start / end",
        key: "startEnd",
        render: (_, row) => (
          <span className="muted">
            {row.start} / {row.end}
          </span>
        ),
      },
      {
        title: "Duration",
        dataIndex: "duration",
        key: "duration",
        render: (duration) => <span className="muted">{duration}</span>,
      },
      { title: "Area", dataIndex: "area", key: "area" },
      {
        title: "Outcome",
        dataIndex: "outcome",
        key: "outcome",
        render: (outcome, row) => (
          <span className={`field-visit-history-outcome field-visit-history-outcome--${row.outcomeTone}`}>
            {outcome}
          </span>
        ),
      },
      {
        title: "Purpose / follow-up",
        dataIndex: "followUp",
        key: "followUp",
        render: (followUp) => <span className="muted">{followUp}</span>,
      },
    ],
    []
  );

  return (
    <>
      <DashHead
        title="Field Visit History"
        sub="Past field visits by employee, beat, and date"
      >
        <Btn
          icon={loading ? undefined : "refresh"}
          size="sm"
          disabled={loading}
          onClick={() => void reload()}
        >
          {loading ? <LoadingOutlined spin /> : null} {loading ? "Refreshing…" : "Refresh"}
        </Btn>
      </DashHead>

      <div className="field-visit-history-page">
        <PageFilterPanel
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search employee, customer, area…"
          activeFilterCount={activeFilterCount}
          onApply={applyFilters}
        >
          <div className="arf-item">
            <span className="arf-label">Employee</span>
            <Select
              className="w-full"
              value={employee}
              onChange={setEmployee}
              options={employeeOptions}
            />
          </div>
          <div className="arf-item">
            <span className="arf-label">Company</span>
            <Select
              className="w-full"
              value={company}
              onChange={setCompany}
              options={[
                { value: "all", label: "All companies" },
                ...FIELD_VISIT_COMPANY_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
              ]}
            />
          </div>
          <div className="arf-item">
            <span className="arf-label">Status</span>
            <Select
              className="w-full"
              value={status}
              onChange={setStatus}
              options={HISTORY_STATUS_OPTIONS}
            />
          </div>
          <div className="arf-item">
            <span className="arf-label">Visit type</span>
            <Select
              className="w-full"
              value={visitType}
              onChange={setVisitType}
              options={[
                { value: "all", label: "All visit types" },
                ...FIELD_VISIT_TYPES.map((t) => ({ value: t, label: t })),
              ]}
            />
          </div>
          <div className="arf-item">
            <span className="arf-label">From</span>
            <DatePicker
              className="w-full"
              format="DD/MM/YYYY"
              value={dateFrom}
              onChange={(d) => d && setDateFrom(d)}
            />
          </div>
          <div className="arf-item">
            <span className="arf-label">To</span>
            <DatePicker
              className="w-full"
              format="DD/MM/YYYY"
              value={dateTo}
              onChange={(d) => d && setDateTo(d)}
            />
          </div>
        </PageFilterPanel>

        {error ? (
          <p style={{ color: "var(--danger)", fontSize: 13, margin: "0 0 8px" }}>{error}</p>
        ) : null}

        <div className="field-beat-card field-visit-history-table-card">
          <div className="field-visit-history-table-head">
            <div className="field-visit-history-table-title">
              <UnorderedListOutlined />
              Visit history
            </div>
            <span className="field-visit-history-table-hint">
              {loading ? "Loading…" : `${rows.length} visits · click a row to see notes`}
            </span>
          </div>
          <div style={{ padding: 16 }}>
            <CommonTable
              {...ERP_TABLE_PROPS}
              className="field-visit-history-table"
              columns={visitHistoryColumns}
              dataSource={rows}
              loading={loading}
              rowKey="id"
              rowClassName={(row) =>
                selected?.id === row.id ? "field-visit-history-row--selected" : ""
              }
              onRow={(row) => ({
                onClick: () => setSelectedId(row.id),
                style: { cursor: "pointer" },
              })}
            />
          </div>
        </div>

        <div className="field-visit-history-bottom">
          <div className="field-beat-card">
            <div className="field-beat-card__head field-visit-history-side__head">
              <LineChartOutlined />
              Top visited (selected period)
            </div>
            <div className="field-visit-history-side__body">
              {topVisited.length === 0 ? (
                <div className="field-visit-history-top-row">
                  <span className="muted">No visits in this period</span>
                </div>
              ) : (
                topVisited.map((item) => (
                  <div key={item.name} className="field-visit-history-top-row">
                    <span>{item.name}</span>
                    <span className="field-visit-history-top-row__count">{item.visits}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="field-beat-card">
            <div className="field-beat-card__head field-visit-history-side__head">
              <FileTextOutlined />
              Visit notes preview
            </div>
            <div className="field-visit-history-notes">
              {selected ? (
                <>
                  <div className="field-visit-history-notes__title">
                    {selected.date} · {selected.employee} · {selected.party}
                  </div>
                  <p className="field-visit-history-notes__body">{selected.notes}</p>
                </>
              ) : (
                <p className="field-visit-history-notes__body muted">
                  Select a visit to see its notes.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

/* ============================================================
   BEAT TERRITORY MANAGEMENT
   ============================================================ */
const BEAT_TERRITORY_KPIS = [
  { label: "Weekly target (total)", value: "32", hint: "visits across 4 field staff", tone: "teal", icon: ThunderboltOutlined },
  { label: "Completed this week", value: "18", hint: "as of 09 Mar", tone: "green", icon: CheckCircleOutlined },
  { label: "On track", value: "3 / 4", hint: "employees meeting target", tone: "green", icon: TeamOutlined },
];

const BEAT_EMPLOYEE_CARDS = [
  {
    name: "Rajesh Mehta",
    role: "Field Sales · Rajasthan North",
    territory: "Rajasthan North — Kota, Jaipur, Alwar",
    cluster: "Asian Paints, Berger, Nirma, ITC (Kota/Jaipur)",
    weeklyTarget: 8,
    completed: 5,
  },
  {
    name: "Mohammed Irfan",
    role: "Field Sales · Rajasthan + MP",
    territory: "Rajasthan South, Madhya Pradesh — Udaipur, Indore, Bhopal",
    cluster: "Berger, HUL, regional distributors",
    weeklyTarget: 8,
    completed: 6,
  },
  {
    name: "Sneha Reddy",
    role: "Field Sales · Vendors & South",
    territory: "Rajasthan (Udaipur), Gujarat — vendor visits",
    cluster: "Minerals & Chemicals, Calcium Products, key vendors",
    weeklyTarget: 6,
    completed: 4,
  },
  {
    name: "Karthik N.",
    role: "Field Sales · Market & expansion",
    territory: "Chittorgarh, Bhilwara, Ajmer — market surveys",
    cluster: "New leads, Emami, regional paint units",
    weeklyTarget: 10,
    completed: 3,
  },
];

const BEAT_ROUTES = [
  { id: "A", title: "Beat A — Rajasthan North", places: "Kota, Jaipur, Alwar cluster", meta: "12 customers · Rajesh Mehta" },
  { id: "B", title: "Beat B — Rajasthan South + MP", places: "Udaipur, Indore, Bhopal", meta: "10 customers · Mohammed Irfan" },
  { id: "C", title: "Beat C — Vendor circuit", places: "Udaipur, Makrana, Gujarat vendors", meta: "8 vendors · Sneha Reddy" },
  { id: "D", title: "Beat D — Market / expansion", places: "Chittorgarh, Bhilwara, Ajmer", meta: "15 leads · Karthik N." },
];

const BEAT_TERRITORY_SUMMARY = [
  { employee: "Rajesh Mehta", territory: "Rajasthan North", customers: 12, target: 8, completed: 5, status: "In progress", statusTone: "progress" },
  { employee: "Mohammed Irfan", territory: "Rajasthan South, MP", customers: 10, target: 8, completed: 6, status: "In progress", statusTone: "progress" },
  { employee: "Sneha Reddy", territory: "Vendor circuit", customers: 8, target: 6, completed: 4, status: "In progress", statusTone: "progress" },
  { employee: "Karthik N.", territory: "Market / expansion", customers: 15, target: 10, completed: 3, status: "Behind target", statusTone: "behind" },
];

const FieldBeatTerritory = () => {
  const territorySummaryColumns = useMemo(
    () => [
      {
        title: "Employee",
        dataIndex: "employee",
        key: "employee",
        render: (employee) => <span className="strong">{employee}</span>,
      },
      { title: "Territory", dataIndex: "territory", key: "territory" },
      {
        title: "Assigned customers",
        dataIndex: "customers",
        key: "customers",
        render: (customers) => <span className="tabular">{customers}</span>,
      },
      {
        title: "Weekly target visits",
        dataIndex: "target",
        key: "target",
        render: (target) => <span className="tabular">{target}</span>,
      },
      {
        title: "Completed visits",
        dataIndex: "completed",
        key: "completed",
        render: (completed) => <span className="tabular">{completed}</span>,
      },
      {
        title: "Status",
        dataIndex: "statusTone",
        key: "status",
        render: (statusTone) => erpStatusBadge(statusTone),
      },
    ],
    []
  );

  return (
  <>
    <DashHead
      title="Beat Territory Management"
      sub="Define beats and territories; assign areas to field employees"
    />

    <div className="field-beat-territory-page">
      <ErpStatGrid cols="auto">
        {BEAT_TERRITORY_KPIS.map((kpi) => (
          <StatCard
            key={kpi.label}
            icon={kpi.icon}
            label={kpi.label}
            value={kpi.value}
            hint={kpi.hint}
            hintTone={mapDashStatTone(kpi.tone)}
          />
        ))}
      </ErpStatGrid>

      <div className="field-beat-territory-section">
        <div className="field-beat-territory-section__head">
          <TeamOutlined />
          Employee cards
        </div>
        <div className="field-beat-employee-grid">
          {BEAT_EMPLOYEE_CARDS.map((emp) => (
            <div key={emp.name} className="field-beat-employee-card">
              <div className="field-beat-employee-card__header">
                <div className="field-beat-employee-card__name">{emp.name}</div>
                <div className="field-beat-employee-card__role">{emp.role}</div>
              </div>
              <div className="field-beat-employee-card__block">
                <div className="field-beat-employee-card__label">Assigned territory / cities</div>
                <div className="field-beat-employee-card__value">{emp.territory}</div>
              </div>
              <div className="field-beat-employee-card__block">
                <div className="field-beat-employee-card__label">Customer cluster</div>
                <div className="field-beat-employee-card__value">{emp.cluster}</div>
              </div>
              <div className="field-beat-employee-card__stats">
                <div>
                  <span className="field-beat-employee-card__stat-label">Weekly target</span>
                  <span className="field-beat-employee-card__stat-value">{emp.weeklyTarget} visits</span>
                </div>
                <div>
                  <span className="field-beat-employee-card__stat-label">This week</span>
                  <span className="field-beat-employee-card__stat-value field-beat-employee-card__stat-value--green">
                    {emp.completed} completed
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="field-beat-card">
        <div className="field-beat-territory-section__head field-beat-card__head-inline">
          <EnvironmentOutlined />
          Route / beat grouping
        </div>
        <div className="field-beat-route-grid">
          {BEAT_ROUTES.map((beat) => (
            <div key={beat.id} className="field-beat-route-card">
              <div className="field-beat-route-card__title">{beat.title}</div>
              <div className="field-beat-route-card__places">{beat.places}</div>
              <div className="field-beat-route-card__meta">{beat.meta}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="field-beat-card">
        <div className="field-visit-history-table-head">
          <div className="field-visit-history-table-title">
            <UnorderedListOutlined />
            Territory &amp; visit summary
          </div>
          <span className="field-visit-history-table-hint">Week of 04–10 Mar 2025</span>
        </div>
        <div style={{ padding: 16 }}>
          <CommonTable
            {...ERP_TABLE_PROPS}
            className="field-beat-territory-table"
            columns={territorySummaryColumns}
            dataSource={BEAT_TERRITORY_SUMMARY}
            rowKey="employee"
          />
        </div>
      </div>
    </div>
  </>
  );
};

export { Customers, CustomerOrders, FieldSales, FieldVisitsBeatTracking, FieldVisitLog, FieldVisitHistory, FieldBeatTerritory, InvoiceVerify };
