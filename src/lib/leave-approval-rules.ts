import { isAdminOrOwner } from "@/lib/role-utils";
import { canPerform, type PermissionsMap } from "@/lib/permission-types";

export const SELF_LEAVE_ACTION_BLOCKED =
  "You cannot approve or reject your own leave request.";

export function isSameEmployeeId(
  a?: string | null,
  b?: string | null,
): boolean {
  if (!a || !b) return false;
  return String(a).trim().toUpperCase() === String(b).trim().toUpperCase();
}

export function isHrLeaveApprover(user?: {
  role?: string;
  permissions?: PermissionsMap;
}): boolean {
  if (!user) return false;
  if (isAdminOrOwner(user.role)) return false;
  return user.role === "hr" || canPerform(user.permissions, "hr", "approve");
}

/** HR approvers (not admin/owner) must not action their own leave requests. */
export function hrCannotActionOwnLeave(
  user?: {
    role?: string;
    employeeId?: string;
    permissions?: PermissionsMap;
  },
  targetEmployeeId?: string,
): boolean {
  if (!user || !targetEmployeeId) return false;
  if (isAdminOrOwner(user.role)) return false;
  if (!isHrLeaveApprover(user)) return false;
  return isSameEmployeeId(user.employeeId, targetEmployeeId);
}

/** Hide the logged-in HR approver's own leave from approval queues. */
export function filterLeavesForHrApproval<T extends { employeeId: string }>(
  user:
    | {
        role?: string;
        employeeId?: string;
        permissions?: PermissionsMap;
      }
    | undefined,
  rows: T[],
): T[] {
  if (!user?.employeeId || isAdminOrOwner(user.role) || !isHrLeaveApprover(user)) {
    return rows;
  }
  return rows.filter(
    (row) => !isSameEmployeeId(user.employeeId, row.employeeId),
  );
}
