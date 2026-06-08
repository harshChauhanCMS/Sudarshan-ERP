// @ts-nocheck
'use client';


import React, { useMemo } from "react";
import { Icon } from "./icons";
import { useDATA } from "./data";
import {
  revenueMtdRupees,
  revenueLakhsFromSeries,
  formatCrFromLakhs,
  openOrdersCount,
  inTransitDispatchCount,
  revenueSpark,
  countSpark,
  productionUtilizationPct,
  orderBookRupees,
  pendingPoCount,
  invoiceMismatchCount,
} from "@/lib/erp-stats";
import { Btn, Badge, StatusBadge, Avatar, Bar, Sparkline, Kpi, Modal, fmtINR, fmtINRFull, fmtNum, AreaChart, BarChart, Donut } from "./ui";
import CommonTable from "@/components/common/CommonTable";
import { ERP_TABLE_PROPS, erpStatusBadge } from "@/components/common/erpStatusBadges";

/* ============================================================
   5 DASHBOARDS
   ============================================================ */

/* ---------- shared header ---------- */
const DashHead = ({ title, sub, children }) => (
  <div className="page-head">
    <div>
      <h1 className="page-title">
        {title}
        <Badge tone="default" sq>
          <Icon name="calendar" size={10} /> May 21, 2026 · Thu
        </Badge>
      </h1>
      <div className="page-sub">{sub}</div>
    </div>
    <div className="page-head-actions">{children}</div>
  </div>
);

const SectionH = ({ title, sub, action }) => (
  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 12 }}>
    <div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 600, letterSpacing: "-0.005em" }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--fg-subtle)", marginTop: 2 }}>{sub}</div>}
    </div>
    {action}
  </div>
);

/* ============================================================
   MASTER DASHBOARD — group view
   ============================================================ */
