// @ts-nocheck
'use client';


import React, { useState } from "react";
import { Select, DatePicker, Button } from "antd";
import { FilterOutlined, UnorderedListOutlined, LineChartOutlined, FileTextOutlined, TeamOutlined, EnvironmentOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Icon } from "./icons";
import { useDATA } from "./data";
import { Btn, Badge, StatusBadge, Avatar, Bar, Sparkline, Kpi, Modal, fmtINR, fmtINRFull, fmtNum, AreaChart, BarChart, Donut } from "./ui";
import {
  EntityFormModal,
  FormField,
  FormGrid,
  FormInput,
  FormSelect,
  useFormState,
  requireFields,
} from "@/components/forms";
import { useEntityMutation } from "@/hooks/use-entity-mutation";
import { nextCustomerId, nextOrderId, nextFieldVisitId, nextInvoiceId, formatDueDate, formatDisplayDate } from "@/lib/id-generators";
import { DashHead, SectionH } from "./dashboards";

/* ============================================================
   MODULES PART 2 — Customers, Orders, Field Sales, Invoice Verify
   ============================================================ */


/* ============================================================
   CUSTOMERS
   ============================================================ */
const customerFormInit = {
  name: "",
  companyType: "Private Limited",
  gstin: "",
  pan: "",
  contact: "",
  phone: "",
  email: "",
  city: "",
  terms: "Net 30",
  creditLimit: "2500000",
  assignedTo: "",
  appliesTo: "Both",
};

