import { randomUUID } from "crypto";
import {
  getEntityItems,
  loadErpDataFromDb,
  updateEntityItem,
} from "@/lib/db-entities";
import type { Dispatch, DispatchLocation } from "@/lib/entity-types";
import type { DispatchDetailView, DispatchTrackView, PlanStatus } from "@/lib/dispatch-planning-types";
import { enrichLocation } from "@/lib/reverse-geocode";
import { buildAppUrl } from "@/lib/app-url";
import { isDbConfigured } from "@/lib/mongodb";

export type DispatchCheckInPayload = {
  token: string;
  location: { lat: number; lng: number; accuracy?: number };
};

export type DispatchLocationPayload = {
  location: { lat: number; lng: number; accuracy?: number };
};

export type DispatchTrackingView = {
  id: string;
  vehicle: string;
  driver: string;
  customer: string;
  route: string;
  status: string;
  driverCheckedInAt?: string;
  lastLocation?: DispatchLocation;
};

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export function validateLocationInput(
  loc: unknown
): { value: { lat: number; lng: number; accuracy?: number } } | { error: string } {
  if (!loc || typeof loc !== "object") return { error: "location is required" };
  const raw = loc as Record<string, unknown>;
  if (!isFiniteNumber(raw.lat) || !isFiniteNumber(raw.lng)) {
    return { error: "location.lat and location.lng are required numbers" };
  }
  return {
    value: {
      lat: raw.lat,
      lng: raw.lng,
      accuracy: isFiniteNumber(raw.accuracy) ? raw.accuracy : undefined,
    },
  };
}

export function generateCheckInToken(): string {
  return randomUUID();
}

export function buildDispatchTrackPath(token: string): string {
  return `/dispatch/track/${encodeURIComponent(token)}`;
}

export function buildDispatchTrackUrl(token: string, origin = ""): string {
  const path = buildDispatchTrackPath(token);
  if (origin) {
    return `${origin.replace(/\/$/, "")}${path}`;
  }
  return buildAppUrl(path);
}

export function buildCheckInQrPayload(token: string, origin = ""): string {
  return buildDispatchTrackUrl(token, origin);
}

