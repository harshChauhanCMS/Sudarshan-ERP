import {
  canPerform,
  type ModuleKey,
  type ModulePermission,
  type PermissionsMap,
} from "@/lib/permission-types";

type RouteRule = { prefix: string; module: ModuleKey; action?: keyof ModulePermission };

const ROUTE_RULES: RouteRule[] = (
  [
    { prefix: "/users", module: "user_management" },
    { prefix: "/reports", module: "reports" },
    { prefix: "/inventory/raw-material", module: "inventory_raw" },
    { prefix: "/inventory/packaging", module: "inventory_packaging" },
    { prefix: "/inventory/spare-parts", module: "inventory_spares" },
    { prefix: "/procurement/vendors", module: "procurement_vendors" },
    { prefix: "/procurement/po", module: "procurement_po" },
    { prefix: "/procurement/invoices", module: "procurement_invoice" },
    { prefix: "/customers", module: "sales_customers" },
    { prefix: "/orders", module: "sales_orders" },
    { prefix: "/field-sales", module: "sales_orders" },
    { prefix: "/production", module: "operations_production" },
    { prefix: "/dispatch", module: "dispatch" },
    { prefix: "/hrms/payroll", module: "payroll" },
    { prefix: "/hrms/salary", module: "payroll" },
    { prefix: "/hrms/reports", module: "reports" },
    { prefix: "/hrms/leave", module: "hr" },
    { prefix: "/hrms/holidays", module: "hr" },
    { prefix: "/hrms/employees", module: "hr" },
    { prefix: "/hrms/attendance", module: "hr" },
    { prefix: "/hrms", module: "hr" },
    { prefix: "/dashboard", module: "dashboard" },
  ] satisfies RouteRule[]
).sort((a, b) => b.prefix.length - a.prefix.length);

export function getRoutePermission(path: string): {
  module: ModuleKey;
  action: keyof ModulePermission;
} | null {
  if (!path || path === "/login" || path === "/forgot" || path === "/select-company") {
    return null;
  }

  const normalized = path.split("?")[0];
  const rule = ROUTE_RULES.find(
    (entry) =>
      normalized === entry.prefix || normalized.startsWith(`${entry.prefix}/`)
  );

  if (!rule) return null;

  return { module: rule.module, action: rule.action ?? "view" };
}

export function canAccessRoute(
  path: string,
  permissions: PermissionsMap | undefined
): boolean {
  const requirement = getRoutePermission(path);
  if (!requirement) return false;
  return canPerform(permissions, requirement.module, requirement.action);
}

type NavItem = {
  id: string;
  label: string;
  icon?: string;
  items?: NavItem[];
};

type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

function filterNavItem(
  item: NavItem,
  permissions: PermissionsMap | undefined
): NavItem | null {
  if (Array.isArray(item.items)) {
    const children = item.items
      .map((child) => filterNavItem(child, permissions))
      .filter(Boolean) as NavItem[];
    if (!children.length) return null;
    return { ...item, items: children };
  }

  return canAccessRoute(item.id, permissions) ? item : null;
}

export function filterNavByPermissions(
  nav: NavSection[],
  permissions: PermissionsMap | undefined
): NavSection[] {
  if (!permissions) return [];

  return nav
    .map((section) => {
      const items = section.items
        .map((item) => filterNavItem(item, permissions))
        .filter(Boolean) as NavItem[];
      if (!items.length) return null;
      return { ...section, items };
    })
    .filter(Boolean) as NavSection[];
}

export function getDefaultLandingRoute(
  permissions: PermissionsMap | undefined
): string {
  const candidates = [
    "/dashboard/master",
    "/hrms/employees",
    "/hrms/attendance",
    "/procurement/po",
    "/inventory/raw-material",
    "/orders",
    "/reports",
  ];

  for (const path of candidates) {
    if (canAccessRoute(path, permissions)) return path;
  }

  return "/select-company";
}
