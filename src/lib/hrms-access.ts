import { canPerform } from "@/lib/permission-types";
import {
  assertEmployeeVisibleToViewer,
  filterRowsForHrViewer,
} from "@/lib/hr-staff-visibility";
import {
  hrCannotActionOwnLeave,
  SELF_LEAVE_ACTION_BLOCKED,
} from "@/lib/leave-approval-rules";
import {
  isManagerRole,
  resolveManagerScope,
} from "@/lib/manager-scope";
import { isAdminOrOwner } from "@/lib/api-auth";
import { resolveCompanyScope, narrowEmployeeIdsByCompany } from "@/lib/company-scope";
import type { SessionUser } from "@/lib/session";

export type HrDataScope =
  | { mode: "all" }
  | { mode: "team"; employeeIds: string[] }
  | { mode: "self"; employeeId: string };

export async function resolveHrDataScope(
  user?: Pick<SessionUser, "role" | "employeeId" | "permissions">,
): Promise<HrDataScope> {
  if (!user) return { mode: "self", employeeId: "__none__" };
  if (isAdminOrOwner(user.role)) return { mode: "all" };

  const companyScope = await resolveCompanyScope(user);

  if (canPerform(user.permissions, "hr", "view") && !isManagerRole(user.role)) {
    if (!companyScope.restricted) return { mode: "all" };
    const employeeIds = await narrowEmployeeIdsByCompany(companyScope);
    return { mode: "team", employeeIds: employeeIds ?? [] };
  }
  if (canPerform(user.permissions, "reports", "view") && !isManagerRole(user.role)) {
    if (!companyScope.restricted) return { mode: "all" };
    const employeeIds = await narrowEmployeeIdsByCompany(companyScope);
    return { mode: "team", employeeIds: employeeIds ?? [] };
  }
  if (isManagerRole(user.role)) {
    const managerScope = await resolveManagerScope(user);
    const employeeIds = await narrowEmployeeIdsByCompany(
      companyScope,
      managerScope.teamEmployeeIds,
    );
    return { mode: "team", employeeIds: employeeIds ?? managerScope.teamEmployeeIds };
  }
  if (user.employeeId) {
    return { mode: "self", employeeId: String(user.employeeId).trim() };
  }
  return { mode: "self", employeeId: "__none__" };
}

export function scopeEmployeeFilter(
  scope: HrDataScope,
  field = "employeeId",
): Record<string, unknown> | null {
  if (scope.mode === "all") return null;
  if (scope.mode === "team") {
    const ids = scope.employeeIds.length ? scope.employeeIds : ["__none__"];
    return { [field]: { $in: ids } };
  }
  return { [field]: scope.employeeId };
}

export function filterRowsByHrScope<T extends { employeeId: string }>(
  rows: T[],
  scope: HrDataScope,
): T[] {
  if (scope.mode === "all") return rows;
  if (scope.mode === "team") {
    const allowed = new Set(scope.employeeIds);
    return rows.filter((row) => allowed.has(String(row.employeeId)));
  }
  return rows.filter((row) => String(row.employeeId) === scope.employeeId);
}

export async function assertCanAccessEmployee(
  user: Pick<SessionUser, "role" | "employeeId" | "permissions"> | undefined,
  targetEmployeeId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const scope = await resolveHrDataScope(user);
  const target = String(targetEmployeeId).trim();

  if (scope.mode === "all") {
    return assertEmployeeVisibleToViewer(user?.role, target);
  }
  if (scope.mode === "team") {
    if (!scope.employeeIds.includes(target)) {
      return { ok: false, message: "You do not have access to this employee." };
    }
    return assertEmployeeVisibleToViewer(user?.role, target);
  }
  if (scope.mode === "self" && scope.employeeId === target) {
    return { ok: true };
  }
  return { ok: false, message: "You do not have access to this employee." };
}

export async function assertCanApproveLeave(
  user: Pick<SessionUser, "role" | "employeeId" | "permissions"> | undefined,
  targetEmployeeId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!user) return { ok: false, message: "Unauthorized" };

  if (hrCannotActionOwnLeave(user, targetEmployeeId)) {
    return { ok: false, message: SELF_LEAVE_ACTION_BLOCKED };
  }

  if (isAdminOrOwner(user.role)) return { ok: true };
  if (canPerform(user.permissions, "hr", "approve")) return { ok: true };
  if (isManagerRole(user.role)) {
    const scope = await resolveManagerScope(user);
    if (scope.teamEmployeeIds.includes(String(targetEmployeeId).trim())) {
      return { ok: true };
    }
    return {
      ok: false,
      message: "You can only approve leave for your direct reports.",
    };
  }
  return { ok: false, message: "You are not authorized to approve leave." };
}

export function canManageEmployees(user?: SessionUser): boolean {
  if (!user) return false;
  if (isAdminOrOwner(user.role)) return true;
  return canPerform(user.permissions, "hr", "add") || canPerform(user.permissions, "hr", "edit");
}

/** Owner, admin, HR, and master may resend expired temporary login credentials. */
export function canResendEmployeeCredentials(user?: SessionUser): boolean {
  if (!user?.role) return false;
  const role = user.role.toLowerCase();
  return (
    role === "owner" ||
    role === "admin" ||
    role === "hr" ||
    role === "master"
  );
}

export function canManagePayroll(user?: SessionUser): boolean {
  if (!user) return false;
  if (isAdminOrOwner(user.role)) return true;
  return (
    canPerform(user.permissions, "payroll", "edit") ||
    canPerform(user.permissions, "payroll", "approve")
  );
}

export async function filterEmployeeRowsForViewer<T extends { employeeId: string }>(
  rows: T[],
  user?: SessionUser,
): Promise<T[]> {
  const scope = await resolveHrDataScope(user);
  let visible = filterRowsByHrScope(rows, scope);
  visible = await filterRowsForHrViewer(visible, user?.role);
  return visible;
}