const MasterDashboard = ({ navigate }) => {
  const DATA = useDATA();
  const rev = revenueLakhsFromSeries(DATA.REVENUE_DATA);
  const revenueRupees = revenueMtdRupees(DATA.REVENUE_DATA);
  const openOrders = openOrdersCount(DATA.ORDERS);
  const inTransit = inTransitDispatchCount(DATA.DISPATCHES);
  const headcount =
    DATA.ATTENDANCE_TODAY.total > 0
      ? DATA.ATTENDANCE_TODAY.total
      : DATA.EMPLOYEES.length;
  const revSpark = revenueSpark(DATA.REVENUE_DATA);
  const ordersSpark = countSpark(openOrders);
  const transitSpark = countSpark(inTransit);
  const headcountSpark = countSpark(headcount);
  const criticalAttentionRows = useMemo(
    () => DATA.NOTIFS.slice(0, 5),
    [DATA.NOTIFS]
  );
  const criticalAttentionColumns = useMemo(
    () => [
      {
        title: "",
        key: "icon",
        width: 42,
        render: (_, n) => (
          <Icon
            name={n.type === "alert" ? "alert" : n.type === "success" ? "check" : "info"}
            size={14}
            style={{ color: n.type === "alert" ? "var(--danger)" : n.type === "success" ? "var(--success)" : "var(--info)" }}
          />
        ),
      },
      {
        title: "Item",
        dataIndex: "text",
        key: "text",
        render: (text) => <span className="strong">{text}</span>,
      },
      {
        title: "Source",
        key: "source",
        render: (_, n) => <span className="muted">{n.time} ago</span>,
      },
      {
        title: "Status",
        key: "status",
        align: "right",
        render: () => <Icon name="chevRight" size={13} className="subtle" />,
      },
    ],
    []
  );

  return (
    <>
      <DashHead title="Master Dashboard" sub="Group-level view across Sudarshan Minerals & Sudarshan Microns">
        <Btn icon="download" size="sm">Export</Btn>
        <Btn variant="primary" size="sm" icon="bolt">Quick action</Btn>
      </DashHead>

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <Kpi icon="money"    label="Revenue · MTD"   value={revenueRupees > 0 ? fmtINR(revenueRupees) : "—"}            spark={revSpark} />
        <Kpi icon="cart"     label="Open Orders"      value={String(openOrders)} unit={openOrders === 1 ? "order" : "orders"} spark={ordersSpark} sparkColor="var(--primary)" />
        <Kpi icon="truck"    label="In Transit"       value={String(inTransit)} unit={inTransit === 1 ? "vehicle" : "vehicles"} spark={transitSpark} />
        <Kpi icon="users"    label="On Roll"          value={String(headcount)} unit={headcount === 1 ? "employee" : "employees"} spark={headcountSpark} sparkColor="var(--secondary)" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: "2fr 1fr", marginBottom: 20 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">
              <Icon name="chart" size={14} /> Revenue · last 7 months
            </div>
            <div className="chart-legend">
              <span className="chart-legend-item">
                <span className="chart-legend-swatch" style={{ background: "var(--primary)" }}></span> SMI
              </span>
              <span className="chart-legend-item">
                <span className="chart-legend-swatch" style={{ background: "var(--secondary)" }}></span> Microns
              </span>
            </div>
          </div>
          <div className="card-body">
            <AreaChart
              data={DATA.REVENUE_DATA}
              keys={["smi", "smic"]}
              colors={["var(--primary)", "var(--secondary)"]}
              currency
              h={220}
            />
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title"><Icon name="pieChart" size={14} /> Revenue split</div>
            <Badge>MTD</Badge>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
            <Donut
              value={rev.smi}
              max={rev.total || 1}
              size={148}
              stroke={14}
              color="var(--primary)"
              label={rev.total > 0 ? `${Math.round((rev.smi / rev.total) * 100)}%` : "—"}
              sub="SMI share"
            />
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span className="dot primary" style={{ flexShrink: 0 }}></span>
                  <span style={{ fontSize: 12, whiteSpace: "nowrap" }}>Sudarshan Minerals</span>
                </div>
                <span className="mono nowrap" style={{ fontWeight: 600, fontSize: 12 }}>
                  {rev.smi > 0 ? formatCrFromLakhs(rev.smi) : "—"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span className="dot gold" style={{ flexShrink: 0 }}></span>
                  <span style={{ fontSize: 12, whiteSpace: "nowrap" }}>Sudarshan Microns</span>
                </div>
                <span className="mono nowrap" style={{ fontWeight: 600, fontSize: 12 }}>
                  {rev.smic > 0 ? formatCrFromLakhs(rev.smic) : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        {DATA.COMPANIES[0] ? (
          <CompanyTile company={DATA.COMPANIES[0]} accent="primary" navigate={navigate} revenueLakhs={rev.smi} productionPct={productionUtilizationPct(DATA.PRODUCTION_DATA)} stockItems={DATA.RAW_MATERIALS} />
        ) : null}
        {DATA.COMPANIES[1] ? (
          <CompanyTile company={DATA.COMPANIES[1]} accent="gold" navigate={navigate} revenueLakhs={rev.smic} productionPct={productionUtilizationPct(DATA.PRODUCTION_DATA)} stockItems={DATA.PACKAGING} />
        ) : null}
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title"><Icon name="alert" size={14} /> Critical attention</div>
            <Btn variant="ghost" size="sm">View all <Icon name="chevRight" size={12} /></Btn>
          </div>
          <div className="card-body flush">
            <div style={{ padding: 16 }}>
              <CommonTable
                {...ERP_TABLE_PROPS}
                columns={criticalAttentionColumns}
                dataSource={criticalAttentionRows}
                rowKey="id"
                onRow={(n) => ({
                  onClick: () => navigate(n.target),
                  style: { cursor: "pointer" },
                })}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title"><Icon name="layers" size={14} /> Quick actions</div>
          </div>
          <div className="card-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { label: "New PO",         icon: "cart",    target: "/procurement/po" },
              { label: "Add stock",      icon: "plus",    target: "/inventory/raw-material" },
              { label: "Create order",   icon: "ticket",  target: "/orders" },
              { label: "Plan dispatch",  icon: "truck",   target: "/dispatch" },
              { label: "Mark attendance",icon: "user",    target: "/hr/attendance" },
              { label: "Run a report",   icon: "chart",   target: "/reports" },
            ].map((a) => (
              <button
                key={a.label}
                onClick={() => navigate(a.target)}
                style={{
                  padding: "12px",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  background: "var(--bg-elev)",
                  display: "flex", alignItems: "center", gap: 10,
                  cursor: "pointer", color: "var(--fg)",
                  fontSize: 13, fontWeight: 500,
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--primary)"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border)"}
              >
                <Icon name={a.icon} size={14} style={{ color: "var(--primary)" }} />
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

const CompanyTile = ({ company, accent, navigate, revenueLakhs = 0, productionPct, stockItems = [] }) => {
  const lowStock = stockItems.filter((i) => i.status === "low" || i.status === "critical").length;
  const stockHealth =
    stockItems.length === 0
      ? "—"
      : lowStock === 0
        ? "Good"
        : lowStock <= 2
          ? "Watch"
          : "Alert";

  return (
  <div className="card" style={{ position: "relative", overflow: "hidden" }}>
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, height: 3,
      background: accent === "gold" ? "var(--secondary)" : "var(--primary)",
    }}></div>
    <div className="card-head" style={{ paddingTop: 18, alignItems: "flex-start" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0, flex: 1 }}>
        <div className={`sb-brand-mark ${accent === "gold" ? "sec" : ""}`} style={{ width: 28, height: 28, fontSize: 13, flexShrink: 0 }}>
          {accent === "gold" ? "M" : "S"}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.3 }}>
            {company.name}
          </div>
          <div style={{ fontSize: 11, color: "var(--fg-subtle)", marginTop: 2 }}>{company.plant}</div>
        </div>
      </div>
      <Btn variant="ghost" size="sm" iconRight="external" onClick={() => navigate("/dashboard/admin")}>Open</Btn>
    </div>
    <div className="card-body" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
      {[
        { l: "Revenue MTD", v: revenueLakhs > 0 ? formatCrFromLakhs(revenueLakhs) : "—", t: "", up: true },
        { l: "Orders",      v: company.activeOrders ?? 0, t: "open", up: true },
        { l: "Production",  v: productionPct != null ? `${productionPct}%` : "—", t: "utilization", up: productionPct != null && productionPct >= 85 },
        { l: "Stock health",v: stockItems.length > 0 ? `${stockItems.length - lowStock}/${stockItems.length}` : "—", t: stockHealth, up: lowStock === 0 },
      ].map((s) => (
        <div key={s.l}>
          <div style={{ fontSize: 11, color: "var(--fg-subtle)", marginBottom: 4 }}>{s.l}</div>
          <div className="mono" style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em" }}>{s.v}</div>
          <div style={{ fontSize: 11, color: s.up ? "var(--success)" : "var(--danger)", marginTop: 2 }}>{s.t}</div>
        </div>
      ))}
    </div>
  </div>
  );
};

/* ============================================================
   ADMIN DASHBOARD — operational
   ============================================================ */
const AdminDashboard = ({ navigate }) => {
  const DATA = useDATA();
  const pendingApprovals = pendingPoCount(DATA.PURCHASE_ORDERS);
  const invoiceVerify = DATA.INVOICES.length;
  const mismatches = invoiceMismatchCount(DATA.INVOICES);
  const exceptions = mismatches + DATA.RAW_MATERIALS.filter((r) => r.status === "critical").length;

  return (
  <>
    <DashHead title="Admin Dashboard" sub="Operational health, approvals & exceptions across the org">
      <Btn icon="filter" size="sm">Filters</Btn>
      <Btn icon="refresh" size="sm">Refresh</Btn>
      <Btn variant="primary" size="sm" icon="bolt">Bulk approve</Btn>
    </DashHead>

    <div className="grid grid-4" style={{ marginBottom: 20 }}>
      <Kpi icon="ticket"  label="Pending approvals"  value={String(pendingApprovals)} spark={countSpark(pendingApprovals)} />
      <Kpi icon="alert"   label="Open exceptions"    value={String(exceptions)} spark={countSpark(exceptions)} />
      <Kpi icon="invoice" label="Invoices to verify" value={String(invoiceVerify)} spark={countSpark(invoiceVerify)} />
      <Kpi icon="user"    label="Employees"   value={String(DATA.EMPLOYEES.length)} spark={countSpark(DATA.EMPLOYEES.length)} sparkColor="var(--primary)" />
    </div>

    <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr", marginBottom: 20 }}>
      <div className="card">
        <div className="card-head">
          <div className="card-title"><Icon name="speech" size={14} /> Activity feed</div>
          <div className="row">
            <div className="tabs" style={{ border: "none" }}>
              <span className="tab active">All <span className="tab-count">142</span></span>
              <span className="tab">Approvals <span className="tab-count">14</span></span>
              <span className="tab">Errors <span className="tab-count">3</span></span>
            </div>
          </div>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { who: "Anil Kapoor",    act: "raised", what: "PO-2026-0142 for Hindustan Talc Mines", amt: "₹18.4 L", t: "12m", ico: "cart",    tone: "primary" },
            { who: "Manish Joshi",   act: "completed", what: "Production batch B-4471 (Talc 600 mesh)", amt: "24 MT", t: "44m", ico: "factory", tone: "success" },
            { who: "Suresh Patel",   act: "started",   what: "Dispatch DSP-1041 → Pidilite Mumbai", amt: "18 MT", t: "1h", ico: "truck",   tone: "info" },
            { who: "Neha Iyer",      act: "approved",  what: "Leave application: Vinod Sharma (3 days)", amt: "", t: "2h", ico: "calendar", tone: "success" },
            { who: "System",         act: "flagged",   what: "Invoice mismatch on PO-2026-0139", amt: "₹6.5k diff", t: "3h", ico: "alert",   tone: "danger" },
            { who: "Karan Singh",    act: "checked in",what: "Asian Paints HO — Mumbai", amt: "10:45 AM", t: "4h", ico: "pin", tone: "default" },
          ].map((a, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                display: "grid", placeItems: "center",
                background: `var(--${a.tone === "default" ? "bg-sunken" : a.tone + "-soft"})`,
                color: a.tone === "default" ? "var(--fg-muted)" : `var(--${a.tone})`,
              }}>
                <Icon name={a.ico} size={14} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "var(--fg)" }}>
                  <strong>{a.who}</strong> <span className="muted">{a.act}</span> {a.what}
                </div>
                <div style={{ fontSize: 11, color: "var(--fg-subtle)", marginTop: 2, display: "flex", gap: 10 }}>
                  <span>{a.t} ago</span>
                  {a.amt && <span style={{ fontFamily: "var(--font-mono)" }}>{a.amt}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title"><Icon name="user" size={14} /> Attendance today</div>
            <Badge tone="success" dot>Live</Badge>
          </div>
          <div className="card-body" style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <Donut value={DATA.ATTENDANCE_TODAY.present} max={DATA.ATTENDANCE_TODAY.total} size={110} stroke={11} label={`${Math.round(DATA.ATTENDANCE_TODAY.present / DATA.ATTENDANCE_TODAY.total * 100)}%`} sub="present" />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { l: "Present", v: DATA.ATTENDANCE_TODAY.present, tone: "success" },
                { l: "Late",    v: DATA.ATTENDANCE_TODAY.late,    tone: "warning" },
                { l: "On leave",v: DATA.ATTENDANCE_TODAY.leave,   tone: "info" },
                { l: "Absent",  v: DATA.ATTENDANCE_TODAY.absent,  tone: "danger" },
                { l: "On field",v: DATA.ATTENDANCE_TODAY.onField, tone: "default" },
              ].map((r) => (
                <div key={r.l} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span className={`dot ${r.tone === "default" ? "" : r.tone === "success" ? "success" : r.tone === "warning" ? "warning" : r.tone === "danger" ? "danger" : "primary"}`}></span>
                    {r.l}
                  </span>
                  <span className="mono" style={{ fontWeight: 600 }}>{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title"><Icon name="shield" size={14} /> Permission requests</div>
            <Badge tone="warning">3 pending</Badge>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { who: "Pooja Aggarwal", req: "Edit access · Customers", time: "2h ago" },
              { who: "Vikram Bhatia",  req: "Approve POs > ₹5L",        time: "Yesterday" },
              { who: "Karan Singh",    req: "Reports · view",            time: "Yesterday" },
            ].map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar name={r.who} color={(i % 5) + 1} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{r.who}</div>
                  <div style={{ fontSize: 11, color: "var(--fg-subtle)" }}>{r.req} · {r.time}</div>
                </div>
                <Btn variant="ghost" size="sm"><Icon name="x" size={12} /></Btn>
                <Btn variant="primary" size="sm"><Icon name="check" size={12} /></Btn>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    <div className="card">
      <div className="card-head">
        <div className="card-title"><Icon name="users" size={14} /> Module activity (last 7 days)</div>
        <Btn variant="ghost" size="sm">All modules <Icon name="chevRight" size={12} /></Btn>
      </div>
      <div className="card-body">
        <BarChart
          data={[
            { day: "Mon", inv: 124, proc: 42, prod: 86, disp: 38 },
            { day: "Tue", inv: 142, proc: 38, prod: 92, disp: 41 },
            { day: "Wed", inv: 118, proc: 56, prod: 88, disp: 36 },
            { day: "Thu", inv: 156, proc: 48, prod: 95, disp: 44 },
            { day: "Fri", inv: 140, proc: 62, prod: 90, disp: 48 },
            { day: "Sat", inv: 98,  proc: 28, prod: 72, disp: 32 },
            { day: "Sun", inv: 42,  proc: 12, prod: 38, disp: 14 },
          ]}
          keys={["inv", "proc", "prod", "disp"]}
          colors={["var(--primary)", "var(--secondary)", "#60a5fa", "#34d399"]}
          h={180}
        />
        <div className="chart-legend" style={{ marginTop: 8, justifyContent: "center" }}>
          <span className="chart-legend-item"><span className="chart-legend-swatch" style={{ background: "var(--primary)" }}></span> Inventory</span>
          <span className="chart-legend-item"><span className="chart-legend-swatch" style={{ background: "var(--secondary)" }}></span> Procurement</span>
          <span className="chart-legend-item"><span className="chart-legend-swatch" style={{ background: "#60a5fa" }}></span> Production</span>
          <span className="chart-legend-item"><span className="chart-legend-swatch" style={{ background: "#34d399" }}></span> Dispatch</span>
        </div>
      </div>
    </div>
  </>
  );
};

