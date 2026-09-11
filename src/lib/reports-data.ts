import dayjs, { type Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import type {
  Dispatch,
  Invoice,
  Order,
  PurchaseOrder,
  Vendor,
} from "@/lib/entity-types";

dayjs.extend(customParseFormat);

/* ============================================================
   REPORTS DATA LAYER
   Pure roll-ups for the /reports page. Every figure here is derived
   from a stored record; anything with no source is reported as null
   so the UI can render "—" instead of inventing a number.
   ============================================================ */

/** Free-text date formats actually present in the stored records. */
const DATE_FORMATS = [
  "MMM D, YYYY",
  "MMM DD, YYYY",
  "YYYY-MM-DD",
  "DD/MM/YYYY",
  "DD-MM-YYYY",
];

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;
/** Trailing "11:30" / "18:30" on values like "May 22, 11:30". */
const TRAILING_CLOCK = /[,\s]+\d{1,2}:\d{2}\s*(am|pm)?$/i;
const HAS_YEAR = /\b\d{4}\b/;

/** `SO-2026-0421` / `PO-2026-0142` → 2026. Ids without a year segment yield null. */
export function yearFromId(id: unknown): number | null {
  const m = /-(\d{4})-/.exec(String(id ?? ""));
  if (!m) return null;
  const year = Number(m[1]);
  return year >= 1990 && year <= 2999 ? year : null;
}

/**
 * Dates across the ERP are free text: ISO ("2026-05-18"), long-form
 * ("May 18, 2026"), and — critically — year-less values carrying a clock
 * ("May 22, 11:30"). A year-less string is anchored to `referenceYear`;
 * without that anchor `new Date("May 22")` lands in 2001 and the record
 * silently drops out of every period filter.
 *
 * Mirrors `parseFlexibleDate` in dispatch-dashboard-data.ts.
 */
export function parseReportDate(
  value: unknown,
  referenceYear?: number,
): Dayjs | null {
  if (!value) return null;
  if (value instanceof Date) {
    const d = dayjs(value);
    return d.isValid() ? d : null;
  }
  const raw = String(value).trim();
  if (!raw) return null;

  if (ISO_DATE.test(raw)) {
    const d = dayjs(raw.slice(0, 10), "YYYY-MM-DD", true);
    if (d.isValid()) return d;
  }

  const strict = dayjs(raw, DATE_FORMATS, true);
  if (strict.isValid()) return strict;

  const withoutClock = raw.replace(TRAILING_CLOCK, "").trim();
  if (!withoutClock) return null;

  if (!HAS_YEAR.test(withoutClock)) {
    // Year-less — anchor it, or refuse rather than guess 2001.
    if (referenceYear == null) return null;
    // Strict formats only: `new Date("garbage 2026")` yields 1 Jan, which would
    // quietly pull unparseable text into January of every report.
    const anchored = dayjs(
      `${withoutClock.replace(/,/g, "")} ${referenceYear}`,
      ["MMM D YYYY", "MMMM D YYYY", "D MMM YYYY", "D MMMM YYYY"],
      true,
    );
    return anchored.isValid() ? anchored : null;
  }

  const loose = dayjs(new Date(withoutClock));
  return loose.isValid() ? loose : null;
}

export function isInMonth(
  value: unknown,
  period: Dayjs,
  referenceYear?: number,
): boolean {
  const d = parseReportDate(value, referenceYear ?? period.year());
  return !!d && d.isSame(period, "month");
}

/** Calendar year-to-date: 1 Jan of the period's year through the period's month end. */
export function isInYearToDate(
  value: unknown,
  period: Dayjs,
  referenceYear?: number,
): boolean {
  const d = parseReportDate(value, referenceYear ?? period.year());
  if (!d) return false;
  return d.isSame(period, "year") && !d.isAfter(period.endOf("month"));
}

/** Pulls a leading number out of free-text quantities like "24 MT" or "1,140 MT". */
export function parseQuantity(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const match = /-?[\d,]*\.?\d+/.exec(String(value));
  if (!match) return 0;
  const n = parseFloat(match[0].replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Product line = the part of an order's product name before the grade suffix,
 * e.g. "Talcum Powder · 600 mesh" → "Talcum Powder". This is the only grouping
 * key the order records actually carry.
 */
export function productLineOf(order: Order): string {
  const raw = (order.product ?? "").trim();
  if (!raw) return "Unspecified";
  return raw.split("·")[0].trim() || "Unspecified";
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/* ------------------------------------------------------------
   VENDOR PURCHASE
   ------------------------------------------------------------ */

export type VendorReportRow = {
  id: string;
  name: string;
  city: string;
  category: string;
  rating: number;
  /** POs raised against this vendor inside the selected month. */
  poMtd: number;
  spendMtd: number;
  /** 1 Jan of the selected year through the selected month end. */
  poYtd: number;
  spendYtd: number;
  invoicesMtd: number;
  /** Share of this vendor's invoices that reconciled against the PO, or null
   *  when they raised no invoices in the period. */
  invoiceMatchPct: number | null;
};

export type VendorReportResult = {
  rows: VendorReportRow[];
  kpis: {
    vendorsTransacting: number;
    poMtd: number;
    spendMtd: number;
    spendYtd: number;
    invoiceMatchPct: number | null;
  };
};

/** Matches a PO/invoice's free-text vendor label to a vendor record. The stored
 *  labels are abbreviated inconsistently ("Bharat Polychem" vs "Bharat Polychem
 *  Industries"), so fall back to a prefix match before giving up. */
function vendorKeyFor(label: string, vendors: Vendor[]): string | null {
  const raw = label.trim().toLowerCase();
  if (!raw) return null;
  const exact = vendors.find((v) => v.name.trim().toLowerCase() === raw);
  if (exact) return exact.id;
  const prefix = vendors.find((v) => {
    const name = v.name.trim().toLowerCase();
    return name.startsWith(raw) || raw.startsWith(name);
  });
  return prefix ? prefix.id : null;
}

export function buildVendorReport(
  vendors: Vendor[],
  purchaseOrders: PurchaseOrder[],
  invoices: Invoice[],
  period: Dayjs,
): VendorReportResult {
  const byVendor = new Map<string, VendorReportRow>();
  for (const v of vendors) {
    byVendor.set(v.id, {
      id: v.id,
      name: v.name,
      city: v.city,
      category: v.category,
      rating: v.rating,
      poMtd: 0,
      spendMtd: 0,
      poYtd: 0,
      spendYtd: 0,
      invoicesMtd: 0,
      invoiceMatchPct: null,
    });
  }

  for (const po of purchaseOrders) {
    const id = vendorKeyFor(po.vendor ?? "", vendors);
    if (!id) continue;
    const row = byVendor.get(id);
    if (!row) continue;
    // `poDate` is the structured field; `date` is the legacy display string.
    const when = po.poDate ?? po.date;
    const refYear = yearFromId(po.id) ?? period.year();
    const total = Number(po.total) || 0;
    if (isInYearToDate(when, period, refYear)) {
      row.poYtd += 1;
      row.spendYtd += total;
    }
    if (isInMonth(when, period, refYear)) {
      row.poMtd += 1;
      row.spendMtd += total;
    }
  }

  const matchTally = new Map<string, { matched: number; total: number }>();
  for (const inv of invoices) {
    const id = vendorKeyFor(inv.vendor ?? "", vendors);
    if (!id || !isInMonth(inv.invDate, period, yearFromId(inv.po) ?? period.year()))
      continue;
    const tally = matchTally.get(id) ?? { matched: 0, total: 0 };
    tally.total += 1;
    if (inv.status === "matched" || inv.status === "verified") tally.matched += 1;
    matchTally.set(id, tally);
  }
  for (const [id, tally] of matchTally) {
    const row = byVendor.get(id);
    if (!row) continue;
    row.invoicesMtd = tally.total;
    row.invoiceMatchPct = tally.total
      ? round1((tally.matched / tally.total) * 100)
      : null;
  }

  const rows = Array.from(byVendor.values()).sort(
    (a, b) => b.spendMtd - a.spendMtd || b.spendYtd - a.spendYtd,
  );

  const invTotals = Array.from(matchTally.values()).reduce(
    (acc, t) => ({ matched: acc.matched + t.matched, total: acc.total + t.total }),
    { matched: 0, total: 0 },
  );

  return {
    rows,
    kpis: {
      vendorsTransacting: rows.filter((r) => r.poMtd > 0).length,
      poMtd: rows.reduce((s, r) => s + r.poMtd, 0),
      spendMtd: rows.reduce((s, r) => s + r.spendMtd, 0),
      spendYtd: rows.reduce((s, r) => s + r.spendYtd, 0),
      invoiceMatchPct: invTotals.total
        ? round1((invTotals.matched / invTotals.total) * 100)
        : null,
    },
  };
}

/* ------------------------------------------------------------
   PROFIT ANALYSIS
   ------------------------------------------------------------ */

export type ProfitReportRow = {
  line: string;
  orders: number;
  qty: number;
  revenue: number;
  /** Revenue on orders that actually shipped, vs. merely booked. */
  dispatchedRevenue: number;
  avgRealisation: number | null;
  /** No bill of materials or standard-cost field exists, so per-line cost
   *  cannot be derived. Null rather than invented. */
  cogs: null;
};

export type ProfitReportResult = {
  rows: ProfitReportRow[];
  kpis: {
    revenue: number;
    dispatchedRevenue: number;
    orders: number;
    qty: number;
    avgRealisation: number | null;
  };
  /** Metrics the schema cannot support, surfaced in the UI. */
  unavailable: string[];
};

const SHIPPED_STATUSES = new Set(["dispatched", "delivered", "completed"]);

export function buildProfitReport(
  orders: Order[],
  period: Dayjs,
): ProfitReportResult {
  const inPeriod = orders.filter((o) =>
    isInMonth(o.orderDate ?? o.due, period, yearFromId(o.id) ?? period.year()),
  );
  const byLine = new Map<string, ProfitReportRow>();

  for (const o of inPeriod) {
    const line = productLineOf(o);
    const row =
      byLine.get(line) ??
      ({
        line,
        orders: 0,
        qty: 0,
        revenue: 0,
        dispatchedRevenue: 0,
        avgRealisation: null,
        cogs: null,
      } as ProfitReportRow);
    row.orders += 1;
    row.qty += o.quantity != null ? Number(o.quantity) || 0 : parseQuantity(o.qty);
    const value = Number(o.value) || 0;
    row.revenue += value;
    if (SHIPPED_STATUSES.has(o.status)) row.dispatchedRevenue += value;
    byLine.set(line, row);
  }

  const rows = Array.from(byLine.values())
    .map((r) => ({
      ...r,
      avgRealisation: r.qty > 0 ? Math.round(r.revenue / r.qty) : null,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const revenue = rows.reduce((s, r) => s + r.revenue, 0);
  const qty = rows.reduce((s, r) => s + r.qty, 0);

  return {
    rows,
    kpis: {
      revenue,
      dispatchedRevenue: rows.reduce((s, r) => s + r.dispatchedRevenue, 0),
      orders: rows.reduce((s, r) => s + r.orders, 0),
      qty,
      avgRealisation: qty > 0 ? Math.round(revenue / qty) : null,
    },
    unavailable: [
      "COGS, gross profit and gross margin need a bill of materials or a standard-cost field on the order — neither exists yet.",
    ],
  };
}

/* ------------------------------------------------------------
   PRODUCTION
   ------------------------------------------------------------ */

export type ProductionPoint = { day: string; planned: number; actual: number };

export type ProductionReportRow = {
  line: string;
  orders: number;
  qty: number;
  completedQty: number;
  /** Share of the line's ordered tonnage that reached a shipped status. */
  completionPct: number | null;
};

export type ProductionReportResult = {
  series: ProductionPoint[];
  rows: ProductionReportRow[];
  kpis: {
    planned: number;
    actual: number;
    attainmentPct: number | null;
    orderedQty: number;
    completedQty: number;
  };
  unavailable: string[];
};

export function buildProductionReport(
  productionData: ProductionPoint[],
  orders: Order[],
  period: Dayjs,
): ProductionReportResult {
  const series = (productionData ?? []).map((p) => ({
    day: p.day,
    planned: Number(p.planned) || 0,
    actual: Number(p.actual) || 0,
  }));
  const planned = series.reduce((s, p) => s + p.planned, 0);
  const actual = series.reduce((s, p) => s + p.actual, 0);

  const inPeriod = orders.filter((o) =>
    isInMonth(o.orderDate ?? o.due, period, yearFromId(o.id) ?? period.year()),
  );
  const byLine = new Map<string, ProductionReportRow>();
  for (const o of inPeriod) {
    const line = productLineOf(o);
    const row =
      byLine.get(line) ??
      ({ line, orders: 0, qty: 0, completedQty: 0, completionPct: null } as ProductionReportRow);
    const q = o.quantity != null ? Number(o.quantity) || 0 : parseQuantity(o.qty);
    row.orders += 1;
    row.qty += q;
    if (SHIPPED_STATUSES.has(o.status)) row.completedQty += q;
    byLine.set(line, row);
  }

  const rows = Array.from(byLine.values())
    .map((r) => ({
      ...r,
      completionPct: r.qty > 0 ? round1((r.completedQty / r.qty) * 100) : null,
    }))
    .sort((a, b) => b.qty - a.qty);

  const orderedQty = rows.reduce((s, r) => s + r.qty, 0);

  return {
    series,
    rows,
    kpis: {
      planned,
      actual,
      attainmentPct: planned > 0 ? round1((actual / planned) * 100) : null,
      orderedQty,
      completedQty: rows.reduce((s, r) => s + r.completedQty, 0),
    },
    unavailable: [
      "Yield, downtime hours and defect rate need a batch/shift production log — no such record is stored.",
    ],
  };
}

/* ------------------------------------------------------------
   DISPATCH
   ------------------------------------------------------------ */

export type DispatchReportRow = {
  route: string;
  trips: number;
  volume: number;
  delivered: number;
  inTransit: number;
  /** Share of this route's trips that reached a delivered status. */
  deliveredPct: number | null;
  avgProgress: number | null;
};

export type DispatchReportResult = {
  rows: DispatchReportRow[];
  kpis: {
    trips: number;
    volume: number;
    delivered: number;
    inTransit: number;
    deliveredPct: number | null;
    routes: number;
  };
  unavailable: string[];
};

const DELIVERED_STATUSES = new Set(["delivered", "completed"]);
const TRANSIT_STATUSES = new Set(["in-transit", "near-delivery", "loading", "dispatched"]);

export function buildDispatchReport(
  dispatches: Dispatch[],
  period: Dayjs,
): DispatchReportResult {
  // `plannedAt` is the structured timestamp; `eta` is the legacy display string.
  // DSP ids carry no year, so the selected period's year is the anchor.
  const inPeriod = dispatches.filter((d) =>
    isInMonth(d.plannedAt ?? d.eta, period),
  );

  const byRoute = new Map<string, DispatchReportRow & { progressSum: number }>();
  for (const d of inPeriod) {
    const route = (d.route ?? "").trim() || "Unspecified";
    const row =
      byRoute.get(route) ??
      {
        route,
        trips: 0,
        volume: 0,
        delivered: 0,
        inTransit: 0,
        deliveredPct: null,
        avgProgress: null,
        progressSum: 0,
      };
    row.trips += 1;
    row.volume += parseQuantity(d.loaded);
    row.progressSum += Number(d.progress) || 0;
    if (DELIVERED_STATUSES.has(d.status)) row.delivered += 1;
    else if (TRANSIT_STATUSES.has(d.status)) row.inTransit += 1;
    byRoute.set(route, row);
  }

  const rows = Array.from(byRoute.values())
    .map(({ progressSum, ...r }) => ({
      ...r,
      deliveredPct: r.trips > 0 ? round1((r.delivered / r.trips) * 100) : null,
      avgProgress: r.trips > 0 ? Math.round(progressSum / r.trips) : null,
    }))
    .sort((a, b) => b.trips - a.trips || b.volume - a.volume);

  const trips = rows.reduce((s, r) => s + r.trips, 0);
  const delivered = rows.reduce((s, r) => s + r.delivered, 0);

  return {
    rows,
    kpis: {
      trips,
      volume: round1(rows.reduce((s, r) => s + r.volume, 0)),
      delivered,
      inTransit: rows.reduce((s, r) => s + r.inTransit, 0),
      deliveredPct: trips > 0 ? round1((delivered / trips) * 100) : null,
      routes: rows.length,
    },
    unavailable: [
      "On-time %, actual lead time and freight cost per route need a delivery-completion timestamp and a freight amount on the dispatch — neither is recorded.",
    ],
  };
}

/* ------------------------------------------------------------
   INVENTORY (raw materials)
   ------------------------------------------------------------ */

export type InventoryReportRow = {
  code: string;
  name: string;
  unit: string;
  stock: number;
  stockValue: number;
  /** POs raised for this material in the trailing 12 months. */
  poCount: number;
  purchaseQty: number;
  purchaseValue: number;
  /** Pareto class on trailing-12-month purchase value; null when never purchased. */
  abcClass: "A" | "B" | "C" | null;
  /** Share of total purchase value this material accounts for. */
  purchaseSharePct: number | null;
  /** Purchase cadence, not floor movement — see `frequencyLabel`. */
  frequency: "high" | "medium" | "low" | null;
  /** Trailing-12-month purchase quantity, oldest month first, for a sparkline. */
  monthlyQty: number[];
  lastPurchasedAt: string | null;
};

export type InventoryReportResult = {
  rows: InventoryReportRow[];
  kpis: {
    stockValue: number;
    purchaseValue12m: number;
    materials: number;
    neverPurchased: number;
    /** Purchase value ÷ closing stock value. A turns proxy, not true turns,
     *  which needs consumption. */
    purchaseToStockRatio: number | null;
  };
  unavailable: string[];
};

const TRAILING_MONTHS = 12;

/**
 * Value attributable to one material on a PO. Purchase orders carry a single
 * `materialCode` but an `items` count that can exceed one, so `quantity * rate`
 * is preferred and `total` is only a fallback for single-line orders.
 */
function poMaterialValue(po: PurchaseOrder): number {
  const qty = Number(po.quantity) || 0;
  const rate = Number(po.rate) || 0;
  if (qty > 0 && rate > 0) return qty * rate;
  return (Number(po.items) || 1) <= 1 ? Number(po.total) || 0 : 0;
}

export function buildInventoryReport(
  rawMaterials: Array<{
    code: string;
    name: string;
    unit: string;
    stock: number;
    value: number;
  }>,
  purchaseOrders: PurchaseOrder[],
  period: Dayjs,
): InventoryReportResult {
  const windowEnd = period.endOf("month");
  const windowStart = windowEnd.subtract(TRAILING_MONTHS - 1, "month").startOf("month");
  const monthKeys: string[] = [];
  for (let i = 0; i < TRAILING_MONTHS; i += 1) {
    monthKeys.push(windowStart.add(i, "month").format("YYYY-MM"));
  }

  const rows = new Map<string, InventoryReportRow>();
  for (const m of rawMaterials) {
    rows.set(m.code, {
      code: m.code,
      name: m.name,
      unit: m.unit,
      stock: Number(m.stock) || 0,
      stockValue: Number(m.value) || 0,
      poCount: 0,
      purchaseQty: 0,
      purchaseValue: 0,
      abcClass: null,
      purchaseSharePct: null,
      frequency: null,
      monthlyQty: monthKeys.map(() => 0),
      lastPurchasedAt: null,
    });
  }

  for (const po of purchaseOrders) {
    const code = (po.materialCode ?? "").trim().toUpperCase();
    if (!code) continue; // PO not linked to a material — cannot be attributed
    const row = rows.get(code);
    if (!row) continue;
    const when = parseReportDate(
      po.poDate ?? po.date,
      yearFromId(po.id) ?? period.year(),
    );
    if (!when || when.isBefore(windowStart) || when.isAfter(windowEnd)) continue;

    row.poCount += 1;
    row.purchaseQty += Number(po.quantity) || 0;
    row.purchaseValue += poMaterialValue(po);

    const idx = monthKeys.indexOf(when.format("YYYY-MM"));
    if (idx >= 0) row.monthlyQty[idx] += Number(po.quantity) || 0;

    const iso = when.toISOString();
    if (!row.lastPurchasedAt || iso > row.lastPurchasedAt) row.lastPurchasedAt = iso;
  }

  const all = Array.from(rows.values());
  const totalPurchase = all.reduce((s, r) => s + r.purchaseValue, 0);

  // Pareto: rank by purchase value, then cut at 80% / 95% of cumulative value.
  const purchased = all
    .filter((r) => r.purchaseValue > 0)
    .sort((a, b) => b.purchaseValue - a.purchaseValue);
  let cumulative = 0;
  for (const row of purchased) {
    // Classify on cumulative value *before* this row, so the item that crosses
    // the 80% line is still an A. Testing after adding would grade a single
    // dominant material as B.
    const cumPctBefore = totalPurchase > 0 ? (cumulative / totalPurchase) * 100 : 0;
    row.abcClass = cumPctBefore < 80 ? "A" : cumPctBefore < 95 ? "B" : "C";
    row.purchaseSharePct = round1((row.purchaseValue / totalPurchase) * 100);
    cumulative += row.purchaseValue;
  }

  // Cadence over the trailing window — not floor movement. Set for every
  // material that was purchased, including ones whose value could not be
  // attributed to a single line.
  for (const row of all) {
    if (row.poCount === 0) continue;
    row.frequency = row.poCount >= 6 ? "high" : row.poCount >= 2 ? "medium" : "low";
  }

  const sorted = all.sort(
    (a, b) => b.purchaseValue - a.purchaseValue || b.stockValue - a.stockValue,
  );
  const stockValue = sorted.reduce((s, r) => s + r.stockValue, 0);

  return {
    rows: sorted,
    kpis: {
      stockValue,
      purchaseValue12m: totalPurchase,
      materials: sorted.length,
      neverPurchased: sorted.filter((r) => r.poCount === 0).length,
      purchaseToStockRatio:
        stockValue > 0 && totalPurchase > 0
          ? Math.round((totalPurchase / stockValue) * 10) / 10
          : null,
    },
    unavailable: [
      "True inventory turns, consumption value and ageing need a material issue/consumption ledger — only purchases are recorded, so ABC and frequency here are purchase-based proxies.",
    ],
  };
}
