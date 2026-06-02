/** Routes where the UI spans both companies (group brand + info toast). */
export function isGroupBrandRoute(route: string | null | undefined): boolean {
  if (!route) return false;
  if (route === "/dashboard/master" || route === "/dashboard/owner") return true;
  if (route === "/hrms/employees" || route.startsWith("/hrms/employees/")) return true;
  if (route === "/hrms/attendance" || route.startsWith("/hrms/attendance/")) return true;
  if (route === "/hrms/salary" || route.startsWith("/hrms/salary/")) return true;
  if (route === "/hrms/reports" || route.startsWith("/hrms/reports/")) return true;
  if (route === "/hrms/payroll" || route.startsWith("/hrms/payroll/")) return true;
  return false;
}

export const GROUP_BRAND_TOAST_MESSAGE =
  "This page manages data for both companies (SMI & Sudarshan Microns).";