/* ============================================================
   OWNER DASHBOARD — strategic & financial
   ============================================================ */
const OwnerDashboard = () => {
  const DATA = useDATA();
  const revCr = revenueMtdRupees(DATA.REVENUE_DATA) / 1_00_00_000;
  const orderBookCr = orderBookRupees(DATA.ORDERS) / 1_00_00_000;
  const topCustomerColumns = useMemo(
    () => [
      {
        title: "Customer",
        dataIndex: "name",
        key: "customer",
        render: (name, c, i) => (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar name={name} color={(i % 5) + 1} />
            <div>
              <div className="strong">{name}</div>
              <div className="subtle" style={{ fontSize: 11 }}>{c.city} · {c.terms}</div>
            </div>
          </div>
        ),
      },
      {
        title: "YTD",
        dataIndex: "ytd",
        key: "ytd",
        align: "right",
        render: (ytd) => <span className="num">{fmtINR(ytd)}</span>,
      },
      {
        title: "Δ",
        key: "delta",
        align: "right",
        render: (_, __, i) => (
          <span style={{ color: i % 3 === 0 ? "var(--danger)" : "var(--success)", fontSize: 11, fontWeight: 500 }}>
            {i % 3 === 0 ? "−2.4%" : `+${(4 + i * 0.7).toFixed(1)}%`}
          </span>
        ),
      },
    ],
    []
  );

  return (
  <>
    <DashHead title="Owner Dashboard" sub="Strategic and financial view across both companies">
      <Btn icon="calendar" size="sm">May 2026</Btn>
      <Btn icon="download" size="sm">Export PDF</Btn>
    </DashHead>

    <div className="grid grid-4" style={{ marginBottom: 20 }}>
      <Kpi icon="money"  label="Group revenue · MTD" value={revCr > 0 ? revCr.toFixed(2) : "—"} unit={revCr > 0 ? "Cr" : undefined} spark={revenueSpark(DATA.REVENUE_DATA)} />
      <Kpi icon="bolt"   label="Open orders"        value={String(openOrdersCount(DATA.ORDERS))} unit="orders" spark={countSpark(openOrdersCount(DATA.ORDERS))} sparkColor="var(--success)" />
      <Kpi icon="chart"  label="Customers"        value={String(DATA.CUSTOMERS.length)} unit="accounts" spark={countSpark(DATA.CUSTOMERS.length)} />
      <Kpi icon="cart"   label="Order book"          value={orderBookCr > 0 ? orderBookCr.toFixed(2) : "—"} unit={orderBookCr > 0 ? "Cr" : undefined} spark={countSpark(Math.round(orderBookCr))} sparkColor="var(--primary)" />
    </div>

    <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 20 }}>
      <div className="card">
        <div className="card-head">
          <div className="card-title"><Icon name="pieChart" size={14} /> Revenue by product line · MTD</div>
        </div>
        <div className="card-body">
          {[
            { name: "Talcum Powder",        v: 322, color: "var(--primary)" },
            { name: "Calcium Carbonate",    v: 245, color: "#5b6dc2" },
            { name: "China Clay",           v: 196, color: "#8497d8" },
            { name: "Dolomite & Quartz",    v: 158, color: "#a8b6e3" },
            { name: "Chemicals (Soda, STPP)", v: 132, color: "#cbd3ee" },
            { name: "FIBC + PP Woven",      v: 287, color: "var(--secondary)" },
            { name: "BOPP & Fabrics",       v: 142, color: "#f0c861" },
          ].map((r, i) => {
            const total = 1482;
            return (
              <div key={r.name} style={{ marginBottom: i === 6 ? 0 : 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: r.color }}></span>
                    {r.name}
                  </span>
                  <span className="mono"><strong>₹{(r.v / 100).toFixed(2)} Cr</strong> <span className="subtle">· {Math.round(r.v / total * 100)}%</span></span>
                </div>
                <div className="bar" style={{ height: 4 }}>
                  <span style={{ width: `${(r.v / total) * 100}%`, background: r.color }}></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title"><Icon name="users" size={14} /> Top customers · MTD</div>
          <Btn variant="ghost" size="sm">All</Btn>
        </div>
        <div className="card-body flush">
          <div style={{ padding: 16 }}>
            <CommonTable
              {...ERP_TABLE_PROPS}
              columns={topCustomerColumns}
              dataSource={DATA.CUSTOMERS}
              rowKey="id"
            />
          </div>
        </div>
      </div>
    </div>

    <div className="grid" style={{ gridTemplateColumns: "2fr 1fr" }}>
      <div className="card">
        <div className="card-head">
          <div className="card-title"><Icon name="chart" size={14} /> Cash flow · last 7 months</div>
          <div className="chart-legend">
            <span className="chart-legend-item"><span className="chart-legend-swatch" style={{ background: "var(--success)" }}></span> Inflow</span>
            <span className="chart-legend-item"><span className="chart-legend-swatch" style={{ background: "var(--danger)" }}></span> Outflow</span>
          </div>
        </div>
        <div className="card-body">
          <AreaChart
            data={[
              { month: "Nov", in: 58, out: 41 },
              { month: "Dec", in: 64, out: 46 },
              { month: "Jan", in: 71, out: 52 },
              { month: "Feb", in: 67, out: 49 },
              { month: "Mar", in: 82, out: 58 },
              { month: "Apr", in: 88, out: 61 },
              { month: "May", in: 96, out: 68 },
            ]}
            keys={["in", "out"]}
            colors={["var(--success)", "var(--danger)"]}
            currency h={220}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title"><Icon name="alert" size={14} /> Risk register</div>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { sev: "high",   t: "PCC stock critical", d: "7.8 MT vs 15 MT reorder · affects 2 orders" },
            { sev: "med",    t: "Vendor concentration", d: "Krishna Minerals = 32% of RM spend" },
            { sev: "med",    t: "Receivables aging",    d: "₹84 L · over 60 days · 4 customers" },
            { sev: "low",    t: "Plant B power consumption", d: "+12% vs Apr · audit recommended" },
          ].map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: 10, background: "var(--bg-sunken)", borderRadius: 8 }}>
              <span style={{
                width: 3, borderRadius: 2,
                background: r.sev === "high" ? "var(--danger)" : r.sev === "med" ? "var(--warning)" : "var(--info)",
              }}></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{r.t}</div>
                <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 2 }}>{r.d}</div>
              </div>
              <Badge tone={r.sev === "high" ? "danger" : r.sev === "med" ? "warning" : "info"}>
                {r.sev === "high" ? "High" : r.sev === "med" ? "Med" : "Low"}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  </>
  );
};

