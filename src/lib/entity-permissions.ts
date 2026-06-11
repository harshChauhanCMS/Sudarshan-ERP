import type { ModuleKey } from "@/lib/permission-types";

/** Maps entity store keys to permission modules for authorization. */
export const ENTITY_MODULE_MAP: Record<string, ModuleKey> = {
  rawMaterials: "inventory_raw",
  packaging: "inventory_packaging",
  spareParts: "inventory_spares",
  spareCategories: "inventory_spares",
  vendors: "procurement_vendors",
  purchaseOrders: "procurement_po",
  customers: "sales_customers",
  orders: "sales_orders",
  invoices: "procurement_invoice",
  dispatches: "dispatch",
  companies: "settings",
  employees: "hr",
  permissions: "user_management",
  roles: "user_management",
  notifications: "dashboard",
  revenueData: "dashboard",
  productionData: "operations_production",
  fieldVisits: "sales_orders",
  attendanceToday: "hr",
};

export function moduleForEntityKey(key: string): ModuleKey | null {
  return ENTITY_MODULE_MAP[key] ?? null;
}

const PATCH_DENYLIST = new Set([
  "__proto__",
  "constructor",
  "prototype",
  "role",
  "roleKey",
  "permissions",
  "passwordHash",
  "isAdmin",
  "isSystem",
]);

export function sanitizeEntityPatch(
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (!PATCH_DENYLIST.has(key)) out[key] = value;
  }
  return out;
}
