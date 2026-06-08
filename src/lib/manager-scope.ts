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
  user: Pick<SessionUser, "role" | "employeeId"> | undefined,
  targetEmployeeId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const scope = await resolveManagerScope(user);
  if (!scope.restricted) return { ok: true };
  if (isEmployeeInManagerTeam(targetEmployeeId, scope)) return { ok: true };
  return {
    ok: false,
    message:
      "You can only access employees assigned to you as reporting manager.",
  };
}

export async function assertManagerCanAccessLeave(
  user: Pick<SessionUser, "role" | "employeeId"> | undefined,
  employeeId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  return assertManagerCanAccessEmployee(user, employeeId);
}
