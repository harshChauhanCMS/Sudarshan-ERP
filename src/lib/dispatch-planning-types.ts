export type PlanStatus = "ready" | "pack" | "vehicle" | "delayed";

export type AwaitingOrderView = {
  id: string;
  customer: string;
  customerFull: string;
  product: string;
  qty: string;
  qtyMt: number;
  requested: string;
  status: PlanStatus;
  sourceLocation: string;
  deliveryLocation: string;
  packagingOk: boolean;
  packagingNote: string;
};

export type PlanningStats = {
  ready: number;
  pack: number;
  vehicle: number;
  delayed: number;
};

export type PlannedDispatchView = {
  id: string;
  orderId: string;
  customer: string;
  product: string;
  route: string;
  loaded: string;
  eta: string;
  vehicle: string;
  driver: string;
  planStatus: PlanStatus;
  status: string;
  plannedAt: string;
};

export type DispatchDetailView = {
  id: string;
  orderId: string;
  customer: string;
  product: string;
  route: string;
  sourceLocation: string;
  deliveryLocation: string;
  loaded: string;
  eta: string;
  vehicle: string;
  driver: string;
  planStatus: PlanStatus;
  status: string;
  progress: number;
  lastUpdate: string;
  plannedAt: string;
  checkInToken: string;
  trackPath: string;
  trackUrl: string;
  driverCheckedInAt?: string;
  lastLocation?: {
    lat: number;
    lng: number;
    accuracy?: number;
    address?: string;
    city?: string;
    state?: string;
    updatedAt: string;
  };
  vehicleAssigned: boolean;
  trackingLive: boolean;
};

export type DispatchTrackView = {
  id: string;
  vehicle: string;
  driver: string;
  customer: string;
  product: string;
  route: string;
  sourceLocation: string;
  deliveryLocation: string;
  loaded: string;
  eta: string;
  status: string;
  progress: number;
  lastUpdate: string;
  driverCheckedInAt?: string;
  lastLocation?: {
    lat: number;
    lng: number;
    accuracy?: number;
    address?: string;
    city?: string;
    state?: string;
    updatedAt: string;
  };
  vehicleAssigned: boolean;
  active: boolean;
};

export type DispatchPlanningPayload = {
  orderId: string;
  sourceLocation: string;
  deliveryLocation: string;
  dispatchDate: string;
  quantity: string;
  vehicleReg?: string;
  vehicleType?: string;
  driverName?: string;
  waRef?: string;
  planStatus: PlanStatus;
  remarks?: string;
};
