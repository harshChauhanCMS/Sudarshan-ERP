import type { ErpData } from "@/lib/seed-data";
import {
  activeDispatches,
  activeProductionJobs,
  dispatchStatusCounts,
  dispatchesForPlant,
  fieldVisitsTodayCount,
  formatLakhs,
  grossMarginPct,
  grossProfitRupees,
  lowStockCount,
  overdueOpenOrders,
  productionDayActual,
  revenueLakhsFromSeries,
  revenueMtdRupees,
} from "@/lib/erp-stats";

function formatInr(n: number): string {
  if (n <= 0) return "—";
  return `₹${n.toLocaleString("en-IN")}`;
}

export type OwnerDashboardView = {
  periodLabel: string;
  subtitle: string;
  companies: Array<{
    id: string;
    name: string;
    plant: string;
    accent: "primary" | "gold";
    metrics: Array<{ label: string; value: string; tone?: "warn" | "danger" | "" }>;
    footnote: string;
  }>;
  stats: Array<{
    label: string;
    value: string;
    tone?: "accent" | "success" | "danger" | "warning" | "default";
  }>;
  lowRmAlerts: Array<{ key: string; company: "Minerals" | "Microns"; name: string; meta: string }>;
  lowPackAlerts: Array<{ key: string; company: "Minerals" | "Microns"; name: string; meta: string }>;
  spareAlerts: Array<{ key: string; company: "Minerals" | "Microns"; name: string; meta: string }>;
  vendorPriceAlerts: Array<{ name: string; change: string; up: boolean }>;
  dispatch: {
    dueCount: number;
    overdueCount: number;
    dueItems: Array<{ key: string; label: string; company: "Minerals" | "Microns" }>;
    overdueItems: Array<{ key: string; label: string; company: "Minerals" | "Microns" }>;
  };
  production: {
    batchesCompleted: number;
    mineralsBatches: number;
    micronsBatches: number;
    totalOutput: string;
    footnote: string;
  };
  fieldVisits: Array<{ key: string; customer: string; rep: string }>;
  employeesInField: Array<{ key: string; name: string; role: string; initials: string }>;
  operationalRisks: Array<{
    severity: "high" | "med";
    icon: string;
    title: string;
    description: string;
  }>;
  profit: {
    title: string;
    revenue: string;
    cogs: string;
    grossProfit: string;
    grossMargin: string;
    footnote: string;
  };
  topCustomers: Array<{ rank: number; name: string; meta: string }>;
  topMaterials: Array<{ rank: number; name: string; meta: string }>;
  criticalNotifs: Array<{ id: number; type: string; text: string }>;
};

