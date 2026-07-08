import type { ErpData } from "@/lib/seed-data";
import {
  computeVendorPriceAlerts,
  customerRevenueForMonth,
  dispatchStatusCounts,
  dispatchesForPlant,
  formatLakhs,
  grossMarginPct,
  grossProfitRupees,
  lowStockCount,
  overdueOpenOrders,
  overdueOrders,
  productionDayActual,
  productionPlantSplit,
  revenueLakhsFromSeries,
  revenueMtdRupees,
} from "@/lib/erp-stats";
import {
  getEmployeesInFieldFromPunches,
  getTodayFieldVisitsForOwner,
} from "@/lib/field-visit-service";
import { SUPPLIED_MATERIAL_CATALOG } from "@/lib/supplied-materials";
import { isDbConfigured } from "@/lib/mongodb";
import { listPackaging } from "@/lib/packaging-service";
import {
  buildOwnerStatDetailView,
  isOwnerStatKey,
  OWNER_STAT_KEYS,
  ownerStatKeyFromLabel,
  type OwnerDetailCompletion,
  type OwnerStatDetailRow,
  type OwnerStatKey,
} from "@/lib/owner-dashboard-stat-details";

export {
  OWNER_STAT_KEYS,
  ownerStatKeyFromLabel,
  isOwnerStatKey,
  type OwnerStatKey,
  type OwnerStatDetailRow,
};

export const OWNER_SECTION_KEYS = [
  "company-smi",
  "company-smic",
  "low-raw-material",
  "low-packaging",
  "spare-parts",
  "dispatch-summary",
  "production",
  "field-visits",
  "operational-risks",
  "profit-overview",
  "top-customers",
  "top-materials",
  "notifications",
] as const;

export type OwnerSectionKey = (typeof OWNER_SECTION_KEYS)[number];

export const OWNER_DETAIL_KEYS = [
  "combined-sales",
  "gross-margin",
  "dispatches-due",
  "overdue",
  "vendor-price-alerts",
  "employees-in-field",
  ...OWNER_SECTION_KEYS,
] as const;

export type OwnerDetailKey = (typeof OWNER_DETAIL_KEYS)[number];

export type OwnerDetailView = {
  key: OwnerDetailKey;
  title: string;
  summary: {
    label: string;
    value: string;
    tone?: "default" | "warn" | "danger" | "success" | "accent";
  };
  rows: OwnerStatDetailRow[];
  completion?: OwnerDetailCompletion;
  footnote?: string;
};

export function isOwnerDetailKey(value: string): value is OwnerDetailKey {
  return (OWNER_DETAIL_KEYS as readonly string[]).includes(value);
}

function formatInr(n: number): string {
  if (n <= 0) return "—";
  return `₹${n.toLocaleString("en-IN")}`;
}

function alertRows(
  items: Array<{ key: string; microns: boolean; name: string; meta: string }>,
  emptyTitle: string,
): OwnerStatDetailRow[] {
  if (!items.length || items[0]?.key === "none") {
    return [{ id: "none", title: emptyTitle, subtitle: "Stock levels are healthy" }];
  }
  return items.map((item) => ({
    id: item.key,
    title: item.name,
    subtitle: item.microns ? "Microns" : "Minerals",
    meta: item.meta,
    tone: item.meta.toLowerCase().includes("critical") ? "danger" : "warn",
  }));
}