/* ============================================================
   PRODUCTION DASHBOARD
   ============================================================ */
const ProductionDashboard = ({ navigate }) => {
  const DATA = useDATA();
  const activeProductionOrders = useMemo(
    () => DATA.ORDERS.filter((o) => o.status === "in-production" || o.status === "scheduled"),
    [DATA.ORDERS]
  );
  const activeProductionColumns = useMemo(
    () => [
      {
        title: "Order",
        dataIndex: "id",
        key: "id",
        render: (id) => <span className="mono strong">{id}</span>,
      },
      {
        title: "Customer",
        dataIndex: "customer",
        key: "customer",
      },
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
        title: "Due",
        dataIndex: "due",
        key: "due",
        align: "right",
        render: (due) => <span className="num">{due}</span>,
      },
      {
        title: "Progress",
        dataIndex: "progress",
        key: "progress",
        width: 160,
        render: (progress) => (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Bar value={progress} />
            <span className="mono" style={{ fontSize: 11, width: 32, textAlign: "right" }}>{progress}%</span>
          </div>
        ),
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
    <DashHead title="Production Dashboard" sub="Live plant operations · batches, throughput, line status">
      <Btn icon="refresh" size="sm">Refresh</Btn>
      <Btn variant="primary" size="sm" icon="plus" onClick={() => navigate && navigate("/orders")}>Plan batch</Btn>
    </DashHead>

    <div className="grid grid-4" style={{ marginBottom: 20 }}>
      <Kpi icon="factory" label="Throughput today"   value="84.5" unit="MT" delta={6.4} spark={[68,72,76,80,82,83,84]} sparkColor="var(--success)" />
      <Kpi icon="bolt"    label="Plan adherence"     value="92" unit="%"   delta={2.1} spark={[88,89,90,90,91,91,92]} />
      <Kpi icon="loader"  label="Lines running"      value="6 / 8" delta={0} deltaLabel="2 in changeover" spark={[6,6,7,7,6,6,6]} sparkColor="var(--primary)" />
      <Kpi icon="alert"   label="Defects · 1000"     value="3.8" unit="ppm" delta={-12} spark={[5,5,4,4,4,4,3]} sparkColor="var(--success)" />
    </div>

    <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr", marginBottom: 20 }}>
      <div className="card">
        <div className="card-head">
          <div className="card-title"><Icon name="chart" size={14} /> Planned vs actual (MT · this week)</div>
          <div className="chart-legend">
            <span className="chart-legend-item"><span className="chart-legend-swatch" style={{ background: "var(--border-strong)" }}></span> Planned</span>
            <span className="chart-legend-item"><span className="chart-legend-swatch" style={{ background: "var(--primary)" }}></span> Actual</span>
          </div>
        </div>
        <div className="card-body">
          <BarChart
            data={DATA.PRODUCTION_DATA}
            keys={["planned", "actual"]}
            colors={["var(--border-strong)", "var(--primary)"]}
            h={220}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title"><Icon name="factory" size={14} /> Line status</div>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { line: "L1 · Talc Mill A",         status: "running",   batch: "B-4471",  pct: 65 },
            { line: "L2 · CaCO₃ Coater",        status: "running",   batch: "B-4472",  pct: 84 },
            { line: "L3 · Dolomite Pulverizer", status: "running",   batch: "B-4473",  pct: 41 },
            { line: "L4 · PCC Reactor",         status: "changeover",batch: "—",       pct: 0 },
            { line: "L5 · Quartz Sizing",       status: "running",   batch: "B-4474",  pct: 92 },
            { line: "L6 · Soda Ash Pack",       status: "running",   batch: "B-4475",  pct: 28 },
            { line: "L7 · STPP Granulator",     status: "running",   batch: "B-4476",  pct: 55 },
            { line: "L8 · Zeolite Dryer",       status: "down",      batch: "—",       pct: 0 },
          ].map((l) => (
            <div key={l.line}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 500 }}>
                  <span className={`dot ${l.status === "running" ? "success pulse" : l.status === "changeover" ? "warning" : "danger"}`}></span>
                  {l.line}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {l.batch !== "—" && <span className="mono subtle" style={{ fontSize: 11 }}>{l.batch}</span>}
                  <Badge tone={l.status === "running" ? "success" : l.status === "changeover" ? "warning" : "danger"}>
                    {l.status === "running" ? `${l.pct}%` : l.status === "changeover" ? "Changeover" : "Down"}
                  </Badge>
                </div>
              </div>
              {l.status === "running" && <Bar value={l.pct} />}
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="card">
      <div className="card-head">
        <div className="card-title"><Icon name="ticket" size={14} /> Active production orders</div>
        <Btn variant="ghost" size="sm">All orders <Icon name="chevRight" size={12} /></Btn>
      </div>
      <div className="card-body flush">
        <div style={{ padding: 16 }}>
          <CommonTable
            {...ERP_TABLE_PROPS}
            columns={activeProductionColumns}
            dataSource={activeProductionOrders}
            rowKey="id"
          />
        </div>
      </div>
    </div>
  </>
  );
};

