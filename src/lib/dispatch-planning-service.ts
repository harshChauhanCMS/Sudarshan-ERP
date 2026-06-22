import {
  appendEntityItem,
  loadErpDataFromDb,
  updateEntityItem,
} from "@/lib/db-entities";
import type { Customer, Dispatch, Order } from "@/lib/entity-types";
import type {
  AwaitingOrderView,
  DispatchPlanningPayload,
  PlannedDispatchView,
  PlanStatus,
  PlanningStats,
} from "@/lib/dispatch-planning-types";
import { generateCheckInToken } from "@/lib/dispatch-check-in-service";
import { isDbConfigured } from "@/lib/mongodb";
import { type ErpData } from "@/lib/seed-data";
import { EMPTY_ERP_DATA } from "@/lib/empty-erp-data";
import { nextDispatchId } from "@/lib/id-generators";

async function loadErpSnapshot(): Promise<{
  data: ErpData;
  source: "mongodb" | "empty";
  dbConfigured: boolean;
}> {
  if (!isDbConfigured()) {
    return { data: EMPTY_ERP_DATA, source: "empty", dbConfigured: false };
  }
  const data = await loadErpDataFromDb();
  return { data, source: "mongodb", dbConfigured: true };
}

function getDispatches(data: ErpData): Dispatch[] {
  return data.DISPATCHES as Dispatch[];
}

function orderYear(orderId: string): number {
  const m = orderId.match(/^SO-(\d{4})-/);
  return m ? parseInt(m[1], 10) : new Date().getFullYear();
}

