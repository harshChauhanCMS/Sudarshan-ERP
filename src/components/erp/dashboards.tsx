// @ts-nocheck
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Calendar, Popover, Select, Spin } from "antd";
import {
  AlertOutlined,
  BarChartOutlined,
  CalendarOutlined,
  CarOutlined,
  CheckCircleOutlined,
  DashboardOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  ExclamationCircleOutlined,
  FileExclamationOutlined,
  InboxOutlined,
  MessageOutlined,
  RiseOutlined,
  SendOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  TruckOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import StatCard, { mapDashStatTone } from "@/components/common/StatCard";
import { AddDriverModal } from "@/components/dispatch/add-driver-modal";
import { Icon } from "./icons";
import { useDATA } from "./data";
import { useOwnerDashboard } from "@/hooks/use-owner-dashboard";
import {
  revenueMtdRupees,
  revenueLakhsFromSeries,
  formatLakhs,
  openOrdersCount,
  revenueSpark,
  countSpark,
  orderBookRupees,
  pendingPoCount,
  lowStockCount,
  productionDayActual,
  productionWeekTotals,
  activeProductionJobs,
  activeDispatches,
  dispatchStatusCounts,
  overdueOpenOrders,
  pendingInvoiceVerifications,
  grossMarginPct,
  grossProfitRupees,
  topCustomerNames,
  fieldVisitsTodayCount,
  dispatchesForPlant,
} from "@/lib/erp-stats";
import { DASHBOARD_AVATARS, OWNER_BANNER_AVATARS, ADMIN_BANNER_AVATARS, bannerAvatarSrc } from "@/lib/dashboard-banner-avatars";
import {
  Btn,
  Badge,
  StatusBadge,
  Avatar,
  Bar,
  Sparkline,
  Kpi,
  Modal,
  fmtINR,
  fmtINRFull,
  fmtNum,
  AreaChart,
  BarChart,
} from "./ui";
import CommonTable from "@/components/common/CommonTable";
import {
  ERP_TABLE_PROPS,
  erpStatusBadge,
} from "@/components/common/erpStatusBadges";

/* ============================================================
   5 DASHBOARDS
   ============================================================ */

/* ---------- shared header ---------- */
const OWNER_CALENDAR_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const ownerCalendarYearOptions = (centerYear) =>
  Array.from({ length: 21 }, (_, index) => {
    const year = centerYear - 10 + index;
    return { label: String(year), value: year };
  });

const renderOwnerCalendarHeader = ({ value: current, onChange }) => (
  <div className="owner-dash-calendar-header">
    <button
      type="button"
      className="owner-dash-calendar-header__nav"
      aria-label="Previous month"
      onClick={() => onChange(current.subtract(1, "month"))}
    >
      <Icon name="arrowRight" size={14} style={{ transform: "rotate(180deg)" }} />
    </button>
    <div className="owner-dash-calendar-header__row">
      <Select
        size="small"
        className="owner-dash-calendar-header__month"
        value={current.month()}
        options={OWNER_CALENDAR_MONTHS.map((label, month) => ({
          label,
          value: month,
        }))}
        onChange={(month) => onChange(current.month(month))}
        popupMatchSelectWidth={false}
        getPopupContainer={() => document.body}
      />
      <Select
        size="small"
        className="owner-dash-calendar-header__year"
        value={current.year()}
        options={ownerCalendarYearOptions(current.year())}
        onChange={(year) => onChange(current.year(year))}
        popupMatchSelectWidth={false}
        getPopupContainer={() => document.body}
      />
    </div>
    <button
      type="button"
      className="owner-dash-calendar-header__nav"
      aria-label="Next month"
      onClick={() => onChange(current.add(1, "month"))}
    >
      <Icon name="arrowRight" size={14} />
    </button>
  </div>
);

const OwnerHoverCalendar = ({ value, onChange, children }) => (
  <Popover
    trigger="hover"
    placement="bottomRight"
    overlayClassName="owner-dash-calendar-popover"
    content={
      <Calendar
        fullscreen={false}
        className="owner-dash-calendar"
        value={value}
        onChange={(next) => onChange(next)}
        headerRender={renderOwnerCalendarHeader}
      />
    }
  >
    <span className="owner-dash-date-trigger">{children}</span>
  </Popover>
);

const DashHead = ({
  title,
  sub,
  children,
  dateBadge,
}: {
  title: string;
  sub: string;
  children?: React.ReactNode;
  dateBadge?: React.ReactNode;
}) => (
  <div className="page-head">
    <div>
      <h1 className="page-title">
        {title}
        {dateBadge ?? (
          <Badge tone="default" sq>
            <Icon name="calendar" size={10} /> May 21, 2026 · Thu
          </Badge>
        )}
      </h1>
      <div className="page-sub">{sub}</div>
    </div>
    <div className="page-head-actions">{children}</div>
  </div>
);

const BannerAvatar = ({ name, avatarSrc, avatarColor }) => {
  const [failed, setFailed] = useState(false);
  const src = avatarSrc ? bannerAvatarSrc(avatarSrc) : "";

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        className="dash-banner-carousel__avatar"
        onError={() => setFailed(true)}
      />
    );
  }

  return <Avatar name={name} color={avatarColor ?? 1} size="lg" />;
};

