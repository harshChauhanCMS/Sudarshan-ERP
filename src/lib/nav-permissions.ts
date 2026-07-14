import {
  canPerform,
  type ModuleKey,
  type ModulePermission,
  type PermissionsMap,
} from "@/lib/permission-types";
import {
  isManagerBlockedRoute,
  isManagerRole,
} from "@/lib/manager-scope-shared";

export const DASHBOARD_ALLOWED_ROLES = new Set(["admin", "owner"]);

export function isDashboardRoute(path: string): boolean {
  const normalized = path.split("?")[0];
  return normalized === "/dashboard" || normalized.startsWith("/dashboard/");
}

export function canAccessDashboard(role: string | undefined): boolean {
  if (!role) return false;
  return DASHBOARD_ALLOWED_ROLES.has(role.toLowerCase());
}

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
    { prefix: "/hrms/notifications", module: "hr" },
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
  permissions: PermissionsMap | undefined,
  role?: string
): boolean {
  if (isDashboardRoute(path) && !canAccessDashboard(role)) {
    return false;
  }

  const normalized = path.split("?")[0];
  if (isManagerRole(role) && isManagerBlockedRoute(normalized)) {
    return false;
  }

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
  permissions: PermissionsMap | undefined,
  role?: string
): NavItem | null {
  if (Array.isArray(item.items)) {
    const children = item.items
      .map((child) => filterNavItem(child, permissions, role))
      .filter(Boolean) as NavItem[];
    if (!children.length) return null;
    return { ...item, items: children };
  }

  return canAccessRoute(item.id, permissions, role) ? item : null;
}

export function filterNavByPermissions(
  nav: NavSection[],
  permissions: PermissionsMap | undefined,
  role?: string
): NavSection[] {
  if (!permissions) return [];

  return nav
    .map((section) => {
      if (section.id === "dashboards" && !canAccessDashboard(role)) {
        return null;
      }

      const items = section.items
        .map((item) => filterNavItem(item, permissions, role))
        .filter(Boolean) as NavItem[];
      if (!items.length) return null;
      return { ...section, items };
    })
    .filter(Boolean) as NavSection[];
}

export function getDefaultLandingRoute(
  permissions: PermissionsMap | undefined,
  role?: string
): string {
  if (isManagerRole(role)) {
    const managerCandidates = [
      "/hrms/leave/approval",
      "/hrms/employees",
      "/hrms/leave/record",
      "/hrms/reports/attendance",
    ];
    for (const path of managerCandidates) {
      if (canAccessRoute(path, permissions, role)) return path;
    }
  }

  const normalizedRole = role?.toLowerCase();
  if (normalizedRole === "owner" && canAccessRoute("/dashboard/owner", permissions, role)) {
    return "/dashboard/owner";
  }
  if (normalizedRole === "admin" && canAccessRoute("/dashboard/admin", permissions, role)) {
    return "/dashboard/admin";
  }

  const candidates = [
    // "/dashboard/master", // commented out: owner/admin no longer land on the shared master dashboard
    "/hrms/employees",
    "/procurement/po",
    "/inventory/raw-material",
    "/orders",
    "/reports",
  ];

  for (const path of candidates) {
    if (canAccessRoute(path, permissions, role)) return path;
  }

  return "/select-company";
}