const Customers = () => {
  const DATA = useDATA();
  const { append, saving, error, clearError } = useEntityMutation();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const form = useFormState(customerFormInit);
  const salesReps = DATA.EMPLOYEES.filter((e) => e.dept === "Sales");

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

  const saveCustomer = async () => {
    const err = requireFields(form.values, ["name", "city"]);
    if (err) throw new Error(err);
    const rep = form.values.assignedTo || salesReps[0]?.name || "—";
    await append("customers", {
      id: nextCustomerId(DATA.CUSTOMERS),
      name: form.values.name.trim(),
      city: form.values.city.trim(),
      orders: 0,
      ytd: 0,
      terms: form.values.terms,
      status: "active",
      gstin: form.values.gstin,
      pan: form.values.pan,
      contact: form.values.contact,
      phone: form.values.phone,
      email: form.values.email,
      creditLimit: Number(form.values.creditLimit) || 0,
      assignedTo: rep,
      appliesTo: form.values.appliesTo,
    });
    form.reset(customerFormInit);
    setOpen(false);
  };

  return (
    <>
      <DashHead title="Customers" sub="Customer master · contacts · credit terms · order history">
        <Btn icon="upload" size="sm">Import CSV</Btn>
        <Btn variant="primary" size="sm" icon="plus" onClick={() => { clearError(); setOpen(true); }}>Add customer</Btn>
      </DashHead>

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <div className="kpi"><div className="kpi-label"><Icon name="users" size={13} className="ico" />Total customers</div><div className="kpi-value tabular">{DATA.CUSTOMERS.length}</div><div style={{ fontSize: 11, color: "var(--fg-muted)" }}>{activeCount} active</div></div>
        <div className="kpi"><div className="kpi-label"><Icon name="cart" size={13} className="ico" />With orders</div><div className="kpi-value tabular">{DATA.CUSTOMERS.filter((c) => c.orders > 0).length}</div><div style={{ fontSize: 11, color: "var(--success)" }}>From database</div></div>
        <div className="kpi"><div className="kpi-label"><Icon name="money" size={13} className="ico" />Receivables</div><div className="kpi-value">{fmtINR(receivables)}</div><div style={{ fontSize: 11, color: "var(--warning)" }}>Est. 18% of YTD</div></div>
        <div className="kpi"><div className="kpi-label"><Icon name="alert" size={13} className="ico" />Credit holds</div><div className="kpi-value" style={{ color: holdCount ? "var(--danger)" : undefined }}>{holdCount}</div><div style={{ fontSize: 11, color: "var(--fg-muted)" }}>Review required</div></div>
      </div>

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
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>City</th>
                <th>Terms</th>
                <th style={{ textAlign: "right" }}>Orders</th>
                <th style={{ textAlign: "right" }}>YTD revenue</th>
                <th style={{ textAlign: "right" }}>Open AR</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="muted" style={{ textAlign: "center", padding: 24 }}>No customers yet. Add one or run npm run seed.</td></tr>
              ) : null}
              {filtered.map((c, i) => (
                <tr key={c.id}>
                  <td className="mono strong">{c.id}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={c.name} color={(i % 5) + 1} />
                      <div className="strong">{c.name}</div>
                    </div>
                  </td>
                  <td className="muted">{c.city}</td>
                  <td><Badge sq>{c.terms}</Badge></td>
                  <td className="num">{c.orders}</td>
                  <td className="num">{fmtINR(c.ytd)}</td>
                  <td className="num">{fmtINR(Math.round(c.ytd * 0.18))}</td>
                  <td>
                    {c.status === "hold"
                      ? <Badge tone="warning" dot>Hold</Badge>
                      : c.status === "prospect"
                        ? <Badge tone="info" dot>Prospect</Badge>
                        : <Badge tone="success" dot>Active</Badge>}
                  </td>
                  <td>
                    <Btn variant="ghost" size="sm" iconRight="chevRight">View</Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <EntityFormModal
        open={open}
        onClose={() => setOpen(false)}
        title="Add customer"
        wide
        submitLabel="Save customer"
        saving={saving}
        error={error}
        onSubmit={saveCustomer}
      >
        <FormGrid>
          <FormField label="Customer name">
            <FormInput value={form.values.name} onChange={(v) => form.setField("name", v)} />
          </FormField>
          <FormField label="Company type">
            <FormSelect value={form.values.companyType} onChange={(v) => form.setField("companyType", v)}>
              <option>Private Limited</option><option>Public Limited</option><option>LLP</option><option>Proprietorship</option>
            </FormSelect>
          </FormField>
          <FormField label="GSTIN">
            <FormInput value={form.values.gstin} onChange={(v) => form.setField("gstin", v)} placeholder="27AAAAA0000A1Z5" />
          </FormField>
          <FormField label="PAN">
            <FormInput value={form.values.pan} onChange={(v) => form.setField("pan", v)} />
          </FormField>
          <FormField label="Primary contact">
            <FormInput value={form.values.contact} onChange={(v) => form.setField("contact", v)} />
          </FormField>
          <FormField label="Phone">
            <FormInput value={form.values.phone} onChange={(v) => form.setField("phone", v)} />
          </FormField>
          <FormField label="Email">
            <FormInput value={form.values.email} onChange={(v) => form.setField("email", v)} />
          </FormField>
          <FormField label="City, State">
            <FormInput value={form.values.city} onChange={(v) => form.setField("city", v)} />
          </FormField>
          <FormField label="Payment terms">
            <FormSelect value={form.values.terms} onChange={(v) => form.setField("terms", v)}>
              <option>Net 30</option><option>Net 45</option><option>Net 60</option><option>Advance</option>
            </FormSelect>
          </FormField>
          <FormField label="Credit limit">
            <FormInput value={form.values.creditLimit} onChange={(v) => form.setField("creditLimit", v)} />
          </FormField>
          <FormField label="Assigned to">
            <FormSelect value={form.values.assignedTo || salesReps[0]?.name || ""} onChange={(v) => form.setField("assignedTo", v)}>
              {salesReps.map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}
            </FormSelect>
          </FormField>
          <FormField label="Applies to">
            <FormSelect value={form.values.appliesTo} onChange={(v) => form.setField("appliesTo", v)}>
              <option>Both</option><option>SMI only</option><option>Microns only</option>
            </FormSelect>
          </FormField>
        </FormGrid>
      </EntityFormModal>
    </>
  );
};

/* ============================================================
   CUSTOMER ORDERS
   ============================================================ */
const orderFormInit = {
  customer: "",
  soNumber: "",
  requiredBy: "",
  product: "",
  qty: "24",
  rate: "74000",
  packaging: "FIBC 1000 kg (4-loop)",
  transport: "FOR · destination",
  priority: "Standard",
};

const CustomerOrders = () => {
  const DATA = useDATA();
  const { append, saving, error, clearError } = useEntityMutation();
  const [newOrder, setNewOrder] = useState(false);
  const [tab, setTab] = useState("all");
  const form = useFormState({
    ...orderFormInit,
    customer: DATA.CUSTOMERS[0]?.name ?? "",
    soNumber: nextOrderId(DATA.ORDERS),
    requiredBy: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  });

  const ORDERS_EXT = DATA.ORDERS;
  const openOrders = ORDERS_EXT.filter((o) => o.status !== "delivered").length;
  const bookValue = ORDERS_EXT.reduce((s, o) => s + o.value, 0);
  const atRisk = ORDERS_EXT.filter((o) => o.progress < 50 && o.status !== "delivered").length;

  const filtered = tab === "all" ? ORDERS_EXT : ORDERS_EXT.filter(o => o.status === tab);

  const saveOrder = async (asDraft: boolean) => {
    const err = requireFields(form.values, ["customer", "product", "qty"]);
    if (err) throw new Error(err);
    const qtyNum = parseFloat(String(form.values.qty).replace(/[^\d.]/g, "")) || 0;
    const rate = parseFloat(String(form.values.rate).replace(/[^\d.]/g, "")) || 0;
    const value = Math.round(qtyNum * rate);
    await append("orders", {
      id: form.values.soNumber || nextOrderId(DATA.ORDERS),
      customer: form.values.customer,
      product: form.values.product,
      qty: `${qtyNum} MT`,
      value,
      due: formatDueDate(form.values.requiredBy),
      status: asDraft ? "scheduled" : "in-production",
      progress: asDraft ? 0 : 10,
    });
    setNewOrder(false);
    form.reset({
      ...orderFormInit,
      customer: DATA.CUSTOMERS[0]?.name ?? "",
      soNumber: nextOrderId([...DATA.ORDERS, { id: form.values.soNumber }]),
      requiredBy: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    });
  };

  return (
    <>
      <DashHead title="Customer Orders" sub="Sales orders across both companies">
        <Btn icon="filter" size="sm">Filters</Btn>
        <Btn icon="download" size="sm">Export</Btn>
        <Btn variant="primary" size="sm" icon="plus" onClick={() => { clearError(); setNewOrder(true); }}>New order</Btn>
      </DashHead>

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <div className="kpi"><div className="kpi-label"><Icon name="ticket" size={13} className="ico" />Open orders</div><div className="kpi-value tabular">{openOrders}</div><div style={{ fontSize: 11, color: "var(--success)" }}>{ORDERS_EXT.length} total</div></div>
        <div className="kpi"><div className="kpi-label"><Icon name="money" size={13} className="ico" />Order book value</div><div className="kpi-value">{fmtINR(bookValue)}</div><div style={{ fontSize: 11, color: "var(--fg-muted)" }}>From database</div></div>
        <div className="kpi"><div className="kpi-label"><Icon name="bolt" size={13} className="ico" />Delivered</div><div className="kpi-value tabular">{ORDERS_EXT.filter((o) => o.status === "delivered").length}</div><div style={{ fontSize: 11, color: "var(--success)" }}>Completed</div></div>
        <div className="kpi"><div className="kpi-label"><Icon name="alert" size={13} className="ico" />At-risk orders</div><div className="kpi-value" style={{ color: atRisk ? "var(--warning)" : undefined }}>{atRisk}</div><div style={{ fontSize: 11, color: "var(--fg-muted)" }}>Progress under 50%</div></div>
      </div>

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
            <input className="input" placeholder="Search by SO #, customer, product…" style={{ height: 30, width: 240 }} />
            <Btn size="sm" icon="sort">Sort</Btn>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>SO #</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Qty</th>
                <th style={{ textAlign: "right" }}>Value</th>
                <th>Due</th>
                <th>Progress</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id}>
                  <td className="mono strong">{o.id}</td>
                  <td>{o.customer}</td>
                  <td className="muted">{o.product}</td>
                  <td className="num">{o.qty}</td>
                  <td className="num">{fmtINRFull(o.value)}</td>
                  <td className="num nowrap">{o.due}</td>
                  <td style={{ width: 140 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Bar value={o.progress} tone={o.progress === 100 ? "success" : "primary"} />
                      <span className="mono" style={{ fontSize: 11, width: 32, textAlign: "right" }}>{o.progress}%</span>
                    </div>
                  </td>
                  <td><StatusBadge status={o.status} /></td>
                  <td><Btn variant="ghost" size="sm" iconRight="chevRight">Open</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <EntityFormModal
        open={newOrder}
        onClose={() => setNewOrder(false)}
        title="Create sales order"
        wide
        submitLabel="Confirm & schedule"
        secondaryLabel="Save draft"
        saving={saving}
        error={error}
        onSubmit={() => saveOrder(false)}
        onSecondary={() => saveOrder(true)}
      >
        <FormGrid>
          <FormField label="Customer">
            <FormSelect value={form.values.customer} onChange={(v) => form.setField("customer", v)}>
              {DATA.CUSTOMERS.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </FormSelect>
          </FormField>
          <FormField label="SO number">
            <FormInput value={form.values.soNumber} onChange={(v) => form.setField("soNumber", v)} />
          </FormField>
          <FormField label="Required by">
            <FormInput type="date" value={form.values.requiredBy} onChange={(v) => form.setField("requiredBy", v)} />
          </FormField>
          <FormField label="Product">
            <FormInput value={form.values.product} onChange={(v) => form.setField("product", v)} placeholder="Talcum Powder · 600 mesh" />
          </FormField>
          <FormField label="Qty (MT)">
            <FormInput value={form.values.qty} onChange={(v) => form.setField("qty", v)} />
          </FormField>
          <FormField label="Rate (₹)">
            <FormInput value={form.values.rate} onChange={(v) => form.setField("rate", v)} />
          </FormField>
        </FormGrid>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 14 }}>
          <FormField label="Packaging">
            <FormSelect value={form.values.packaging} onChange={(v) => form.setField("packaging", v)}>
              <option>FIBC 1000 kg (4-loop)</option><option>PP Woven 50 kg</option><option>BOPP 20 kg</option><option>Bulk loose</option>
            </FormSelect>
          </FormField>
          <FormField label="Transport">
            <FormSelect value={form.values.transport} onChange={(v) => form.setField("transport", v)}>
              <option>FOR · destination</option><option>Ex-works</option><option>Customer pickup</option>
            </FormSelect>
          </FormField>
          <FormField label="Priority">
            <FormSelect value={form.values.priority} onChange={(v) => form.setField("priority", v)}>
              <option>Standard</option><option>Rush</option><option>Critical</option>
            </FormSelect>
          </FormField>
        </div>
      </EntityFormModal>
    </>
  );
};

/* ============================================================
   FIELD SALES / BEAT TRACKING — Activity dashboard
   ============================================================ */
const FIELD_ACTIVITY_KPIS = [
  { label: "Employees in field", value: "5", hint: "Currently out on visit", tone: "teal" },
  { label: "Visits completed today", value: "12", hint: "09 Mar 2025", tone: "green" },
  { label: "Pending visit reports", value: "3", hint: "Awaiting notes/closure", tone: "amber" },
  { label: "Average visit duration", value: "2h 45m", hint: "Last 7 days", tone: "teal" },
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
  const salesReps = DATA.EMPLOYEES.filter((e) => e.dept === "Sales");
  const [planRep, setPlanRep] = useState(salesReps[0]?.name ?? "");
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
        <div className="field-activity-kpi-grid">
          {FIELD_ACTIVITY_KPIS.map((kpi) => (
            <div
              key={kpi.label}
              className={`field-activity-kpi field-activity-kpi--${kpi.tone}`}
            >
              <div className="field-activity-kpi__label">{kpi.label}</div>
              <div className="field-activity-kpi__value">{kpi.value}</div>
              <div className="field-activity-kpi__hint">{kpi.hint}</div>
            </div>
          ))}
        </div>

        <div className="field-activity-map-row">
          <div className="field-activity-map-main">
            <div className="field-activity-map-frame card">
              <div className="card-head">
                <div className="card-title">
                  <Icon name="map" size={14} /> Field locations · Rajasthan &amp; MP
                </div>
                <div className="row">
                  <Badge tone="success" dot>3 in field</Badge>
                  <Badge tone="primary" dot>2 completed</Badge>
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
              {salesReps.map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}
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
  const { append, update, saving, error, clearError } = useEntityMutation();
  const [open, setOpen] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [verifierNote, setVerifierNote] = useState("");
  const [uploadForm, setUploadForm] = useState({ po: "", vendor: "", invAmt: "", poAmt: "" });

  const INVOICES = DATA.INVOICES;
  const matched = INVOICES.filter((i) => i.status === "matched");
  const mismatched = INVOICES.filter((i) => i.status === "mismatch");
  const passRate = INVOICES.length ? Math.round((matched.length / INVOICES.length) * 100) : 0;
  const avgDiff = mismatched.length
    ? Math.round(mismatched.reduce((s, i) => s + Math.abs(i.invAmt - i.poAmt), 0) / mismatched.length)
    : 0;

  const approveInvoice = async () => {
    if (!open) return;
    await update("invoices", open.id, {
      status: "matched",
      reason: verifierNote || "Approved with note",
    });
    setOpen(null);
    setVerifierNote("");
  };

  const rejectInvoice = async () => {
    if (!open) return;
    await update("invoices", open.id, {
      status: "mismatch",
      reason: verifierNote || "Rejected by verifier",
    });
    setOpen(null);
    setVerifierNote("");
  };

  const uploadInvoice = async () => {
    const invAmt = Number(uploadForm.invAmt) || 0;
    const poAmt = Number(uploadForm.poAmt) || 0;
    await append("invoices", {
      id: nextInvoiceId(INVOICES),
      po: uploadForm.po,
      vendor: uploadForm.vendor,
      invDate: formatDisplayDate(),
      invAmt,
      poAmt,
      status: invAmt === poAmt ? "matched" : "mismatch",
      reason: invAmt === poAmt ? "—" : `₹${Math.abs(invAmt - poAmt).toLocaleString("en-IN")} diff`,
    });
    setUploadOpen(false);
    setUploadForm({ po: "", vendor: "", invAmt: "", poAmt: "" });
  };

  return (
    <>
      <DashHead title="Invoice Verification" sub="Auto-match invoices to POs · flag mismatches">
        <Btn size="sm" icon="upload" onClick={() => { clearError(); setUploadOpen(true); }}>Upload invoice</Btn>
        <Btn variant="primary" size="sm" icon="bolt">Auto-match queue</Btn>
      </DashHead>

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <div className="kpi"><div className="kpi-label"><Icon name="invoice" size={13} className="ico" />Pending verification</div><div className="kpi-value tabular">{INVOICES.length}</div><div style={{ fontSize: 11, color: "var(--fg-muted)" }}>Total this month</div></div>
        <div className="kpi"><div className="kpi-label"><Icon name="check" size={13} className="ico" />Auto-matched</div><div className="kpi-value tabular" style={{ color: "var(--success)" }}>{matched.length}</div><div style={{ fontSize: 11, color: "var(--success)" }}>{passRate}% pass rate</div></div>
        <div className="kpi"><div className="kpi-label"><Icon name="alert" size={13} className="ico" />Mismatched</div><div className="kpi-value tabular" style={{ color: "var(--danger)" }}>{mismatched.length}</div><div style={{ fontSize: 11, color: "var(--fg-muted)" }}>Avg diff ₹{avgDiff.toLocaleString("en-IN")}</div></div>
        <div className="kpi"><div className="kpi-label"><Icon name="money" size={13} className="ico" />Total amount</div><div className="kpi-value">{fmtINR(INVOICES.reduce((s, i) => s + i.invAmt, 0))}</div><div style={{ fontSize: 11, color: "var(--fg-muted)" }}>To verify</div></div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title"><Icon name="invoice" size={14} /> Invoices awaiting verification</div>
          <div className="tabs" style={{ border: "none" }}>
            <span className="tab active">All <span className="tab-count">{INVOICES.length}</span></span>
            <span className="tab">Mismatched <span className="tab-count">{INVOICES.filter(i => i.status === "mismatch").length}</span></span>
            <span className="tab">Auto-matched <span className="tab-count">{INVOICES.filter(i => i.status === "matched").length}</span></span>
          </div>
        </div>
        <div className="card-body flush" style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Invoice #</th><th>PO</th><th>Vendor</th><th>Invoice date</th>
                <th style={{ textAlign: "right" }}>Invoice ₹</th>
                <th style={{ textAlign: "right" }}>PO ₹</th>
                <th style={{ textAlign: "right" }}>Diff</th>
                <th>Reason</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {INVOICES.length === 0 ? (
                <tr>
                  <td colSpan={10} className="muted" style={{ textAlign: "center", padding: 32 }}>
                    No invoices in the database. Run <code>npm run seed</code> to load demo data.
                  </td>
                </tr>
              ) : null}
              {INVOICES.map((inv) => {
                const diff = inv.invAmt - inv.poAmt;
                return (
                  <tr key={inv.id} onClick={() => setOpen(inv)} style={{ cursor: "pointer" }}>
                    <td className="mono strong">{inv.id}</td>
                    <td className="mono">{inv.po}</td>
                    <td>{inv.vendor}</td>
                    <td className="muted">{inv.invDate}</td>
                    <td className="num">{fmtINRFull(inv.invAmt)}</td>
                    <td className="num">{fmtINRFull(inv.poAmt)}</td>
                    <td className="num" style={{ color: diff > 0 ? "var(--danger)" : "var(--fg-muted)", fontWeight: diff > 0 ? 600 : 400 }}>
                      {diff > 0 ? `+₹${diff.toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td className="muted" style={{ fontSize: 12 }}>{inv.reason}</td>
                    <td><StatusBadge status={inv.status === "matched" ? "verified" : "mismatch"} /></td>
                    <td>
                      {inv.status === "matched"
                        ? <Btn variant="ghost" size="sm">View</Btn>
                        : <Btn variant="primary" size="sm">Review</Btn>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <EntityFormModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload invoice"
        sub="Register invoice for verification (metadata only)"
        wide
        submitLabel="Save invoice"
        saving={saving}
        error={error}
        onSubmit={uploadInvoice}
      >
        <FormGrid>
          <FormField label="PO number">
            <FormSelect value={uploadForm.po} onChange={(v) => {
              const po = DATA.PURCHASE_ORDERS.find((p) => p.id === v);
              setUploadForm({ po: v, vendor: po?.vendor ?? uploadForm.vendor, invAmt: String(po?.total ?? ""), poAmt: String(po?.total ?? "") });
            }}>
              <option value="">Select PO</option>
              {DATA.PURCHASE_ORDERS.map((p) => <option key={p.id} value={p.id}>{p.id} — {p.vendor}</option>)}
            </FormSelect>
          </FormField>
          <FormField label="Vendor">
            <FormInput value={uploadForm.vendor} onChange={(v) => setUploadForm({ ...uploadForm, vendor: v })} />
          </FormField>
          <FormField label="Invoice amount (₹)">
            <FormInput value={uploadForm.invAmt} onChange={(v) => setUploadForm({ ...uploadForm, invAmt: v })} />
          </FormField>
          <FormField label="PO amount (₹)">
            <FormInput value={uploadForm.poAmt} onChange={(v) => setUploadForm({ ...uploadForm, poAmt: v })} />
          </FormField>
        </FormGrid>
      </EntityFormModal>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `Verify ${open.id}` : ""} sub={open ? `vs ${open.po} · ${open.vendor}` : ""} wide
        footer={<>
          <Btn variant="ghost" onClick={() => setOpen(null)} disabled={saving}>Cancel</Btn>
          <Btn variant="danger" onClick={rejectInvoice} disabled={saving}>Reject</Btn>
          <Btn variant="primary" onClick={approveInvoice} disabled={saving}>{saving ? "Saving…" : "Approve with diff"}</Btn>
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
            {open.status === "mismatch" && (
              <div style={{ padding: 12, background: "var(--warning-soft)", border: "1px solid var(--warning)", borderRadius: 8, display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14 }}>
                <Icon name="alert" size={16} style={{ color: "var(--warning)", flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Difference detected: {open.reason}</div>
                  <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>
                    Variance is within 1% tolerance. Approve with note, or contact vendor for revised invoice.
                  </div>
                </div>
              </div>
            )}
            <FormField label="Verifier note">
              <textarea className="input" rows={3} placeholder="Reason for approval/rejection — visible in audit log…" value={verifierNote} onChange={(e) => setVerifierNote(e.target.value)} />
            </FormField>
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

const FieldVisitsBeatTracking = () => (
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
        <div className="field-beat-card__body flush">
          <table className="tbl field-beat-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Beat / area</th>
                <th>Last check-in</th>
                <th>Location</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {FIELD_CHECKINS.map((row) => (
                <tr key={row.employee}>
                  <td className="strong">{row.employee}</td>
                  <td>{row.beat}</td>
                  <td className="muted">{row.checkIn}</td>
                  <td>
                    <span className="field-beat-location">{row.location}</span>
                  </td>
                  <td>
                    <span className={`field-beat-status field-beat-status--${row.status}`}>
                      {row.statusLabel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
const FIELD_VISIT_HISTORY_ROWS = [
  {
    id: "1",
    date: "09 Mar 2025",
    employee: "Rajesh Mehta",
    party: "Asian Paints, Kota",
    visitType: "Customer",
    start: "08:15",
    end: "11:45",
    duration: "3h 30m",
    area: "Kota",
    outcome: "Order confirmed",
    outcomeTone: "positive",
    followUp: "15 Mar — rate sheet",
    notes:
      "Rate discussion completed. Customer agreed on GCC 325 at ₹X per MT for Q2. Order for 50 MT confirmed pending PO. Follow-up call scheduled for dispatch timeline.",
  },
  {
    id: "2",
    date: "09 Mar 2025",
    employee: "Mohammed Irfan",
    party: "Berger Paints — Jaipur branch",
    visitType: "Customer",
    start: "07:45",
    end: "10:20",
    duration: "2h 35m",
    area: "Jaipur",
    outcome: "PO expected",
    outcomeTone: "positive",
    followUp: "12 Mar — PO status",
    notes:
      "Met purchase manager for annual contract renewal. Discussed volume discount and delivery schedule. PO expected by 12 Mar.",
  },
  {
    id: "3",
    date: "08 Mar 2025",
    employee: "Sneha Reddy",
    party: "Minerals & Chemicals Ltd (Udaipur)",
    visitType: "Vendor",
    start: "10:00",
    end: "12:30",
    duration: "2h 30m",
    area: "Udaipur",
    outcome: "Sample collected",
    outcomeTone: "positive",
    followUp: "—",
    notes: "Collected quality samples for lab testing. Vendor shared updated MSDS and batch certificates.",
  },
  {
    id: "4",
    date: "08 Mar 2025",
    employee: "Karthik N.",
    party: "Market survey — Chittorgarh",
    visitType: "Market",
    start: "09:30",
    end: "—",
    duration: "In progress",
    area: "Chittorgarh",
    outcome: "Data logged",
    outcomeTone: "neutral",
    followUp: "10 Mar — report",
    notes: "Competitor pricing survey in progress. Visited 4 distributors in industrial belt.",
  },
  {
    id: "5",
    date: "07 Mar 2025",
    employee: "Rajesh Mehta",
    party: "ITC Paperboards, Bikaner",
    visitType: "Customer",
    start: "11:00",
    end: "13:15",
    duration: "2h 15m",
    area: "Bikaner",
    outcome: "Proposal sent",
    outcomeTone: "neutral",
    followUp: "14 Mar — decision",
    notes: "Presented Q1 proposal for coated grades. Customer requested revised terms for bulk order.",
  },
  {
    id: "6",
    date: "07 Mar 2025",
    employee: "Mohammed Irfan",
    party: "Nirma Ltd, Ahmedabad",
    visitType: "Customer",
    start: "14:00",
    end: "16:30",
    duration: "2h 30m",
    area: "Ahmedabad",
    outcome: "Rate agreed",
    outcomeTone: "positive",
    followUp: "—",
    notes: "Finalized rate for soda ash supply. Customer confirmed trial batch for next month.",
  },
];

const FIELD_TOP_VISITED = [
  { name: "Asian Paints", visits: 8 },
  { name: "Berger Paints", visits: 6 },
  { name: "ITC Paperboards", visits: 4 },
  { name: "Minerals & Chemicals Ltd", visits: 3 },
  { name: "Nirma Ltd", visits: 3 },
  { name: "Hindustan Unilever", visits: 2 },
];

const visitTypeClass = (type) => {
  const key = type.toLowerCase();
  if (key === "customer") return "customer";
  if (key === "vendor") return "vendor";
  if (key === "market") return "market";
  return "other";
};

const FieldVisitHistory = () => {
  const [selectedId, setSelectedId] = useState(FIELD_VISIT_HISTORY_ROWS[0].id);
  const [dateFrom, setDateFrom] = useState(dayjs("2025-03-01"));
  const [dateTo, setDateTo] = useState(dayjs("2025-03-09"));

  const selected = FIELD_VISIT_HISTORY_ROWS.find((r) => r.id === selectedId) ?? FIELD_VISIT_HISTORY_ROWS[0];

  return (
    <>
      <DashHead
        title="Field Visit History"
        sub="Past field visits by employee, beat, and date"
      />

      <div className="field-visit-history-page">
        <div className="arf-panel ap-filters-panel field-visit-history-filters">
          <div className="arf-head">
            <FilterOutlined style={{ color: "var(--primary)", fontSize: 12 }} />
            <span className="arf-head-title">Filters</span>
          </div>
          <div className="arf-body">
            <div className="arf-controls ap-filters-controls ap-filters-controls--split-apply">
              <div className="arf-item">
                <span className="arf-label">Employee</span>
                <Select
                  className="w-full"
                  defaultValue="all"
                  options={[
                    { value: "all", label: "All employees" },
                    { value: "rajesh", label: "Rajesh Mehta" },
                    { value: "mohammed", label: "Mohammed Irfan" },
                    { value: "sneha", label: "Sneha Reddy" },
                  ]}
                />
              </div>
              <div className="arf-item">
                <span className="arf-label">Company</span>
                <Select
                  className="w-full"
                  defaultValue="all"
                  options={[
                    { value: "all", label: "All companies" },
                    { value: "smi", label: "Sudarshan Minerals (Udaipur)" },
                    { value: "smic", label: "Sudarshan Microns" },
                  ]}
                />
              </div>
              <div className="arf-item">
                <span className="arf-label">Territory</span>
                <Select
                  className="w-full"
                  defaultValue="all"
                  options={[
                    { value: "all", label: "All territories" },
                    { value: "rajasthan", label: "Rajasthan" },
                    { value: "gujarat", label: "Gujarat" },
                  ]}
                />
              </div>
              <div className="arf-item">
                <span className="arf-label">Visit type</span>
                <Select
                  className="w-full"
                  defaultValue="all"
                  options={[
                    { value: "all", label: "All visit types" },
                    { value: "customer", label: "Customer" },
                    { value: "vendor", label: "Vendor" },
                    { value: "market", label: "Market" },
                  ]}
                />
              </div>
              <div className="ap-filters-row-break" aria-hidden="true" />
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
              <div className="ap-filters-spacer" aria-hidden="true" />
              <div className="arf-item ap-filters-actions">
                <Button type="primary" icon={<FilterOutlined />}>
                  Apply filters
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="field-beat-card field-visit-history-table-card">
          <div className="field-visit-history-table-head">
            <div className="field-visit-history-table-title">
              <UnorderedListOutlined />
              Visit history
            </div>
            <span className="field-visit-history-table-hint">Click a row to see notes</span>
          </div>
          <div className="field-beat-card__body flush">
            <table className="tbl field-visit-history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Employee</th>
                  <th>Party</th>
                  <th>Visit type</th>
                  <th>Start / end</th>
                  <th>Duration</th>
                  <th>Area</th>
                  <th>Outcome</th>
                  <th>Follow-up</th>
                </tr>
              </thead>
              <tbody>
                {FIELD_VISIT_HISTORY_ROWS.map((row) => (
                  <tr
                    key={row.id}
                    className={selectedId === row.id ? "field-visit-history-row--selected" : ""}
                    onClick={() => setSelectedId(row.id)}
                  >
                    <td className="muted">{row.date}</td>
                    <td className="strong">{row.employee}</td>
                    <td>{row.party}</td>
                    <td>
                      <span className={`field-visit-history-type field-visit-history-type--${visitTypeClass(row.visitType)}`}>
                        {row.visitType}
                      </span>
                    </td>
                    <td className="muted">
                      {row.start} / {row.end}
                    </td>
                    <td className="muted">{row.duration}</td>
                    <td>{row.area}</td>
                    <td>
                      <span className={`field-visit-history-outcome field-visit-history-outcome--${row.outcomeTone}`}>
                        {row.outcome}
                      </span>
                    </td>
                    <td className="muted">{row.followUp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="field-visit-history-bottom">
          <div className="field-beat-card">
            <div className="field-beat-card__head field-visit-history-side__head">
              <LineChartOutlined />
              Top visited (last 30 days)
            </div>
            <div className="field-visit-history-side__body">
              {FIELD_TOP_VISITED.map((item) => (
                <div key={item.name} className="field-visit-history-top-row">
                  <span>{item.name}</span>
                  <span className="field-visit-history-top-row__count">{item.visits}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="field-beat-card">
            <div className="field-beat-card__head field-visit-history-side__head">
              <FileTextOutlined />
              Visit notes preview
            </div>
            <div className="field-visit-history-notes">
              <div className="field-visit-history-notes__title">
                {selected.date} · {selected.employee} · {selected.party}
              </div>
              <p className="field-visit-history-notes__body">{selected.notes}</p>
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
  { label: "Weekly target (total)", value: "32", hint: "visits across 4 field staff", tone: "teal" },
  { label: "Completed this week", value: "18", hint: "as of 09 Mar", tone: "green" },
  { label: "On track", value: "3 / 4", hint: "employees meeting target", tone: "green" },
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

const FieldBeatTerritory = () => (
  <>
    <DashHead
      title="Beat Territory Management"
      sub="Define beats and territories; assign areas to field employees"
    />

    <div className="field-beat-territory-page">
      <div className="field-activity-kpi-grid">
        {BEAT_TERRITORY_KPIS.map((kpi) => (
          <div key={kpi.label} className={`field-activity-kpi field-activity-kpi--${kpi.tone}`}>
            <div className="field-activity-kpi__label">{kpi.label}</div>
            <div className="field-activity-kpi__value">{kpi.value}</div>
            <div className="field-activity-kpi__hint">{kpi.hint}</div>
          </div>
        ))}
      </div>

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
        <div className="field-beat-card__body flush">
          <table className="tbl field-beat-territory-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Territory</th>
                <th>Assigned customers</th>
                <th>Weekly target visits</th>
                <th>Completed visits</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {BEAT_TERRITORY_SUMMARY.map((row) => (
                <tr key={row.employee}>
                  <td className="strong">{row.employee}</td>
                  <td>{row.territory}</td>
                  <td className="tabular">{row.customers}</td>
                  <td className="tabular">{row.target}</td>
                  <td className="tabular">{row.completed}</td>
                  <td>
                    <span className={`field-beat-territory-status field-beat-territory-status--${row.statusTone}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </>
);

export { Customers, CustomerOrders, FieldSales, FieldVisitsBeatTracking, FieldVisitLog, FieldVisitHistory, FieldBeatTerritory, InvoiceVerify };
