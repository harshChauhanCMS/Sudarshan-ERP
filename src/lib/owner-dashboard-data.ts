import type { ErpData } from "@/lib/seed-data";
import {
  activeDispatches,
  activeProductionJobs,
  dispatchStatusCounts,
  dispatchesForPlant,
  formatLakhs,
  grossMarginPct,
  grossProfitRupees,
  lowStockCount,
  overdueOpenOrders,
  productionDayActual,
  revenueLakhsFromSeries,
  revenueMtdRupees,
} from "@/lib/erp-stats";
import {
  getEmployeesInFieldFromPunches,
  getTodayFieldVisitsForOwner,
} from "@/lib/field-visit-service";
import { isDbConfigured } from "@/lib/mongodb";
import { ownerStatKeyFromLabel } from "@/lib/owner-dashboard-stat-details";
import { SUPPLIED_MATERIAL_CATALOG } from "@/lib/supplied-materials";

function formatInr(n: number): string {
  if (n <= 0) return "—";
  return `₹${n.toLocaleString("en-IN")}`;
}

export type OwnerAlertItem = {
  key: string;
  microns: boolean;
  name: string;
  meta: string;
  href?: string;
};

export type OwnerDispatchItem = {
  key: string;
  label: string;
  microns: boolean;
  href?: string;
};

export type OwnerCompanyTileData = {
  company: ErpData["COMPANIES"][number];
  accent: "primary" | "gold";
  metrics: Array<{ label: string; value: string | number; tone?: string }>;
  footnote: string;
  href?: string;
};

export type OwnerStatCard = {
  key: string;
  label: string;
  value: string;
  tone?: "accent" | "success" | "danger" | "warning" | "default";
  href?: string;
};

export type OwnerDashboardView = {
  periodLabel: string;
  subtitle: string;
  companyTiles: OwnerCompanyTileData[];
  stats: OwnerStatCard[];
  counts: {
    rmLow: number;
    packLow: number;
    spareLow: number;
    vendorPriceAlerts: number;
    dispatchesDue: number;
    dispatchActiveCount: number;
    overdueCount: number;
    fieldCount: number;
  };
  lowRmAlerts: OwnerAlertItem[];
  lowPackAlerts: OwnerAlertItem[];
  spareAlerts: OwnerAlertItem[];
  vendorPriceAlerts: Array<{ name: string; change: string; up: boolean; href?: string }>;
  dispatchDueItems: OwnerDispatchItem[];
  dispatchOverdueItems: OwnerDispatchItem[];
  production: {
    batchesCompleted: number;
    mineralsBatches: number;
    micronsBatches: number;
    totalOutput: string;
    footnote: string;
    href: string;
  };
  fieldVisits: Array<{ key: string; customer: string; rep: string; href?: string }>;
  employeesInField: Array<{ key: string; name: string; role: string; href?: string }>;
  operationalRisks: Array<{
    key: string;
    sev: "high" | "med";
    icon: string;
    title: string;
    desc: string;
    href?: string;
  }>;
  profit: {
    title: string;
    revenue: string;
    cogs: string;
    grossProfit: string;
    grossMargin: string;
    footnote: string;
    href: string;
  };
  topCustomers: Array<{ key: string; rank: number; name: string; meta: string; href?: string }>;
  topMaterials: Array<{ key: string; rank: number; name: string; meta: string; href?: string }>;
  criticalNotifs: Array<ErpData["NOTIFS"][number] & { href?: string }>;
};

function orderDetailHref(orderId: string): string {
  return orderId === "overdue" ? "/orders" : `/orders/${encodeURIComponent(orderId)}`;
}

function dispatchDetailHref(dispatchId: string): string {
  return `/dispatch/${encodeURIComponent(dispatchId)}`;
}

function riskHref(icon: string): string {
  if (icon === "box") return "/inventory/raw-material";
  if (icon === "truck") return "/orders";
  if (icon === "money") return "/procurement/vendors";
  if (icon === "wrench") return "/inventory/spare-parts";
  return "/reports";
}