function parseQtyMt(qty: string): number {
  const n = parseFloat(qty.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function parseDueDate(due: string, year: number): Date | null {
  if (!due?.trim()) return null;
  const d = new Date(`${due.trim()} ${year}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isDueOverdue(due: string, orderId: string): boolean {
  const dueDate = parseDueDate(due, orderYear(orderId));
  if (!dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate < today;
}

function findCustomer(data: ErpData, customerName: string) {
  const customers = data.CUSTOMERS as Customer[];
  return customers.find(
    (c) =>
      c.name === customerName ||
      customerName.includes(c.name) ||
      c.name.includes(customerName.split(" ")[0] ?? "")
  );
}

function defaultSourceLocation(data: ErpData): string {
  const co = data.COMPANIES[0];
  if (!co) return "Minerals Plant — Udaipur, Loading Bay 2";
  const plant = co.plant?.split(",")[0] ?? co.plant ?? "Udaipur";
  return `${co.name} — ${plant}, Loading Bay 2`;
}

function packagingHealth(data: ErpData): { ok: boolean; note: string } {
  const low = data.PACKAGING.filter((p) => p.status === "low" || p.status === "critical");
  if (low.length === 0) {
    return { ok: true, note: "Ready — packaging stock available." };
  }
  const names = low.map((p) => p.name).slice(0, 2).join(", ");
  return {
    ok: false,
    note: `Awaiting bags — low stock: ${names}.`,
  };
}

function derivePlanStatus(
  order: Order,
  dispatchForOrder: Dispatch | undefined,
  packagingOk: boolean
): PlanStatus {
  if (isDueOverdue(order.due, order.id)) return "delayed";
  if (
    dispatchForOrder &&
    (!dispatchForOrder.vehicle || dispatchForOrder.vehicle === "—")
  ) {
    return "vehicle";
  }
  if (!packagingOk || order.progress < 70) return "pack";
  if (order.progress >= 70) return "ready";
  return "pack";
}

function isAwaitingOrder(order: Order, dispatches: Dispatch[]): boolean {
  if (order.status === "delivered" || order.status === "dispatched") return false;
  const planned = dispatches.find(
    (d) =>
      d.orderId === order.id &&
      d.status !== "delivered" &&
      d.status !== "cancelled"
  );
  if (planned && planned.vehicle && planned.vehicle !== "—") return false;
  return order.status === "scheduled" || order.status === "in-production";
}

export function buildAwaitingOrders(data: ErpData): AwaitingOrderView[] {
  const sourceLocation = defaultSourceLocation(data);
  const packaging = packagingHealth(data);

  const dispatches = getDispatches(data);

  return data.ORDERS.filter((order) => isAwaitingOrder(order, dispatches))
    .map((order) => {
      const customer = findCustomer(data, order.customer);
      const dispatchForOrder = dispatches.find((d) => d.orderId === order.id);
      const planStatus = derivePlanStatus(order, dispatchForOrder, packaging.ok);
      const customerFull = customer?.name ?? order.customer;
      const deliveryLocation = customer?.dispatchAddress
        ? customer.dispatchAddress
        : customer?.city
          ? `${customerFull}, ${customer.city}`
          : order.customer;

      return {
        id: order.id,
        customer: order.customer,
        customerFull,
        product: order.product,
        qty: order.qty,
        qtyMt: parseQtyMt(order.qty),
        requested: order.due,
        status: planStatus,
        sourceLocation: dispatchForOrder?.sourceLocation ?? sourceLocation,
        deliveryLocation: dispatchForOrder?.deliveryLocation ?? deliveryLocation,
        packagingOk: packaging.ok && order.progress >= 50,
        packagingNote:
          order.progress >= 70
            ? "Ready — production complete enough to load."
            : packaging.note,
      };
    })
    .sort((a, b) => a.requested.localeCompare(b.requested));
}

export function buildPlanningStats(orders: AwaitingOrderView[]): PlanningStats {
  return {
    ready: orders.filter((o) => o.status === "ready").length,
    pack: orders.filter((o) => o.status === "pack").length,
    vehicle: orders.filter((o) => o.status === "vehicle").length,
    delayed: orders.filter((o) => o.status === "delayed").length,
  };
}

export function buildPlannedDispatches(dispatches: Dispatch[]): PlannedDispatchView[] {
  return [...dispatches]
    .map((d) => ({
      id: d.id,
      orderId: d.orderId ?? "—",
      customer: d.customer,
      product: d.product ?? "—",
      route: d.route,
      loaded: d.loaded,
      eta: d.eta,
      vehicle: d.vehicle,
      driver: d.driver,
      planStatus:
        (d.planStatus as PlanStatus) ??
        (d.vehicle && d.vehicle !== "—" ? "ready" : "vehicle"),
      status: d.status,
      plannedAt: d.plannedAt ?? d.lastUpdate,
    }))
    .sort((a, b) => b.plannedAt.localeCompare(a.plannedAt));
}

export async function getDispatchPlanningOverview() {
  const { data, source, dbConfigured } = await loadErpSnapshot();
  const awaitingOrders = buildAwaitingOrders(data);
  const plannedDispatches = buildPlannedDispatches(getDispatches(data));
  const hasData = awaitingOrders.length > 0 || plannedDispatches.length > 0;

  return {
    awaitingOrders,
    stats: buildPlanningStats(awaitingOrders),
    plannedDispatches,
    companyLabel: (() => {
      const co = data.COMPANIES[0];
      if (!co) return "";
      return `${co.name} — ${co.plant?.split(",")[0] ?? co.plant}`;
    })(),
    source,
    dbConfigured,
    hasData,
  };
}

export async function createDispatchPlan(payload: DispatchPlanningPayload) {
  if (!isDbConfigured()) {
    throw new Error("Database not configured");
  }

  const data = await loadErpDataFromDb();
  const dispatches = getDispatches(data);
  const order = data.ORDERS.find((o) => o.id === payload.orderId);
  if (!order) throw new Error("Order not found");

  const existing = dispatches.find(
    (d) =>
      d.orderId === payload.orderId &&
      d.status !== "delivered" &&
      d.status !== "cancelled"
  );
  if (existing && existing.vehicle && existing.vehicle !== "—") {
    throw new Error(`Order ${payload.orderId} already has an active dispatch plan`);
  }

  if (!payload.deliveryLocation?.trim()) {
    throw new Error("Delivery location is required");
  }

  const route = `${payload.sourceLocation.split(",")[0] ?? "Plant"} → ${payload.deliveryLocation.split(",")[0] ?? "Customer"}`;
  const now = new Date().toISOString();
  const hasVehicle = Boolean(payload.vehicleReg?.trim());

  if (existing) {
    const patch: Partial<Dispatch> = {
      vehicle: payload.vehicleReg?.trim() || "—",
      driver: payload.driverName?.trim() || "—",
      route,
      loaded: `${payload.quantity} MT`,
      eta: payload.dispatchDate,
      planStatus: payload.planStatus,
      lastUpdate: "just now",
      sourceLocation: payload.sourceLocation,
      deliveryLocation: payload.deliveryLocation,
      vehicleType: payload.vehicleType,
      waRef: payload.waRef,
      remarks: payload.remarks,
      status: hasVehicle ? "loading" : existing.status,
    };
    if (hasVehicle && !existing.checkInToken) {
      patch.checkInToken = generateCheckInToken();
      patch.qrGeneratedAt = now;
    }
    await updateEntityItem(
      "dispatches",
      existing.id,
      patch as Record<string, unknown>,
      "id"
    );
    const dispatch = { ...existing, ...patch };
    const nextOrderStatus =
      payload.planStatus === "vehicle" || !hasVehicle ? order.status : "dispatched";
    if (nextOrderStatus !== order.status) {
      await updateEntityItem(
        "orders",
        order.id,
        { status: nextOrderStatus, dispatchDate: payload.dispatchDate },
        "id"
      );
    }
    return { dispatch, orderId: order.id };
  }

  const dispatchId = nextDispatchId(dispatches);

  const dispatch: Dispatch = {
    id: dispatchId,
    orderId: payload.orderId,
    vehicle: payload.vehicleReg?.trim() || "—",
    driver: payload.driverName?.trim() || "—",
    customer: order.customer,
    product: order.product,
    route,
    loaded: `${payload.quantity} MT`,
    eta: payload.dispatchDate,
    progress: 0,
    status: hasVehicle ? "loading" : "loading",
    planStatus: payload.planStatus,
    lastUpdate: "just now",
    plannedAt: now,
    sourceLocation: payload.sourceLocation,
    deliveryLocation: payload.deliveryLocation,
    vehicleType: payload.vehicleType,
    waRef: payload.waRef,
    remarks: payload.remarks,
    ...(hasVehicle
      ? { checkInToken: generateCheckInToken(), qrGeneratedAt: now }
      : {}),
  };

  await appendEntityItem("dispatches", dispatch as unknown as Record<string, unknown>);

  const nextOrderStatus =
    payload.planStatus === "vehicle" || !hasVehicle ? order.status : "dispatched";

  if (nextOrderStatus !== order.status) {
    await updateEntityItem(
      "orders",
      order.id,
      { status: nextOrderStatus, dispatchDate: payload.dispatchDate },
      "id"
    );
  }

  return { dispatch, orderId: order.id };
}
