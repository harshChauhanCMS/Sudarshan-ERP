import type { ErpData } from "@/lib/seed-data";

/** `REVENUE_DATA` series values are stored in lakhs (₹1L = 100,000). */
export function revenueLakhsFromSeries(revenueData: ErpData["REVENUE_DATA"]): {
  smi: number;
  smic: number;
  total: number;
} {
  if (revenueData.length === 0) return { smi: 0, smic: 0, total: 0 };
  const last = revenueData[revenueData.length - 1];
  const smi = Number(last.smi) || 0;
  const smic = Number(last.smic) || 0;
  return { smi, smic, total: smi + smic };
}

export function revenueMtdRupees(revenueData: ErpData["REVENUE_DATA"]): number {
  const { total } = revenueLakhsFromSeries(revenueData);
  return total * 100_000;
}

export function revenueMtdCr(revenueData: ErpData["REVENUE_DATA"]): string {
  const { total } = revenueLakhsFromSeries(revenueData);
  return (total / 100).toFixed(2);
}

export function formatCrFromLakhs(lakhs: number): string {
  return `₹${(lakhs / 100).toFixed(2)} Cr`;
}

export function openOrdersCount(orders: ErpData["ORDERS"]): number {
  return orders.filter((o) => o.status !== "delivered").length;
}

export function inTransitDispatchCount(dispatches: ErpData["DISPATCHES"]): number {
  return dispatches.filter((d) => d.status !== "delivered").length;
}

export function pendingPoCount(pos: ErpData["PURCHASE_ORDERS"]): number {
  return pos.filter((p) => p.status === "pending" || p.status === "approved").length;
}

export function invoiceMismatchCount(invoices: ErpData["INVOICES"]): number {
  return invoices.filter((i) => i.status === "mismatch").length;
}

export function orderBookRupees(orders: ErpData["ORDERS"]): number {
  return orders
    .filter((o) => o.status !== "delivered")
    .reduce((s, o) => s + (Number(o.value) || 0), 0);
}

export function productionUtilizationPct(
  productionData: ErpData["PRODUCTION_DATA"]
): number | null {
  if (productionData.length === 0) return null;
  const totals = productionData.reduce(
    (acc, d) => ({
      planned: acc.planned + (Number(d.planned) || 0),
      actual: acc.actual + (Number(d.actual) || 0),
    }),
    { planned: 0, actual: 0 }
  );
  if (totals.planned === 0) return null;
  return Math.round((totals.actual / totals.planned) * 100);
}

export function sparkFromSeries(values: number[], minPoints = 7): number[] {
  if (values.length === 0) return [];
  if (values.length >= minPoints) return values.slice(-minPoints);
  const pad = minPoints - values.length;
  const first = values[0] ?? 0;
  return [...Array(pad).fill(first), ...values];
}

export function revenueSpark(revenueData: ErpData["REVENUE_DATA"]): number[] {
  return sparkFromSeries(
    revenueData.map((r) => (Number(r.smi) || 0) + (Number(r.smic) || 0))
  );
}

/** Flat sparkline when only a current count is known (no time series). */
export function countSpark(count: number): number[] {
  return sparkFromSeries(count > 0 ? [count] : []);
}

export function formatLakhs(lakhs: number): string {
  if (lakhs <= 0) return "—";
  return `₹${lakhs.toFixed(1)} L`;
}

export function lowStockCount(items: { status?: string }[]): number {
  return items.filter((i) => i.status === "low" || i.status === "critical").length;
}

export function productionDayActual(
  productionData: ErpData["PRODUCTION_DATA"]
): number {
  if (productionData.length === 0) return 0;
  return Number(productionData[productionData.length - 1].actual) || 0;
}

export function productionWeekTotals(
  productionData: ErpData["PRODUCTION_DATA"]
): { planned: number; actual: number } {
  return productionData.reduce(
    (acc, d) => ({
      planned: acc.planned + (Number(d.planned) || 0),
      actual: acc.actual + (Number(d.actual) || 0),
    }),
    { planned: 0, actual: 0 }
  );
}