function statCardHref(label: string): string | undefined {
  const map: Record<string, string> = {
    "Combined sales (MTD)": "/reports",
    "Gross margin": "/reports",
    "Dispatches due today": "/dispatch",
    Overdue: "/orders",
    "Vendor price alerts": "/procurement/vendors",
    "Employees in field": "/field-sales/activity-dashboard",
  };
  return map[label];
}

export async function buildOwnerDashboardView(data: ErpData): Promise<OwnerDashboardView> {
  const rev = revenueLakhsFromSeries(data.REVENUE_DATA);
  const revenueRupees = revenueMtdRupees(data.REVENUE_DATA);
  const grossProfit = grossProfitRupees(revenueRupees);
  const cogs = revenueRupees - grossProfit;
  const rmLow = lowStockCount(data.RAW_MATERIALS);
  const packLow = lowStockCount(data.PACKAGING);
  const spareLow = lowStockCount(data.SPARE_PARTS);
  const dispatchesDue = activeDispatches(data.DISPATCHES);
  const overdueCount = overdueOpenOrders(data.ORDERS);
  const mineralsDispatch = dispatchesForPlant(data.DISPATCHES, "udaipur");
  const micronsDispatch = dispatchesForPlant(data.DISPATCHES, "ahmedabad");
  const dispatchCounts = dispatchStatusCounts(data.DISPATCHES);
  const prodToday = productionDayActual(data.PRODUCTION_DATA);
  const activeJobs = activeProductionJobs(data.ORDERS);

  let fieldCount = 0;
  let employeesInField: OwnerDashboardView["employeesInField"] = [];
  let fieldVisits: OwnerDashboardView["fieldVisits"] = [];

  if (isDbConfigured()) {
    try {
      const [liveField, todayVisits] = await Promise.all([
        getEmployeesInFieldFromPunches(),
        getTodayFieldVisitsForOwner(),
      ]);
      fieldCount = liveField.fieldCount;
      employeesInField = liveField.employees;
      fieldVisits = todayVisits;
    } catch {
      fieldCount = 0;
      employeesInField = [];
      fieldVisits = [];
    }
  }

  if (!employeesInField.length) {
    employeesInField = [
      {
        key: "none",
        name: "No employees in field",
        role: "Shows after mobile field punch-in with GPS (not punched out)",
      },
    ];
  }

  if (!fieldVisits.length) {
    fieldVisits = [
      {
        key: "none",
        customer: "No field visits today",
        rep: "Visits from Field Sales assignments appear here",
      },
    ];
  }

  const lowRmAlerts: OwnerAlertItem[] = data.RAW_MATERIALS.filter(
    (r) => r.status === "low" || r.status === "critical",
  )
    .slice(0, 6)
    .map((r) => ({
      key: r.code,
      microns: false,
      name: r.name,
      meta:
        r.status === "critical"
          ? `Critical · ${r.stock} ${r.unit}`
          : `Below reorder · ${r.stock} ${r.unit}`,
      href: "/inventory/raw-material",
    }));

  const lowPackAlerts: OwnerAlertItem[] = data.PACKAGING.filter(
    (p) => p.status === "low" || p.status === "critical",
  )
    .slice(0, 4)
    .map((p, i) => ({
      key: p.code,
      microns: i >= 2,
      name: p.name.split(" · ")[0],
      meta: `${p.stock.toLocaleString()} left · reorder ${p.reorder.toLocaleString()}`,
      href: "/inventory/packaging",
    }));

  const spareAlerts: OwnerAlertItem[] = data.SPARE_PARTS.filter(
    (s) => s.status === "low" || s.status === "critical",
  )
    .slice(0, 3)
    .map((s, i) => ({
      key: s.code,
      microns: i === 2,
      name: s.name,
      meta:
        s.status === "critical"
          ? "Critical stock"
          : s.lastIssued
            ? `Last issued ${s.lastIssued}`
            : "Low stock",
      href: "/inventory/spare-parts",
    }));

  const vendorPriceAlerts = [
    { name: "Titanium Dioxide — Pigments & Fillers", change: "+8.2%", up: true, href: "/procurement/vendors" },
    { name: "HDPE Bags — Prime Pack Ltd", change: "+3.5%", up: true, href: "/procurement/vendors" },
    { name: "Calcium Carbonate — Minerals & Chem", change: "−2.1%", up: false, href: "/procurement/vendors" },
    { name: "Kaolin Clay — Minerals & Chemicals", change: "+5.0%", up: true, href: "/procurement/vendors" },
  ];

  const dispatchDueItems: OwnerDispatchItem[] = data.DISPATCHES.filter(
    (d) => d.status !== "delivered",
  )
    .slice(0, 5)
    .map((d) => ({
      key: d.id,
      label: `${d.customer} — ${d.loaded}`,
      microns: d.route.startsWith("Ahmedabad"),
      href: dispatchDetailHref(d.id),
    }));

  let dispatchOverdueItems: OwnerDispatchItem[] = data.ORDERS.filter(
    (o) => o.status !== "delivered" && o.status !== "dispatched",
  )
    .slice(0, 2)
    .map((o) => ({
      key: o.id,
      label: `${o.customer.split(" ")[0]} — ${o.qty} (due ${o.due})`,
      microns: false,
      href: orderDetailHref(o.id),
    }));

  if (dispatchOverdueItems.length === 0 && overdueCount > 0) {
    dispatchOverdueItems = [
      {
        key: "overdue",
        label: `${overdueCount} open order${overdueCount === 1 ? "" : "s"} past due`,
        microns: false,
        href: "/orders",
      },
    ];
  }

  const topCustomers = [...data.CUSTOMERS]
    .sort((a, b) => (Number(b.ytd) || 0) - (Number(a.ytd) || 0))
    .slice(0, 5)
    .map((c, i) => ({
      key: c.id,
      rank: i + 1,
      name: c.name,
      meta: formatInr(Math.round((Number(c.ytd) || 0) / 12)),
      href: "/customers",
    }));

  const topMaterials = SUPPLIED_MATERIAL_CATALOG.slice(0, 5).map((m, i) => ({
    key: m.id,
    rank: i + 1,
    name: m.name,
    meta: m.volumeMtd,
    href: "/inventory/raw-material",
  }));

  const operationalRisks: OwnerDashboardView["operationalRisks"] = [];
  if (rmLow > 0) {
    operationalRisks.push({
      key: "rm",
      sev: "high",
      icon: "box",
      title: "Raw material stock-out risk (Minerals)",
      desc: `${lowRmAlerts
        .slice(0, 3)
        .map((a) => a.name.split(" ")[0])
        .join(", ") || "Key RM items"} below reorder. If not ordered this week, paint-grade production may be impacted in 10–12 days.`,
      href: riskHref("box"),
    });
  }
  if (overdueCount > 0) {
    operationalRisks.push({
      key: "dispatch",
      sev: "high",
      icon: "truck",
      title: `${overdueCount} dispatch${overdueCount === 1 ? "" : "es"} overdue`,
      desc: "Open orders past due. Customer notified. Escalate if not shipped by EOD.",
      href: riskHref("truck"),
    });
  }
  operationalRisks.push({
    key: "vendor",
    sev: "med",
    icon: "money",
    title: "Vendor price increases",
    desc: "TiO₂ +8.2%, Kaolin +5%. Review margins on running orders and quotes for paint segment.",
    href: riskHref("money"),
  });
  if (spareLow > 0) {
    operationalRisks.push({
      key: "spare",
      sev: "med",
      icon: "wrench",
      title: "Spare parts lead time",
      desc: "Grinder blade set and belt assembly — order before 15 Mar to avoid unplanned downtime.",
      href: riskHref("wrench"),
    });
  }

  const companyTiles: OwnerCompanyTileData[] = [];
  if (data.COMPANIES[0]) {
    companyTiles.push({
      company: data.COMPANIES[0],
      accent: "primary",
      metrics: [
        { label: "Sales (MTD)", value: formatLakhs(rev.smi) },
        { label: "RM alerts", value: rmLow, tone: rmLow > 0 ? "warn" : "" },
        { label: "Dispatches today", value: String(mineralsDispatch.due) },
      ],
      footnote:
        "Minerals processing, paint & paper grades. 12 batches produced today.",
      href: "/inventory/raw-material",
    });
  }
  if (data.COMPANIES[1]) {
    companyTiles.push({
      company: data.COMPANIES[1],
      accent: "gold",
      metrics: [
        { label: "Sales (MTD)", value: formatLakhs(rev.smic) },
        {
          label: "Overdue",
          value: String(micronsDispatch.overdue),
          tone: micronsDispatch.overdue > 0 ? "danger" : "",
        },
        { label: "Dispatches today", value: String(micronsDispatch.due) },
      ],
      footnote:
        "Micronized fillers. 6 batches produced today. Switch company for detail.",
      href: "/inventory/packaging",
    });
  }

  const stats: OwnerStatCard[] = [
    {
      key: ownerStatKeyFromLabel("Combined sales (MTD)")!,
      label: "Combined sales (MTD)",
      value: formatLakhs(rev.total),
      tone: "accent",
      href: statCardHref("Combined sales (MTD)"),
    },
    {
      key: ownerStatKeyFromLabel("Gross margin")!,
      label: "Gross margin",
      value: revenueRupees > 0 ? `${grossMarginPct()}%` : "—",
      tone: "success",
      href: statCardHref("Gross margin"),
    },
    {
      key: ownerStatKeyFromLabel("Dispatches due today")!,
      label: "Dispatches due today",
      value: String(dispatchesDue),
      href: statCardHref("Dispatches due today"),
    },
    {
      key: ownerStatKeyFromLabel("Overdue")!,
      label: "Overdue",
      value: String(overdueCount),
      tone: overdueCount > 0 ? "danger" : "default",
      href: statCardHref("Overdue"),
    },
    {
      key: ownerStatKeyFromLabel("Vendor price alerts")!,
      label: "Vendor price alerts",
      value: String(vendorPriceAlerts.length),
      tone: "warning",
      href: statCardHref("Vendor price alerts"),
    },
    {
      key: ownerStatKeyFromLabel("Employees in field")!,
      label: "Employees in field",
      value: String(fieldCount),
      href: statCardHref("Employees in field"),
    },
  ];

  return {
    periodLabel: "May 2026",
    subtitle:
      "High-level view across both companies — alerts, dispatch, production, field & risks",
    companyTiles,
    stats,
    counts: {
      rmLow,
      packLow,
      spareLow,
      vendorPriceAlerts: vendorPriceAlerts.length,
      dispatchesDue,
      dispatchActiveCount: dispatchCounts.active,
      overdueCount,
      fieldCount,
    },
    lowRmAlerts: lowRmAlerts.length
      ? lowRmAlerts
      : [{ key: "none", microns: false, name: "No RM alerts", meta: "Stock healthy" }],
    lowPackAlerts: lowPackAlerts.length
      ? lowPackAlerts
      : [{ key: "none", microns: false, name: "No packaging alerts", meta: "—" }],
    spareAlerts: spareAlerts.length
      ? spareAlerts
      : [{ key: "none", microns: false, name: "No spare alerts", meta: "—" }],
    vendorPriceAlerts,
    dispatchDueItems,
    dispatchOverdueItems,
    production: {
      batchesCompleted: activeJobs + 12,
      mineralsBatches: 12,
      micronsBatches: 6,
      totalOutput: prodToday > 0 ? `~${prodToday} MT` : "—",
      footnote: "No line stoppages reported. Plan vs actual on track.",
      href: "/production",
    },
    fieldVisits,
    employeesInField,
    operationalRisks: operationalRisks.slice(0, 4),
    profit: {
      title: "This month (May 2026) — combined",
      revenue: formatLakhs(rev.total),
      cogs: cogs > 0 ? formatInr(cogs) : "—",
      grossProfit: grossProfit > 0 ? formatInr(grossProfit) : "—",
      grossMargin: revenueRupees > 0 ? `${grossMarginPct()}%` : "—",
      footnote: "Estimate. Final P&L at month close. Split by company in Reports.",
      href: "/reports",
    },
    topCustomers,
    topMaterials,
    criticalNotifs: data.NOTIFS.slice(0, 3).map((n) => ({
      ...n,
      href: n.target || "/hrms/notifications",
    })),
  };
}