export function parseCheckInQrPayload(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const trackMatch = trimmed.match(/\/dispatch\/track\/([^/?#]+)/i);
  if (trackMatch?.[1]) {
    try {
      return decodeURIComponent(trackMatch[1]);
    } catch {
      return trackMatch[1];
    }
  }

  try {
    const parsed = JSON.parse(trimmed) as { token?: string; type?: string };
    if (parsed.type === "dispatch-check-in" && parsed.token) return parsed.token;
    if (parsed.token) return parsed.token;
  } catch {
    // plain token or URL fallback
  }

  if (/^https?:\/\//i.test(trimmed)) {
    const urlToken = trimmed.match(/\/dispatch\/track\/([^/?#]+)/i)?.[1];
    if (urlToken) {
      try {
        return decodeURIComponent(urlToken);
      } catch {
        return urlToken;
      }
    }
  }

  if (/^[0-9a-f-]{36}$/i.test(trimmed)) return trimmed;
  return trimmed.length >= 8 ? trimmed : null;
}

async function findDispatchByToken(token: string): Promise<Dispatch | null> {
  const items = await getEntityItems<Dispatch>("dispatches");
  return items.find((d) => d.checkInToken === token) ?? null;
}

async function findDispatchById(id: string): Promise<Dispatch | null> {
  const items = await getEntityItems<Dispatch>("dispatches");
  return items.find((d) => d.id === id) ?? null;
}

async function applyDispatchLocation(
  dispatch: Dispatch,
  locationInput: { lat: number; lng: number; accuracy?: number },
  options: { markCheckIn?: boolean } = {}
) {
  const enriched = await enrichLocation(locationInput);
  const now = new Date().toISOString();
  const lastLocation: DispatchLocation = {
    lat: enriched.lat,
    lng: enriched.lng,
    accuracy: enriched.accuracy,
    address: enriched.address,
    city: enriched.city,
    state: enriched.state,
    updatedAt: now,
  };

  const patch: Partial<Dispatch> = {
    lastLocation,
    lastUpdate: "just now",
    status:
      dispatch.status === "loading"
        ? "in-transit"
        : dispatch.status === "in-transit" && (dispatch.progress ?? 0) >= 85
          ? "near-delivery"
          : dispatch.status,
    progress: Math.min(
      99,
      Math.max(
        dispatch.progress ?? (options.markCheckIn ? 5 : 0),
        (dispatch.progress ?? (options.markCheckIn ? 5 : 0)) + (options.markCheckIn ? 0 : 1)
      )
    ),
  };

  if (options.markCheckIn && !dispatch.driverCheckedInAt) {
    patch.driverCheckedInAt = now;
    patch.progress = Math.max(dispatch.progress ?? 0, 5);
  }

  await updateEntityItem("dispatches", dispatch.id, patch as Record<string, unknown>, "id");
  return { dispatch: { ...dispatch, ...patch }, lastLocation };
}

export async function checkInDispatchDriver(
  token: string,
  locationInput: { lat: number; lng: number; accuracy?: number },
  user: { id?: string; email: string; name?: string; employeeId?: string }
) {
  if (!isDbConfigured()) throw new Error("Database not configured");

  const dispatch = await findDispatchByToken(token.trim());
  if (!dispatch) throw new Error("Invalid or expired dispatch QR code");
  if (!dispatch.vehicle || dispatch.vehicle === "—") {
    throw new Error("Vehicle is not assigned for this dispatch");
  }
  if (dispatch.status === "delivered" || dispatch.status === "cancelled") {
    throw new Error("This dispatch is no longer active");
  }

  const result = await applyDispatchLocation(dispatch, locationInput, { markCheckIn: true });
  const now = new Date().toISOString();
  const patch: Partial<Dispatch> = {
    driverUserId: user.id,
    driverUserEmail: user.email,
    driverEmployeeId: user.employeeId,
    driver: dispatch.driver && dispatch.driver !== "—" ? dispatch.driver : user.name ?? user.email,
    driverCheckedInAt: dispatch.driverCheckedInAt ?? now,
  };

  await updateEntityItem("dispatches", dispatch.id, patch as Record<string, unknown>, "id");
  return {
    dispatch: { ...result.dispatch, ...patch },
    lastLocation: result.lastLocation,
  };
}

export async function shareLocationFromTrackToken(
  token: string,
  locationInput: { lat: number; lng: number; accuracy?: number }
) {
  if (!isDbConfigured()) throw new Error("Database not configured");

  const dispatch = await findDispatchByToken(token.trim());
  if (!dispatch) throw new Error("Invalid dispatch tracking link");
  if (dispatch.status === "delivered" || dispatch.status === "cancelled") {
    throw new Error("This dispatch is no longer active");
  }

  return applyDispatchLocation(dispatch, locationInput, {
    markCheckIn: !dispatch.driverCheckedInAt,
  });
}

export async function adminUpdateDispatchLocation(
  dispatchId: string,
  locationInput: { lat: number; lng: number; accuracy?: number }
) {
  if (!isDbConfigured()) throw new Error("Database not configured");

  const dispatch = await findDispatchById(dispatchId);
  if (!dispatch) throw new Error("Dispatch not found");
  if (dispatch.status === "delivered" || dispatch.status === "cancelled") {
    throw new Error("This dispatch is no longer active");
  }

  return applyDispatchLocation(dispatch, locationInput, { markCheckIn: false });
}

export async function updateDispatchLocation(
  dispatchId: string,
  locationInput: { lat: number; lng: number; accuracy?: number },
  user: { email: string }
) {
  if (!isDbConfigured()) throw new Error("Database not configured");

  const dispatch = await findDispatchById(dispatchId);
  if (!dispatch) throw new Error("Dispatch not found");
  if (!dispatch.driverCheckedInAt) {
    throw new Error("Driver has not checked in for this dispatch");
  }
  if (
    dispatch.driverUserEmail &&
    dispatch.driverUserEmail.toLowerCase() !== user.email.toLowerCase()
  ) {
    throw new Error("Only the checked-in driver can update location");
  }
  if (dispatch.status === "delivered" || dispatch.status === "cancelled") {
    throw new Error("This dispatch is no longer active");
  }

  if (dispatch.status === "delivered" || dispatch.status === "cancelled") {
    throw new Error("This dispatch is no longer active");
  }

  return applyDispatchLocation(dispatch, locationInput, { markCheckIn: false });
}

function toDispatchTrackView(dispatch: Dispatch): DispatchTrackView {
  const vehicleAssigned = Boolean(dispatch.vehicle && dispatch.vehicle !== "—");
  const active = dispatch.status !== "delivered" && dispatch.status !== "cancelled";

  return {
    id: dispatch.id,
    vehicle: dispatch.vehicle,
    driver: dispatch.driver,
    customer: dispatch.customer,
    product: dispatch.product ?? "—",
    route: dispatch.route,
    sourceLocation: dispatch.sourceLocation ?? "—",
    deliveryLocation: dispatch.deliveryLocation ?? "—",
    loaded: dispatch.loaded,
    eta: dispatch.eta,
    status: dispatch.status,
    progress: dispatch.progress ?? 0,
    lastUpdate: dispatch.lastUpdate,
    driverCheckedInAt: dispatch.driverCheckedInAt,
    lastLocation: dispatch.lastLocation,
    vehicleAssigned,
    active,
  };
}

function toDispatchDetailView(dispatch: Dispatch, token: string): DispatchDetailView {
  const vehicleAssigned = Boolean(dispatch.vehicle && dispatch.vehicle !== "—");
  const trackingLive = Boolean(
    dispatch.driverCheckedInAt &&
      dispatch.lastLocation &&
      dispatch.status !== "delivered" &&
      dispatch.status !== "cancelled"
  );

  return {
    id: dispatch.id,
    orderId: dispatch.orderId ?? "—",
    customer: dispatch.customer,
    product: dispatch.product ?? "—",
    route: dispatch.route,
    sourceLocation: dispatch.sourceLocation ?? "—",
    deliveryLocation: dispatch.deliveryLocation ?? "—",
    loaded: dispatch.loaded,
    eta: dispatch.eta,
    vehicle: dispatch.vehicle,
    driver: dispatch.driver,
    planStatus:
      (dispatch.planStatus as PlanStatus) ??
      (vehicleAssigned ? "ready" : "vehicle"),
    status: dispatch.status,
    progress: dispatch.progress ?? 0,
    lastUpdate: dispatch.lastUpdate,
    plannedAt: dispatch.plannedAt ?? dispatch.lastUpdate,
    checkInToken: token,
    trackPath: buildDispatchTrackPath(token),
    trackUrl: buildDispatchTrackUrl(token),
    driverCheckedInAt: dispatch.driverCheckedInAt,
    lastLocation: dispatch.lastLocation,
    vehicleAssigned,
    trackingLive,
  };
}

export async function ensureDispatchCheckInToken(dispatchId: string): Promise<string> {
  if (!isDbConfigured()) throw new Error("Database not configured");

  const dispatch = await findDispatchById(dispatchId);
  if (!dispatch) throw new Error("Dispatch not found");

  if (dispatch.checkInToken) return dispatch.checkInToken;

  const token = generateCheckInToken();
  const now = new Date().toISOString();
  await updateEntityItem(
    "dispatches",
    dispatchId,
    { checkInToken: token, qrGeneratedAt: now } as Record<string, unknown>,
    "id"
  );
  return token;
}

export async function getDispatchDetail(id: string): Promise<DispatchDetailView | null> {
  if (!isDbConfigured()) return null;

  const dispatch = await findDispatchById(id);
  if (!dispatch) return null;

  const token = dispatch.checkInToken ?? (await ensureDispatchCheckInToken(id));
  return toDispatchDetailView({ ...dispatch, checkInToken: token }, token);
}

export async function getDispatchTrackByToken(token: string): Promise<DispatchTrackView | null> {
  if (!isDbConfigured()) return null;

  const dispatch = await findDispatchByToken(token.trim());
  if (!dispatch) return null;

  return toDispatchTrackView(dispatch);
}

export async function getActiveDispatchTracking(): Promise<DispatchTrackingView[]> {
  if (!isDbConfigured()) return [];
  const data = await loadErpDataFromDb();
  return data.DISPATCHES.filter(
    (d) =>
      d.driverCheckedInAt &&
      d.lastLocation &&
      d.status !== "delivered" &&
      d.status !== "cancelled"
  )
    .map((d) => ({
      id: d.id,
      vehicle: d.vehicle,
      driver: d.driver,
      customer: d.customer,
      route: d.route,
      status: d.status,
      driverCheckedInAt: d.driverCheckedInAt,
      lastLocation: d.lastLocation,
    }))
    .sort(
      (a, b) =>
        (b.lastLocation?.updatedAt ?? "").localeCompare(a.lastLocation?.updatedAt ?? "")
    );
}