export function activeProductionJobs(orders: ErpData["ORDERS"]): number {
  return orders.filter((o) => o.status === "in-production").length;
}

export function activeDispatches(dispatches: ErpData["DISPATCHES"]): number {
  return dispatches.filter((d) => d.status !== "delivered").length;
}

export function dispatchStatusCounts(dispatches: ErpData["DISPATCHES"]): {
  inTransit: number;
  nearDelivery: number;
  loading: number;
  active: number;
} {
  let inTransit = 0;
  let nearDelivery = 0;
  let loading = 0;
  for (const d of dispatches) {
    if (d.status === "delivered") continue;
    if (d.status === "in-transit") inTransit += 1;
    else if (d.status === "near-delivery") nearDelivery += 1;
    else if (d.status === "loading") loading += 1;
  }
  return {
    inTransit,
    nearDelivery,
    loading,
    active: inTransit + nearDelivery + loading,
  };
}

/** Orders still open with due on or before the dashboard date (May 21). */
export function overdueOpenOrders(orders: ErpData["ORDERS"]): number {
  const cutoff = new Date("2026-05-21");
  return orders.filter((o) => {
    if (o.status === "delivered" || o.status === "dispatched") return false;
    const due = new Date(`${o.due}, 2026`);
    return !Number.isNaN(due.getTime()) && due <= cutoff;
  }).length;
}

export function pendingInvoiceVerifications(
  invoices: ErpData["INVOICES"]
): number {
  return invoices.filter((i) => i.status === "mismatch").length;
}

export function grossMarginPct(): number {
  return 28.4;
}

export function grossProfitRupees(revenueRupees: number): number {
  if (revenueRupees <= 0) return 0;
  return Math.round(revenueRupees * (grossMarginPct() / 100));
}

export function topCustomerNames(
  customers: ErpData["CUSTOMERS"],
  limit = 5
): string {
  if (customers.length === 0) return "—";
  return [...customers]
    .sort((a, b) => (Number(b.ytd) || 0) - (Number(a.ytd) || 0))
    .slice(0, limit)
    .map((c) => c.name.replace(/ Limited| Ltd| India Ltd/g, ""))
    .join(", ");
}

export function fieldVisitsTodayCount(
  visits: ErpData["FIELD_VISITS"]
): number {
  return visits.filter(
    (v) => v.ts.includes("AM") || v.status === "in-progress"
  ).length;
}

export function dispatchesForPlant(
  dispatches: ErpData["DISPATCHES"],
  plant: "udaipur" | "ahmedabad"
): { due: number; overdue: number; completed: number } {
  const match =
    plant === "udaipur"
      ? (route: string) => route.startsWith("Udaipur")
      : (route: string) => route.startsWith("Ahmedabad");
  let due = 0;
  let overdue = 0;
  let completed = 0;
  for (const d of dispatches) {
    if (!match(d.route)) continue;
    if (d.status === "delivered") completed += 1;
    else {
      due += 1;
      if (d.progress < 30 && d.status !== "loading") overdue += 1;
    }
  }
  return { due, overdue, completed };
}

export type SidebarBadgeMap = Record<string, { badge?: string; badgeAlert?: string }>;

export function sidebarBadges(data: ErpData): SidebarBadgeMap {
  const mismatch = invoiceMismatchCount(data.INVOICES);
  const map: SidebarBadgeMap = {};

  const setCount = (path: string, count: number, alert = false) => {
    if (count <= 0) return;
    if (alert) map[path] = { badgeAlert: String(count) };
    else map[path] = { badge: String(count) };
  };

  setCount("/inventory/raw-material", data.RAW_MATERIALS.length);
  setCount("/inventory/packaging", data.PACKAGING.length);
  setCount("/procurement/po", data.PURCHASE_ORDERS.length);
  if (mismatch > 0) setCount("/procurement/invoices", mismatch, true);
  else setCount("/procurement/invoices", data.INVOICES.length);
  setCount("/orders", openOrdersCount(data.ORDERS));
  setCount("/dispatch", inTransitDispatchCount(data.DISPATCHES));

  return map;
}
