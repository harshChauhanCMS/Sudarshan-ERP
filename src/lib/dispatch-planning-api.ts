import type {
  AwaitingOrderView,
  DispatchDetailView,
  DispatchPlanningPayload,
  DispatchTrackView,
  PlannedDispatchView,
  PlanningStats,
  PlanStatus,
} from "@/lib/dispatch-planning-types";

export type DispatchPlanningOverview = {
  awaitingOrders: AwaitingOrderView[];
  stats: PlanningStats;
  plannedDispatches: PlannedDispatchView[];
  companyLabel: string;
  source: "mongodb" | "empty";
  dbConfigured: boolean;
  hasData: boolean;
};

export type DispatchPlanFormValues = {
  orderId: string;
  customer: string;
  sourceLocation: string;
  deliveryLocation: string;
  dispatchDate: string;
  quantity: string;
  vehicleReg: string;
  vehicleType: string;
  driverName: string;
  waRef: string;
  planStatus: PlanStatus;
  remarks: string;
};

async function parseApi<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data as T;
}

export async function fetchDispatchPlanning(): Promise<DispatchPlanningOverview> {
  const res = await fetch("/api/dispatch/planning", { cache: "no-store" });
  return parseApi<DispatchPlanningOverview>(res);
}

export async function fetchDispatchDetail(id: string): Promise<DispatchDetailView> {
  const res = await fetch(`/api/dispatch/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
  return parseApi<DispatchDetailView>(res);
}

export async function fetchDispatchTrack(token: string): Promise<DispatchTrackView> {
  const res = await fetch(`/api/dispatch/track/${encodeURIComponent(token)}`, {
    cache: "no-store",
  });
  return parseApi<DispatchTrackView>(res);
}

export async function shareDispatchTrackLocation(
  token: string,
  location: { lat: number; lng: number; accuracy?: number }
): Promise<{ dispatchId: string; lastLocation: DispatchTrackView["lastLocation"] }> {
  const res = await fetch(`/api/dispatch/track/${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ location }),
  });
  return parseApi(res);
}

export async function adminUpdateDispatchLocation(
  dispatchId: string,
  location: { lat: number; lng: number; accuracy?: number }
): Promise<{ dispatchId: string; lastLocation: DispatchDetailView["lastLocation"] }> {
  const res = await fetch(`/api/dispatch/${encodeURIComponent(dispatchId)}/location`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ location }),
  });
  return parseApi(res);
}

export async function createDispatchPlan(
  payload: DispatchPlanningPayload
): Promise<{ dispatch: { id: string }; orderId: string }> {
  const res = await fetch("/api/dispatch/plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseApi(res);
}

export const STATUS_LABELS: Record<PlanStatus, string> = {
  ready: "Ready",
  pack: "Packaging Pending",
  vehicle: "Vehicle Pending",
  delayed: "Delayed",
};

export type { PlanStatus, AwaitingOrderView, PlannedDispatchView, PlanningStats, DispatchDetailView, DispatchTrackView };

export function buildInitialFromOrder(order: AwaitingOrderView): DispatchPlanFormValues {
  return {
    orderId: order.id,
    customer: order.customerFull,
    sourceLocation: order.sourceLocation,
    deliveryLocation: order.deliveryLocation,
    dispatchDate: new Date().toISOString().slice(0, 10),
    quantity: String(order.qtyMt),
    vehicleReg: "",
    vehicleType: "32ft",
    driverName: "",
    waRef: "",
    planStatus: order.status,
    remarks: "",
  };
}

export function findAwaitingOrder(
  orders: AwaitingOrderView[],
  orderId: string | null | undefined
): AwaitingOrderView | null {
  if (!orderId) return orders[0] ?? null;
  return orders.find((o) => o.id === orderId) ?? orders[0] ?? null;
}
