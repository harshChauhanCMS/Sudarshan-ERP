import {
  MODULE_KEYS,
  type ModuleKey,
  type ModulePermission,
  type PermissionAction,
  type PermissionsMap,
} from "@/lib/permission-types";

export const PERM_ACTIONS: PermissionAction[] = [
  "view",
  "add",
  "edit",
  "approve",
  "export",
];

/** Short column headers for the permission matrix (full names in tooltips). */
export const PERM_ACTION_LABELS: Record<PermissionAction, string> = {
  view: "View",
  add: "Add",
  edit: "Edit",
  approve: "Appr",
  export: "Exp",
};

/** Grid template for module + five permission columns in the users drawer. */
export const PERM_MATRIX_GRID =
  "minmax(0, 1fr) repeat(5, minmax(52px, 1fr))";

export const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: "Dashboard",
  hr: "HR & Attendance",
  payroll: "Payroll",
  inventory_raw: "Inventory: Raw Material",
  inventory_packaging: "Inventory: Packaging",
  inventory_spares: "Inventory: Spare Parts",
  procurement_vendors: "Procurement: Vendors",
  procurement_po: "Procurement: Purchase Orders",
  procurement_invoice: "Procurement: Invoice Verify",
  sales_customers: "Sales: Customers",
  sales_orders: "Sales: Orders",
  operations_production: "Operations: Production",
  operations_quality: "Operations: Quality",
  dispatch: "Dispatch",
  settings: "Settings",
  user_management: "User Management",
  reports: "Reports",
};

export const MODULE_GROUPS: ReadonlyArray<{
  label: string;
  keys: readonly ModuleKey[];
}> = [
  { label: "Core", keys: ["dashboard", "reports"] },
  { label: "HRMS", keys: ["hr", "payroll"] },
  {
    label: "Inventory",
    keys: ["inventory_raw", "inventory_packaging", "inventory_spares"],
  },
  {
    label: "Procurement",
    keys: ["procurement_vendors", "procurement_po", "procurement_invoice"],
  },
  { label: "Sales", keys: ["sales_customers", "sales_orders"] },
  {
    label: "Operations",
    keys: ["operations_production", "operations_quality"],
  },
  { label: "Logistics", keys: ["dispatch"] },
  { label: "Administration", keys: ["settings", "user_management"] },
];

const emptyModulePerm = (): ModulePermission => ({
  view: false,
  add: false,
  edit: false,
  approve: false,
  export: false,
});

export function emptyPermissionsMap(): PermissionsMap {
  return Object.fromEntries(
    MODULE_KEYS.map((key) => [key, emptyModulePerm()]),
  ) as PermissionsMap;
}

/** Normalize and enforce view dependency for stored permissions. */
export function normalizePermissionsMap(input: unknown): PermissionsMap {
  const base = emptyPermissionsMap();
  if (!input || typeof input !== "object") return base;

  const src = input as Record<string, unknown>;
  for (const key of MODULE_KEYS) {
    const mod = src[key];
    if (!mod || typeof mod !== "object") continue;
    const row = mod as Record<string, unknown>;
    for (const action of PERM_ACTIONS) {
      base[key][action] = Boolean(row[action]);
    }
    const perm = base[key];
    if ((perm.add || perm.edit || perm.approve || perm.export) && !perm.view) {
      perm.view = true;
    }
  }
  return base;
}

export function toggleModulePermission(
  perms: PermissionsMap,
  module: ModuleKey,
  action: PermissionAction,
  checked: boolean,
): PermissionsMap {
  const next = structuredClone(perms);
  const mod = { ...emptyModulePerm(), ...next[module] };

  if (action === "view" && !checked) {
    mod.view = false;
    mod.add = false;
    mod.edit = false;
    mod.approve = false;
    mod.export = false;
  } else {
    mod[action] = checked;
    if (checked && action !== "view") mod.view = true;
  }

  next[module] = mod;
  return next;
}

export function countGrantedPermissions(perms: PermissionsMap): number {
  let total = 0;
  for (const key of MODULE_KEYS) {
    for (const action of PERM_ACTIONS) {
      if (perms[key]?.[action]) total++;
    }
  }
  return total;
}

export function permissionsEqual(a: PermissionsMap, b: PermissionsMap): boolean {
  for (const key of MODULE_KEYS) {
    for (const action of PERM_ACTIONS) {
      if (Boolean(a[key]?.[action]) !== Boolean(b[key]?.[action])) return false;
    }
  }
  return true;
}
