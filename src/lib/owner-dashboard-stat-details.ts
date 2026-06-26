import type { ErpData } from "@/lib/seed-data";
import {
  dispatchDeliveryCompletion,
  formatLakhs,
  grossMarginPct,
  grossProfitRupees,
  overdueOpenOrders,
  revenueLakhsFromSeries,
  revenueMtdRupees,
} from "@/lib/erp-stats";
import { getEmployeesInFieldFromPunches } from "@/lib/field-visit-service";
import { isDbConfigured } from "@/lib/mongodb";

function formatInr(n: number): string {
  if (n <= 0) return "—";
  return `₹${n.toLocaleString("en-IN")}`;
}

function dispatchStatusLabel(status: string): string {
  return status.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function dispatchRowTone(
  dispatch: ErpData["DISPATCHES"][number],
): OwnerStatDetailRow["tone"] {
  if (dispatch.status === "delivered") return "success";
  if (dispatch.status === "near-delivery" || dispatch.progress >= 90) return "success";
  if (dispatch.progress < 30 && dispatch.status !== "loading") return "danger";
  if (dispatch.status === "loading") return "warn";
  return "accent";
}

export const OWNER_STAT_KEYS = [
  "combined-sales",
  "gross-margin",
  "dispatches-due",
  "overdue",
  "vendor-price-alerts",
  "employees-in-field",
] as const;

export type OwnerStatKey = (typeof OWNER_STAT_KEYS)[number];

export type OwnerStatDetailRow = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  tone?: "default" | "warn" | "danger" | "success" | "accent";
  progressPct?: number;
};

export type OwnerDetailCompletion = {
  label: string;
  pct: number;
  completed: number;
  total: number;
  caption?: string;
};

