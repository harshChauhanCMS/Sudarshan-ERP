import { connectDB } from "@/lib/db";
import Employee from "@/lib/models/Employee";
import type { SessionUser } from "@/lib/session";
import {
  isEmployeeInManagerTeam,
  isManagerRole,
  reportingManagerMatches,
  type ManagerScope,
} from "@/lib/manager-scope-shared";

export {
  MANAGER_BLOCKED_ROUTE_PREFIXES,
  MANAGER_ROLE,
  filterByManagerScope,
  formatReportingManagerLabel,
  isManagerBlockedRoute,
  isManagerRole,
  managerTeamEmployeeFilter,
  parseReportingManagerId,
  reportingManagerMatches,
  type ManagerScope,
} from "@/lib/manager-scope-shared";

export async function getTeamEmployeeIdsForManager(
  managerEmployeeId: string
): Promise<string[]> {
  await connectDB();
  const managerId = managerEmployeeId.trim().toUpperCase();
  const employees = await Employee.find({
    reportingManager: { $exists: true, $ne: "" },
  })
    .select("employeeId reportingManager")
    .lean();

  return employees
    .filter((emp) => reportingManagerMatches(emp.reportingManager, managerId))
    .map((emp) => String(emp.employeeId));
}

export async function resolveManagerScope(
  user?: Pick<SessionUser, "role" | "employeeId">
): Promise<ManagerScope> {
  if (!isManagerRole(user?.role)) {
    return { restricted: false, teamEmployeeIds: [] };
  }
  if (!user?.employeeId) {
    return { restricted: true, teamEmployeeIds: [] };
  }
  const teamEmployeeIds = await getTeamEmployeeIdsForManager(user.employeeId);
  return { restricted: true, teamEmployeeIds };
}

export async function assertManagerCanAccessEmployee(
  user: Pick<SessionUser, "role" | "employeeId" | "permissions"> | undefined,
  targetEmployeeId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { assertCanAccessEmployee } = await import("@/lib/hrms-access");
  return assertCanAccessEmployee(user, targetEmployeeId);
}

export async function assertManagerCanAccessLeave(
  user: Pick<SessionUser, "role" | "employeeId" | "permissions"> | undefined,
  employeeId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { assertCanApproveLeave } = await import("@/lib/hrms-access");
  return assertCanApproveLeave(user, employeeId);
}
