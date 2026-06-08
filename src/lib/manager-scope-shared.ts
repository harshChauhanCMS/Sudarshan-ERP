export const MANAGER_ROLE = "manager";

export const MANAGER_BLOCKED_ROUTE_PREFIXES = [
  "/hrms/employees/add",
  "/hrms/salary",
  "/hrms/payroll",
  "/hrms/leave/admin",
  "/hrms/holidays",
] as const;

export function isManagerRole(role?: string): boolean {
  return role?.toLowerCase() === MANAGER_ROLE;
}

export function isManagerBlockedRoute(path: string): boolean {
  const normalized = path.split("?")[0];
  return MANAGER_BLOCKED_ROUTE_PREFIXES.some(
    (prefix) =>
      normalized === prefix || normalized.startsWith(`${prefix}/`)
  );
}

/** Extract EMP-XXXX from "EMP-3012 — Name" or a plain employee id. */
export function parseReportingManagerId(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  const match = trimmed.match(/^(EMP-\d+)/i);
  if (match) return match[1].toUpperCase();
  return trimmed.toUpperCase();
}

export function formatReportingManagerLabel(
  employeeId: string,
  fullName: string
): string {
  return `${employeeId} — ${fullName}`;
}

export function reportingManagerMatches(
  reportingManager: string | undefined | null,
  managerEmployeeId: string
): boolean {
  const parsed = parseReportingManagerId(reportingManager);
  const managerId = managerEmployeeId.trim().toUpperCase();
  if (!parsed || !managerId) return false;
  return parsed === managerId;
}

export type ManagerScope = {
  restricted: boolean;
  teamEmployeeIds: string[];
};

export function isEmployeeInManagerTeam(
  employeeId: string,
  scope: ManagerScope
): boolean {
  if (!scope.restricted) return true;
  return scope.teamEmployeeIds.includes(String(employeeId).trim());
}

export function filterByManagerScope<T extends { employeeId: string }>(
  rows: T[],
  scope: ManagerScope
): T[] {
  if (!scope.restricted) return rows;
  const allowed = new Set(scope.teamEmployeeIds);
  return rows.filter((row) => allowed.has(String(row.employeeId)));
}

export function managerTeamEmployeeFilter(
  scope: ManagerScope
): { employeeId: { $in: string[] } } | null {
  if (!scope.restricted) return null;
  return {
    employeeId: {
      $in: scope.teamEmployeeIds.length ? scope.teamEmployeeIds : ["__none__"],
    },
  };
}