export function buildOwnerDashboardView(data: ErpData): OwnerDashboardView {
  const rev = revenueLakhsFromSeries(data.REVENUE_DATA);
  const revenueRupees = revenueMtdRupees(data.REVENUE_DATA);
  const grossProfit = grossProfitRupees(revenueRupees);
  const cogs = revenueRupees - grossProfit;
  const attendance = data.ATTENDANCE_TODAY;
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
  const fieldCount = attendance.onField || fieldVisitsTodayCount(data.FIELD_VISITS);

  const lowRmAlerts = data.RAW_MATERIALS.filter(
    (r) => r.status === "low" || r.status === "critical",
  )
    .slice(0, 6)
    .map((r) => ({
      key: r.code,
      company: "Minerals" as const,
      name: r.name,
      meta:
        r.status === "critical"
          ? `Critical · ${r.stock} ${r.unit}`
          : `Below reorder · ${r.stock} ${r.unit}`,
    }));

  const lowPackAlerts = data.PACKAGING.filter(
    (p) => p.status === "low" || p.status === "critical",
  )
    .slice(0, 4)
    .map((p, i) => ({
      key: p.code,
      company: (i >= 2 ? "Microns" : "Minerals") as "Minerals" | "Microns",
      name: p.name.split(" · ")[0],
      meta: `${p.stock.toLocaleString()} left · reorder ${p.reorder.toLocaleString()}`,
    }));

  const spareAlerts = data.SPARE_PARTS.filter(
    (s) => s.status === "low" || s.status === "critical",
  )
    .slice(0, 3)
    .map((s, i) => ({
      key: s.code,
      company: (i === 2 ? "Microns" : "Minerals") as "Minerals" | "Microns",
      name: s.name,
      meta:
        s.status === "critical"
          ? "Critical stock"
          : s.lastIssued
            ? `Last issued ${s.lastIssued}`
            : "Low stock",
    }));

  const vendorPriceAlerts = [
    { name: "Titanium Dioxide — Pigments & Fillers", change: "+8.2%", up: true },
    { name: "HDPE Bags — Prime Pack Ltd", change: "+3.5%", up: true },
    { name: "Calcium Carbonate — Minerals & Chem", change: "−2.1%", up: false },
    { name: "Kaolin Clay — Minerals & Chemicals", change: "+5.0%", up: true },
  ];

  const dispatchDueItems = data.DISPATCHES.filter((d) => d.status !== "delivered")
    .slice(0, 5)
    .map((d) => ({
      key: d.id,
      label: `${d.customer} — ${d.loaded}`,
      company: (d.route.startsWith("Ahmedabad") ? "Microns" : "Minerals") as
        | "Minerals"
        | "Microns",
    }));

  let dispatchOverdueItems = data.ORDERS.filter(
    (o) => o.status !== "delivered" && o.status !== "dispatched",
  )
    .slice(0, 2)
    .map((o) => ({
      key: o.id,
      label: `${o.customer.split(" ")[0]} — ${o.qty} (due ${o.due})`,
      company: "Minerals" as const,
    }));

  if (dispatchOverdueItems.length === 0 && overdueCount > 0) {
    dispatchOverdueItems = [
      {
        key: "overdue",
        label: `${overdueCount} open order${overdueCount === 1 ? "" : "s"} past due`,
        company: "Minerals",
      },
    ];
  }

  const topCustomers = [...data.CUSTOMERS]
    .sort((a, b) => (Number(b.ytd) || 0) - (Number(a.ytd) || 0))
    .slice(0, 5)
    .map((c, i) => ({
      rank: i + 1,
      name: c.name,
      meta: formatInr(Math.round((Number(c.ytd) || 0) / 12)),
    }));

  const topMaterials = [
    { rank: 1, name: "Talc 400/500 Mesh", meta: "186 MT" },
    { rank: 2, name: "Calcium Carbonate 300M", meta: "142 MT" },
    { rank: 3, name: "Kaolin Clay 200M", meta: "98 MT" },
    { rank: 4, name: "Detergent Base Powder", meta: "75 MT" },
    { rank: 5, name: "Barytes 200 Mesh", meta: "62 MT" },
  ];

  const fieldVisits = data.FIELD_VISITS.slice(0, 5).map((v) => ({
    key: v.id,
    customer: `${v.customer.split(" ")[0]} — ${v.city}`,
    rep: `${v.rep.split(" ")[0]} ${v.rep.split(" ")[1]?.[0] ?? ""}.`.trim(),
  }));

  const salesEmployees = data.EMPLOYEES.filter((e) =>
    e.role.toLowerCase().includes("field sales"),
  ).slice(0, 2);
  const extraEmployees = [
    { name: "Sunita Meena", role: "Prod (Microns)" },
    { name: "Anita Patel", role: "Dispatch" },
    { name: "Rakesh Purohit", role: "Logistics" },
  ];
  const employeesInField = [
    ...salesEmployees.map((e) => ({
      key: e.id,
      name: e.name,
      role: e.role,
      initials: e.name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    })),
    ...extraEmployees.map((e, i) => ({
      key: `extra-${i}`,
      name: e.name,
      role: e.role,
      initials: e.name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    })),
  ].slice(0, 5);

  const operationalRisks: OwnerDashboardView["operationalRisks"] = [];
  if (rmLow > 0) {
    operationalRisks.push({
      severity: "high",
      icon: "box",
      title: "Raw material stock-out risk (Minerals)",
      description: `${lowRmAlerts
        .slice(0, 3)
        .map((a) => a.name.split(" ")[0])
        .join(", ") || "Key RM items"} below reorder. If not ordered this week, paint-grade production may be impacted in 10–12 days.`,
    });
  }
  if (overdueCount > 0) {
    operationalRisks.push({
      severity: "high",
      icon: "truck",
      title: `${overdueCount} dispatch${overdueCount === 1 ? "" : "es"} overdue`,
      description:
        "Open orders past due. Customer notified. Escalate if not shipped by EOD.",
    });
  }
  operationalRisks.push({
    severity: "med",
    icon: "money",
    title: "Vendor price increases",
    description:
      "TiO₂ +8.2%, Kaolin +5%. Review margins on running orders and quotes for paint segment.",
  });
  if (spareLow > 0) {
    operationalRisks.push({
      severity: "med",
      icon: "wrench",
      title: "Spare parts lead time",
      description:
        "Grinder blade set and belt assembly — order before 15 Mar to avoid unplanned downtime.",
    });
  }

  const companies: OwnerDashboardView["companies"] = [];
  if (data.COMPANIES[0]) {
    companies.push({
      id: data.COMPANIES[0].id,
      name: data.COMPANIES[0].name,
      plant: data.COMPANIES[0].plant?.split(",")[0] ?? data.COMPANIES[0].plant,
      accent: "primary",
      metrics: [
        { label: "Sales (MTD)", value: formatLakhs(rev.smi) },
        {
          label: "RM alerts",
          value: String(rmLow),
          tone: rmLow > 0 ? "warn" : "",
        },
        { label: "Dispatches today", value: String(mineralsDispatch.due) },
      ],
      footnote:
        "Minerals processing, paint & paper grades. 12 batches produced today.",
    });
  }
  if (data.COMPANIES[1]) {
    companies.push({
      id: data.COMPANIES[1].id,
      name: data.COMPANIES[1].name,
      plant: data.COMPANIES[1].plant?.split(",")[0] ?? data.COMPANIES[1].plant,
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
    });
  }

  return {
    periodLabel: "May 2026",
    subtitle:
      "High-level view across both companies — alerts, dispatch, production, field & risks",
    companies,
    stats: [
      {
        label: "Combined sales (MTD)",
        value: formatLakhs(rev.total),
        tone: "accent",
      },
      {
        label: "Gross margin",
        value: revenueRupees > 0 ? `${grossMarginPct()}%` : "—",
        tone: "success",
      },
      { label: "Dispatches due today", value: String(dispatchesDue) },
      {
        label: "Overdue",
        value: String(overdueCount),
        tone: overdueCount > 0 ? "danger" : "default",
      },
      { label: "Vendor price alerts", value: "4", tone: "warning" },
      { label: "Employees in field", value: String(fieldCount) },
    ],
    lowRmAlerts: lowRmAlerts.length
      ? lowRmAlerts
      : [{ key: "none", company: "Minerals", name: "No RM alerts", meta: "Stock healthy" }],
    lowPackAlerts: lowPackAlerts.length
      ? lowPackAlerts
      : [{ key: "none", company: "Minerals", name: "No packaging alerts", meta: "—" }],
    spareAlerts: spareAlerts.length
      ? spareAlerts
      : [{ key: "none", company: "Minerals", name: "No spare alerts", meta: "—" }],
    vendorPriceAlerts,
    dispatch: {
      dueCount: dispatchCounts.active,
      overdueCount,
      dueItems: dispatchDueItems,
      overdueItems: dispatchOverdueItems,
    },
    production: {
      batchesCompleted: activeJobs + 12,
      mineralsBatches: 12,
      micronsBatches: 6,
      totalOutput: prodToday > 0 ? `~${prodToday} MT` : "—",
      footnote: "No line stoppages reported. Plan vs actual on track.",
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
    },
    topCustomers,
    topMaterials,
    criticalNotifs: data.NOTIFS.slice(0, 3).map((n) => ({
      id: n.id,
      type: n.type,
      text: n.text,
    })),
  };
}
