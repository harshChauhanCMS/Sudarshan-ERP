import { lowStockCount } from "@/lib/erp-stats";
import type { Dispatch, Order, Packaging } from "@/lib/entity-types";
import type { ErpData } from "@/lib/seed-data";
import type {
  CalendarPoint,
  CustomerDispatchRow,
  DelayReasonRow,
  DelayedAlertRow,
  DispatchDashboardOverview,
  DispatchSchedule,
  DispatchTone,
  DriverTrackingRow,
  PackagingBlockRow,
  PlantCount,
  PlantDueOverdue,
  ScheduleRow,
  VehicleAssignmentRow,
  VehicleTrackingRow,
} from "@/lib/dispatch-dashboard-types";

/** Default filter window when the caller passes no from/to: 3 back, 10 ahead. */
const DEFAULT_DAYS_BACK = 3;
const DEFAULT_DAYS_AHEAD = 10;
/** Past this many days the calendar has more bars than pixels. */
const MAX_RANGE_DAYS = 60;
/** Bar charts get unreadable past this many categories. */
const MAX_CHART_ROWS = 8;
/** Text lists are scroll-boxes in the UI; keep the payload bounded. */
const MAX_LIST_ROWS = 10;
/** Driver rows render un-scrolled, so this cap is what bounds the widget. */
const MAX_DRIVER_ROWS = 4;

const CLOSED_DISPATCH_STATUSES = new Set(["delivered", "cancelled"]);
const CLOSED_ORDER_STATUSES = new Set(["delivered", "dispatched"]);
const MOVING_STATUSES = new Set(["in-transit", "near-delivery"]);

// ---------------------------------------------------------------------------
// Dates
//
// The schema stores dates as display strings in several shapes: `Order.due` is
// "May 24" (no year), `Dispatch.eta` is "May 22, 11:30" for legacy rows but a
// plain "2026-07-30" for anything written by the plan form, and `plannedAt` is
// a full ISO timestamp. One tolerant parser handles all of them.
// ---------------------------------------------------------------------------

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;
const TRAILING_CLOCK = /,?\s*\d{1,2}:\d{2}\s*(AM|PM)?$/i;

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function parseFlexibleDate(value: string | undefined, referenceYear: number): Date | null {
  const raw = value?.trim();
  if (!raw) return null;

  const iso = raw.match(ISO_DATE);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }

  const withoutClock = raw.replace(TRAILING_CLOCK, "").trim();
  if (!withoutClock) return null;
  const candidate = /\b\d{4}\b/.test(withoutClock)
    ? withoutClock
    : `${withoutClock} ${referenceYear}`;
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? null : startOfDay(parsed);
}

