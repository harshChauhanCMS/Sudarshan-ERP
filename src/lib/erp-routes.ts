/** ERP paths (formerly hash routes in Sudarshan ERP.html). */
export const ERP_ROUTES = [
  "/dashboard/master",
  "/dashboard/admin",
  "/dashboard/owner",
  "/dashboard/production",
  "/dashboard/dispatch",
  "/inventory/raw-material",
  "/inventory/raw-material/add",
  "/inventory/packaging",
  "/inventory/packaging/add",
  "/inventory/spare-parts",
  "/inventory/spare-parts/add",
  "/procurement/vendors",
  "/procurement/vendors/add",
  "/procurement/po",
  "/procurement/po/add",
  "/procurement/invoices",
  "/customers",
  "/customers/add",
  "/orders",
  "/orders/add",
  "/field-sales",
  "/field-sales/activity-dashboard",
  "/field-sales/visits-beat-tracking",
  "/field-sales/visit-log",
  "/field-sales/visit-history",
  "/field-sales/beat-territory",
  "/production",
  "/dispatch",
  "/hrms/employees",
  "/hrms/notifications",
  "/hrms/reports",
  "/hrms/reports/attendance",
  "/hrms/reports/employee",
  "/hrms/reports/daily",
  "/hrms/reports/field",
  "/hrms/reports/late-early",
  "/hrms/leave",
  "/hrms/leave/record",
  "/hrms/leave/apply",
  "/hrms/leave/approval",
  "/hrms/leave/admin",
  "/hrms/leave/policy",
  "/hrms/holidays",
  "/hrms/salary",
  "/hrms/salary/monthly",
  "/hrms/salary/bulk",
  "/hrms/salary/daily-wage",
  "/hrms/payroll",
  "/reports",
  "/users",
  "/design-system",
] as const;

export type ErpRoute = (typeof ERP_ROUTES)[number];

export function pathToRoute(segments: string[] | undefined): string {
  if (!segments?.length) return "/dashboard/master";
  const route = "/" + segments.join("/");
  return (ERP_ROUTES as readonly string[]).includes(route) ? route : "/dashboard/master";
}

export function routeToSegments(route: string): string[] {
  return route.replace(/^\//, "").split("/").filter(Boolean);
}