export async function buildOwnerDetailView(
  key: OwnerDetailKey,
  data: ErpData,
  referenceDate: Date = new Date(),
): Promise<OwnerDetailView> {
  if (isOwnerStatKey(key)) {
    return (await buildOwnerStatDetailView(key, data, referenceDate)) as OwnerDetailView;
  }

  const rev = revenueLakhsFromSeries(data.REVENUE_DATA);
  const revenueRupees = revenueMtdRupees(data.REVENUE_DATA);
  const grossProfit = grossProfitRupees(revenueRupees);
  const cogs = revenueRupees - grossProfit;
  // Packaging lives in its own collection, not the bootstrap ErpData blob — load it directly.
  const packaging = isDbConfigured() ? await listPackaging() : data.PACKAGING;
  const rmLow = lowStockCount(data.RAW_MATERIALS);
  const packLow = lowStockCount(packaging);
  const spareLow = lowStockCount(data.SPARE_PARTS);
  const mineralsDispatch = dispatchesForPlant(data.DISPATCHES, "udaipur");
  const micronsDispatch = dispatchesForPlant(data.DISPATCHES, "ahmedabad");
  const dispatchCounts = dispatchStatusCounts(data.DISPATCHES);
  const prodToday = productionDayActual(data.PRODUCTION_DATA);
  const plantSplit = productionPlantSplit(data.ORDERS, data.COMPANIES);
  const mineralsJobs = plantSplit.byCompany[0]?.count ?? 0;
  const micronsJobs = plantSplit.byCompany[1]?.count ?? 0;
  const overdueCount = overdueOpenOrders(data.ORDERS, referenceDate);
  const vendorPriceAlerts = computeVendorPriceAlerts(data.PURCHASE_ORDERS);

  const lowRmAlerts = data.RAW_MATERIALS.filter(
    (r) => r.status === "low" || r.status === "critical",
  )
    .slice(0, 20)
    .map((r) => ({
      key: r.code,
      microns: false,
      name: r.name,
      meta:
        r.status === "critical"
          ? `Critical · ${r.stock} ${r.unit}`
          : `Below reorder · ${r.stock} ${r.unit}`,
    }));

  const lowPackAlerts = packaging
    .filter((p) => p.status === "low" || p.status === "critical")
    .slice(0, 20)
    .map((p) => ({
      key: p.code,
      // All packaging (FIBC/PP woven/BOPP) is produced by Sudarshan Microns.
      microns: true,
      name: p.name.split(" · ")[0],
      meta: `${p.stock.toLocaleString()} left · reorder ${p.reorder.toLocaleString()}`,
    }));

  const spareAlerts = data.SPARE_PARTS.filter(
    (s) => s.status === "low" || s.status === "critical",
  )
    .slice(0, 20)
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
    }));

  if (key === "company-smi" && data.COMPANIES[0]) {
    const company = data.COMPANIES[0];
    return {
      key,
      title: company.name,
      summary: { label: "Sales (MTD)", value: formatLakhs(rev.smi), tone: "accent" },
      rows: [
        { id: "plant", title: "Plant", meta: company.plant },
        {
          id: "rm",
          title: "RM alerts",
          meta: String(rmLow),
          tone: rmLow > 0 ? "warn" : "default",
        },
        {
          id: "dispatch",
          title: "Dispatches today",
          meta: String(mineralsDispatch.due),
          tone: "accent",
        },
      ],
      footnote: `Minerals processing, paint & paper grades. ${mineralsJobs} order${mineralsJobs === 1 ? "" : "s"} in production today.`,
    };
  }

  if (key === "company-smic" && data.COMPANIES[1]) {
    const company = data.COMPANIES[1];
    return {
      key,
      title: company.name,
      summary: { label: "Sales (MTD)", value: formatLakhs(rev.smic), tone: "accent" },
      rows: [
        { id: "plant", title: "Plant", meta: company.plant },
        {
          id: "overdue",
          title: "Overdue",
          meta: String(micronsDispatch.overdue),
          tone: micronsDispatch.overdue > 0 ? "danger" : "default",
        },
        {
          id: "dispatch",
          title: "Dispatches today",
          meta: String(micronsDispatch.due),
          tone: "accent",
        },
      ],
      footnote: `Micronized fillers. ${micronsJobs} order${micronsJobs === 1 ? "" : "s"} in production today. Switch company for detail.`,
    };
  }

  if (key === "low-raw-material") {
    return {
      key,
      title: "Low raw material alerts",
      summary: { label: "Items flagged", value: String(rmLow), tone: rmLow > 0 ? "warn" : "default" },
      rows: alertRows(lowRmAlerts, "No RM alerts"),
      footnote: "Below reorder or critical stock for raw materials.",
    };
  }

  if (key === "low-packaging") {
    return {
      key,
      title: "Low packaging alerts",
      summary: {
        label: "Items flagged",
        value: String(packLow),
        tone: packLow > 0 ? "warn" : "default",
      },
      rows: alertRows(lowPackAlerts, "No packaging alerts"),
      footnote: "Packaging stock below reorder levels.",
    };
  }

  if (key === "spare-parts") {
    return {
      key,
      title: "Spare parts alerts",
      summary: {
        label: "Items flagged",
        value: String(spareLow),
        tone: spareLow > 0 ? "warn" : "default",
      },
      rows: alertRows(spareAlerts, "No spare alerts"),
      footnote: "Spare parts requiring procurement attention.",
    };
  }

  if (key === "dispatch-summary") {
    const dueRows = data.DISPATCHES.filter((d) => d.status !== "delivered")
      .slice(0, 15)
      .map((d) => ({
        id: d.id,
        title: d.customer,
        subtitle: `Due · ${d.route}`,
        meta: d.loaded,
        tone: "accent" as const,
      }));
    const overdueRows = overdueOrders(data.ORDERS, referenceDate)
      .slice(0, 10)
      .map((o) => ({
        id: o.id,
        title: o.customer,
        subtitle: `Overdue · due ${o.due}`,
        meta: o.qty,
        tone: "danger" as const,
      }));
    const rows = [...dueRows, ...overdueRows];
    return {
      key,
      title: "Dispatch due & overdue",
      summary: {
        label: "Due / overdue",
        value: `${dispatchCounts.active} / ${overdueCount}`,
        tone: overdueCount > 0 ? "danger" : "accent",
      },
      rows: rows.length
        ? rows
        : [{ id: "none", title: "No dispatch issues", subtitle: "All shipments on track" }],
      footnote: "Active dispatches and open orders past due.",
    };
  }

  if (key === "production") {
    return {
      key,
      title: "Production overview",
      summary: {
        label: "Active production jobs today",
        value: String(plantSplit.total),
        tone: "accent",
      },
      rows: [
        { id: "minerals", title: "Minerals (Udaipur)", meta: `${mineralsJobs} order${mineralsJobs === 1 ? "" : "s"}` },
        { id: "microns", title: "Microns (Makrana)", meta: `${micronsJobs} order${micronsJobs === 1 ? "" : "s"}` },
        {
          id: "output",
          title: "Total output (est.)",
          meta: prodToday > 0 ? `~${prodToday} MT` : "—",
          tone: "success",
        },
        { id: "jobs", title: "Active production jobs", meta: String(plantSplit.total) },
      ],
      footnote: "No line stoppages reported. Plan vs actual on track.",
    };
  }

  if (key === "field-visits") {
    let rows: OwnerStatDetailRow[] = [];
    if (isDbConfigured()) {
      try {
        const visits = await getTodayFieldVisitsForOwner();
        rows = visits.map((v) => ({
          id: v.key,
          title: v.customer,
          subtitle: v.rep,
          tone: "accent" as const,
        }));
      } catch {
        rows = [];
      }
    }
    return {
      key,
      title: "Field sales / visits today",
      summary: { label: "Visits today", value: String(rows.length), tone: "accent" },
      rows: rows.length
        ? rows
        : [
            {
              id: "none",
              title: "No field visits today",
              subtitle: "Visits from Field Sales assignments appear here",
            },
          ],
      footnote: "Today's field visit assignments across both companies.",
    };
  }

  if (key === "operational-risks") {
    const risks: OwnerStatDetailRow[] = [];
    if (rmLow > 0) {
      risks.push({
        id: "rm",
        title: "Raw material stock-out risk (Minerals)",
        subtitle: `${rmLow} RM item(s) below reorder`,
        tone: "danger",
      });
    }
    if (overdueCount > 0) {
      risks.push({
        id: "dispatch",
        title: `${overdueCount} dispatch${overdueCount === 1 ? "" : "es"} overdue`,
        subtitle: "Open orders past due — escalate if not shipped by EOD",
        tone: "danger",
      });
    }
    if (vendorPriceAlerts.length > 0) {
      const risers = vendorPriceAlerts.filter((v) => v.up);
      risks.push({
        id: "vendor",
        title: "Vendor price increases",
        subtitle: `${(risers.length ? risers : vendorPriceAlerts)
          .slice(0, 2)
          .map((v) => `${v.name.split(" — ")[0]} ${v.change}`)
          .join(", ")} — review margins on running orders`,
        tone: "warn",
      });
    }
    if (spareLow > 0) {
      risks.push({
        id: "spare",
        title: "Spare parts lead time",
        subtitle: "Order critical spares before planned maintenance",
        tone: "warn",
      });
    }
    return {
      key,
      title: "Top operational risks",
      summary: { label: "Active risks", value: String(risks.length), tone: "warn" },
      rows: risks,
      footnote: "Prioritized risks requiring owner attention this week.",
    };
  }

  if (key === "profit-overview") {
    return {
      key,
      title: "Profit overview",
      summary: {
        label: "Est. gross margin",
        value: revenueRupees > 0 ? `${grossMarginPct()}%` : "—",
        tone: "success",
      },
      rows: [
        { id: "rev", title: "Revenue (MTD)", meta: formatLakhs(rev.total) },
        { id: "cogs", title: "COGS", meta: cogs > 0 ? formatInr(cogs) : "—" },
        {
          id: "gp",
          title: "Gross profit",
          meta: grossProfit > 0 ? formatInr(grossProfit) : "—",
          tone: "success",
        },
        {
          id: "margin",
          title: "Est. gross margin",
          meta: revenueRupees > 0 ? `${grossMarginPct()}%` : "—",
          tone: "success",
        },
      ],
      footnote: "Estimated margin (no cost data tracked yet). Final P&L at month close.",
    };
  }

  if (key === "top-customers") {
    const monthCustomers = data.CUSTOMERS.map((c) => ({
      customer: c,
      monthRupees: customerRevenueForMonth(data.ORDERS, c.name, referenceDate),
    }));
    const anyMonthSales = monthCustomers.some((c) => c.monthRupees > 0);
    const customers = (
      anyMonthSales
        ? [...monthCustomers].sort((a, b) => b.monthRupees - a.monthRupees)
        : [...monthCustomers].sort(
            (a, b) => (Number(b.customer.ytd) || 0) - (Number(a.customer.ytd) || 0),
          )
    ).slice(0, 10);
    return {
      key,
      title: "Top customers (MTD)",
      summary: { label: "Customers listed", value: String(customers.length), tone: "accent" },
      rows: customers.map(({ customer: c, monthRupees }, i) => ({
        id: c.id ?? `c-${i}`,
        title: c.name,
        meta: anyMonthSales
          ? formatInr(monthRupees)
          : `~${formatInr(Math.round((Number(c.ytd) || 0) / 12))}`,
        subtitle: c.city,
      })),
      footnote: anyMonthSales
        ? "Actual order value for the selected month."
        : "No dated orders this month — showing YTD run-rate instead.",
    };
  }

  if (key === "top-materials") {
    const materials = SUPPLIED_MATERIAL_CATALOG;
    return {
      key,
      title: "Top supplied materials (MTD)",
      summary: { label: "Materials tracked", value: String(materials.length), tone: "accent" },
      rows: materials.map((m) => ({
        id: m.id,
        title: m.name,
        meta: m.volumeMtd,
      })),
      footnote: "Volume supplied month-to-date across plants.",
    };
  }

  // notifications
  const notifs = data.NOTIFS.filter((n) => n.type === "alert").slice(0, 20);
  return {
    key,
    title: "Recent critical notifications",
    summary: { label: "Notifications", value: String(notifs.length), tone: "accent" },
    rows: notifs.length
      ? notifs.map((n) => ({
          id: String(n.id),
          title: n.text,
          subtitle: n.time,
          meta: n.type,
          tone: "danger" as const,
        }))
      : [{ id: "none", title: "No critical notifications", subtitle: "All clear" }],
    footnote: "Latest system alerts for leadership.",
  };
}
