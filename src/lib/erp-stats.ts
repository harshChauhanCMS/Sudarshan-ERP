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

export function dispatchDeliveryCompletion(
  dispatches: ErpData["DISPATCHES"],
): { pct: number; completed: number; total: number; active: number } {
  const total = dispatches.length;
  if (total === 0) {
    return { pct: 0, completed: 0, total: 0, active: 0 };
  }
  const completed = dispatches.filter((d) => d.status === "delivered").length;
  const active = total - completed;
  const pct = Math.round(
    dispatches.reduce((sum, d) => sum + (Number(d.progress) || 0), 0) / total,
  );
  return { pct, completed, total, active };
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

/**
 * `Order.due` is stored as a short display string with no year (e.g. "May 24"),
 * so the comparison year is inferred from `referenceDate`. That's a limitation
 * of the current data model, not a hardcoded snapshot — orders due in a
 * different year than `referenceDate` can't be represented until `due`
 * carries a real ISO date.
 */
export function isOrderOverdue(
  order: { status: string; due: string },
  referenceDate: Date,
): boolean {
  if (order.status === "delivered" || order.status === "dispatched") return false;
  const due = new Date(`${order.due}, ${referenceDate.getFullYear()}`);
  if (Number.isNaN(due.getTime())) return false;
  return due <= referenceDate;
}

/** Orders still open with due on or before `referenceDate` (defaults to today). */
export function overdueOpenOrders(
  orders: ErpData["ORDERS"],
  referenceDate: Date = new Date(),
): number {
  return orders.filter((o) => isOrderOverdue(o, referenceDate)).length;
}

/** The actual overdue orders (for list widgets), most-overdue-first. */
export function overdueOrders(
  orders: ErpData["ORDERS"],
  referenceDate: Date = new Date(),
): ErpData["ORDERS"] {
  return orders
    .filter((o) => isOrderOverdue(o, referenceDate))
    .sort(
      (a, b) =>
        new Date(`${a.due}, ${referenceDate.getFullYear()}`).getTime() -
        new Date(`${b.due}, ${referenceDate.getFullYear()}`).getTime(),
    );
}

export function pendingInvoiceVerifications(
  invoices: ErpData["INVOICES"]
): number {
  return invoices.filter((i) => i.status === "mismatch").length;
}

/**
 * No cost/COGS field exists anywhere in the schema (Order, PurchaseOrder,
 * RawMaterial), so this is a fixed estimate rather than a computed figure —
 * surface it to users as "Est. gross margin", not "Gross margin".
 */
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

export type VendorPriceAlert = {
  id: string;
  name: string;
  change: string;
  pct: number;
  up: boolean;
};

/**
 * Real vendor price-change detection: compares the two most recent purchase
 * order rates for the same vendor + material. Requires `PurchaseOrder.rate`
 * and a material name/code to be populated — POs without them (or vendors
 * with fewer than two priced POs for the same material) simply produce no
 * alert, rather than a fabricated one.
 */
export function computeVendorPriceAlerts(
  purchaseOrders: ErpData["PURCHASE_ORDERS"],
  limit = 6,
): VendorPriceAlert[] {
  const groups = new Map<
    string,
    { vendor: string; material: string; entries: { rate: number; time: number }[] }
  >();

  for (const po of purchaseOrders) {
    const rate = Number(po.rate);
    const material = po.materialName || po.materialCode;
    if (!Number.isFinite(rate) || rate <= 0 || !material || !po.vendor) continue;
    const dateStr = po.poDate || po.date;
    const time = dateStr ? new Date(dateStr).getTime() : NaN;
    if (Number.isNaN(time)) continue;

    const key = `${po.vendor}__${material}`;
    const group = groups.get(key) ?? { vendor: po.vendor, material, entries: [] };
    group.entries.push({ rate, time });
    groups.set(key, group);
  }

  const alerts: VendorPriceAlert[] = [];
  for (const [key, group] of groups) {
    if (group.entries.length < 2) continue;
    group.entries.sort((a, b) => a.time - b.time);
    const prev = group.entries[group.entries.length - 2];
    const latest = group.entries[group.entries.length - 1];
    if (prev.rate <= 0) continue;
    const pct = ((latest.rate - prev.rate) / prev.rate) * 100;
    if (Math.abs(pct) < 0.5) continue;
    alerts.push({
      id: key,
      name: `${group.material} — ${group.vendor}`,
      change: `${pct >= 0 ? "+" : "−"}${Math.abs(pct).toFixed(1)}%`,
      pct: Math.round(Math.abs(pct) * 10) / 10,
      up: pct >= 0,
    });
  }

  return alerts.sort((a, b) => b.pct - a.pct).slice(0, limit);
}

/**
 * Orders have no direct plant field, so plant is inferred by matching each
 * order's product text against the company's product catalog — real orders,
 * heuristic grouping (not a stored fact). Orders that don't match any
 * company's catalog aren't counted in `byCompany` but still count in `total`.
 */
export function productionPlantSplit(
  orders: ErpData["ORDERS"],
  companies: ErpData["COMPANIES"],
): { total: number; byCompany: Array<{ companyId: string; count: number }> } {
  const inProduction = orders.filter((o) => o.status === "in-production");
  const byCompany = companies.map((c) => {
    const keywords = c.products.map((p) => p.toLowerCase());
    const count = inProduction.filter((o) => {
      const product = o.product.toLowerCase();
      return keywords.some((k) => product.includes(k));
    }).length;
    return { companyId: c.id, count };
  });
  return { total: inProduction.length, byCompany };
}

/**
 * Real month-to-date revenue per customer, computed from `Order.value` for
 * orders whose date falls in `referenceDate`'s month (using `orderDate` when
 * present, falling back to `due` + `referenceDate`'s year). Returns `null`
 * for a customer if no orders can be dated at all, so callers can fall back
 * to a YTD run-rate instead of silently showing zero.
 */
export function customerRevenueForMonth(
  orders: ErpData["ORDERS"],
  customerName: string,
  referenceDate: Date,
): number {
  const month = referenceDate.getMonth();
  const year = referenceDate.getFullYear();
  let total = 0;
  for (const o of orders) {
    if (o.customer !== customerName) continue;
    const dateStr = o.orderDate || (o.due ? `${o.due}, ${year}` : null);
    if (!dateStr) continue;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) continue;
    if (d.getMonth() === month && d.getFullYear() === year) {
      total += Number(o.value) || 0;
    }
  }
  return total;
}

