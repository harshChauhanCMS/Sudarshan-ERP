import type { ErpData } from "@/lib/seed-data";
import type { Packaging } from "@/lib/entity-types";
import {
  activeProductionJobs,
  overdueOrders,
  productionDayActual,
  productionWeekTotals,
} from "@/lib/erp-stats";

/** Kept in sync with the plant options offered on /orders/add. */
export const PLANT_LABELS: Record<string, string> = {
  "PLANT-A": "Plant A — Grinding Unit 1",
  "PLANT-B": "Plant B — Grinding Unit 2",
  "PLANT-C": "Plant C — Blending",
};

function plantLabel(unit?: string): string {
  if (!unit) return "Unassigned";
  return PLANT_LABELS[unit] ?? unit;
}

export type ProductionDashboardView = {
  stats: {
    todayTargetMt: number;
    todayActualMt: number;
    targetPct: number;
    weekTargetMt: number;
    weekActualMt: number;
    activeJobsCount: number;
  };
  activeJobRows: Array<{ id: string; label: string; unit: string; priority: string }>;
  consumptionPending: Array<{ id: string; label: string }>;
  packagingRequired: Array<{
    type: string;
    required: number;
    available: number;
    status: "OK" | "Tight" | "Short";
    tone: "success" | "warning" | "danger";
  }>;
  unitUtilization: Array<{ unit: string; label: string; count: number; pct: number }>;
  rawMaterialAvailability: ErpData["RAW_MATERIALS"];
  sparePartsAtRisk: Array<{ machine: string; text: string }>;
  completedBatches: Array<{ id: string; product: string; qty: string; status: string }>;
  delayedTasks: Array<{ id: string; text: string }>;
  productionQueue: Array<{
    id: string;
    product: string;
    spec: string;
    qty: string;
    date: string;
    unit: string;
    status: string;
    priority: string;
  }>;
};

/** Sum of `bagsRequired` per packaging type, across orders still in the active pipeline. */
function bagsRequiredByPackaging(orders: ErpData["ORDERS"]): Map<string, number> {
  const active = orders.filter(
    (o) => o.status === "in-production" || o.status === "scheduled",
  );
  const map = new Map<string, number>();
  for (const o of active) {
    const key = o.packaging?.trim();
    const req = Number(o.bagsRequired) || 0;
    if (!key || !req) continue;
    map.set(key, (map.get(key) ?? 0) + req);
  }
  return map;
}

export function buildProductionDashboardView(
  data: ErpData,
  packaging: Packaging[],
): ProductionDashboardView {
  const week = productionWeekTotals(data.PRODUCTION_DATA);
  const last = data.PRODUCTION_DATA[data.PRODUCTION_DATA.length - 1];
  const todayTargetMt = Number(last?.planned) || 0;
  const todayActualMt = productionDayActual(data.PRODUCTION_DATA);
  const targetPct = todayTargetMt > 0 ? Math.round((todayActualMt / todayTargetMt) * 100) : 0;

  const activeOrders = data.ORDERS.filter((o) => o.status === "in-production");
  const activeJobsCount = activeProductionJobs(data.ORDERS);

  const activeJobRows = activeOrders.slice(0, 6).map((o) => ({
    id: o.id,
    label: `${o.product} (${o.qty})`,
    unit: plantLabel(o.assignedUnit),
    priority: o.priority || "normal",
  }));

  // Production finished (100%) but the order hasn't moved off "in-production" yet —
  // the closest real signal for "consumption not recorded" since there's no
  // dedicated consumption-entry tracking in the data model.
  const consumptionPending = data.ORDERS
    .filter((o) => o.status === "in-production" && o.progress >= 100)
    .slice(0, 6)
    .map((o) => ({ id: o.id, label: `${o.product} (${o.qty})` }));

  const reserved = bagsRequiredByPackaging(data.ORDERS);
  const packagingRequired: ProductionDashboardView["packagingRequired"] = [];
  for (const [type, required] of reserved) {
    const inv = packaging.find((p) => p.name === type || p.code === type);
    const available = inv?.stock ?? 0;
    const status: "OK" | "Tight" | "Short" =
      required > available ? "Short" : required > available * 0.8 ? "Tight" : "OK";
    packagingRequired.push({
      type,
      required,
      available,
      status,
      tone: status === "Short" ? "danger" : status === "Tight" ? "warning" : "success",
    });
  }

  const unitCounts = new Map<string, number>();
  for (const o of activeOrders) {
    const key = o.assignedUnit || "unassigned";
    unitCounts.set(key, (unitCounts.get(key) ?? 0) + 1);
  }
  const maxUnitCount = Math.max(1, ...unitCounts.values());
  const unitUtilization = [...unitCounts.entries()]
    .map(([unit, count]) => ({
      unit,
      label: unit === "unassigned" ? "Unassigned" : plantLabel(unit),
      count,
      pct: Math.round((count / maxUnitCount) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  const sparePartsAtRisk = data.SPARE_PARTS.filter(
    (p) => p.critical && (p.status === "low" || p.status === "critical"),
  )
    .slice(0, 5)
    .map((p) => ({
      machine: p.location?.split("·")[0]?.trim() || "Plant",
      text: `${p.name} (${p.code}) — ${p.status === "critical" ? "critical" : "low"} stock.`,
    }));

  // "Completed" proxy: order reached 100% progress but hasn't been marked delivered.
  const completedBatches = data.ORDERS
    .filter((o) => o.progress >= 100 && o.status !== "delivered")
    .slice(0, 8)
    .map((o) => ({ id: o.id, product: o.product, qty: o.qty, status: o.status }));

  const delayedTasks = overdueOrders(data.ORDERS, new Date())
    .filter((o) => o.status === "in-production" || o.status === "scheduled")
    .slice(0, 6)
    .map((o) => ({
      id: o.id,
      text: `${o.product} (${o.qty}). Due ${o.due} — past due, not yet dispatched.`,
    }));

  const productionQueue = data.ORDERS
    .filter((o) => o.status === "scheduled" || o.status === "in-production")
    .slice(0, 12)
    .map((o) => ({
      id: o.id,
      product: o.product,
      spec: o.grade || "—",
      qty: o.qty,
      date: o.due,
      unit: plantLabel(o.assignedUnit),
      status: o.status,
      priority: o.priority || "normal",
    }));

  return {
    stats: {
      todayTargetMt,
      todayActualMt,
      targetPct,
      weekTargetMt: week.planned,
      weekActualMt: week.actual,
      activeJobsCount,
    },
    activeJobRows,
    consumptionPending,
    packagingRequired,
    unitUtilization,
    rawMaterialAvailability: data.RAW_MATERIALS.slice(0, 7),
    sparePartsAtRisk,
    completedBatches,
    delayedTasks,
    productionQueue,
  };
}