const DashboardBannerCarousel = ({
  slides,
  navigate,
  intervalMs = 6000,
}: {
  slides: Array<{ id: string; href?: string; [key: string]: unknown }>;
  navigate?: (href: string) => void;
  intervalMs?: number;
}) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  useEffect(() => {
    if (count <= 1 || paused) return undefined;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [count, intervalMs, paused]);

  if (!count) return null;

  const go = (next) => {
    setIndex((i) => (next + count) % count);
  };

  return (
    <div
      className="dash-banner-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="dash-banner-carousel__viewport">
        <div
          className="dash-banner-carousel__track"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((item) => (
            <article
              key={item.id}
              className={`dash-banner-carousel__slide dash-banner-carousel__slide--${item.tone ?? "blue"}`}
            >
              <div className="dash-banner-carousel__copy">
                <div className="dash-banner-carousel__meta">
                  <span className="dash-banner-carousel__eyebrow">
                    {item.eyebrow}
                  </span>
                  {item.role ? (
                    <span className="dash-banner-carousel__role">
                      {item.role}
                    </span>
                  ) : null}
                </div>
                <h3 className="dash-banner-carousel__title">{item.title}</h3>
                <p className="dash-banner-carousel__text">{item.text}</p>
                {item.href && navigate ? (
                  <button
                    type="button"
                    className="dash-banner-carousel__cta"
                    onClick={() => navigate(item.href)}
                  >
                    {item.actionLabel ?? "View details"}
                    <Icon name="arrowRight" size={12} />
                  </button>
                ) : null}
              </div>
              <div className="dash-banner-carousel__avatar-wrap">
                <BannerAvatar
                  name={item.name}
                  avatarSrc={item.avatarSrc}
                  avatarColor={item.avatarColor}
                />
              </div>
            </article>
          ))}
        </div>
      </div>

      {count > 1 ? (
        <>
          <button
            type="button"
            className="dash-banner-carousel__nav dash-banner-carousel__nav--prev"
            onClick={() => go(index - 1)}
            aria-label="Previous banner"
          >
            <Icon name="arrowRight" size={14} />
          </button>
          <button
            type="button"
            className="dash-banner-carousel__nav dash-banner-carousel__nav--next"
            onClick={() => go(index + 1)}
            aria-label="Next banner"
          >
            <Icon name="arrowRight" size={14} />
          </button>
          <div
            className="dash-banner-carousel__dots"
            role="tablist"
            aria-label="Dashboard banners"
          >
            {slides.map((item, i) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                className={`dash-banner-carousel__dot${i === index ? " is-active" : ""}`}
                onClick={() => setIndex(i)}
                aria-label={`Show banner ${i + 1}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
};

const ADMIN_BANNER_SLIDES = [
  {
    id: "platform",
    tone: "blue",
    eyebrow: "Sudarshan ERP",
    title: "One portal for plant operations",
    text: "Run Minerals and Microns from a single admin workspace — users, alerts, procurement, inventory, and live operations together.",
    name: "Operations team",
    role: "Admin dashboard",
    avatarSrc: ADMIN_BANNER_AVATARS.platform,
    avatarColor: 1,
    href: "/dashboard/admin",
    actionLabel: "Explore dashboard",
  },
  {
    id: "procurement",
    tone: "amber",
    eyebrow: "Procurement & accounts",
    title: "PO-to-invoice control",
    text: "Create purchase orders, verify vendor invoices, and resolve mismatches before they reach month-end closing.",
    name: "Accounts team",
    role: "Procurement module",
    avatarSrc: ADMIN_BANNER_AVATARS.procurement,
    avatarColor: 2,
    href: "/procurement/invoices",
    actionLabel: "Open procurement",
  },
  {
    id: "inventory",
    tone: "rose",
    eyebrow: "Inventory",
    title: "Stock across RM, packaging & spares",
    text: "Monitor reorder levels, low-stock alerts, and warehouse movement for both manufacturing plants in real time.",
    name: "Stores team",
    role: "Inventory module",
    avatarSrc: ADMIN_BANNER_AVATARS.inventory,
    avatarColor: 3,
    href: "/inventory/raw-material",
    actionLabel: "View inventory",
  },
  {
    id: "people-logistics",
    tone: "green",
    eyebrow: "People & logistics",
    title: "Workforce, field teams & dispatch",
    text: "Mark attendance, track field visits with GPS from mobile, and coordinate dispatches from order booking to delivery.",
    name: "HR & dispatch",
    role: "HRMS & logistics",
    avatarSrc: ADMIN_BANNER_AVATARS.people,
    avatarColor: 4,
    href: "/hrms/attendance",
    actionLabel: "People & dispatch",
  },
];

const OWNER_BANNER_SLIDES = [
  {
    id: "executive",
    tone: "green",
    eyebrow: "Executive overview",
    title: "SMI & SMIC performance in one view",
    text: "Compare Sudarshan Minerals and Microns — sales, plant KPIs, risks, and company health without switching systems.",
    name: "Leadership",
    role: "Owner dashboard",
    avatarSrc: OWNER_BANNER_AVATARS.executive,
    avatarColor: 4,
    href: "/reports",
    actionLabel: "View reports",
  },
  {
    id: "finance",
    tone: "ocean",
    eyebrow: "Finance & profitability",
    title: "Revenue, margin & top customers",
    text: "Estimated P&L, gross margin, and customer contribution so you can spot trends and act before quarter close.",
    name: "Finance",
    role: "Business intelligence",
    avatarSrc: OWNER_BANNER_AVATARS.finance,
    avatarColor: 3,
    href: "/reports",
    actionLabel: "Profit overview",
  },
  {
    id: "dispatch",
    tone: "blue",
    eyebrow: "Logistics",
    title: "Plant-to-customer dispatch visibility",
    text: "See due and overdue shipments, active dispatches, and delivery risk before it affects customer commitments.",
    name: "Logistics",
    role: "Dispatch control",
    avatarSrc: OWNER_BANNER_AVATARS.dispatch,
    avatarColor: 1,
    href: "/dispatch",
    actionLabel: "Dispatch board",
  },
  {
    id: "procurement",
    tone: "amber",
    eyebrow: "Procurement",
    title: "Vendor price & sourcing intelligence",
    text: "Catch quote changes early and protect margins on running orders across your supplier network.",
    name: "Procurement",
    role: "Vendor management",
    avatarSrc: OWNER_BANNER_AVATARS.procurement,
    avatarColor: 5,
    href: "/procurement/vendors",
    actionLabel: "Vendor insights",
  },
  {
    id: "field",
    tone: "violet",
    eyebrow: "Field sales",
    title: "Mobile workforce on the ground",
    text: "Live field punch-in, customer visits, and sales activity from the Sudarshan mobile app — visible on this dashboard.",
    name: "Field sales",
    role: "Mobile ERP",
    avatarSrc: OWNER_BANNER_AVATARS.field,
    avatarColor: 2,
    href: "/field-sales/activity-dashboard",
    actionLabel: "Field activity",
  },
];

const DISPATCH_BANNER_SLIDES = [
  {
    id: "schedule",
    tone: "blue",
    eyebrow: "Dispatch planning",
    title: "Schedule pickup, dispatch & delivery",
    text: "Plan shipments from plant to customer — slot pickups, assign vehicles, set ETAs, and coordinate delivery windows before trucks leave the gate.",
    name: "Dispatch planner",
    role: "Schedule & routing",
    avatarSrc: DASHBOARD_AVATARS.schedule,
    avatarColor: 1,
    href: "/dispatch/new",
    actionLabel: "Create dispatch plan",
  },
  {
    id: "tracking",
    tone: "ocean",
    eyebrow: "Live tracking",
    title: "Track every vehicle on the road",
    text: "See live location, ETA, speed, and on-time status for active dispatches — from loading bay to customer doorstep.",
    name: "Fleet control",
    role: "GPS & ETA monitoring",
    avatarSrc: DASHBOARD_AVATARS.tracking,
    avatarColor: 2,
    href: "/dashboard/dispatch",
    actionLabel: "Open live tracking",
  },
];

const SectionH = ({ title, sub, action }) => (
  <div
    style={{
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      marginBottom: 12,
    }}
  >
    <div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "-0.005em",
        }}
      >
        {title}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: "var(--fg-subtle)", marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
    {action}
  </div>
);

const MasterSectionTitle = ({ icon, children }) => (
  <div className="master-section-title">
    <Icon name={icon} size={14} style={{ color: "var(--primary)" }} />
    {children}
  </div>
);

const MasterSummaryCard = ({ label, value, sub, tone = "default", icon }) => (
  <div className="master-summary-card">
    <div className="master-summary-card__label">
      {icon ? <Icon name={icon} size={13} /> : null}
      {label}
    </div>
    <div
      className={`master-summary-card__value ${tone !== "default" ? tone : ""}`}
    >
      {value}
    </div>
    {sub ? <div className="master-summary-card__sub">{sub}</div> : null}
  </div>
);

const MasterListCard = ({ title, children, footnote }) => (
  <div className="card master-list-card">
    <div className="card-head">
      <div className="card-title">{title}</div>
    </div>
    <div className="card-body">
      <ul className="master-dash-list">{children}</ul>
      {footnote ? <p className="master-dash-footnote">{footnote}</p> : null}
    </div>
  </div>
);

const MasterListRow = ({ label, value, pillTone }) => (
  <li>
    <span>{label}</span>
    {pillTone ? (
      <span className={`master-pill ${pillTone}`}>{value}</span>
    ) : (
      <span className="master-list-row__value">{value}</span>
    )}
  </li>
);

/* ============================================================
   MASTER DASHBOARD — group view
   ============================================================ */
const MasterDashboard = ({ navigate }) => {
  const DATA = useDATA();
  const rev = revenueLakhsFromSeries(DATA.REVENUE_DATA);
  const revenueRupees = revenueMtdRupees(DATA.REVENUE_DATA);
  const attendance = DATA.ATTENDANCE_TODAY;
  const presentToday =
    attendance.total > 0 ? attendance.present : DATA.EMPLOYEES.length;
  const totalEmployees =
    attendance.total > 0 ? attendance.total : DATA.EMPLOYEES.length;
  const prodToday = productionDayActual(DATA.PRODUCTION_DATA);
  const prodWeek = productionWeekTotals(DATA.PRODUCTION_DATA);
  const activeJobs = activeProductionJobs(DATA.ORDERS);
  const batchCount = Math.max(activeJobs, DATA.PRODUCTION_DATA.length);
  const dispatchesDue = activeDispatches(DATA.DISPATCHES);
  const overdueDispatches = overdueOpenOrders(DATA.ORDERS);
  const dispatchCounts = dispatchStatusCounts(DATA.DISPATCHES);
  const rmLow = lowStockCount(DATA.RAW_MATERIALS);
  const packLow = lowStockCount(DATA.PACKAGING);
  const spareRisk = lowStockCount(DATA.SPARE_PARTS);
  const pendingInvoices = pendingInvoiceVerifications(DATA.INVOICES);
  const mineralsDispatch = dispatchesForPlant(DATA.DISPATCHES, "udaipur");
  const micronsDispatch = dispatchesForPlant(DATA.DISPATCHES, "ahmedabad");
  const fieldToday = fieldVisitsTodayCount(DATA.FIELD_VISITS);
  const grossProfit = grossProfitRupees(revenueRupees);
  const prodTargetToday =
    DATA.PRODUCTION_DATA.length > 0
      ? Number(DATA.PRODUCTION_DATA[DATA.PRODUCTION_DATA.length - 1].planned) ||
        0
      : 0;
  const prodPct =
    prodTargetToday > 0
      ? Math.round((prodToday / prodTargetToday) * 100)
      : null;
  const lowRmNames = DATA.RAW_MATERIALS.filter(
    (r) => r.status === "low" || r.status === "critical",
  )
    .slice(0, 3)
    .map((r) => r.name.split(" ")[0])
    .join(" / ");

  return (
    <>
      <DashHead
        title="Master Dashboard"
        sub="Single-page summary across Admin, Owner, Production & Dispatch"
      >
        <Btn icon="download" size="sm">
          Export
        </Btn>
        <Btn variant="primary" size="sm" icon="bolt">
          Quick action
        </Btn>
      </DashHead>

      <div className="master-dash-layout">
        <MasterSectionTitle icon="chart">Overall summary</MasterSectionTitle>
        <div className="master-summary-grid">
          <MasterSummaryCard
            icon="money"
            label="Combined sales (MTD)"
            value={formatLakhs(rev.total)}
            sub="Owner dashboard · both companies"
            tone="accent"
          />
          <MasterSummaryCard
            icon="chart"
            label="Gross margin"
            value={revenueRupees > 0 ? `${grossMarginPct()}%` : "—"}
            sub="Owner dashboard · this month"
            tone="success"
          />
          <MasterSummaryCard
            icon="factory"
            label="Today’s production"
            value={prodToday > 0 ? `${prodToday} MT` : "—"}
            sub={`Production dashboard · ${batchCount} batches, ${activeJobs} jobs running`}
          />
          <MasterSummaryCard
            icon="truck"
            label="Dispatches due today"
            value={String(dispatchesDue)}
            sub={`Owner: ${dispatchesDue} due · Dispatch: ${dispatchCounts.active} detailed`}
          />
          <MasterSummaryCard
            icon="alert"
            label="Dispatches overdue"
            value={String(overdueDispatches)}
            sub="Owner & Dispatch dashboards"
            tone={overdueDispatches > 0 ? "danger" : "default"}
          />
          <MasterSummaryCard
            icon="users"
            label="Employees present today"
            value={String(presentToday)}
            sub={`Admin attendance summary · of ${totalEmployees}`}
            tone="success"
          />
        </div>

        <MasterSectionTitle icon="truck">Dispatch snapshot</MasterSectionTitle>
        <div className="master-dispatch-block">
          <div className="card master-list-card">
            <div className="card-head">
              <div className="card-title">Dispatch KPIs</div>
            </div>
            <div className="card-body">
              <div className="master-summary-grid master-summary-grid--compact">
                <MasterSummaryCard
                  label="Due today"
                  value={String(dispatchCounts.active)}
                  sub="Dispatch dashboard detailed list"
                />
                <MasterSummaryCard
                  label="Overdue"
                  value={String(overdueDispatches)}
                  sub="Open orders past due"
                  tone={overdueDispatches > 0 ? "danger" : "default"}
                />
                <MasterSummaryCard
                  label="Vehicles assigned"
                  value={String(dispatchCounts.active)}
                  sub={`${dispatchCounts.inTransit} in transit · ${dispatchCounts.nearDelivery} ready · ${dispatchCounts.loading} loading`}
                />
                <MasterSummaryCard
                  label="Packaging block"
                  value={String(packLow)}
                  sub={
                    packLow > 0
                      ? "Low packaging stock affecting dispatch readiness"
                      : "No packaging blocks"
                  }
                  tone={packLow > 0 ? "warning" : "default"}
                />
              </div>
            </div>
          </div>

          <MasterListCard title="Today’s dispatch mix">
            <MasterListRow
              label="Minerals (Udaipur)"
              value={`${mineralsDispatch.due} due · ${mineralsDispatch.overdue} overdue · ${mineralsDispatch.completed} completed`}
            />
            <MasterListRow
              label="Microns (Makrana)"
              value={`${micronsDispatch.due} due · ${micronsDispatch.overdue > 0 ? `${micronsDispatch.overdue} overdue · ` : ""}${micronsDispatch.completed} completed`}
            />
            <MasterListRow
              label="Key customers"
              value={topCustomerNames(DATA.CUSTOMERS)}
            />
          </MasterListCard>
        </div>

        <MasterSectionTitle icon="layers">Company snapshot</MasterSectionTitle>
        <div className="master-two-col">
          <MasterListCard title="Company overview">
            <MasterListRow
              label={DATA.COMPANIES[0]?.name ?? "Sudarshan Minerals"}
              value={`Sales: ${formatLakhs(rev.smi)} · Dispatches today: ${mineralsDispatch.due} · RM alerts: ${rmLow}`}
            />
            <MasterListRow
              label={DATA.COMPANIES[1]?.name ?? "Sudarshan Microns"}
              value={`Sales: ${formatLakhs(rev.smic)} · Dispatches today: ${micronsDispatch.due} · Overdue: ${micronsDispatch.overdue}`}
            />
          </MasterListCard>
          <MasterListCard
            title="Users & access"
            footnote="From Admin & Owner dashboards."
          >
            <MasterListRow
              label="Total users"
              value={String(DATA.EMPLOYEES.length)}
            />
            <MasterListRow label="Present today" value={String(presentToday)} />
            <MasterListRow
              label="In field today"
              value={String(attendance.onField || fieldToday)}
            />
            <MasterListRow
              label="Pending invoice verifications"
              value={
                <>
                  <Icon name="invoice" size={11} /> {pendingInvoices}
                </>
              }
              pillTone={pendingInvoices > 0 ? "danger" : undefined}
            />
          </MasterListCard>
        </div>

        <MasterSectionTitle icon="box">
          Inventory & production health
        </MasterSectionTitle>
        <div className="master-two-col">
          <MasterListCard title="Low stock & risk indicators">
            <MasterListRow
              label="Low RM alerts"
              value={
                <>
                  <Icon name="box" size={11} /> {rmLow} (Owner)
                </>
              }
              pillTone={rmLow > 0 ? "danger" : undefined}
            />
            <MasterListRow
              label="Low packaging alerts"
              value={
                <>
                  <Icon name="package" size={11} /> {packLow}
                </>
              }
              pillTone={packLow > 0 ? "warning" : undefined}
            />
            <MasterListRow
              label="Spare parts risk"
              value={
                <>
                  <Icon name="wrench" size={11} /> {spareRisk}
                </>
              }
              pillTone={spareRisk > 0 ? "warning" : undefined}
            />
            <MasterListRow
              label="RM low (Talc / CaCO₃ / TiO₂)"
              value={
                lowRmNames
                  ? `Below reorder · watch for stock-out in 10–12 days (${lowRmNames})`
                  : "No critical RM items"
              }
            />
          </MasterListCard>
          <MasterListCard
            title="Today’s production"
            footnote="From Production dashboard stats row."
          >
            <MasterListRow
              label="Today’s target"
              value={prodTargetToday > 0 ? `${prodTargetToday} MT` : "—"}
            />
            <MasterListRow
              label="Achieved so far"
              value={
                prodToday > 0
                  ? `${prodToday} MT${prodPct != null ? ` · ${prodPct}%` : ""}`
                  : "—"
              }
              pillTone={
                prodPct != null && prodPct >= 70 ? "success" : undefined
              }
            />
            <MasterListRow
              label="Week target"
              value={prodWeek.planned > 0 ? `${prodWeek.planned} MT` : "—"}
            />
            <MasterListRow
              label="Week achieved"
              value={prodWeek.actual > 0 ? `${prodWeek.actual} MT` : "—"}
            />
            <MasterListRow label="Active jobs now" value={String(activeJobs)} />
          </MasterListCard>
        </div>

        <div className="master-two-col">
          <MasterListCard
            title="People & field activity"
            footnote="From Owner & Admin dashboards (field visits & alerts)."
          >
            <MasterListRow
              label="Employees in field today"
              value={String(attendance.onField || fieldToday)}
            />
            <MasterListRow
              label="Field visits logged today"
              value={String(fieldToday)}
            />
            <MasterListRow
              label="Key visits"
              value={DATA.FIELD_VISITS.slice(0, 6)
                .map((v) => v.customer.split(" ")[0])
                .join(", ")}
            />
          </MasterListCard>

          <MasterListCard title="Profit & top customers">
            <MasterListRow
              label="Revenue (MTD)"
              value={formatLakhs(rev.total)}
            />
            <MasterListRow
              label="Gross profit"
              value={grossProfit > 0 ? fmtINR(grossProfit) : "—"}
            />
            <MasterListRow
              label="Top customers (MTD)"
              value={topCustomerNames(DATA.CUSTOMERS)}
            />
          </MasterListCard>
        </div>
      </div>
    </>
  );
};

/* ============================================================
   ADMIN DASHBOARD — operational
   ============================================================ */
const ADMIN_ORDERS_WEEK_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#16a34a",
  "#0d9488",
  "#ca8a04",
];

const ADMIN_ORDERS_WEEK_GRADIENTS = [
  { from: "#60a5fa", to: "#1d4ed8" },
  { from: "#a78bfa", to: "#6d28d9" },
  { from: "#f472b6", to: "#be185d" },
  { from: "#fb923c", to: "#c2410c" },
  { from: "#4ade80", to: "#15803d" },
  { from: "#2dd4bf", to: "#0f766e" },
  { from: "#facc15", to: "#a16207" },
];

const AdminEyebrow = ({ children }) => (
  <div className="admin-eyebrow">{children}</div>
);

const AdminStatCard = ({ label, value, tone = "default", icon }) => (
  <StatCard
    icon={icon}
    label={label}
    value={value}
    hintTone={mapDashStatTone(tone)}
  />
);

const AdminCompanyCard = ({ company, accent, metrics }) => (
  <div className={`admin-company-card ${accent === "gold" ? "microns" : ""}`}>
    <div className="admin-company-card__name">{company.name}</div>
    <div className="admin-company-card__loc">
      <Icon name="pin" size={11} />{" "}
      {company.plant?.split(",")[0] ?? company.plant}
    </div>
    <div className="admin-company-card__metrics">
      {metrics.map((m) => (
        <div key={m.label} className="admin-company-card__metric">
          <span className={`admin-company-card__metric-v ${m.tone ?? ""}`}>
            {m.value}
          </span>
          <span className="admin-company-card__metric-l">{m.label}</span>
        </div>
      ))}
    </div>
  </div>
);

const AdminWidget = ({ title, icon, badge, children }) => (
  <div className="admin-widget">
    <div className="admin-widget-header">
      <span className="admin-widget-header__title">
        <Icon name={icon} size={14} /> {title}
      </span>
      {badge}
    </div>
    <div className="admin-widget-body">{children}</div>
  </div>
);

const AdminDashboard = ({ navigate }) => {
  const DATA = useDATA();
  const attendance = DATA.ATTENDANCE_TODAY;
  const totalUsers =
    attendance.total > 0 ? attendance.total : DATA.EMPLOYEES.length;
  const presentToday =
    attendance.total > 0 ? attendance.present : DATA.EMPLOYEES.length;
  const rmLow = lowStockCount(DATA.RAW_MATERIALS);
  const packLow = lowStockCount(DATA.PACKAGING);
  const spareLow = lowStockCount(DATA.SPARE_PARTS);
  const lowStockTotal = rmLow + packLow + spareLow;
  const pendingInvoices = pendingInvoiceVerifications(DATA.INVOICES);
  const mismatchInvoices = useMemo(
    () => DATA.INVOICES.filter((i) => i.status === "mismatch"),
    [DATA.INVOICES],
  );
  const pendingInvoiceTotal = mismatchInvoices.reduce(
    (s, i) => s + (Number(i.invAmt) || 0),
    0,
  );
  const dispatchDelays = overdueOpenOrders(DATA.ORDERS);
  const mineralsDispatch = dispatchesForPlant(DATA.DISPATCHES, "udaipur");
  const micronsDispatch = dispatchesForPlant(DATA.DISPATCHES, "ahmedabad");
  const waTasks = pendingPoCount(DATA.PURCHASE_ORDERS);

  const lowRmLabels = DATA.RAW_MATERIALS.filter(
    (r) => r.status === "low" || r.status === "critical",
  )
    .slice(0, 3)
    .map((r) => r.name.split(" ")[0])
    .join(", ");
  const lowPackLabels = DATA.PACKAGING.filter(
    (p) => p.status === "low" || p.status === "critical",
  )
    .slice(0, 2)
    .map((p) => p.name.split(" · ")[0])
    .join(", ");
  const lowSpareLabels = DATA.SPARE_PARTS.filter(
    (s) => s.status === "low" || s.status === "critical",
  )
    .slice(0, 2)
    .map((s) => s.name.split(" ")[0])
    .join(", ");

  const invoiceColumns = useMemo(
    () => [
      {
        title: "Invoice",
        dataIndex: "id",
        key: "id",
        render: (id) => <span className="mono">{id}</span>,
      },
      {
        title: "Vendor",
        dataIndex: "vendor",
        key: "vendor",
      },
      {
        title: "Amount",
        dataIndex: "invAmt",
        key: "invAmt",
        align: "right",
        render: (amt) => <span className="num">{fmtINR(amt)}</span>,
      },
      {
        title: "Action",
        key: "action",
        align: "right",
        render: () => (
          <Btn
            variant="primary"
            size="sm"
            onClick={() => navigate("/procurement/invoices")}
          >
            Verify
          </Btn>
        ),
      },
    ],
    [navigate],
  );

  const recentColumns = useMemo(
    () => [
      {
        title: "Type",
        key: "type",
        width: 90,
        render: (_, r) => <Badge tone={r.tone}>{r.type}</Badge>,
      },
      {
        title: "Record",
        dataIndex: "record",
        key: "record",
      },
      {
        title: "Updated by",
        dataIndex: "by",
        key: "by",
      },
      {
        title: "When",
        dataIndex: "when",
        key: "when",
        align: "right",
        render: (when) => <span className="muted">{when}</span>,
      },
    ],
    [],
  );

  const recentRecords = useMemo(() => {
    const rows = [];
    const po = DATA.PURCHASE_ORDERS[0];
    if (po) {
      rows.push({
        key: po.id,
        type: "PO",
        tone: "default",
        record: `${po.id} — ${po.vendor}`,
        by: "Mahesh J.",
        when: po.date,
      });
    }
    const dsp = DATA.DISPATCHES[0];
    if (dsp) {
      rows.push({
        key: dsp.id,
        type: "Dispatch",
        tone: "info",
        record: `${dsp.id} — ${dsp.customer}, ${dsp.loaded}`,
        by: "Anita P.",
        when: dsp.lastUpdate,
      });
    }
    const emp = DATA.EMPLOYEES[1];
    if (emp) {
      rows.push({
        key: emp.id,
        type: "User",
        tone: "default",
        record: `${emp.name} — Role: ${emp.role}`,
        by: "System",
        when: "May 21, 08:55",
      });
    }
    const inv =
      DATA.INVOICES.find((i) => i.status === "matched") ?? DATA.INVOICES[0];
    if (inv) {
      rows.push({
        key: inv.id,
        type: "Invoice",
        tone: "warning",
        record: `${inv.id} — ${inv.status === "matched" ? "Verified" : "Pending"}`,
        by: "Priya S.",
        when: inv.invDate,
      });
    }
    const order = DATA.ORDERS[0];
    if (order) {
      rows.push({
        key: order.id,
        type: "SO",
        tone: "default",
        record: `${order.id} — ${order.customer}`,
        by: "Deepak A.",
        when: `Due ${order.due}`,
      });
    }
    rows.push({
      key: "batch",
      type: "Production",
      tone: "info",
      record: "Batch B-4471 — Minerals, Talc 600 mesh",
      by: "Vikram S.",
      when: "May 21, 15:30",
    });
    return rows;
  }, [DATA]);

  const fieldAlerts = useMemo(() => {
    const fromVisits = DATA.FIELD_VISITS.slice(0, 2).map((v) => ({
      icon: "pin",
      tone: "primary",
      text: (
        <>
          <strong>{v.rep}</strong> —{" "}
          {v.status === "completed" ? "Visit logged" : "Check-in"} at{" "}
          {v.customer}. {v.ts}.
        </>
      ),
    }));
    return [
      ...fromVisits,
      {
        icon: "alert",
        tone: "danger",
        text: (
          <>
            <strong>Lotus Herbals</strong> — Follow-up not yet logged. Due May
            22. Escalate?
          </>
        ),
      },
    ];
  }, [DATA.FIELD_VISITS]);

  const dispatchDelayAlerts = useMemo(() => {
    const alerts = DATA.DISPATCHES.filter(
      (d) => d.status === "in-transit" && d.progress < 50,
    )
      .slice(0, 1)
      .map((d) => ({
        text: (
          <>
            <strong>{d.id}</strong> — {d.customer}, {d.loaded}. In transit · ETA{" "}
            {d.eta}. Customer notified.
          </>
        ),
      }));
    if (dispatchDelays > 0) {
      alerts.push({
        text: (
          <>
            <strong>Open orders</strong> — {dispatchDelays} overdue dispatch
            {dispatchDelays === 1 ? "" : "es"}. Dispatch team alerted.
          </>
        ),
      });
    }
    if (alerts.length === 0) {
      alerts.push({
        text: <span className="muted">No dispatch delays reported today.</span>,
      });
    }
    return alerts;
  }, [DATA.DISPATCHES, dispatchDelays]);

  const ordersWeekData = [
    { day: "Mon", orders: 8 },
    { day: "Tue", orders: 12 },
    { day: "Wed", orders: 10 },
    { day: "Thu", orders: 15 },
    { day: "Fri", orders: 13 },
    { day: "Sat", orders: 7 },
    { day: "Sun", orders: 4 },
  ];

  return (
    <div className="admin-dash">
      <DashHead
        title="Admin Dashboard"
        sub="Overview for current company — access, alerts, invoices, field & operations"
      >
        <Btn icon="refresh" size="sm">
          Refresh
        </Btn>
      </DashHead>

      <DashboardBannerCarousel slides={ADMIN_BANNER_SLIDES} navigate={navigate} />

      <AdminEyebrow>Current company</AdminEyebrow>
      <div className="admin-company-overview">
        {DATA.COMPANIES[0] ? (
          <AdminCompanyCard
            company={DATA.COMPANIES[0]}
            accent="primary"
            metrics={[
              {
                label: "Active users",
                value: DATA.COMPANIES[0].employees ?? "—",
              },
              {
                label: "RM alerts",
                value: rmLow,
                tone: rmLow > 0 ? "warn" : "",
              },
              { label: "Dispatches today", value: mineralsDispatch.due },
              { label: "Pending invoices", value: pendingInvoices },
            ]}
          />
        ) : null}
        {DATA.COMPANIES[1] ? (
          <AdminCompanyCard
            company={DATA.COMPANIES[1]}
            accent="gold"
            metrics={[
              {
                label: "Active users",
                value: DATA.COMPANIES[1].employees ?? "—",
              },
              {
                label: "Pack alerts",
                value: packLow,
                tone: packLow > 0 ? "warn" : "",
              },
              { label: "Dispatches today", value: micronsDispatch.due },
              {
                label: "Overdue",
                value: micronsDispatch.overdue,
                tone: micronsDispatch.overdue > 0 ? "danger" : "",
              },
            ]}
          />
        ) : null}
      </div>

      <div className="admin-stats-row">
        <AdminStatCard
          icon={TeamOutlined}
          label="Total users"
          value={String(totalUsers)}
        />
        <AdminStatCard
          icon={WarningOutlined}
          label="Low stock alerts"
          value={String(lowStockTotal)}
          tone="warning"
        />
        <AdminStatCard
          icon={FileExclamationOutlined}
          label="Pending invoices"
          value={String(pendingInvoices)}
          tone="danger"
        />
        <AdminStatCard
          icon={TruckOutlined}
          label="Dispatch delays"
          value={String(dispatchDelays)}
          tone="warning"
        />
        <AdminStatCard
          icon={CheckCircleOutlined}
          label="Present today"
          value={String(presentToday)}
          tone="success"
        />
        <AdminStatCard
          icon={MessageOutlined}
          label="WA tasks (week)"
          value={String(waTasks)}
          tone="accent"
        />
      </div>

      <div className="admin-quick-actions">
        <Btn
          variant="secondary"
          size="sm"
          icon="users"
          onClick={() => navigate("/users")}
        >
          User management
        </Btn>
        <Btn
          variant="secondary"
          size="sm"
          icon="invoice"
          onClick={() => navigate("/procurement/invoices")}
        >
          Verify invoices
        </Btn>
        <Btn
          variant="secondary"
          size="sm"
          icon="alert"
          onClick={() => navigate("/hrms/notifications")}
        >
          Review alerts
        </Btn>
      </div>

      <div className="admin-dash-grid">
        <AdminWidget
          title="User access issues"
          icon="shield"
          badge={<Badge tone="warning">3</Badge>}
        >
          <ul className="admin-issue-list">
            <li>
              <span className="admin-issue-list__icon danger">
                <Icon name="user" size={13} />
              </span>
              <div>
                <strong>Arun Nair</strong> — account disabled. Last login 28
                Feb. Re-enable or archive.
              </div>
            </li>
            <li>
              <span className="admin-issue-list__icon warning">
                <Icon name="shield" size={13} />
              </span>
              <div>
                <strong>Kiran Desai</strong> — password reset requested. Pending
                since 8 Mar.
              </div>
            </li>
            <li>
              <span className="admin-issue-list__icon warning">
                <Icon name="check" size={13} />
              </span>
              <div>
                <strong>2 new users</strong> — awaiting role assignment (Stores,
                Microns).
              </div>
            </li>
          </ul>
        </AdminWidget>

        <AdminWidget title="Low stock alerts by module" icon="box">
          <div className="admin-alert-mod-section">
            <div className="admin-alert-mod-title">
              <Icon name="box" size={12} /> Raw material
            </div>
            <ul className="admin-alert-mod-list">
              <li>
                <span>{lowRmLabels || "No RM alerts"}</span>
                {rmLow > 0 ? <Badge tone="danger">{rmLow}</Badge> : null}
              </li>
            </ul>
          </div>
          <div className="admin-alert-mod-section">
            <div className="admin-alert-mod-title">
              <Icon name="package" size={12} /> Packaging
            </div>
            <ul className="admin-alert-mod-list">
              <li>
                <span>{lowPackLabels || "No packaging alerts"}</span>
                {packLow > 0 ? <Badge tone="warning">{packLow}</Badge> : null}
              </li>
            </ul>
          </div>
          <div className="admin-alert-mod-section">
            <div className="admin-alert-mod-title">
              <Icon name="wrench" size={12} /> Spare parts
            </div>
            <ul className="admin-alert-mod-list">
              <li>
                <span>{lowSpareLabels || "No spare parts alerts"}</span>
                {spareLow > 0 ? <Badge tone="warning">{spareLow}</Badge> : null}
              </li>
            </ul>
          </div>
        </AdminWidget>

        <AdminWidget
          title="Pending invoice verifications"
          icon="invoice"
          badge={
            pendingInvoices > 0 ? (
              <Badge tone="danger">{pendingInvoices}</Badge>
            ) : null
          }
        >
          <CommonTable
            {...ERP_TABLE_PROPS}
            size="small"
            columns={invoiceColumns}
            dataSource={mismatchInvoices}
            rowKey="id"
            pagination={false}
          />
          <p className="admin-widget-footnote">
            Total pending:{" "}
            {pendingInvoiceTotal > 0 ? fmtINR(pendingInvoiceTotal) : "—"}.{" "}
            <button
              type="button"
              className="admin-link-btn"
              onClick={() => navigate("/procurement/invoices")}
            >
              Verify all
            </button>
          </p>
        </AdminWidget>
      </div>

      <div className="admin-dash-grid">
        <AdminWidget title="Field activity alerts" icon="user">
          <ul className="admin-activity-list">
            {fieldAlerts.map((item, i) => (
              <li key={i}>
                <span className={`admin-activity-list__icon ${item.tone}`}>
                  <Icon name={item.icon} size={13} />
                </span>
                <div>{item.text}</div>
              </li>
            ))}
          </ul>
        </AdminWidget>

        <AdminWidget title="Attendance summary" icon="calendar">
          <div className="admin-attendance-bar">
            <div className="admin-attendance-box present">
              <div className="admin-attendance-box__n">{presentToday}</div>
              <div className="admin-attendance-box__l">Present</div>
            </div>
            <div className="admin-attendance-box absent">
              <div className="admin-attendance-box__n">
                {attendance.absent || 0}
              </div>
              <div className="admin-attendance-box__l">Absent</div>
            </div>
            <div className="admin-attendance-box leave">
              <div className="admin-attendance-box__n">
                {attendance.leave || 0}
              </div>
              <div className="admin-attendance-box__l">On leave</div>
            </div>
            <div className="admin-attendance-box field">
              <div className="admin-attendance-box__n">
                {attendance.onField || fieldVisitsTodayCount(DATA.FIELD_VISITS)}
              </div>
              <div className="admin-attendance-box__l">In field</div>
            </div>
          </div>
          <p className="admin-widget-footnote">
            Of {totalUsers} users · Both companies. Marked as of May 21, 10:00.
          </p>
        </AdminWidget>

        <AdminWidget
          title="Dispatch delay alerts"
          icon="truck"
          badge={
            dispatchDelays > 0 ? (
              <Badge tone="danger">{dispatchDelays}</Badge>
            ) : null
          }
        >
          <ul className="admin-delay-list">
            {dispatchDelayAlerts.map((item, i) => (
              <li key={i}>
                <span className="admin-delay-list__icon">
                  <Icon name="clock" size={13} />
                </span>
                <div>{item.text}</div>
              </li>
            ))}
          </ul>
        </AdminWidget>
      </div>

      <div className="admin-dash-grid admin-dash-grid--single">
        <AdminWidget title="Recently updated records" icon="chart">
          <CommonTable
            {...ERP_TABLE_PROPS}
            size="small"
            columns={recentColumns}
            dataSource={recentRecords}
            rowKey="key"
            pagination={false}
          />
        </AdminWidget>
      </div>

      <div className="card admin-orders-week">
        <div className="card-head">
          <div className="card-title">Orders this week</div>
          <span className="muted" style={{ fontSize: 12 }}>
            Both companies
          </span>
        </div>
        <div className="card-body">
          <p
            className="admin-widget-footnote"
            style={{ marginTop: 0, marginBottom: 12 }}
          >
            Daily order count · each day in a distinct color
          </p>
          <div className="owner-chart-panel admin-orders-week-chart">
            <div className="owner-chart-panel__canvas">
              <BarChart
                data={ordersWeekData}
                keys={["orders"]}
                colors={ADMIN_ORDERS_WEEK_COLORS}
                groupColors={ADMIN_ORDERS_WEEK_COLORS}
                groupGradients={ADMIN_ORDERS_WEEK_GRADIENTS}
                showValues
                h={148}
                tooltipFormatter={({ label, value }) =>
                  `${label}: ${value} order${value === 1 ? "" : "s"}`
                }
              />
            </div>
            <div className="owner-chart-legend owner-chart-legend--bar">
              {ordersWeekData.map((d, i) => (
                <span key={d.day} className="owner-chart-legend__item">
                  <span
                    className="owner-chart-legend__dot"
                    style={{ background: ADMIN_ORDERS_WEEK_COLORS[i] }}
                  />
                  {d.day}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   OWNER DASHBOARD — strategic & financial
   ============================================================ */
const OwnerEyebrow = ({ children }) => (
  <div className="owner-eyebrow">{children}</div>
);

const ownerCanNav = (href) => Boolean(href);

const OwnerNavButton = ({
  navigate,
  href,
  className = "",
  children,
  disabled = false,
  ...rest
}) => {
  if (disabled || !ownerCanNav(href) || !navigate) {
    return (
      <div className={className} {...rest}>
        {children}
      </div>
    );
  }
  return (
    <button
      type="button"
      className={`owner-dash-nav ${className}`.trim()}
      onClick={() => navigate(href)}
      {...rest}
    >
      {children}
    </button>
  );
};

const OwnerCompanyTile = ({
  company,
  accent,
  metrics,
  footnote,
  href,
  navigate,
}) => (
  <OwnerNavButton
    navigate={navigate}
    href={href}
    className={`owner-company-tile ${accent === "gold" ? "microns" : ""} owner-company-tile--nav`}
  >
    <div>
      <div className="owner-company-tile__name">{company.name}</div>
      <div className="owner-company-tile__loc">
        <Icon name="pin" size={11} />{" "}
        {company.plant?.split(",")[0] ?? company.plant}
      </div>
    </div>
    <div className="owner-company-tile__metrics">
      {metrics.map((m) => (
        <div key={m.label} className="owner-company-tile__metric">
          <div className={`owner-company-tile__metric-v ${m.tone ?? ""}`}>
            {m.value}
          </div>
          <div className="owner-company-tile__metric-l">{m.label}</div>
        </div>
      ))}
    </div>
    {footnote ? <p className="owner-company-tile__note">{footnote}</p> : null}
  </OwnerNavButton>
);

const OWNER_STAT_ICONS = {
  "Combined sales (MTD)": DollarOutlined,
  "Gross margin": RiseOutlined,
  "Dispatches due today": CalendarOutlined,
  Overdue: ExclamationCircleOutlined,
  "Vendor price alerts": AlertOutlined,
  "Employees in field": EnvironmentOutlined,
};

const OwnerStatCard = ({ label, value, tone = "default", href, navigate }) => (
  <OwnerNavButton
    navigate={navigate}
    href={href}
    className="owner-stat-card--nav"
  >
    <StatCard
      icon={OWNER_STAT_ICONS[label] ?? BarChartOutlined}
      label={label}
      value={value}
      hintTone={mapDashStatTone(tone)}
      className="sc-card--nav"
    />
  </OwnerNavButton>
);

const OwnerWidget = ({
  title,
  icon,
  badge,
  wide,
  theme = "",
  children,
  titleHref,
  navigate,
}) => (
  <div
    className={`owner-widget ${wide ? "owner-widget--wide" : ""} ${theme}`.trim()}
  >
    <div className="owner-widget-header">
      <OwnerNavButton
        navigate={navigate}
        href={titleHref}
        className="owner-widget-header__title owner-widget-header__title--nav owner-dash-nav--inline"
        disabled={!titleHref}
      >
        {icon ? <Icon name={icon} size={14} /> : null} {title}
      </OwnerNavButton>
      {badge}
    </div>
    <div className="owner-widget-body">{children}</div>
  </div>
);

const OwnerCoTag = ({ microns, children }) => (
  <span className={`owner-co-tag ${microns ? "microns" : ""}`}>{children}</span>
);

const ownerVendorShortName = (name) => {
  const parts = name.split(/\s*[—–-]\s*/);
  return parts[0]?.trim() || name;
};

const OWNER_CHART_THEMES = {
  inventory: {
    container: "owner-widget--rose",
    colors: ["#e11d48", "#ea580c", "#7c3aed"],
  },
  dispatch: {
    container: "owner-widget--blue",
    colors: ["#2563eb", "#dc2626"],
  },
  production: {
    container: "owner-widget--ocean",
    colors: ["#1d4ed8", "#0d9488", "#ca8a04"],
  },
  profit: {
    container: "owner-card--green",
    colors: ["#2563eb", "#64748b", "#16a34a"],
  },
  customers: {
    container: "owner-card--violet",
    colors: ["#2563eb", "#7c3aed", "#db2777", "#ea580c", "#0d9488"],
  },
  vendor: {
    container: "owner-widget--amber",
    colors: ["#dc2626", "#16a34a"],
  },
};

const ownerThemeLegend = (theme, labels) =>
  labels.map((label, i) => ({
    label,
    color: theme.colors[i % theme.colors.length],
  }));

const OwnerChartLegend = ({ items }) => (
  <div className="owner-chart-legend owner-chart-legend--bar">
    {items.map((item) => (
      <span key={item.label} className="owner-chart-legend__item">
        <span
          className="owner-chart-legend__dot"
          style={{ background: item.color }}
        />
        {item.label}
      </span>
    ))}
  </div>
);

const OwnerChartPanel = ({ children, legend }) => (
  <div className="owner-chart-panel">
    <div className="owner-chart-panel__canvas">{children}</div>
    {legend}
  </div>
);

const ownerChartTooltip = {
  inventory: ({ label, value }) =>
    `${label}: ${value} low-stock item${value === 1 ? "" : "s"}`,
  dispatch: ({ label, value }) =>
    `${label}: ${value} dispatch${value === 1 ? "" : "es"}`,
  production: ({ label, value }) =>
    `${label}: ${value} batch${value === 1 ? "" : "es"}`,
  profit: ({ label, value }) => `${label}: ₹${value} L`,
  customers: ({ label, value }) => `${label}: ₹${value} L / month (est.)`,
};

const OwnerVendorPriceChart = ({ items, navigate }) => {
  const maxAbs = Math.max(...items.map((i) => i.pct), 1);
  const [hovered, setHovered] = useState(null);
  return (
    <div className="owner-vendor-chart">
      {items.map((item, index) => {
        const widthPct = (item.pct / maxAbs) * 100;
        const isHovered = hovered === item.name;
        return (
          <OwnerNavButton
            key={item.name}
            navigate={navigate}
            href={item.href}
            className="owner-vendor-chart__row owner-dash-nav--row"
            onMouseEnter={() => setHovered(item.name)}
            onMouseLeave={() => setHovered(null)}
          >
            {isHovered ? (
              <div className="owner-vendor-chart__tooltip" role="tooltip">
                <strong>{item.name}</strong>
                <span>
                  {item.up ? "Price increase" : "Price decrease"}: {item.change}{" "}
                  vs last order
                </span>
              </div>
            ) : null}
            <span className="owner-vendor-chart__rank">{index + 1}</span>
            <div className="owner-vendor-chart__main">
              <div className="owner-vendor-chart__head">
                <div className="owner-vendor-chart__label" title={item.name}>
                  {ownerVendorShortName(item.name)}
                </div>
                <span
                  className={`owner-vendor-chart__badge ${item.up ? "up" : "down"}`}
                >
                  <Icon name={item.up ? "arrowUp" : "arrowDown"} size={11} />
                  {item.change}
                </span>
              </div>
              <div className="owner-vendor-chart__track">
                <div
                  className={`owner-vendor-chart__bar ${item.up ? "up" : "down"}`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          </OwnerNavButton>
        );
      })}
      <div className="owner-chart-legend">
        <span className="owner-chart-legend__item">
          <span className="owner-chart-legend__dot up" /> Price increase
        </span>
        <span className="owner-chart-legend__item">
          <span className="owner-chart-legend__dot down" /> Price decrease
        </span>
      </div>
    </div>
  );
};

const OwnerDispatchDonut = ({ due, overdue }) => {
  const total = due + overdue;
  const onTrackPct = total > 0 ? Math.round((due / total) * 100) : 100;
  const [hovered, setHovered] = useState(false);
  const size = 148;
  const stroke = 13;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dueShare = total > 0 ? due / total : 1;
  const overdueShare = total > 0 ? overdue / total : 0;
  const dueLen = circumference * dueShare;
  const overdueLen = circumference * overdueShare;

  return (
    <div
      className="owner-dispatch-ring"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered ? (
        <div className="owner-dispatch-ring__tooltip" role="tooltip">
          <span>
            Due today: <strong>{due}</strong>
          </span>
          <span>
            Overdue: <strong>{overdue}</strong>
          </span>
          <span>
            On schedule: <strong>{onTrackPct}%</strong>
          </span>
        </div>
      ) : null}
      <div
        className={`owner-dispatch-ring__viz${hovered ? " is-hovered" : ""}`}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="owner-dispatch-ring__svg"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--bg-sunken)"
            strokeWidth={stroke}
          />
          {due > 0 ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="#2563eb"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dueLen} ${circumference}`}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className="owner-dispatch-ring__arc owner-dispatch-ring__arc--due"
            />
          ) : null}
          {overdue > 0 ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="#dc2626"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${overdueLen} ${circumference}`}
              strokeDashoffset={-dueLen}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className="owner-dispatch-ring__arc owner-dispatch-ring__arc--overdue"
            />
          ) : null}
        </svg>
        <div className="owner-dispatch-ring__center">
          <span className="owner-dispatch-ring__pct">{onTrackPct}%</span>
          <span className="owner-dispatch-ring__lbl">on schedule</span>
          <span className="owner-dispatch-ring__total">{total} total</span>
        </div>
      </div>
      <div className="owner-dispatch-ring__stats">
        <div className="owner-dispatch-ring__stat owner-dispatch-ring__stat--due">
          <span className="owner-dispatch-ring__stat-num">{due}</span>
          <span className="owner-dispatch-ring__stat-lbl">Due today</span>
        </div>
        <div className="owner-dispatch-ring__stat owner-dispatch-ring__stat--overdue">
          <span className="owner-dispatch-ring__stat-num">{overdue}</span>
          <span className="owner-dispatch-ring__stat-lbl">Overdue</span>
        </div>
      </div>
    </div>
  );
};

const OwnerDashboard = ({ navigate }) => {
  const { data, loading, error } = useOwnerDashboard();
  const [dashboardDate, setDashboardDate] = useState(() => dayjs("2026-05-21"));

  if (loading) {
    return (
      <div
        className="owner-dash"
        style={{ display: "flex", justifyContent: "center", padding: "4rem 0" }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="owner-dash">
        <DashHead title="Owner Dashboard" sub="Unable to load dashboard data" />
        <div className="card" style={{ padding: 24 }}>
          <p style={{ color: "var(--danger)", margin: 0 }}>
            {error ?? "No data available"}
          </p>
        </div>
      </div>
    );
  }

  const {
    subtitle,
    companyTiles,
    stats,
    counts,
    lowRmAlerts,
    lowPackAlerts,
    spareAlerts,
    vendorPriceAlerts,
    dispatchDueItems,
    dispatchOverdueItems,
    production,
    fieldVisits,
    employeesInField,
    operationalRisks,
    profit,
    topCustomers,
    topMaterials,
    criticalNotifs,
  } = data;

  const inventoryChartData = [
    { cat: "RM", count: counts.rmLow },
    { cat: "Pack", count: counts.packLow },
    { cat: "Spare", count: counts.spareLow },
  ];

  const dispatchChartData = [
    { label: "Due today", count: counts.dispatchActiveCount },
    { label: "Overdue", count: counts.overdueCount },
  ];

  const productionChartData = [
    { plant: "Total", batches: production.batchesCompleted },
    { plant: "Minerals", batches: production.mineralsBatches },
    { plant: "Microns", batches: production.micronsBatches },
  ];

  const profitChartData = [
    { metric: "Revenue", lakhs: profit.chartLakhs.revenue },
    { metric: "COGS", lakhs: profit.chartLakhs.cogs },
    { metric: "Gross profit", lakhs: profit.chartLakhs.grossProfit },
  ];

  const topCustomersChartData = topCustomers.map((c) => ({
    customer: c.name.length > 14 ? `${c.name.slice(0, 12)}…` : c.name,
    sales: c.salesLakhs,
  }));

  return (
    <div className="owner-dash">
      <DashHead
        title="Owner Dashboard"
        sub={subtitle}
        dateBadge={
          <OwnerHoverCalendar
            value={dashboardDate}
            onChange={setDashboardDate}
          >
            <Badge tone="default" sq className="owner-dash-date-badge">
              <Icon name="calendar" size={10} />{" "}
              {dashboardDate.format("MMM D, YYYY")} · {dashboardDate.format("ddd")}
            </Badge>
          </OwnerHoverCalendar>
        }
      >
        <OwnerHoverCalendar value={dashboardDate} onChange={setDashboardDate}>
          <Btn icon="calendar" size="sm" type="button">
            {dashboardDate.format("MMM YYYY")}
          </Btn>
        </OwnerHoverCalendar>
        <Btn icon="download" size="sm">
          Export PDF
        </Btn>
      </DashHead>

      <DashboardBannerCarousel slides={OWNER_BANNER_SLIDES} navigate={navigate} />

      <OwnerEyebrow>Company summary</OwnerEyebrow>
      <div className="owner-company-switch">
        {companyTiles.map((tile) => (
          <OwnerCompanyTile
            key={tile.company.id}
            company={tile.company}
            accent={tile.accent}
            metrics={tile.metrics}
            footnote={tile.footnote}
            href={tile.href}
            navigate={navigate}
          />
        ))}
      </div>

      <div className="owner-stats-row">
        {stats.map((stat) => (
          <OwnerStatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            tone={stat.tone ?? "default"}
            href={stat.href}
            navigate={navigate}
          />
        ))}
      </div>

      <OwnerEyebrow>Visual insights</OwnerEyebrow>
      <div className="owner-dash-grid owner-dash-grid--two">
        <OwnerWidget
          title="Inventory alerts by category"
          icon="box"
          titleHref="/inventory/raw-material"
          navigate={navigate}
          theme={OWNER_CHART_THEMES.inventory.container}
        >
          <p className="owner-chart-caption">
            Low-stock items across both companies
          </p>
          <OwnerChartPanel
            legend={
              <OwnerChartLegend
                items={ownerThemeLegend(OWNER_CHART_THEMES.inventory, [
                  "Raw material",
                  "Packaging",
                  "Spare parts",
                ])}
              />
            }
          >
            <BarChart
              data={inventoryChartData}
              keys={["count"]}
              colors={OWNER_CHART_THEMES.inventory.colors}
              groupColors={OWNER_CHART_THEMES.inventory.colors}
              labelKey="cat"
              tooltipFormatter={ownerChartTooltip.inventory}
              h={155}
            />
          </OwnerChartPanel>
        </OwnerWidget>

        <OwnerWidget
          title="Dispatch status"
          icon="truck"
          titleHref="/dispatch"
          navigate={navigate}
          theme={OWNER_CHART_THEMES.dispatch.container}
        >
          <p className="owner-chart-caption">
            Due today vs overdue open orders
          </p>
          <OwnerChartPanel
            legend={
              <OwnerChartLegend
                items={ownerThemeLegend(OWNER_CHART_THEMES.dispatch, [
                  "Due today",
                  "Overdue",
                ])}
              />
            }
          >
            <BarChart
              data={dispatchChartData}
              keys={["count"]}
              colors={OWNER_CHART_THEMES.dispatch.colors}
              groupColors={OWNER_CHART_THEMES.dispatch.colors}
              labelKey="label"
              tooltipFormatter={ownerChartTooltip.dispatch}
              showValues
              axisFontSize={13}
              valueFontSize={18}
              labelFontSize={13}
              h={190}
            />
          </OwnerChartPanel>
        </OwnerWidget>
      </div>

      <div className="owner-dash-grid">
        <OwnerWidget
          title="Low raw material alerts"
          icon="box"
          titleHref="/inventory/raw-material"
          navigate={navigate}
          badge={
            counts.rmLow > 0 ? (
              <Badge tone="danger">{counts.rmLow}</Badge>
            ) : null
          }
        >
          <ul className="owner-alert-list">
            {lowRmAlerts.map((item) => (
              <li key={item.key}>
                <OwnerNavButton
                  navigate={navigate}
                  href={item.href}
                  className="owner-dash-nav--row owner-alert-list__row"
                  disabled={item.key === "none"}
                >
                  <OwnerCoTag microns={item.microns}>
                    {item.microns ? "Microns" : "Minerals"}
                  </OwnerCoTag>
                  <span className="owner-alert-list__name">{item.name}</span>
                  <span className="owner-alert-list__meta">{item.meta}</span>
                </OwnerNavButton>
              </li>
            ))}
          </ul>
        </OwnerWidget>

        <OwnerWidget
          title="Low packaging alerts"
          icon="package"
          titleHref="/inventory/packaging"
          navigate={navigate}
          badge={
            counts.packLow > 0 ? (
              <Badge tone="warning">{counts.packLow}</Badge>
            ) : null
          }
        >
          <ul className="owner-alert-list">
            {lowPackAlerts.map((item) => (
              <li key={item.key}>
                <OwnerNavButton
                  navigate={navigate}
                  href={item.href}
                  className="owner-dash-nav--row owner-alert-list__row"
                  disabled={item.key === "none"}
                >
                  <OwnerCoTag microns={item.microns}>
                    {item.microns ? "Microns" : "Minerals"}
                  </OwnerCoTag>
                  <span className="owner-alert-list__name">{item.name}</span>
                  <span className="owner-alert-list__meta">{item.meta}</span>
                </OwnerNavButton>
              </li>
            ))}
          </ul>
        </OwnerWidget>

        <OwnerWidget
          title="Spare parts alerts"
          icon="wrench"
          titleHref="/inventory/spare-parts"
          navigate={navigate}
          badge={
            counts.spareLow > 0 ? (
              <Badge tone="warning">{counts.spareLow}</Badge>
            ) : null
          }
        >
          <ul className="owner-alert-list">
            {spareAlerts.map((item) => (
              <li key={item.key}>
                <OwnerNavButton
                  navigate={navigate}
                  href={item.href}
                  className="owner-dash-nav--row owner-alert-list__row"
                  disabled={item.key === "none"}
                >
                  <OwnerCoTag microns={item.microns}>
                    {item.microns ? "Microns" : "Minerals"}
                  </OwnerCoTag>
                  <span className="owner-alert-list__name">{item.name}</span>
                  <span className="owner-alert-list__meta">{item.meta}</span>
                </OwnerNavButton>
              </li>
            ))}
          </ul>
        </OwnerWidget>
      </div>

      <div className="owner-dash-grid owner-dash-grid--dispatch">
        <OwnerWidget
          title="Vendor price change alerts"
          icon="money"
          titleHref="/procurement/vendors"
          navigate={navigate}
          badge={<Badge tone="warning">{counts.vendorPriceAlerts}</Badge>}
          theme={OWNER_CHART_THEMES.vendor.container}
        >
          <p className="owner-chart-caption">
            Recent vendor quote changes (% vs last order)
          </p>
          <OwnerVendorPriceChart
            items={vendorPriceAlerts}
            navigate={navigate}
          />
          <p className="owner-widget-footnote">
            Review margin impact. Both companies.
          </p>
        </OwnerWidget>

        <OwnerWidget
          title="Dispatch due & overdue summary"
          icon="truck"
          titleHref="/dispatch"
          navigate={navigate}
          theme={OWNER_CHART_THEMES.dispatch.container}
        >
          <div className="owner-dispatch-summary owner-dispatch-summary--with-chart">
            <div className="owner-dispatch-summary__chart">
              <OwnerDispatchDonut
                due={counts.dispatchActiveCount}
                overdue={counts.overdueCount}
              />
            </div>
            <div>
              <div className="owner-dispatch-summary__heading">Due today</div>
              <div className="owner-dispatch-list">
                {dispatchDueItems.map((item) => (
                  <OwnerNavButton
                    key={item.key}
                    navigate={navigate}
                    href={item.href}
                    className="owner-dispatch-list__item owner-dispatch-list__item--nav"
                  >
                    <span>{item.label}</span>
                    <OwnerCoTag microns={item.microns}>
                      {item.microns ? "Microns" : "Minerals"}
                    </OwnerCoTag>
                  </OwnerNavButton>
                ))}
              </div>
            </div>
            <div>
              <div className="owner-dispatch-summary__heading overdue">
                Overdue
              </div>
              <div className="owner-dispatch-list">
                {dispatchOverdueItems.map((item) => (
                  <OwnerNavButton
                    key={item.key}
                    navigate={navigate}
                    href={item.href}
                    className="owner-dispatch-list__item owner-dispatch-list__item--nav"
                  >
                    <span>{item.label}</span>
                    <OwnerCoTag microns={item.microns}>
                      {item.microns ? "Microns" : "Minerals"}
                    </OwnerCoTag>
                  </OwnerNavButton>
                ))}
              </div>
            </div>
          </div>
        </OwnerWidget>
      </div>

      <div className="owner-dash-grid">
        <OwnerWidget
          title="Production overview"
          icon="factory"
          titleHref={production.href}
          navigate={navigate}
          theme={OWNER_CHART_THEMES.production.container}
        >
          <p className="owner-chart-caption">
            Batches completed today by plant
          </p>
          <OwnerChartPanel
            legend={
              <OwnerChartLegend
                items={ownerThemeLegend(OWNER_CHART_THEMES.production, [
                  "Total",
                  "Minerals",
                  "Microns",
                ])}
              />
            }
          >
            <BarChart
              data={productionChartData}
              keys={["batches"]}
              colors={OWNER_CHART_THEMES.production.colors}
              groupColors={OWNER_CHART_THEMES.production.colors}
              labelKey="plant"
              tooltipFormatter={ownerChartTooltip.production}
              h={145}
            />
          </OwnerChartPanel>
          <OwnerNavButton
            navigate={navigate}
            href={production.href}
            className="owner-prod-overview owner-prod-overview--nav"
          >
            <div className="owner-prod-stat">
              <div className="owner-prod-stat__val">
                {production.batchesCompleted}
              </div>
              <div className="owner-prod-stat__lbl">
                Batches completed today
              </div>
            </div>
            <div className="owner-prod-stat">
              <div className="owner-prod-stat__val">
                {production.mineralsBatches}
              </div>
              <div className="owner-prod-stat__lbl">Minerals (Udaipur)</div>
            </div>
            <div className="owner-prod-stat">
              <div className="owner-prod-stat__val">
                {production.micronsBatches}
              </div>
              <div className="owner-prod-stat__lbl">Microns (Makrana)</div>
            </div>
            <div className="owner-prod-stat">
              <div className="owner-prod-stat__val">
                {production.totalOutput}
              </div>
              <div className="owner-prod-stat__lbl">Total output (est.)</div>
            </div>
          </OwnerNavButton>
          <p className="owner-widget-footnote">{production.footnote}</p>
        </OwnerWidget>

        <OwnerWidget
          title="Field sales / visits today"
          icon="user"
          titleHref="/field-sales/visit-log"
          navigate={navigate}
        >
          <ul className="owner-field-visit-list">
            {fieldVisits.map((v) => (
              <li key={v.key}>
                <OwnerNavButton
                  navigate={navigate}
                  href={v.href}
                  className="owner-field-visit-list__row"
                  disabled={v.key === "none"}
                >
                  <span className="owner-field-visit-list__cust">
                    {v.customer}
                  </span>
                  <span className="owner-field-visit-list__rep">{v.rep}</span>
                </OwnerNavButton>
              </li>
            ))}
          </ul>
          {fieldVisits[0]?.key !== "none" ? (
            <p className="owner-widget-footnote">
              Live from today&apos;s field visit assignments (IST).
            </p>
          ) : null}
        </OwnerWidget>

        <OwnerWidget
          title="Employees in field today"
          icon="users"
          titleHref="/field-sales/activity-dashboard"
          navigate={navigate}
        >
          <ul className="owner-employees-field">
            {employeesInField.map((e) => (
              <li key={e.key}>
                <OwnerNavButton
                  navigate={navigate}
                  href={e.href}
                  className="owner-employees-field__row"
                  disabled={e.key === "none" || e.key.startsWith("extra-")}
                >
                  <span className="owner-employees-field__avatar">
                    {e.name
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                  <span>{e.name}</span>
                  <span className="owner-employees-field__role">{e.role}</span>
                </OwnerNavButton>
              </li>
            ))}
          </ul>
          {employeesInField[0]?.key !== "none" ? (
            <p className="owner-widget-footnote">
              Live from mobile field punch-in with GPS. Hidden after punch-out
              today.
            </p>
          ) : null}
        </OwnerWidget>
      </div>

      <div className="owner-dash-grid owner-dash-grid--single">
        <OwnerWidget
          title="Top operational risks"
          icon="alert"
          titleHref="/reports"
          navigate={navigate}
        >
          <ul className="owner-risks-list">
            {operationalRisks.map((risk) => (
              <li key={risk.title}>
                <OwnerNavButton
                  navigate={navigate}
                  href={risk.href}
                  className="owner-risks-list__row"
                >
                  <span className={`owner-risks-list__icon ${risk.sev}`}>
                    <Icon name={risk.icon} size={14} />
                  </span>
                  <div>
                    <div className="owner-risks-list__title">{risk.title}</div>
                    <div className="owner-risks-list__desc">{risk.desc}</div>
                  </div>
                </OwnerNavButton>
              </li>
            ))}
          </ul>
        </OwnerWidget>
      </div>

      <div className="owner-grid">
        <div
          className={`card owner-card ${OWNER_CHART_THEMES.profit.container}`}
        >
          <div className="card-head owner-card-head">
            <div className="card-title">Profit overview</div>
            <OwnerNavButton
              navigate={navigate}
              href={profit.href}
              className="owner-card-head__link owner-dash-nav--inline"
            >
              View report <Icon name="arrowRight" size={12} />
            </OwnerNavButton>
          </div>
          <div className="card-body">
            <p className="owner-chart-caption">
              Revenue, COGS & gross profit (₹ Lakhs)
            </p>
            <OwnerChartPanel
              legend={
                <OwnerChartLegend
                  items={ownerThemeLegend(OWNER_CHART_THEMES.profit, [
                    "Revenue",
                    "COGS",
                    "Gross profit",
                  ])}
                />
              }
            >
              <BarChart
                data={profitChartData}
                keys={["lakhs"]}
                colors={OWNER_CHART_THEMES.profit.colors}
                groupColors={OWNER_CHART_THEMES.profit.colors}
                labelKey="metric"
                tooltipFormatter={ownerChartTooltip.profit}
                h={145}
              />
            </OwnerChartPanel>
            <div className="owner-profit-overview">
              <h3>{profit.title}</h3>
              <div className="owner-profit-row">
                <span>Revenue</span>
                <span className="val">{profit.revenue}</span>
              </div>
              <div className="owner-profit-row">
                <span>COGS</span>
                <span className="val">{profit.cogs}</span>
              </div>
              <div className="owner-profit-row">
                <span>Gross profit</span>
                <span className="val positive">{profit.grossProfit}</span>
              </div>
              <div className="owner-profit-row">
                <span>Gross margin</span>
                <span className="val positive">{profit.grossMargin}</span>
              </div>
            </div>
            <p className="owner-widget-footnote">{profit.footnote}</p>
          </div>
        </div>

        <div
          className={`card owner-card ${OWNER_CHART_THEMES.customers.container}`}
        >
          <div className="card-head owner-card-head">
            <div className="card-title">Top customers (MTD)</div>
            <OwnerNavButton
              navigate={navigate}
              href="/customers"
              className="owner-card-head__link owner-dash-nav--inline"
            >
              View all <Icon name="arrowRight" size={12} />
            </OwnerNavButton>
          </div>
          <div className="card-body">
            <p className="owner-chart-caption">
              Estimated monthly sales (₹ Lakhs)
            </p>
            <OwnerChartPanel
              legend={
                <OwnerChartLegend
                  items={ownerThemeLegend(
                    OWNER_CHART_THEMES.customers,
                    topCustomersChartData.map((c) => c.customer),
                  )}
                />
              }
            >
              <BarChart
                data={topCustomersChartData}
                keys={["sales"]}
                colors={OWNER_CHART_THEMES.customers.colors}
                groupColors={topCustomersChartData.map(
                  (_, i) =>
                    OWNER_CHART_THEMES.customers.colors[
                      i % OWNER_CHART_THEMES.customers.colors.length
                    ],
                )}
                labelKey="customer"
                tooltipFormatter={ownerChartTooltip.customers}
                h={145}
              />
            </OwnerChartPanel>
            <ul className="owner-top-list">
              {topCustomers.map((c) => (
                <li key={c.rank}>
                  <OwnerNavButton
                    navigate={navigate}
                    href={c.href}
                    className="owner-top-list__row"
                  >
                    <span className="owner-top-list__rank">{c.rank}</span>
                    <span className="owner-top-list__name">{c.name}</span>
                    <span className="owner-top-list__meta">{c.meta}</span>
                  </OwnerNavButton>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="owner-dash-grid owner-dash-grid--two">
        <OwnerWidget
          title="Top supplied materials (MTD)"
          titleHref="/inventory/raw-material"
          navigate={navigate}
        >
          <ul className="owner-top-list">
            {topMaterials.map((m) => (
              <li key={m.rank}>
                <OwnerNavButton
                  navigate={navigate}
                  href={m.href}
                  className="owner-top-list__row"
                >
                  <span className="owner-top-list__rank">{m.rank}</span>
                  <span className="owner-top-list__name">{m.name}</span>
                  <span className="owner-top-list__meta">{m.meta}</span>
                </OwnerNavButton>
              </li>
            ))}
          </ul>
        </OwnerWidget>

        <OwnerWidget
          title="Recent critical notifications"
          titleHref="/hrms/notifications"
          navigate={navigate}
        >
          <div className="owner-critical-notifs">
            {criticalNotifs.map((n) => (
              <OwnerNavButton
                key={n.id}
                navigate={navigate}
                href={n.href}
                className="owner-critical-notifs__item owner-critical-notifs__item--nav"
              >
                <strong>
                  {n.type === "alert"
                    ? "Alert:"
                    : n.type === "success"
                      ? "Update:"
                      : "Info:"}
                </strong>{" "}
                {n.text}
              </OwnerNavButton>
            ))}
          </div>
        </OwnerWidget>
      </div>
    </div>
  );
};

/* ============================================================
   PRODUCTION DASHBOARD
   ============================================================ */
const ProdStatCard = ({ label, value, tone = "default", icon }) => (
  <StatCard
    icon={icon}
    label={label}
    value={value}
    hintTone={mapDashStatTone(tone)}
  />
);

const ProdWidget = ({ title, icon, badge, meta, children, footnote }) => (
  <div className="prod-dash-widget">
    <div className="prod-dash-widget__head">
      <span className="prod-dash-widget__title">
        {icon ? <Icon name={icon} size={14} /> : null} {title}
      </span>
      {badge}
      {meta}
    </div>
    <div className="prod-dash-widget__body">{children}</div>
    {footnote ? <p className="prod-dash-widget__footnote">{footnote}</p> : null}
  </div>
);

const PROD_MACHINES = [
  "Ball Mill #1",
  "Ball Mill #2",
  "Raymond Mill #1",
  "Raymond Mill #2",
];

const PENDING_CONSUMPTION = [
  { id: "PO-2025-035", product: "TiO₂ Blend 325M" },
  { id: "PO-2025-034", product: "Talc 500 Mesh" },
  { id: "PO-2025-033", product: "Barytes 200 Mesh" },
];

const BAG_IMPACT = [
  { label: "Reserved for today’s production", value: "3,680 bags" },
  { label: "HDPE 50 kg (reserved)", value: "800" },
  { label: "HDPE 25 kg (reserved)", value: "2,400" },
  { label: "Laminated 25 kg (reserved)", value: "480 — tight", warn: true },
  { label: "After today (est. balance)", value: "HDPE 50 kg: 3,400" },
];

const MACHINE_UTIL = [
  {
    name: "Ball Mill #1",
    meta: "PO-2025-037 — Calcium Carbonate · Est. complete 14:00",
    pct: 78,
    tone: "default",
  },
  {
    name: "Ball Mill #2",
    meta: "PO-2025-039 — Barytes · Est. complete 16:30",
    pct: 35,
    tone: "default",
  },
  {
    name: "Raymond Mill #1",
    meta: "PO-2025-038 — Talc 400 Mesh · Est. complete 15:00",
    pct: 55,
    tone: "default",
  },
  {
    name: "Raymond Mill #2",
    meta: "PO-2025-036 — Kaolin · QC hold",
    pct: 95,
    tone: "warning",
  },
];

const PACK_REQUIRED = [
  {
    type: "HDPE Valve Bag 25 kg",
    required: 2400,
    available: 8500,
    status: "OK",
    tone: "success",
  },
  {
    type: "HDPE Valve Bag 50 kg",
    required: 800,
    available: 4200,
    status: "OK",
    tone: "success",
  },
  {
    type: "Laminated Paper Bag 25 kg",
    required: 480,
    available: 1200,
    status: "Tight",
    tone: "warning",
  },
  {
    type: "Jumbo Bag 500 kg",
    required: 24,
    available: 320,
    status: "OK",
    tone: "success",
  },
];

const COMPLETED_BATCHES = [
  {
    order: "PO-2025-035",
    product: "Titanium Dioxide Blend 325M",
    qty: 8,
    machine: "Ball Mill #2",
    time: "08:45",
  },
  {
    order: "PO-2025-034",
    product: "Talc 500 Mesh",
    qty: 10,
    machine: "Raymond #1",
    time: "07:30",
  },
  {
    order: "PO-2025-033",
    product: "Barytes 200 Mesh",
    qty: 25,
    machine: "Ball Mill #1",
    time: "06:15",
  },
  {
    order: "PO-2025-032",
    product: "Iron Oxide Red 325M",
    qty: 5,
    machine: "Raymond #2",
    time: "05:50",
  },
  {
    order: "PO-2025-031",
    product: "Calcium Carbonate 300M",
    qty: 12,
    machine: "Ball Mill #1",
    time: "04:20",
  },
];

const DELAYED_TASKS = [
  {
    id: "PO-2025-032",
    text: "Detergent Base Powder (30 MT). On hold: raw material shortfall. Expected start: tomorrow.",
  },
  {
    id: "PO-2025-030",
    text: "Talc 400 Mesh (15 MT). Delayed 4 hrs: Raymond #1 breakdown. Resumed 08:00; est. complete 15:00.",
  },
];

const PRODUCTION_QUEUE = [
  {
    order: "PO-2025-040",
    product: "Talc Powder",
    spec: "500 Mesh",
    qty: 15,
    date: "2025-03-10",
    machine: "Raymond #1",
    status: "Planned",
    priority: "High",
  },
  {
    order: "PO-2025-041",
    product: "Calcium Carbonate",
    spec: "300 Mesh",
    qty: 20,
    date: "2025-03-10",
    machine: "Ball Mill #1",
    status: "Planned",
    priority: "High",
  },
  {
    order: "PO-2025-042",
    product: "Kaolin Clay",
    spec: "200 Mesh",
    qty: 12,
    date: "2025-03-10",
    machine: "Raymond #2",
    status: "Planned",
    priority: "Medium",
  },
  {
    order: "PO-2025-043",
    product: "Detergent Base Powder",
    spec: "Custom",
    qty: 30,
    date: "2025-03-11",
    machine: "—",
    status: "On Hold",
    priority: "High",
    hold: true,
  },
  {
    order: "PO-2025-044",
    product: "Barytes Powder",
    spec: "200 Mesh",
    qty: 25,
    date: "2025-03-11",
    machine: "Ball Mill #1",
    status: "Planned",
    priority: "Medium",
  },
  {
    order: "PO-2025-045",
    product: "Zinc Oxide",
    spec: "325 Mesh",
    qty: 8,
    date: "2025-03-11",
    machine: "Ball Mill #2",
    status: "Planned",
    priority: "Low",
  },
];

const SPARES_RISK_STATIC = [
  {
    machine: "Ball Mill #2",
    text: "Grinder blade set (SP-102) low. Order before 15 Mar.",
  },
  { machine: "Conveyor C3", text: "Belt drive assembly. Lead time 2 weeks." },
  { machine: "Raymond #1", text: "Wear parts due next month. Monitor." },
];

function rmAvailClass(status) {
  if (status === "critical") return "critical";
  if (status === "low") return "low";
  return "ok";
}

function rmAvailLabel(stock, unit, status) {
  const label = status === "critical" ? "Low" : status === "low" ? "Low" : "OK";
  return `${stock} ${unit} — ${label}`;
}

const ProductionDashboard = ({ navigate }) => {
  const DATA = useDATA();

  const week = productionWeekTotals(DATA.PRODUCTION_DATA);
  const todayActual = productionDayActual(DATA.PRODUCTION_DATA);
  const todayTarget =
    DATA.PRODUCTION_DATA.find((d) => d.day === "Fri")?.planned ?? 85;
  const targetPct =
    todayTarget > 0 ? Math.round((todayActual / todayTarget) * 100) : 0;
  const activeJobs = activeProductionJobs(DATA.ORDERS);

  const activeJobRows = useMemo(() => {
    const running = DATA.ORDERS.filter((o) => o.status === "in-production");
    if (running.length > 0) {
      return running.slice(0, 4).map((o, i) => ({
        id: o.id,
        label: `${o.product} (${o.qty})`,
        machine: PROD_MACHINES[i % PROD_MACHINES.length],
      }));
    }
    return [
      {
        id: "PO-2025-037",
        label: "Calcium Carbonate 300 Mesh (20 MT)",
        machine: "Ball Mill #1",
      },
      {
        id: "PO-2025-036",
        label: "Kaolin Clay 200 Mesh (12 MT)",
        machine: "Raymond #2",
      },
      {
        id: "PO-2025-038",
        label: "Talc 400 Mesh (15 MT)",
        machine: "Raymond #1",
      },
      {
        id: "PO-2025-039",
        label: "Barytes 200 Mesh (25 MT)",
        machine: "Ball Mill #2",
      },
    ];
  }, [DATA.ORDERS]);

  const rawAvailability = useMemo(
    () => DATA.RAW_MATERIALS.slice(0, 7),
    [DATA.RAW_MATERIALS],
  );

  const sparesRisk = useMemo(() => {
    const fromData = DATA.SPARE_PARTS.filter(
      (p) => p.critical && (p.status === "low" || p.status === "critical"),
    )
      .slice(0, 3)
      .map((p) => ({
        machine: p.location.split("·")[0]?.trim() || "Plant",
        text: `${p.name} (${p.code}) — ${p.status === "critical" ? "critical" : "low"} stock.`,
      }));
    return fromData.length ? fromData : SPARES_RISK_STATIC;
  }, [DATA.SPARE_PARTS]);

  return (
    <div className="prod-dash">
      <DashHead
        title="Production Dashboard"
        sub="Targets, active jobs, consumption, packaging & machines"
      >
        <Btn icon="refresh" size="sm">
          Refresh
        </Btn>
        <Btn
          variant="primary"
          size="sm"
          icon="plus"
          onClick={() => navigate && navigate("/orders/add")}
        >
          Plan batch
        </Btn>
      </DashHead>

      <div className="prod-dash-stats">
        <ProdStatCard
          icon={DashboardOutlined}
          label="Today’s target (MT)"
          value={String(todayTarget)}
        />
        <ProdStatCard
          icon={BarChartOutlined}
          label="Achieved so far (MT)"
          value={String(todayActual)}
          tone="accent"
        />
        <ProdStatCard
          icon={TrophyOutlined}
          label="Target achieved"
          value={`${targetPct}%`}
          tone="success"
        />
        <ProdStatCard
          icon={CalendarOutlined}
          label="Week target (MT)"
          value={String(week.planned)}
        />
        <ProdStatCard
          icon={RiseOutlined}
          label="Week achieved"
          value={String(week.actual)}
        />
        <ProdStatCard
          icon={ThunderboltOutlined}
          label="Active jobs now"
          value={String(activeJobs || activeJobRows.length)}
        />
      </div>

      <div className="prod-dash-grid prod-dash-grid--3">
        <ProdWidget
          title="Actual consumption pending entry"
          badge={<Badge tone="warning">3</Badge>}
          footnote="Batches completed today; RM consumption not yet recorded."
        >
          <ul className="prod-dash-pending">
            {PENDING_CONSUMPTION.map((item) => (
              <li key={item.id}>
                <span>
                  {item.id} — {item.product}
                </span>
                <button
                  type="button"
                  className="prod-dash-link"
                  onClick={() => navigate && navigate("/production")}
                >
                  Enter
                </button>
              </li>
            ))}
          </ul>
        </ProdWidget>

        <ProdWidget title="Bag stock auto-impact summary">
          {BAG_IMPACT.map((row) => (
            <div key={row.label} className="prod-dash-bag-row">
              <span>{row.label}</span>
              <span className={row.warn ? "warn" : ""}>{row.value}</span>
            </div>
          ))}
          <p className="prod-dash-widget__footnote">
            Stock is auto-reserved against current jobs. Updates on consumption
            entry.
          </p>
        </ProdWidget>

        <ProdWidget title="Production summary">
          <div className="prod-dash-co-box">
            <div className="prod-dash-co-box__v">{todayActual} MT</div>
            <div className="prod-dash-co-box__l">Today’s production</div>
            <p className="prod-dash-co-box__sub">
              12 batches · {activeJobs || activeJobRows.length} jobs running
            </p>
          </div>
        </ProdWidget>
      </div>

      <div className="prod-dash-grid prod-dash-grid--2">
        <ProdWidget
          title="Today’s active production jobs"
          badge={<Badge tone="success">{activeJobRows.length} running</Badge>}
        >
          <ul className="prod-dash-jobs">
            {activeJobRows.map((job) => (
              <li key={job.id}>
                <span>
                  <strong>{job.id}</strong> — {job.label}
                </span>
                <span className="prod-dash-job-badge">{job.machine}</span>
              </li>
            ))}
          </ul>
        </ProdWidget>

        <ProdWidget
          title="Machine utilization"
          meta={<span className="prod-dash-widget__meta">Current shift</span>}
        >
          {MACHINE_UTIL.map((m) => (
            <div key={m.name} className="prod-dash-machine">
              <div className="prod-dash-machine__name">{m.name}</div>
              <div className="prod-dash-machine__meta">{m.meta}</div>
              <div className="prod-dash-machine__bar">
                <div
                  className={`prod-dash-machine__fill ${m.tone === "warning" ? "warning" : m.tone === "danger" ? "danger" : ""}`}
                  style={{ width: `${m.pct}%` }}
                />
              </div>
            </div>
          ))}
        </ProdWidget>
      </div>

      <div className="prod-dash-grid prod-dash-grid--2">
        <ProdWidget title="Raw material availability summary">
          <ul className="prod-dash-rm-list">
            {rawAvailability.map((rm) => (
              <li key={rm.code}>
                <span>
                  {rm.name} ({rm.code})
                </span>
                <span className={rmAvailClass(rm.status)}>
                  {rmAvailLabel(rm.stock, rm.unit, rm.status)}
                </span>
              </li>
            ))}
          </ul>
        </ProdWidget>

        <ProdWidget title="Packaging required for current production">
          <div className="prod-dash-table-wrap">
            <table className="prod-dash-table">
              <thead>
                <tr>
                  <th>Packaging type</th>
                  <th>Required</th>
                  <th>Available</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {PACK_REQUIRED.map((row) => (
                  <tr key={row.type}>
                    <td>{row.type}</td>
                    <td>{fmtNum(row.required)}</td>
                    <td>{fmtNum(row.available)}</td>
                    <td>
                      <Badge tone={row.tone}>{row.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ProdWidget>
      </div>

      <div className="prod-dash-grid prod-dash-grid--2">
        <ProdWidget
          title="Machine spare parts at risk"
          badge={<Badge tone="warning">{sparesRisk.length}</Badge>}
        >
          <ul className="prod-dash-spares">
            {sparesRisk.map((item, i) => (
              <li key={i}>
                <span className="prod-dash-spares__icon">
                  <Icon name="wrench" size={13} />
                </span>
                <span>
                  <strong>{item.machine}</strong> — {item.text}
                </span>
              </li>
            ))}
          </ul>
        </ProdWidget>

        <ProdWidget title="Dynamic production mix note">
          <div className="prod-dash-mix-note">
            <strong>Mix is demand-driven.</strong> Current plan is based on
            today’s queue and orders. New orders or priority changes can shift
            the mix; consumption entry and bag reservation update accordingly.
            Review queue and RM availability before committing to new dates.
          </div>
        </ProdWidget>
      </div>

      <div className="prod-dash-grid prod-dash-grid--2">
        <ProdWidget
          title="Completed batches today"
          meta={<span className="prod-dash-widget__meta">12 batches</span>}
        >
          <div className="prod-dash-table-wrap">
            <table className="prod-dash-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Product</th>
                  <th>Qty (MT)</th>
                  <th>Machine</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {COMPLETED_BATCHES.map((row) => (
                  <tr key={row.order}>
                    <td>{row.order}</td>
                    <td>{row.product}</td>
                    <td>{row.qty}</td>
                    <td>{row.machine}</td>
                    <td>{row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ProdWidget>

        <ProdWidget
          title="Delayed production tasks"
          badge={<Badge tone="danger">2</Badge>}
        >
          <ul className="prod-dash-delayed">
            {DELAYED_TASKS.map((item) => (
              <li key={item.id}>
                <span className="prod-dash-delayed__icon">
                  <Icon name="clock" size={14} />
                </span>
                <div>
                  <strong>{item.id}</strong> — {item.text}
                </div>
              </li>
            ))}
          </ul>
        </ProdWidget>
      </div>

      <div className="prod-dash-eod">
        <div className="prod-dash-eod__title">
          <Icon name="invoice" size={16} /> End-of-day consumption entry
        </div>
        <div className="prod-dash-eod__desc">
          Enter actual RM and packaging consumption for completed batches before
          shift close. Keeps stock and costs accurate.
        </div>
        <Btn
          variant="primary"
          size="sm"
          icon="check"
          onClick={() => navigate && navigate("/production")}
        >
          Open consumption entry
        </Btn>
      </div>

      <ProdWidget
        title="Production queue"
        badge={
          <Btn
            variant="secondary"
            size="sm"
            onClick={() => navigate && navigate("/orders")}
          >
            View full queue
          </Btn>
        }
      >
        <div className="prod-dash-table-wrap">
          <table className="prod-dash-table prod-dash-table--queue">
            <thead>
              <tr>
                <th>Order</th>
                <th>Product</th>
                <th>Spec / Mesh</th>
                <th>Qty (MT)</th>
                <th>Planned date</th>
                <th>Machine</th>
                <th>Status</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {PRODUCTION_QUEUE.map((row) => (
                <tr key={row.order}>
                  <td>{row.order}</td>
                  <td>{row.product}</td>
                  <td>{row.spec}</td>
                  <td>{row.qty}</td>
                  <td>{row.date}</td>
                  <td>{row.machine}</td>
                  <td>
                    <Badge tone={row.hold ? "danger" : "default"}>
                      {row.status}
                    </Badge>
                  </td>
                  <td>{row.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ProdWidget>
    </div>
  );
};

/* ============================================================
   DISPATCH DASHBOARD
   ============================================================ */
const DispStatCard = ({ label, value, tone = "default", icon }) => (
  <StatCard
    icon={icon}
    label={label}
    value={value}
    hintTone={mapDashStatTone(tone)}
  />
);

const DispWidget = ({
  title,
  icon,
  badge,
  meta,
  children,
  footnote,
  theme = "",
  wide = false,
}) => (
  <div
    className={`disp-dash-widget ${wide ? "disp-dash-widget--wide" : ""} ${theme}`.trim()}
  >
    <div className="disp-dash-widget__head">
      <span className="disp-dash-widget__title">
        {icon ? <Icon name={icon} size={14} /> : null} {title}
      </span>
      {badge}
      {meta}
    </div>
    <div className="disp-dash-widget__body">
      {children}
      {footnote ? (
        <p className="disp-dash-widget__footnote">{footnote}</p>
      ) : null}
    </div>
  </div>
);

const DispEyebrow = ({ children }) => (
  <div className="disp-dash-eyebrow">{children}</div>
);

const DISPATCH_CHART_THEMES = {
  calendar: {
    container: "disp-dash-widget--blue",
    colors: ["#2563eb"],
  },
  dueOrders: {
    container: "disp-dash-widget--rose",
    colors: ["#e11d48", "#ea580c", "#16a34a", "#2563eb"],
  },
  customers: {
    container: "disp-dash-widget--violet",
    colors: ["#7c3aed", "#2563eb", "#16a34a"],
  },
  company: {
    container: "disp-dash-widget--ocean",
    colors: ["#2563eb", "#dc2626"],
  },
  dueToday: {
    container: "disp-dash-widget--green",
    colors: ["#2563eb", "#0d9488"],
  },
  overdue: {
    container: "disp-dash-widget--amber",
    colors: ["#dc2626"],
  },
  delays: {
    container: "disp-dash-widget--amber",
    colors: ["#ea580c", "#dc2626"],
  },
};

const DISPATCH_OPS_CHART_PROPS = {
  showValues: true,
  axisFontSize: 13,
  valueFontSize: 18,
  labelFontSize: 13,
  h: 190,
};

const dispChartLegend = (theme, labels) =>
  labels.map((label, i) => ({
    label,
    color: theme.colors[i % theme.colors.length],
  }));

const dispShortCustomer = (name) => {
  const parts = name.split(/\s+/);
  if (parts.length <= 2) return name;
  return `${parts[0]} ${parts[1]}`;
};

const dispChartTooltip = {
  count: ({ label, value }) => `${label}: ${value}`,
  mt: ({ label, value }) => `${label}: ${value} MT`,
  dispatches: ({ label, value }) =>
    `${label} Mar: ${value} dispatch${value === 1 ? "" : "es"}`,
};

const DISPATCH_DUE_TODAY = [
  { label: "Asian Paints — 12 MT Talc", co: "minerals" },
  { label: "ITC Paperboards — 15 MT Kaolin", co: "minerals" },
  { label: "Berger Paints — 8 MT CaCO₃", co: "minerals" },
  { label: "HUL — 20 MT Detergent base", co: "minerals" },
  { label: "Nirma — 20 MT Detergent", co: "minerals" },
  { label: "Lotus Herbals — 3 MT Cosmetic", co: "minerals" },
  { label: "Cosmic Minerals — 6 MT Barytes", co: "microns" },
  { label: "Prime Fillers — 4 MT Dolomite", co: "microns" },
  { label: "Jaipur Paints — 5 MT Talc", co: "minerals" },
];

const OVERDUE_DISPATCHES = [
  {
    text: "HUL — 20 MT Due 8 Mar. Vehicle assigned 14:00 slot.",
    co: "minerals",
  },
  {
    text: "Lotus Herbals — 3 MT Due 7 Mar. Pending packaging.",
    co: "minerals",
  },
];

const PACK_PENDING = [
  {
    id: "DP-2025-097",
    text: "Lotus Herbals — 3 MT Cosmetic. Laminated pouches 1 kg short. ETA 10 Mar.",
  },
  {
    id: "DP-2025-098",
    text: "Nirma — 20 MT. HDPE 50 kg bags delayed from vendor. Expected tomorrow.",
  },
];

const DELAY_REASONS = [
  { n: 1, l: "Vehicle / en-route delay" },
  { n: 2, l: "Packaging shortage" },
  { n: 0, l: "Loading delay" },
  { n: 0, l: "Customer reschedule" },
];

const TRACKING_ROWS = [
  { reg: "GJ-01-AB-1234", status: "Loading — Asian Paints" },
  { reg: "GJ-02-CD-5678", status: "In transit — ITC (ETA 14:30)" },
  { reg: "GJ-07-EF-9012", status: "In transit — Berger" },
  { reg: "MH-12-GH-3456", status: "Ready — HUL 14:00" },
  { reg: "RJ-14-JK-7890", status: "Ready — Cosmic (Microns)" },
];

const DRIVER_TRACKING = [
  {
    reg: "GJ-02-CD-5678",
    tone: "transit",
    title: "Kiran S. · ITC — 15 MT Kaolin",
    meta: "Last update: 10:42 · NH-48, ~45 km from plant. ETA 14:30",
  },
  {
    reg: "GJ-07-EF-9012",
    tone: "transit",
    title: "Vijay M. · Berger — 8 MT CaCO₃",
    meta: "Last update: 09:15 · At customer gate. Awaiting unload",
  },
  {
    reg: "GJ-01-AB-1234",
    tone: "loading",
    title: "Ramesh P. · Asian Paints — 12 MT Talc",
    meta: "Last update: 09:00 · Loading bay #2. Est. departure 09:45",
  },
];

const DUE_ORDERS_TODAY = [
  {
    id: "DP-2025-095",
    customer: "Asian Paints Ltd",
    product: "Talc 400M",
    qty: "12 MT",
    vehicle: "GJ-01-AB-1234",
    slot: "09:00",
    status: "Loading",
    tone: "warning",
  },
  {
    id: "DP-2025-094",
    customer: "ITC Paperboards",
    product: "Kaolin 200M",
    qty: "15 MT",
    vehicle: "GJ-02-CD-5678",
    slot: "10:30",
    status: "Delayed",
    tone: "warning",
  },
  {
    id: "DP-2025-093",
    customer: "Berger Paints",
    product: "CaCO₃ 300M",
    qty: "8 MT",
    vehicle: "GJ-07-EF-9012",
    slot: "12:00",
    status: "In transit",
    tone: "info",
  },
  {
    id: "DP-2025-096",
    customer: "Hindustan Unilever",
    product: "Detergent base",
    qty: "20 MT",
    vehicle: "MH-12-GH-3456",
    slot: "14:00",
    status: "Ready",
    tone: "success",
  },
  {
    id: "DP-2025-097",
    customer: "Lotus Herbals",
    product: "Talc Cosmetic",
    qty: "3 MT",
    vehicle: "—",
    slot: "—",
    status: "Packaging",
    tone: "warning",
  },
  {
    id: "DP-2025-099",
    customer: "Cosmic Minerals",
    product: "Barytes 200M",
    qty: "6 MT",
    vehicle: "RJ-14-JK-7890",
    slot: "11:00",
    status: "Ready",
    tone: "success",
  },
];

const VEHICLE_ASSIGNMENTS = [
  {
    reg: "GJ-01-AB-1234",
    driver: "Ramesh P. · Asian Paints — 12 MT Talc",
    status: "Loading",
    tone: "loading",
  },
  {
    reg: "GJ-02-CD-5678",
    driver: "Kiran S. · ITC — 15 MT Kaolin",
    status: "In transit",
    tone: "transit",
  },
  {
    reg: "GJ-07-EF-9012",
    driver: "Vijay M. · Berger — 8 MT CaCO₃",
    status: "In transit",
    tone: "transit",
  },
  {
    reg: "MH-12-GH-3456",
    driver: "Anil K. · HUL — 20 MT (slot 14:00)",
    status: "Ready",
    tone: "ready",
  },
  {
    reg: "RJ-14-JK-7890",
    driver: "Suresh R. · Cosmic — 6 MT Barytes (Microns)",
    status: "Ready",
    tone: "ready",
  },
];

const CUST_DISPATCH_SUMMARY = [
  {
    customer: "Asian Paints Ltd",
    due: 1,
    mt: 12,
    dispatched: 0,
    pending: 1,
    status: "Loading",
    tone: "warning",
  },
  {
    customer: "ITC Paperboards",
    due: 1,
    mt: 15,
    dispatched: 0,
    pending: 1,
    status: "Delayed",
    tone: "warning",
  },
  {
    customer: "Berger Paints India",
    due: 1,
    mt: 8,
    dispatched: 0,
    pending: 1,
    status: "In transit",
    tone: "info",
  },
  {
    customer: "Hindustan Unilever Ltd",
    due: 1,
    mt: 20,
    dispatched: 0,
    pending: 1,
    status: "Ready",
    tone: "success",
  },
  {
    customer: "Lotus Herbals Pvt Ltd",
    due: 1,
    mt: 3,
    dispatched: 0,
    pending: 1,
    status: "Packaging",
    tone: "warning",
  },
  {
    customer: "Cosmic Minerals",
    due: 1,
    mt: 6,
    dispatched: 0,
    pending: 1,
    status: "Ready",
    tone: "success",
  },
  {
    customer: "Nirma Ltd",
    due: 0,
    mt: 0,
    dispatched: 1,
    pending: 0,
    status: "Delivered",
    tone: "success",
  },
];

const CALENDAR_DAYS = [
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  { day: 9, today: true, count: "9 due" },
  { day: 10, dispatch: true, count: "6" },
  { day: 11, dispatch: true, count: "5" },
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  21,
  22,
  23,
  24,
  25,
  26,
  27,
  28,
  29,
  30,
  31,
];

function CoTag({ co }) {
  return (
    <span className={`disp-dash-tag ${co === "microns" ? "microns" : ""}`}>
      {co === "microns" ? "Microns" : "Minerals"}
    </span>
  );
}

const DISPATCH_MAP_PLANTS = [
  { x: 52, y: 38, name: "Udaipur", sub: "Minerals plant" },
  { x: 32, y: 56, name: "Ahmedabad", sub: "Microns plant" },
];

const DISPATCH_MAP_VEHICLE_COLORS = {
  transit: { bg: "#2563eb", ring: "rgba(37, 99, 235, 0.24)" },
  loading: { bg: "#ea580c", ring: "rgba(234, 88, 12, 0.24)" },
  ready: { bg: "#16a34a", ring: "rgba(22, 163, 74, 0.24)" },
};

const buildDispatchMapVehicles = () =>
  VEHICLE_ASSIGNMENTS.map((vehicle, index) => ({
    reg: vehicle.reg,
    status: vehicle.status,
    tone: vehicle.tone,
    x: 12 + ((index * 23 + vehicle.reg.charCodeAt(2)) % 74),
    y: 14 + ((index * 17 + vehicle.reg.charCodeAt(vehicle.reg.length - 2)) % 72),
  }));

const DispatchFleetMapPreview = () => {
  const vehicles = useMemo(() => buildDispatchMapVehicles(), []);

  return (
    <div className="disp-dash-map-preview">
      <div className="disp-dash-map-preview__head">
        <strong>Live fleet map</strong>
        <Badge tone="success" dot>
          {vehicles.length} vehicles
        </Badge>
      </div>
      <div className="map-frame disp-dash-map-preview__frame">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="disp-dash-map-preview__svg"
        >
          <path
            d="M 20 20 Q 28 14 38 16 L 50 12 Q 62 10 72 18 L 84 22 Q 92 30 88 42 L 86 56 Q 82 72 70 82 L 56 92 Q 42 94 36 88 L 28 80 Q 20 70 18 56 L 18 38 Q 16 28 20 20 Z"
            fill="rgba(55,77,149,0.04)"
            stroke="rgba(55,77,149,0.15)"
            strokeWidth="0.4"
            strokeDasharray="0.6 0.6"
          />
          {vehicles.map((vehicle, index) => {
            const plant = DISPATCH_MAP_PLANTS[index % DISPATCH_MAP_PLANTS.length];
            return (
              <line
                key={`route-${vehicle.reg}`}
                x1={plant.x}
                y1={plant.y}
                x2={vehicle.x}
                y2={vehicle.y}
                stroke="rgba(37, 99, 235, 0.28)"
                strokeWidth="0.35"
                strokeDasharray="0.8 0.8"
              />
            );
          })}
        </svg>
        {DISPATCH_MAP_PLANTS.map((plant) => (
          <div
            key={plant.name}
            className="disp-dash-map-preview__plant"
            style={{ left: `${plant.x}%`, top: `${plant.y}%` }}
          >
            <span className="disp-dash-map-preview__plant-dot" />
            <span className="disp-dash-map-preview__plant-label">
              {plant.name}
            </span>
          </div>
        ))}
        {vehicles.map((vehicle) => {
          const colors =
            DISPATCH_MAP_VEHICLE_COLORS[vehicle.tone] ??
            DISPATCH_MAP_VEHICLE_COLORS.transit;
          return (
            <div
              key={vehicle.reg}
              className="disp-dash-map-preview__vehicle"
              style={{
                left: `${vehicle.x}%`,
                top: `${vehicle.y}%`,
                background: colors.bg,
                boxShadow: `0 0 0 4px ${colors.ring}`,
              }}
              title={`${vehicle.reg} · ${vehicle.status}`}
            >
              <Icon name="truck" size={10} />
            </div>
          );
        })}
      </div>
      <ul className="disp-dash-map-preview__list">
        {vehicles.map((vehicle) => (
          <li key={vehicle.reg}>
            <span className="mono">{vehicle.reg}</span>
            <span>{vehicle.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const DispatchMapHoverButton = ({ children }) => (
  <Popover
    trigger="hover"
    placement="bottomRight"
    overlayClassName="disp-dash-map-popover"
    content={<DispatchFleetMapPreview />}
  >
    <span className="disp-dash-map-trigger">{children}</span>
  </Popover>
);

const DispatchDashboard = ({ navigate }) => {
  const [addDriverOpen, setAddDriverOpen] = useState(false);
  const DATA = useDATA();
  const dispatchCounts = dispatchStatusCounts(DATA.DISPATCHES);
  const mineralsPlant = dispatchesForPlant(DATA.DISPATCHES, "udaipur");
  const micronsPlant = dispatchesForPlant(DATA.DISPATCHES, "ahmedabad");
  const packBlock = lowStockCount(DATA.PACKAGING);

  const dueToday = DISPATCH_DUE_TODAY.length;
  const overdue = OVERDUE_DISPATCHES.length;
  const vehiclesAssigned = VEHICLE_ASSIGNMENTS.length;
  const inTransit = dispatchCounts.inTransit || 2;
  const completedToday =
    DATA.DISPATCHES.filter((d) => d.status === "delivered").length || 3;

  const dueTodayPlantData = [
    {
      plant: "Minerals",
      count: DISPATCH_DUE_TODAY.filter((d) => d.co !== "microns").length,
    },
    {
      plant: "Microns",
      count: DISPATCH_DUE_TODAY.filter((d) => d.co === "microns").length,
    },
  ];

  const companyDispatchChartData = [
    {
      plant: "Minerals",
      due: mineralsPlant.due || 7,
      overdue: mineralsPlant.overdue || 2,
    },
    {
      plant: "Microns",
      due: micronsPlant.due || 2,
      overdue: micronsPlant.overdue || 0,
    },
  ];

  const dispatchCalendarChartData = CALENDAR_DAYS.map((cell) => {
    if (typeof cell === "number") {
      return { day: String(cell), dispatches: 0 };
    }
    const n = parseInt(String(cell.count ?? "").replace(/\D/g, ""), 10) || 0;
    return { day: String(cell.day), dispatches: n };
  }).filter((d) => Number(d.day) >= 7 && Number(d.day) <= 18);

  const dueOrdersChartData = DUE_ORDERS_TODAY.map((row) => ({
    customer: dispShortCustomer(row.customer),
    mt: parseFloat(row.qty) || 0,
  }));

  const customerDispatchChartData = CUST_DISPATCH_SUMMARY.map((row) => ({
    customer: dispShortCustomer(row.customer),
    mt: row.mt,
    dispatched: row.dispatched,
    pending: row.pending,
  }));

  const delayReasonsChartData = DELAY_REASONS.filter((r) => r.n > 0).map(
    (row) => ({
      reason:
        row.l.length > 18 ? `${row.l.slice(0, 16)}…` : row.l,
      count: row.n,
    }),
  );

  return (
    <div className="disp-dash">
      <DashHead
        title="Dispatch Dashboard"
        sub="Due today, overdue, vehicles, packaging blocks & company overview"
      >
        <DispatchMapHoverButton>
          <Btn
            icon="map"
            size="sm"
            onClick={() => navigate && navigate("/dispatch")}
          >
            Map view
          </Btn>
        </DispatchMapHoverButton>
        <Btn
          variant="secondary"
          size="sm"
          icon="user"
          onClick={() => setAddDriverOpen(true)}
        >
          Add driver
        </Btn>
        <Btn
          variant="primary"
          size="sm"
          icon="plus"
          onClick={() => navigate && navigate("/dispatch")}
        >
          New dispatch
        </Btn>
      </DashHead>

      <DashboardBannerCarousel slides={DISPATCH_BANNER_SLIDES} navigate={navigate} />

      <AddDriverModal
        open={addDriverOpen}
        onClose={() => setAddDriverOpen(false)}
      />

      <div className="disp-dash-stats">
        <DispStatCard
          icon={CalendarOutlined}
          label="Dispatch due today"
          value={String(dueToday)}
          tone="accent"
        />
        <DispStatCard
          icon={ExclamationCircleOutlined}
          label="Overdue"
          value={String(overdue)}
          tone="danger"
        />
        <DispStatCard
          icon={CarOutlined}
          label="Vehicles assigned"
          value={String(vehiclesAssigned)}
        />
        <DispStatCard
          icon={SendOutlined}
          label="In transit"
          value={String(inTransit)}
          tone="success"
        />
        <DispStatCard
          icon={InboxOutlined}
          label="Packaging block"
          value={String(packBlock || 2)}
          tone="warning"
        />
        <DispStatCard
          icon={CheckCircleOutlined}
          label="Completed today"
          value={String(completedToday)}
        />
      </div>

      <DispEyebrow>Operations overview</DispEyebrow>
      <div className="disp-dash-grid disp-dash-grid--3">
        <DispWidget
          title="Dispatch due today"
          icon="calendar"
          badge={<Badge tone="default">{dueToday}</Badge>}
          theme={DISPATCH_CHART_THEMES.dueToday.container}
        >
          <p className="disp-dash-chart-caption">
            Due dispatches by company (Minerals vs Microns)
          </p>
          <OwnerChartPanel
            legend={
              <OwnerChartLegend
                items={dispChartLegend(DISPATCH_CHART_THEMES.dueToday, [
                  "Minerals",
                  "Microns",
                ])}
              />
            }
          >
            <BarChart
              data={dueTodayPlantData}
              keys={["count"]}
              colors={DISPATCH_CHART_THEMES.dueToday.colors}
              groupColors={DISPATCH_CHART_THEMES.dueToday.colors}
              labelKey="plant"
              tooltipFormatter={dispChartTooltip.count}
              {...DISPATCH_OPS_CHART_PROPS}
            />
          </OwnerChartPanel>
        </DispWidget>

        <DispWidget
          title="Overdue dispatches"
          icon="alert"
          badge={<Badge tone="danger">{overdue}</Badge>}
          theme={DISPATCH_CHART_THEMES.overdue.container}
          footnote="Customers notified. Escalate if not out today."
        >
          <p className="disp-dash-chart-caption">Overdue count by plant</p>
          <OwnerChartPanel>
            <BarChart
              data={companyDispatchChartData}
              keys={["overdue"]}
              colors={DISPATCH_CHART_THEMES.overdue.colors}
              groupColors={DISPATCH_CHART_THEMES.overdue.colors}
              labelKey="plant"
              tooltipFormatter={dispChartTooltip.count}
              {...DISPATCH_OPS_CHART_PROPS}
            />
          </OwnerChartPanel>
          <ul className="disp-dash-list disp-dash-list--compact">
            {OVERDUE_DISPATCHES.map((item) => (
              <li key={item.text}>
                <span>{item.text}</span>
                <CoTag co={item.co} />
              </li>
            ))}
          </ul>
        </DispWidget>

        <DispWidget
          title="Company-wise dispatch overview"
          icon="factory"
          theme={DISPATCH_CHART_THEMES.company.container}
        >
          <p className="disp-dash-chart-caption">
            Due vs overdue by plant today
          </p>
          <OwnerChartPanel
            legend={
              <OwnerChartLegend
                items={dispChartLegend(DISPATCH_CHART_THEMES.company, [
                  "Due today",
                  "Overdue",
                ])}
              />
            }
          >
            <BarChart
              data={companyDispatchChartData}
              keys={["due", "overdue"]}
              colors={DISPATCH_CHART_THEMES.company.colors}
              groupColors={DISPATCH_CHART_THEMES.company.colors}
              labelKey="plant"
              tooltipFormatter={dispChartTooltip.count}
              {...DISPATCH_OPS_CHART_PROPS}
            />
          </OwnerChartPanel>
        </DispWidget>
      </div>

      <DispEyebrow>Visual insights</DispEyebrow>
      <div className="disp-dash-grid disp-dash-grid--2">
        <DispWidget
          title="Dispatch calendar"
          icon="calendar"
          theme={DISPATCH_CHART_THEMES.calendar.container}
        >
          <p className="disp-dash-chart-caption">
            March 2025 — scheduled dispatches by day
          </p>
          <OwnerChartPanel
            legend={
              <OwnerChartLegend
                items={dispChartLegend(DISPATCH_CHART_THEMES.calendar, [
                  "Dispatches",
                ])}
              />
            }
          >
            <BarChart
              data={dispatchCalendarChartData}
              keys={["dispatches"]}
              colors={DISPATCH_CHART_THEMES.calendar.colors}
              groupColors={DISPATCH_CHART_THEMES.calendar.colors}
              labelKey="day"
              tooltipFormatter={dispChartTooltip.dispatches}
              h={165}
            />
          </OwnerChartPanel>
        </DispWidget>

        <DispWidget
          title="Due orders today"
          icon="truck"
          badge={<Badge tone="default">{DUE_ORDERS_TODAY.length}</Badge>}
          theme={DISPATCH_CHART_THEMES.dueOrders.container}
        >
          <p className="disp-dash-chart-caption">
            Order volume by customer (MT)
          </p>
          <OwnerChartPanel
            legend={
              <OwnerChartLegend
                items={dispChartLegend(DISPATCH_CHART_THEMES.dueOrders, [
                  "Quantity (MT)",
                ])}
              />
            }
          >
            <BarChart
              data={dueOrdersChartData}
              keys={["mt"]}
              colors={DISPATCH_CHART_THEMES.dueOrders.colors}
              groupColors={dueOrdersChartData.map(
                (_, i) =>
                  DISPATCH_CHART_THEMES.dueOrders.colors[
                    i % DISPATCH_CHART_THEMES.dueOrders.colors.length
                  ],
              )}
              labelKey="customer"
              tooltipFormatter={dispChartTooltip.mt}
              h={165}
            />
          </OwnerChartPanel>
        </DispWidget>
      </div>

      <div className="disp-dash-grid disp-dash-grid--2">
        <DispWidget
          title="Dispatches pending — packaging shortage"
          icon="package"
          badge={<Badge tone="warning">2</Badge>}
          theme="disp-dash-widget--rose"
          footnote="Stores/Procurement to confirm. Reschedule slot after material receipt."
        >
          <ul className="disp-dash-list disp-dash-list--stack">
            {PACK_PENDING.map((item) => (
              <li key={item.id}>
                <span>
                  <strong>{item.id}</strong> {item.text}
                </span>
              </li>
            ))}
          </ul>
        </DispWidget>

        <DispWidget
          title="Delayed dispatch reasons summary"
          icon="pieChart"
          theme={DISPATCH_CHART_THEMES.delays.container}
        >
          <p className="disp-dash-chart-caption">Open delay cases by reason</p>
          <OwnerChartPanel
            legend={
              <OwnerChartLegend
                items={dispChartLegend(DISPATCH_CHART_THEMES.delays, [
                  "Cases",
                ])}
              />
            }
          >
            <BarChart
              data={delayReasonsChartData}
              keys={["count"]}
              colors={DISPATCH_CHART_THEMES.delays.colors}
              groupColors={DISPATCH_CHART_THEMES.delays.colors}
              labelKey="reason"
              tooltipFormatter={dispChartTooltip.count}
              h={130}
            />
          </OwnerChartPanel>
          <p className="disp-dash-widget__footnote disp-dash-widget__footnote--inline">
            DP-094 (ITC): vehicle delay. DP-097, 098: packaging.
          </p>
        </DispWidget>
      </div>

      <div className="disp-dash-grid disp-dash-grid--main">
        <div className="disp-dash-main-left">
          <DispWidget title="Simple vehicle tracking status" icon="truck" theme="disp-dash-widget--blue">
            <div className="disp-dash-pill-strip">
              <span className="disp-dash-pill loading">Loading · 1</span>
              <span className="disp-dash-pill transit">In transit · 2</span>
              <span className="disp-dash-pill ready">Ready at gate · 2</span>
            </div>
            <ul className="disp-dash-list">
              {TRACKING_ROWS.map((row) => (
                <li key={row.reg}>
                  <span className="mono">{row.reg}</span>
                  <span>{row.status}</span>
                </li>
              ))}
            </ul>
          </DispWidget>

          <DispWidget title="Driver / vehicle tracking (concept)" icon="pin" theme="disp-dash-widget--ocean">
            {DRIVER_TRACKING.map((row) => (
              <div key={row.reg} className="disp-dash-track-row">
                <span className={`disp-dash-track-dot ${row.tone}`} />
                <span className="disp-dash-track-reg">{row.reg}</span>
                <div>
                  <div>{row.title}</div>
                  <div className="disp-dash-track-meta">{row.meta}</div>
                </div>
              </div>
            ))}
            <p className="disp-dash-widget__footnote disp-dash-widget__footnote--inline">
              Concept: driver check-in / GPS ping updates ETA. Full tracking in
              logistics module.
            </p>
          </DispWidget>
        </div>

        <div className="disp-dash-main-right">
          <div className="disp-dash-delayed-panel">
            <h4>
              <Icon name="alert" size={13} /> Delayed dispatch alert
            </h4>
            <ul>
              <li>
                <strong>DP-2025-094</strong> — ITC Paperboards (15 MT Kaolin).
                Vehicle delayed ~2 hrs. New ETA 14:30. Customer notified via WA.
              </li>
            </ul>
          </div>

          <div className={`card disp-dash-card ${DISPATCH_CHART_THEMES.dueOrders.container}`}>
            <div className="card-head">
              <div className="card-title">Vehicle assignment</div>
              <Btn
                variant="secondary"
                size="sm"
                onClick={() => navigate && navigate("/dispatch")}
              >
                Manage
              </Btn>
            </div>
            <div className="card-body">
              <ul className="disp-dash-vehicles">
                {VEHICLE_ASSIGNMENTS.map((v) => (
                  <li key={v.reg}>
                    <div>
                      <span className="disp-dash-vehicles__reg">{v.reg}</span>
                      <div className="disp-dash-vehicles__driver">
                        {v.driver}
                      </div>
                    </div>
                    <span className={`disp-dash-vehicles__badge ${v.tone}`}>
                      {v.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <DispWidget
        title="Customer-wise dispatch summary"
        icon="users"
        wide
        theme={DISPATCH_CHART_THEMES.customers.container}
      >
        <p className="disp-dash-chart-caption">
          Total MT, dispatched & pending by customer (today)
        </p>
        <OwnerChartPanel
          legend={
            <OwnerChartLegend
              items={dispChartLegend(DISPATCH_CHART_THEMES.customers, [
                "Total MT",
                "Dispatched",
                "Pending",
              ])}
            />
          }
        >
          <BarChart
            data={customerDispatchChartData}
            keys={["mt", "dispatched", "pending"]}
            colors={DISPATCH_CHART_THEMES.customers.colors}
            groupColors={DISPATCH_CHART_THEMES.customers.colors}
            labelKey="customer"
            tooltipFormatter={dispChartTooltip.mt}
            h={185}
          />
        </OwnerChartPanel>
      </DispWidget>
    </div>
  );
};

export {
  MasterDashboard,
  AdminDashboard,
  OwnerDashboard,
  ProductionDashboard,
  DispatchDashboard,
  DashHead,
  SectionH,
  DashboardBannerCarousel,
  DISPATCH_BANNER_SLIDES,
};
