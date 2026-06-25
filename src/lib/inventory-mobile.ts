import type { Packaging, RawMaterial, SparePart } from "@/lib/entity-types";
import type { ErpData } from "@/lib/seed-data";

export const INVENTORY_KINDS = [
  "raw-material",
  "packaging",
  "spare-part",
] as const;

export type InventoryKind = (typeof INVENTORY_KINDS)[number];

export function isInventoryKind(value: string): value is InventoryKind {
  return (INVENTORY_KINDS as readonly string[]).includes(value);
}

export type InventoryDetailField = {
  label: string;
  value: string;
  tone?: "default" | "warn" | "danger" | "success" | "accent";
};

export type InventoryItemDetailView = {
  kind: InventoryKind;
  code: string;
  name: string;
  status: string;
  statusLabel: string;
  company: "Minerals" | "Microns";
  stock: {
    current: number;
    reorder: number;
    unit: string;
    levelPct: number;
  };
  fields: InventoryDetailField[];
  footnote?: string;
};

function formatInr(n: number): string {
  if (n <= 0) return "—";
  return `₹${n.toLocaleString("en-IN")}`;
}

function statusLabel(status: string): string {
  if (status === "critical") return "Critical";
  if (status === "low") return "Low stock";
  if (status === "ok") return "In stock";
  return status.replace(/-/g, " ");
}

function statusTone(status: string): InventoryDetailField["tone"] {
  if (status === "critical") return "danger";
  if (status === "low") return "warn";
  if (status === "ok") return "success";
  return "default";
}

function stockLevelPct(stock: number, reorder: number): number {
  if (reorder <= 0) return stock > 0 ? 100 : 0;
  return Math.min(100, Math.round((stock / (reorder * 3)) * 100));
}

function buildRawMaterialView(item: RawMaterial): InventoryItemDetailView {
  return {
    kind: "raw-material",
    code: item.code,
    name: item.name,
    status: item.status,
    statusLabel: statusLabel(item.status),
    company: "Minerals",
    stock: {
      current: item.stock,
      reorder: item.reorder,
      unit: item.unit,
      levelPct: stockLevelPct(item.stock, item.reorder),
    },
    fields: [
      { label: "SKU", value: item.code },
      { label: "Grade", value: item.grade },
      { label: "Location", value: item.location },
      {
        label: "Stock on hand",
        value: `${item.stock} ${item.unit}`,
        tone: statusTone(item.status),
      },
      { label: "Reorder level", value: `${item.reorder} ${item.unit}` },
      { label: "Inventory value", value: formatInr(item.value) },
      {
        label: "Trend (7d)",
        value: `${item.trend > 0 ? "+" : ""}${item.trend}%`,
        tone: item.trend < 0 ? "warn" : item.trend > 0 ? "success" : "default",
      },
      ...(item.category ? [{ label: "Category", value: item.category }] : []),
      ...(item.preferredVendor
        ? [{ label: "Preferred vendor", value: item.preferredVendor }]
        : []),
      ...(item.notes ? [{ label: "Notes", value: item.notes }] : []),
    ],
    footnote: "Raw material master · Sudarshan Minerals & Industries",
  };
}

function buildPackagingView(item: Packaging, microns: boolean): InventoryItemDetailView {
  return {
    kind: "packaging",
    code: item.code,
    name: item.name,
    status: item.status,
    statusLabel: statusLabel(item.status),
    company: microns ? "Microns" : "Minerals",
    stock: {
      current: item.stock,
      reorder: item.reorder,
      unit: item.unit,
      levelPct: stockLevelPct(item.stock, item.reorder),
    },
    fields: [
      { label: "SKU", value: item.code },
      {
        label: "Stock on hand",
        value: `${item.stock.toLocaleString()} ${item.unit}`,
        tone: statusTone(item.status),
      },
      {
        label: "Reorder level",
        value: `${item.reorder.toLocaleString()} ${item.unit}`,
      },
      {
        label: "Trend (7d)",
        value: `${item.trend > 0 ? "+" : ""}${item.trend}%`,
        tone: item.trend < 0 ? "warn" : item.trend > 0 ? "success" : "default",
      },
      ...(item.capacity
        ? [{ label: "Capacity", value: `${item.capacity} ${item.unit}` }]
        : []),
      ...(item.gradeCompatibility
        ? [{ label: "Grade compatibility", value: item.gradeCompatibility }]
        : []),
      ...(item.supplier ? [{ label: "Supplier", value: item.supplier }] : []),
      ...(item.materialType
        ? [{ label: "Material type", value: item.materialType }]
        : []),
      ...(item.notes ? [{ label: "Notes", value: item.notes }] : []),
    ],
    footnote: "Packaging inventory · Sudarshan Microns",
  };
}

function buildSparePartView(item: SparePart, microns: boolean): InventoryItemDetailView {
  return {
    kind: "spare-part",
    code: item.code,
    name: item.name,
    status: item.status,
    statusLabel: statusLabel(item.status),
    company: microns ? "Microns" : "Minerals",
    stock: {
      current: item.stock,
      reorder: item.reorder,
      unit: item.unit,
      levelPct: stockLevelPct(item.stock, item.reorder),
    },
    fields: [
      { label: "SKU", value: item.code },
      { label: "Category", value: item.category },
      { label: "Vendor", value: item.vendor },
      { label: "Location", value: item.location || "—" },
      {
        label: "Stock on hand",
        value: `${item.stock} ${item.unit}`,
        tone: statusTone(item.status),
      },
      { label: "Reorder level", value: `${item.reorder} ${item.unit}` },
      { label: "Inventory value", value: formatInr(item.value) },
      {
        label: "Critical part",
        value: item.critical ? "Yes" : "No",
        tone: item.critical ? "warn" : "default",
      },
      { label: "Last issued", value: item.lastIssued || "—" },
      {
        label: "Trend (7d)",
        value: `${item.trend > 0 ? "+" : ""}${item.trend}%`,
        tone: item.trend < 0 ? "warn" : item.trend > 0 ? "success" : "default",
      },
      ...(item.machineName
        ? [{ label: "Machine", value: item.machineName }]
        : []),
      ...(item.notes ? [{ label: "Notes", value: item.notes }] : []),
    ],
    footnote: "Spare parts store · maintenance inventory",
  };
}

export function buildInventoryItemDetailView(
  kind: InventoryKind,
  code: string,
  data: ErpData,
): InventoryItemDetailView | null {
  const normalized = decodeURIComponent(code).trim();

  if (kind === "raw-material") {
    const item = data.RAW_MATERIALS.find((r) => r.code === normalized);
    return item ? buildRawMaterialView(item) : null;
  }

  if (kind === "packaging") {
    const index = data.PACKAGING.findIndex((p) => p.code === normalized);
    if (index < 0) return null;
    const microns = index >= 2;
    return buildPackagingView(data.PACKAGING[index], microns);
  }

  if (kind === "spare-part") {
    const index = data.SPARE_PARTS.findIndex((s) => s.code === normalized);
    if (index < 0) return null;
    const microns = index === 2;
    return buildSparePartView(data.SPARE_PARTS[index], microns);
  }

  return null;
}