export type OwnerStatDetailView = {
  key: OwnerStatKey;
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

const STAT_LABELS: Record<OwnerStatKey, string> = {
  "combined-sales": "Combined sales (MTD)",
  "gross-margin": "Gross margin",
  "dispatches-due": "Dispatches due today",
  overdue: "Overdue",
  "vendor-price-alerts": "Vendor price alerts",
  "employees-in-field": "Employees in field",
};

const LABEL_TO_KEY: Record<string, OwnerStatKey> = {
  "Combined sales (MTD)": "combined-sales",
  "Gross margin": "gross-margin",
  "Dispatches due today": "dispatches-due",
  Overdue: "overdue",
  "Vendor price alerts": "vendor-price-alerts",
  "Employees in field": "employees-in-field",
};

export function ownerStatKeyFromLabel(label: string): OwnerStatKey | undefined {
  return LABEL_TO_KEY[label];
}

export function isOwnerStatKey(value: string): value is OwnerStatKey {
  return (OWNER_STAT_KEYS as readonly string[]).includes(value);
}

function overdueOrderRows(orders: ErpData["ORDERS"]): OwnerStatDetailRow[] {
  const cutoff = new Date("2026-05-21");
  return orders
    .filter((o) => {
      if (o.status === "delivered" || o.status === "dispatched") return false;
      const due = new Date(`${o.due}, 2026`);
      return !Number.isNaN(due.getTime()) && due <= cutoff;
    })
    .slice(0, 20)
    .map((o) => ({
      id: o.id,
      title: o.customer,
      subtitle: `${o.qty} · due ${o.due}`,
      meta: o.status.replace(/-/g, " "),
      tone: "danger" as const,
    }));
}

export async function buildOwnerStatDetailView(
  key: OwnerStatKey,
  data: ErpData,
): Promise<OwnerStatDetailView> {
  const rev = revenueLakhsFromSeries(data.REVENUE_DATA);
  const revenueRupees = revenueMtdRupees(data.REVENUE_DATA);
  const grossProfit = grossProfitRupees(revenueRupees);
  const cogs = revenueRupees - grossProfit;
  const overdueCount = overdueOpenOrders(data.ORDERS);

  const vendorPriceAlerts = [
    { id: "vendor-tio2", name: "Titanium Dioxide — Pigments & Fillers", change: "+8.2%", up: true },
    { id: "vendor-hdpe", name: "HDPE Bags — Prime Pack Ltd", change: "+3.5%", up: true },
    { id: "vendor-cc", name: "Calcium Carbonate — Minerals & Chem", change: "−2.1%", up: false },
    { id: "vendor-kaolin", name: "Kaolin Clay — Minerals & Chemicals", change: "+5.0%", up: true },
  ];

  if (key === "combined-sales") {
    return {
      key,
      title: STAT_LABELS[key],
      summary: {
        label: "Group total (MTD)",
        value: formatLakhs(rev.total),
        tone: "accent",
      },
      rows: [
        {
          id: "smi",
          title: "Sudarshan Minerals & Industries",
          subtitle: "Udaipur plant",
          meta: formatLakhs(rev.smi),
          tone: "default",
        },
        {
          id: "smic",
          title: "Sudarshan Microns",
          subtitle: "Makrana / Ahmedabad",
          meta: formatLakhs(rev.smic),
          tone: "default",
        },
      ],
      footnote: "Revenue estimate from monthly series. Final numbers at month close.",
    };
  }

  if (key === "gross-margin") {
    return {
      key,
      title: STAT_LABELS[key],
      summary: {
        label: "Gross margin",
        value: revenueRupees > 0 ? `${grossMarginPct()}%` : "—",
        tone: "success",
      },
      rows: [
        {
          id: "revenue",
          title: "Revenue (MTD)",
          meta: formatLakhs(rev.total),
        },
        {
          id: "cogs",
          title: "COGS (est.)",
          meta: cogs > 0 ? formatInr(cogs) : "—",
        },
        {
          id: "gp",
          title: "Gross profit",
          meta: grossProfit > 0 ? formatInr(grossProfit) : "—",
          tone: "success",
        },
      ],
      footnote: "Estimate for both companies combined. See Reports for company split.",
    };
  }

  if (key === "dispatches-due") {
    const completion = dispatchDeliveryCompletion(data.DISPATCHES);
    const rows = data.DISPATCHES.map((d) => ({
      id: d.id,
      title: d.customer,
      subtitle: `${d.route} · ${dispatchStatusLabel(d.status)}`,
      meta: d.loaded,
      tone: dispatchRowTone(d),
      progressPct: d.progress,
    }));

    return {
      key,
      title: STAT_LABELS[key],
      summary: {
        label: "Dispatches today",
        value: String(completion.total),
        tone: "accent",
      },
      completion: {
        label: "Delivery completion",
        pct: completion.pct,
        completed: completion.completed,
        total: completion.total,
        caption:
          completion.total > 0
            ? `${completion.completed} delivered · ${completion.active} in progress`
            : "No dispatches on the board",
      },
      rows: rows.length
        ? rows
        : [
            {
              id: "none",
              title: "No dispatches due",
              subtitle: "All shipments delivered or none scheduled today",
            },
          ],
      footnote: "All dispatches from the live dispatch board. Tap a row for shipment details.",
    };
  }

  if (key === "overdue") {
    const rows = overdueOrderRows(data.ORDERS);
    return {
      key,
      title: STAT_LABELS[key],
      summary: {
        label: "Overdue open orders",
        value: String(overdueCount),
        tone: overdueCount > 0 ? "danger" : "default",
      },
      rows: rows.length
        ? rows
        : [
            {
              id: "none",
              title: "No overdue orders",
              subtitle: "Open order book is on schedule",
            },
          ],
      footnote: "Orders past due date that are not yet dispatched.",
    };
  }

  if (key === "vendor-price-alerts") {
    return {
      key,
      title: STAT_LABELS[key],
      summary: {
        label: "Price changes flagged",
        value: String(vendorPriceAlerts.length),
        tone: "warn",
      },
      rows: vendorPriceAlerts.map((item) => ({
        id: item.id,
        title: item.name,
        meta: item.change,
        tone: item.up ? "danger" : "success",
      })),
      footnote: "Review margin impact on running orders and quotes.",
    };
  }

  // employees-in-field
  let rows: OwnerStatDetailRow[] = [];
  if (isDbConfigured()) {
    try {
      const live = await getEmployeesInFieldFromPunches();
      rows = live.employees.map((e) => ({
        id: e.key,
        title: e.name,
        subtitle: e.role,
        tone: "accent" as const,
      }));
    } catch {
      rows = [];
    }
  }

  return {
    key,
    title: STAT_LABELS[key],
    summary: {
      label: "Currently in field",
      value: String(rows.length),
      tone: "accent",
    },
    rows: rows.length
      ? rows
      : [
          {
            id: "none",
            title: "No employees in field",
            subtitle: "Shows after mobile field punch-in with GPS (not punched out)",
          },
        ],
    footnote: "Live from attendance punches. Hidden after punch-out today.",
  };
}
