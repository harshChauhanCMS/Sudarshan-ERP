export const MODULE_KEYS = [
  "dashboard",
  "hr",
  "payroll",
  "inventory_raw",
  "inventory_packaging",
  "inventory_spares",
  "procurement_vendors",
  "procurement_po",
  "procurement_invoice",
  "sales_customers",
  "sales_orders",
  "operations_production",
  "operations_quality",
  "dispatch",
  "settings",
  "user_management",
  "reports",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export type PermissionAction = "view" | "add" | "edit" | "approve" | "export";

export type ModulePermission = {
  view: boolean;
  add: boolean;
  edit: boolean;
  approve: boolean;
  export: boolean;
};

export type PermissionsMap = Record<ModuleKey, ModulePermission>;

export function canPerform(
  permissions: PermissionsMap | undefined,
  module: ModuleKey,
  action: keyof ModulePermission = "view"
): boolean {
  if (!permissions) return false;
  return Boolean(permissions[module]?.[action]);
}