/* ============================================================
   DISPATCH DASHBOARD
   ============================================================ */
const DispatchDashboard = ({ navigate }) => {
  const DATA = useDATA();
  const dispatchScheduleColumns = useMemo(
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
        render: (driver, d) => (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar name={driver} color={(d.id.charCodeAt(d.id.length - 1) % 5) + 1} />
            {driver}
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
        align: "right",
        render: (loaded) => <span className="num">{loaded}</span>,
      },
      {
        title: "ETA",
        dataIndex: "eta",
        key: "eta",
        render: (eta) => <span className="mono" style={{ fontSize: 12 }}>{eta}</span>,
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
    <DashHead title="Dispatch Dashboard" sub="Live vehicles, deliveries & loadout planning">
      <Btn icon="map" size="sm">Map view</Btn>
      <Btn variant="primary" size="sm" icon="plus" onClick={() => navigate("/dispatch")}>New dispatch</Btn>
    </DashHead>

    <div className="grid grid-4" style={{ marginBottom: 20 }}>
      <Kpi icon="truck"  label="Vehicles dispatched today" value="14" delta={16} spark={[10,11,12,12,13,13,14]} sparkColor="var(--primary)" />
      <Kpi icon="bolt"   label="On-time delivery"          value="94.2" unit="%" delta={1.2} spark={[91,92,93,93,93,94,94]} sparkColor="var(--success)" />
      <Kpi icon="alert"  label="Delayed shipments"         value="2" delta={-33} spark={[3,3,2,3,2,2,2]} sparkColor="var(--success)" />
      <Kpi icon="clock"  label="Avg transit time"          value="11.4" unit="hrs" delta={-4} spark={[12,12,11.8,11.6,11.5,11.4,11.4]} sparkColor="var(--success)" />
    </div>

    <div className="grid" style={{ gridTemplateColumns: "1fr 420px", marginBottom: 20 }}>
      <div className="card">
        <div className="card-head">
          <div className="card-title"><Icon name="map" size={14} /> Live fleet · West & Central India</div>
          <div className="row">
            <Badge tone="info" dot>4 in-transit</Badge>
            <Badge tone="gold" dot>1 near</Badge>
          </div>
        </div>
        <div className="card-body">
          <FleetMap />
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title"><Icon name="truck" size={14} /> Active vehicles</div>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {DATA.DISPATCHES.slice(0, 4).map((d) => (
            <div key={d.id} onClick={() => navigate("/dispatch")} style={{ cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div className="mono nowrap" style={{ fontSize: 12, fontWeight: 600 }}>{d.vehicle}</div>
                <StatusBadge status={d.status} />
              </div>
              <div style={{ fontSize: 12, color: "var(--fg-muted)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="user" size={11} />
                <span className="nowrap">{d.driver}</span>
                <span style={{ opacity: 0.5 }}>·</span>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.customer}</span>
              </div>
              <Bar value={d.progress} tone={d.status === "near-delivery" ? "gold" : d.status === "delivered" ? "success" : "primary"} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--fg-subtle)" }}>
                <span className="nowrap" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{d.route}</span>
                <span className="mono nowrap" style={{ marginLeft: 8 }}>ETA {d.eta.split(",")[1]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="card">
      <div className="card-head">
        <div className="card-title"><Icon name="calendar" size={14} /> Dispatch schedule · next 48 hours</div>
        <Btn variant="ghost" size="sm">View all <Icon name="chevRight" size={12} /></Btn>
      </div>
      <div className="card-body flush">
        <div style={{ padding: 16 }}>
          <CommonTable
            {...ERP_TABLE_PROPS}
            columns={dispatchScheduleColumns}
            dataSource={DATA.DISPATCHES}
            rowKey="id"
          />
        </div>
      </div>
    </div>
  </>
  );
};

/* ---------- fleet map (svg) ---------- */
const FleetMap = () => {
  const cities = [
    { x: 52, y: 38, n: "Udaipur", t: "Plant A" },
    { x: 32, y: 56, n: "Ahmedabad", t: "Plant B" },
    { x: 28, y: 78, n: "Mumbai" },
    { x: 38, y: 90, n: "Pune" },
    { x: 80, y: 78, n: "Kolkata" },
    { x: 24, y: 64, n: "Bhavnagar" },
    { x: 56, y: 36, n: "Gotan" },
  ];
  const routes = [
    { from: [52, 38], to: [28, 78], color: "var(--primary)", progress: 0.68, label: "DSP-1042" },
    { from: [32, 56], to: [28, 78], color: "var(--info)", progress: 0.42, label: "DSP-1041" },
    { from: [52, 38], to: [80, 78], color: "var(--primary)", progress: 0.24, label: "DSP-1040" },
    { from: [32, 56], to: [24, 64], color: "var(--secondary)", progress: 0.92, label: "DSP-1039" },
    { from: [52, 38], to: [38, 90], color: "var(--success)", progress: 1.0, label: "DSP-1038" },
  ];
  return (
    <div className="map-frame" style={{ height: 340, position: "relative" }}>
      {/* Landmass + route lines via SVG (stretched is OK for stylized blob + lines) */}
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
        <path
          d="M 20 20 Q 28 14 38 16 L 50 12 Q 62 10 72 18 L 84 22 Q 92 30 88 42 L 86 56 Q 82 72 70 82 L 56 92 Q 42 94 36 88 L 28 80 Q 20 70 18 56 L 18 38 Q 16 28 20 20 Z"
          fill="rgba(55,77,149,0.04)"
          stroke="rgba(55,77,149,0.15)"
          strokeWidth="0.4"
          strokeDasharray="0.6 0.6"
        />
        {routes.map((r, i) => (
          <g key={i}>
            <line x1={r.from[0]} y1={r.from[1]} x2={r.to[0]} y2={r.to[1]} stroke={r.color} strokeWidth="0.4" strokeDasharray="0.8 0.8" opacity="0.4" />
            <line
              x1={r.from[0]} y1={r.from[1]}
              x2={r.from[0] + (r.to[0] - r.from[0]) * r.progress}
              y2={r.from[1] + (r.to[1] - r.from[1]) * r.progress}
              stroke={r.color} strokeWidth="0.6" strokeLinecap="round"
            />
          </g>
        ))}
      </svg>

      {/* City dots — DOM-positioned so they stay circular */}
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

      {/* Moving truck dots */}
      {routes.filter(r => r.progress < 1).map((r, i) => (
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

      {/* City labels */}
      {cities.map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${c.x}%`,
            top: `${c.y}%`,
            transform: "translate(10px, -50%)",
            fontSize: 11,
            color: c.t ? "var(--primary)" : "var(--fg-muted)",
            fontWeight: c.t ? 600 : 500,
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {c.n}{c.t && <span style={{ marginLeft: 4, color: "var(--fg-subtle)", fontWeight: 400 }}>· {c.t}</span>}
        </div>
      ))}

      {/* Floating route ETA labels */}
      {routes.slice(0, 3).map((r, i) => (
        <div
          key={`l-${i}`}
          style={{
            position: "absolute",
            left: `${r.from[0] + (r.to[0] - r.from[0]) * r.progress}%`,
            top: `${r.from[1] + (r.to[1] - r.from[1]) * r.progress}%`,
            transform: "translate(14px, -140%)",
            background: "var(--bg-elev)",
            border: "1px solid var(--border)",
            padding: "2px 6px",
            borderRadius: 4,
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            color: r.color,
            fontWeight: 600,
            boxShadow: "var(--shadow-sm)",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          {r.label}
        </div>
      ))}
    </div>
  );
};

export { MasterDashboard, AdminDashboard, OwnerDashboard, ProductionDashboard, DispatchDashboard, DashHead, SectionH };