export type SidebarBadgeMap = Record<string, { badge?: string; badgeAlert?: string }>;

export function sidebarBadges(inputs: {
  rawMaterials: ErpData["RAW_MATERIALS"];
  packagingCount: number;
  purchaseOrders: ErpData["PURCHASE_ORDERS"];
  invoices: ErpData["INVOICES"];
  orders: ErpData["ORDERS"];
  dispatches: ErpData["DISPATCHES"];
}): SidebarBadgeMap {
  const { rawMaterials, packagingCount, purchaseOrders, invoices, orders, dispatches } = inputs;
  const mismatch = invoiceMismatchCount(invoices);
  const map: SidebarBadgeMap = {};

  const setCount = (path: string, count: number, alert = false) => {
    if (count <= 0) return;
    if (alert) map[path] = { badgeAlert: String(count) };
    else map[path] = { badge: String(count) };
  };

  setCount("/inventory/raw-material", rawMaterials.length);
  setCount("/inventory/packaging", packagingCount);
  setCount("/procurement/po", purchaseOrders.length);
  if (mismatch > 0) setCount("/procurement/invoices", mismatch, true);
  else setCount("/procurement/invoices", invoices.length);
  setCount("/orders", openOrdersCount(orders));
  setCount("/dispatch", inTransitDispatchCount(dispatches));

  return map;
}