function toIsoDay(date: Date): string {
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

function dayLabel(date: Date): string {
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** `SO-2026-0421` → 2026. Falls back to the reference year for ad-hoc ids. */
function orderYear(orderId: string, fallbackYear: number): number {
  const m = orderId.match(/-(\d{4})-/);
  return m ? Number(m[1]) : fallbackYear;
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export type DateRange = { from: Date; to: Date };

/**
 * The calendar's window. Fixed relative to today and never derived from the
 * schedule filter — narrowing the overdue/due list to a single day must not
 * collapse the calendar to a single bar.
 */
export function calendarWindow(now: Date): DateRange {
  const today = startOfDay(now);
  return {
    from: addDays(today, -DEFAULT_DAYS_BACK),
    to: addDays(today, DEFAULT_DAYS_AHEAD),
  };
}

/**
 * Strict `YYYY-MM-DD` parser for filter input. `parseFlexibleDate` is
 * deliberately lenient for the schema's display-string dates, but that
 * leniency is wrong here: `new Date("not-a-date 2026")` resolves to 1 Jan 2026
 * in V8, so garbage in a query string would silently become a real window
 * instead of falling back to the default. Round-tripping the parts also
 * rejects impossible days like 2026-02-31.
 */
function parseIsoDay(value: string | null | undefined): Date | null {
  const raw = value?.trim();
  if (!raw) return null;
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(year, month - 1, day);
  const roundTrips =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;
  return roundTrips ? date : null;
}

/**
 * Resolves the from/to filter. Unparseable or inverted input falls back to the
 * default window rather than erroring — this drives a dashboard, and a bad
 * query string should not blank the page. The span is capped so the calendar
 * can't be asked to draw hundreds of bars.
 */
export function resolveRange(
  now: Date,
  from?: string | null,
  to?: string | null
): DateRange {
  const today = startOfDay(now);
  const parsedFrom = parseIsoDay(from);
  const parsedTo = parseIsoDay(to);

  let start = parsedFrom ?? addDays(today, -DEFAULT_DAYS_BACK);
  let end = parsedTo ?? addDays(today, DEFAULT_DAYS_AHEAD);
  if (end.getTime() < start.getTime()) {
    start = addDays(today, -DEFAULT_DAYS_BACK);
    end = addDays(today, DEFAULT_DAYS_AHEAD);
  }
  if (daysBetween(start, end) > MAX_RANGE_DAYS) {
    end = addDays(start, MAX_RANGE_DAYS);
  }
  return { from: start, to: end };
}

// ---------------------------------------------------------------------------
// Plants
// ---------------------------------------------------------------------------

type PlantDef = { label: string; tokens: string[] };

/** Chart axis/legend labels must stay short or the widget grows a wrapped row. */
const MAX_PLANT_LABEL = 14;

/**
 * Company names share a group prefix ("Sudarshan Minerals…", "Sudarshan
 * Microns"), which is dead weight in a two-bar chart. Strip the word every
 * company starts with so the labels reduce to what actually distinguishes
 * them — "Minerals", "Microns".
 */
function commonLeadingWord(names: string[]): string {
  if (names.length < 2) return "";
  const first = names[0]?.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (!first) return "";
  const shared = names.every(
    (n) => n.trim().split(/\s+/)[0]?.toLowerCase() === first
  );
  return shared ? first : "";
}

function plantLabel(co: { name?: string; short?: string; plant?: string }, prefix: string): string {
  const name = co.name?.trim() ?? "";
  const words = name.split(/\s+/).filter(Boolean);
  const distinctive =
    prefix && words[0]?.toLowerCase() === prefix ? words[1] : words[0];
  const label =
    distinctive || co.short?.trim() || co.plant?.split(",")[0]?.trim() || "Plant";
  return label.length > MAX_PLANT_LABEL
    ? `${label.slice(0, MAX_PLANT_LABEL - 1)}…`
    : label;
}

/**
 * Plant buckets come from COMPANIES, never from hardcoded "Minerals"/"Microns"
 * labels. A dispatch is matched on its route/source text because that is the
 * only plant reference `Dispatch` carries — and the text differs by origin:
 * legacy rows read "Udaipur → Mumbai", plan-form rows read
 * "Sudarshan Minerals & Industries — Udaipur → …". Matching on city *and*
 * company name covers both.
 */
function buildPlants(data: ErpData): PlantDef[] {
  const companies = data.COMPANIES ?? [];
  if (companies.length === 0) return [{ label: "Plant", tokens: [] }];
  const prefix = commonLeadingWord(companies.map((co) => co.name ?? ""));
  return companies.map((co) => {
    const city = (co.plant ?? "").split(",")[0]?.trim() ?? "";
    return {
      label: plantLabel(co, prefix),
      tokens: [city, co.short, co.name]
        .filter((t): t is string => Boolean(t?.trim()))
        .map((t) => t.toLowerCase()),
    };
  });
}

/** Unmatched dispatches fall to the first company — the primary plant. */
function plantIndexFor(dispatch: Dispatch | undefined, plants: PlantDef[]): number {
  if (!dispatch) return 0;
  const haystack = `${dispatch.route ?? ""} ${dispatch.sourceLocation ?? ""}`.toLowerCase();
  const idx = plants.findIndex((p) => p.tokens.some((t) => haystack.includes(t)));
  return idx >= 0 ? idx : 0;
}

// ---------------------------------------------------------------------------
// Misc helpers
// ---------------------------------------------------------------------------

function parseMt(qty: string | undefined): number {
  const n = parseFloat((qty ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function shortCustomer(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length <= 2 ? name.trim() : `${parts[0]} ${parts[1]}`;
}

function hasVehicle(dispatch: Dispatch): boolean {
  const v = dispatch.vehicle?.trim();
  return Boolean(v && v !== "—" && v !== "-");
}

function isActiveDispatch(dispatch: Dispatch): boolean {
  return !CLOSED_DISPATCH_STATUSES.has(dispatch.status);
}

function packagingHealth(items: Packaging[]): { ok: boolean; note: string; names: string } {
  const low = items.filter((p) => p.status === "low" || p.status === "critical");
  if (low.length === 0) {
    return { ok: true, note: "Packaging stock available across all SKUs.", names: "" };
  }
  const names = low.map((p) => p.name).slice(0, 3).join(", ");
  return { ok: false, note: `Low packaging stock: ${names}.`, names };
}

// ---------------------------------------------------------------------------
// Unified outstanding work
//
// "Due today" and "overdue" must agree across six widgets, so both are derived
// from one list: every active dispatch, plus every open order that has no
// active dispatch yet (an order already planned is represented by its dispatch,
// not counted twice).
// ---------------------------------------------------------------------------

type DueItem = {
  key: string;
  dispatchId: string | null;
  orderId: string | null;
  customer: string;
  product: string;
  qty: string;
  mt: number;
  date: Date | null;
  plant: number;
  vehicle: string;
  driver: string;
  status: string;
  vehicleAssigned: boolean;
  progress: number;
  remarks: string;
};

function buildDueItems(
  dispatches: Dispatch[],
  orders: Order[],
  plants: PlantDef[],
  referenceYear: number
): DueItem[] {
  const activeDispatches = dispatches.filter(isActiveDispatch);
  const plannedOrderIds = new Set(
    activeDispatches.map((d) => d.orderId?.trim()).filter(Boolean) as string[]
  );

  const fromDispatches: DueItem[] = activeDispatches.map((d) => {
    const order = d.orderId ? orders.find((o) => o.id === d.orderId) : undefined;
    return {
      key: d.id,
      dispatchId: d.id,
      orderId: d.orderId ?? null,
      customer: d.customer,
      product: d.product ?? order?.product ?? "—",
      qty: d.loaded || order?.qty || "—",
      mt: parseMt(d.loaded) || parseMt(order?.qty),
      date:
        parseFlexibleDate(d.eta, referenceYear) ??
        parseFlexibleDate(d.plannedAt, referenceYear),
      plant: plantIndexFor(d, plants),
      vehicle: d.vehicle ?? "—",
      driver: d.driver ?? "—",
      status: d.status,
      vehicleAssigned: hasVehicle(d),
      progress: Number(d.progress) || 0,
      remarks: d.remarks?.trim() ?? "",
    };
  });

  const fromOrders: DueItem[] = orders
    .filter((o) => !CLOSED_ORDER_STATUSES.has(o.status) && !plannedOrderIds.has(o.id))
    .map((o) => ({
      key: o.id,
      dispatchId: null,
      orderId: o.id,
      customer: o.customer,
      product: o.product,
      qty: o.qty,
      mt: parseMt(o.qty),
      date: parseFlexibleDate(o.due, orderYear(o.id, referenceYear)),
      plant: 0,
      vehicle: "—",
      driver: "—",
      status: o.status,
      vehicleAssigned: false,
      progress: Number(o.progress) || 0,
      remarks: "",
    }));

  return [...fromDispatches, ...fromOrders];
}

// ---------------------------------------------------------------------------
// Section builders
// ---------------------------------------------------------------------------

function buildCalendar(items: DueItem[], range: DateRange): CalendarPoint[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (!item.date) continue;
    const key = toIsoDay(item.date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  // A window wider than a month repeats day-of-month numbers, so switch the
  // bar label to d/M once it can no longer be read unambiguously.
  const span = daysBetween(range.from, range.to);
  const points: CalendarPoint[] = [];
  for (let offset = 0; offset <= span; offset += 1) {
    const day = new Date(range.from);
    day.setDate(day.getDate() + offset);
    const key = toIsoDay(day);
    points.push({
      day:
        span <= 31
          ? String(day.getDate())
          : `${day.getDate()}/${day.getMonth() + 1}`,
      date: key,
      dispatches: counts.get(key) ?? 0,
    });
  }
  return points;
}

/**
 * The merged "Overdue & due orders" section: every outstanding item whose
 * scheduled day falls inside the filter window, overdue ones first. Replaces
 * the old pair of widgets, which showed the same items split by a fixed
 * today/before-today boundary with no way to look at another period.
 */
function buildSchedule(
  items: DueItem[],
  plants: PlantDef[],
  range: DateRange,
  today: Date
): DispatchSchedule {
  const inRange = items.filter(
    (i) =>
      i.date &&
      i.date.getTime() >= range.from.getTime() &&
      i.date.getTime() <= range.to.getTime()
  );

  const rows: ScheduleRow[] = [...inRange]
    .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0))
    .map((item) => {
      const date = item.date as Date;
      const overdue = date.getTime() < today.getTime();
      const daysLate = overdue ? daysBetween(date, today) : 0;
      const tail = item.vehicleAssigned
        ? `Vehicle ${item.vehicle} assigned.`
        : item.dispatchId
          ? "Awaiting vehicle assignment."
          : "Not yet planned.";
      return {
        id: item.dispatchId ?? item.orderId ?? item.key,
        dispatchId: item.dispatchId,
        orderId: item.orderId,
        kind: overdue ? ("overdue" as const) : ("due" as const),
        customer: item.customer,
        customerShort: shortCustomer(item.customer),
        product: item.product,
        qty: item.qty,
        mt: item.mt,
        date: toIsoDay(date),
        dateLabel: dayLabel(date),
        plant: plants[item.plant]?.label ?? "",
        daysLate,
        note: overdue ? `${daysLate}d late. ${tail}` : tail,
      };
    });

  const byCustomerTotals = new Map<string, number>();
  for (const row of rows) {
    byCustomerTotals.set(row.customer, (byCustomerTotals.get(row.customer) ?? 0) + row.mt);
  }
  const byCustomer = [...byCustomerTotals.entries()]
    .map(([customer, mt]) => ({
      customer,
      customerShort: shortCustomer(customer),
      mt: Math.round(mt * 100) / 100,
    }))
    .sort((a, b) => b.mt - a.mt)
    .slice(0, MAX_CHART_ROWS);

  return {
    from: toIsoDay(range.from),
    to: toIsoDay(range.to),
    matchCount: rows.length,
    overdueCount: rows.filter((r) => r.kind === "overdue").length,
    dueCount: rows.filter((r) => r.kind === "due").length,
    totalMt: Math.round(rows.reduce((sum, r) => sum + r.mt, 0) * 100) / 100,
    rows: rows.slice(0, MAX_LIST_ROWS),
    byCustomer,
  };
}

function buildPackagingBlocks(
  outstanding: DueItem[],
  packaging: { ok: boolean; names: string }
): PackagingBlockRow[] {
  if (packaging.ok) return [];
  return outstanding
    .filter((item) => item.progress < 70 && !item.vehicleAssigned)
    .slice(0, MAX_LIST_ROWS)
    .map((item) => ({
      id: item.dispatchId ?? item.orderId ?? item.key,
      dispatchId: item.dispatchId,
      orderId: item.orderId,
      customer: item.customer,
      text: `${item.customer} — ${item.qty} ${item.product}. Short on: ${packaging.names}`,
    }));
}

/**
 * There is no delay-reason field anywhere in the schema, so reasons are
 * inferred from observable state rather than recorded by a user. Every bucket
 * here is derivable — a "customer reschedule" bucket is deliberately absent
 * because nothing in the data could ever populate it.
 */
function buildDelayReasons(
  overdue: DueItem[],
  outstanding: DueItem[],
  packagingOk: boolean,
  today: Date
): DelayReasonRow[] {
  const enRoute = overdue.filter(
    (i) => i.vehicleAssigned && MOVING_STATUSES.has(i.status)
  ).length;
  const packagingShort = packagingOk
    ? 0
    : outstanding.filter((i) => i.progress < 70 && !i.vehicleAssigned).length;
  const loading = overdue.filter(
    (i) => i.status === "loading" && i.vehicleAssigned
  ).length;
  const awaitingVehicle = outstanding.filter(
    (i) => i.dispatchId && !i.vehicleAssigned && i.date && i.date <= today
  ).length;

  return [
    { reason: "Vehicle / en-route delay", count: enRoute },
    { reason: "Packaging shortage", count: packagingShort },
    { reason: "Loading delay", count: loading },
    { reason: "Awaiting vehicle", count: awaitingVehicle },
  ];
}

/** `.disp-dash-vehicles__badge` / `.disp-dash-track-dot` share this vocabulary. */
function dispatchTone(dispatch: Dispatch): DispatchTone {
  if (MOVING_STATUSES.has(dispatch.status)) return "transit";
  if (dispatch.status === "loading" && Number(dispatch.progress) === 0) return "ready";
  return "loading";
}

function toneLabel(tone: DispatchTone): string {
  if (tone === "transit") return "In transit";
  return tone === "ready" ? "Ready" : "Loading";
}

function trackingStatusLabel(dispatch: Dispatch): string {
  const who = dispatch.customer;
  switch (dispatch.status) {
    case "in-transit":
      return `In transit — ${who}${dispatch.eta ? ` (ETA ${dispatch.eta})` : ""}`;
    case "near-delivery":
      return `Near delivery — ${who}`;
    case "loading":
      return Number(dispatch.progress) > 0
        ? `Loading — ${who}`
        : `Ready at gate — ${who}`;
    default:
      return `${dispatch.status} — ${who}`;
  }
}

function buildVehicleTracking(active: Dispatch[]): VehicleTrackingRow[] {
  return active
    .filter(hasVehicle)
    .slice(0, MAX_LIST_ROWS)
    .map((d) => ({
      id: d.id,
      reg: d.vehicle,
      status: trackingStatusLabel(d),
    }));
}

function buildDriverTracking(active: Dispatch[]): DriverTrackingRow[] {
  return active
    .filter((d) => hasVehicle(d) && d.driver && d.driver !== "—")
    .slice(0, MAX_DRIVER_ROWS)
    .map((d) => {
      const loc = d.lastLocation;
      const where = loc?.address || loc?.city || d.route;
      const meta = loc
        ? `${where} · updated ${loc.updatedAt}`
        : d.driverCheckedInAt
          ? `Checked in ${d.driverCheckedInAt} · no GPS ping yet`
          : "No driver check-in yet";
      return {
        id: d.id,
        reg: d.vehicle,
        driver: d.driver,
        title: `${d.driver} — ${d.customer}`,
        meta,
        tone: dispatchTone(d),
      };
    });
}

function buildVehicleAssignments(active: Dispatch[]): VehicleAssignmentRow[] {
  return active
    .filter(hasVehicle)
    .slice(0, MAX_LIST_ROWS)
    .map((d) => {
      const tone = dispatchTone(d);
      const who = d.customer ? ` · ${d.customer}` : "";
      return {
        id: d.id,
        reg: d.vehicle,
        driver:
          d.driver && d.driver !== "—"
            ? `${d.driver}${who}`
            : `Driver not assigned${who}`,
        status: toneLabel(tone),
        tone,
      };
    });
}

function buildDelayedAlerts(overdue: DueItem[], today: Date): DelayedAlertRow[] {
  return overdue
    .filter((i) => i.dispatchId)
    .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0))
    .slice(0, 5)
    .map((item) => {
      const daysLate = item.date ? daysBetween(item.date, today) : 0;
      const detail =
        item.remarks ||
        (item.vehicleAssigned
          ? `Vehicle ${item.vehicle} en route, ${item.progress}% complete.`
          : "No vehicle assigned yet.");
      return {
        id: item.dispatchId as string,
        text: `${item.customer} (${item.qty} ${item.product}) — ${daysLate}d overdue. ${detail}`,
      };
    });
}

function buildCustomerSummary(orders: Order[]): CustomerDispatchRow[] {
  const byCustomer = new Map<string, CustomerDispatchRow>();
  for (const order of orders) {
    const mt = parseMt(order.qty);
    if (mt <= 0) continue;
    const row = byCustomer.get(order.customer) ?? {
      customer: order.customer,
      customerShort: shortCustomer(order.customer),
      mt: 0,
      dispatched: 0,
      pending: 0,
    };
    row.mt += mt;
    if (CLOSED_ORDER_STATUSES.has(order.status)) row.dispatched += mt;
    else row.pending += mt;
    byCustomer.set(order.customer, row);
  }
  return [...byCustomer.values()]
    .map((r) => ({
      ...r,
      mt: Math.round(r.mt * 100) / 100,
      dispatched: Math.round(r.dispatched * 100) / 100,
      pending: Math.round(r.pending * 100) / 100,
    }))
    .sort((a, b) => b.mt - a.mt)
    .slice(0, MAX_CHART_ROWS);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export type DispatchDashboardOptions = {
  now?: Date;
  /** ISO day (YYYY-MM-DD) bounds for the merged schedule section. */
  from?: string | null;
  to?: string | null;
};

/**
 * Pure builder — the route owns loading (Mongo vs seed vs empty) and passes the
 * snapshot in, mirroring `buildProductionDashboardView`.
 *
 * The from/to filter scopes the schedule section *only*. `stats` and the
 * calendar stay anchored to today: the KPI row answers "what is happening now"
 * and the calendar shows what is coming up, while the schedule section answers
 * "what falls in this window". Letting the filter move the others would make
 * "Overdue" mean something different depending on an unrelated control.
 */
export function buildDispatchDashboardView(
  data: ErpData,
  packagingItems: Packaging[],
  options: DispatchDashboardOptions = {}
): DispatchDashboardOverview {
  const now = options.now ?? new Date();
  const packaging = packagingHealth(packagingItems);

  const today = startOfDay(now);
  const range = resolveRange(now, options.from, options.to);
  const calendarRange = calendarWindow(now);
  const referenceYear = now.getFullYear();
  const plants = buildPlants(data);
  const dispatches = data.DISPATCHES as Dispatch[];
  const orders = data.ORDERS as Order[];
  const activeDispatches = dispatches.filter(isActiveDispatch);

  const items = buildDueItems(dispatches, orders, plants, referenceYear);
  const dueToday = items.filter(
    (i) => i.date && i.date.getTime() === today.getTime()
  );
  const overdue = items.filter((i) => i.date && i.date.getTime() < today.getTime());

  const dueTodayByPlant: PlantCount[] = plants.map((p, idx) => ({
    plant: p.label,
    count: dueToday.filter((i) => i.plant === idx).length,
  }));

  const companyDispatch: PlantDueOverdue[] = plants.map((p, idx) => ({
    plant: p.label,
    due: items.filter((i) => i.plant === idx).length,
    overdue: overdue.filter((i) => i.plant === idx).length,
  }));

  const inTransit = activeDispatches.filter((d) => MOVING_STATUSES.has(d.status)).length;
  const loading = activeDispatches.filter(
    (d) => d.status === "loading" && Number(d.progress) > 0
  ).length;
  const ready = activeDispatches.filter(
    (d) => d.status === "loading" && Number(d.progress) === 0 && hasVehicle(d)
  ).length;

  // A dispatch is "completed today" when its dispatch date is today and it is
  // delivered — `lastUpdate` is a relative string ("8 min ago") and cannot be
  // resolved to a calendar day.
  const completedToday = dispatches.filter((d) => {
    if (d.status !== "delivered") return false;
    const date = parseFlexibleDate(d.eta, referenceYear);
    return Boolean(date && date.getTime() === today.getTime());
  }).length;

  const hasData = items.length > 0 || dispatches.length > 0;

  return {
    stats: {
      dueToday: dueToday.length,
      overdue: overdue.length,
      vehiclesAssigned: activeDispatches.filter(hasVehicle).length,
      inTransit,
      packagingBlock: lowStockCount(packagingItems),
      completedToday,
    },
    dueTodayByPlant,
    companyDispatch,
    calendar: buildCalendar(items, calendarRange),
    calendarWindow: {
      from: toIsoDay(calendarRange.from),
      to: toIsoDay(calendarRange.to),
    },
    schedule: buildSchedule(items, plants, range, today),
    packagingBlocks: buildPackagingBlocks(items, packaging),
    delayReasons: buildDelayReasons(overdue, items, packaging.ok, today),
    trackingCounts: { loading, inTransit, ready },
    vehicleTracking: buildVehicleTracking(activeDispatches),
    driverTracking: buildDriverTracking(activeDispatches),
    delayedAlerts: buildDelayedAlerts(overdue, today),
    vehicleAssignments: buildVehicleAssignments(activeDispatches),
    customerSummary: buildCustomerSummary(orders),
    plantLabels: plants.map((p) => p.label),
    packagingNote: packaging.note,
    companyLabel: (() => {
      const co = data.COMPANIES[0];
      if (!co) return "";
      return `${co.name} — ${co.plant?.split(",")[0] ?? co.plant}`;
    })(),
    hasData,
    generatedAt: now.toISOString(),
  };
}
