import { connectDB } from "@/lib/db";
import Employee from "@/lib/models/Employee";
import { User } from "@/models/User";

export const HR_STAFF_VIEW_ROLES = new Set(["admin", "owner"]);
const HR_DEPARTMENT_KEYS = new Set(["hr"]);

export function isHrViewer(role?: string): boolean {
  return role?.toLowerCase() === "hr";
}

export function canViewHrStaffRecords(viewerRole?: string): boolean {
  if (!viewerRole) return false;
  return HR_STAFF_VIEW_ROLES.has(viewerRole.toLowerCase());
}

/** Employee IDs for HR staff — login role `hr` and/or department `hr`. */
export async function getHrStaffEmployeeIds(): Promise<Set<string>> {
  await connectDB();

  const [hrUsers, hrDeptEmployees] = await Promise.all([
    User.find({ role: "hr", employeeId: { $exists: true, $ne: "" } })
      .select("employeeId")
      .lean(),
    Employee.find({ department: { $in: [...HR_DEPARTMENT_KEYS] } })
      .select("employeeId")
      .lean(),
  ]);

  const ids = new Set<string>();
  for (const user of hrUsers) {
    const id = String(user.employeeId || "").trim();
    if (id) ids.add(id);
  }
  for (const emp of hrDeptEmployees) {
    const id = String(emp.employeeId || "").trim();
    if (id) ids.add(id);
  }
  return ids;
}

export function isHrStaffEmployee(
  employeeId: string,
  hrStaffIds: Set<string>
): boolean {
  return hrStaffIds.has(String(employeeId).trim());
}

export function shouldHideFromHrViewer(
  viewerRole: string | undefined,
  employeeId: string,
  hrStaffIds: Set<string>
): boolean {
  if (!isHrViewer(viewerRole)) return false;
  return isHrStaffEmployee(employeeId, hrStaffIds);
}

export async function filterRowsForHrViewer<T extends { employeeId: string }>(
  rows: T[],
  viewerRole?: string
): Promise<T[]> {
  if (!isHrViewer(viewerRole)) return rows;
  const hrStaffIds = await getHrStaffEmployeeIds();
  return rows.filter((row) => !shouldHideFromHrViewer(viewerRole, row.employeeId, hrStaffIds));
}

export async function assertEmployeeVisibleToViewer(
  viewerRole: string | undefined,
  targetEmployeeId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isHrViewer(viewerRole)) return { ok: true };
  const hrStaffIds = await getHrStaffEmployeeIds();
  if (shouldHideFromHrViewer(viewerRole, targetEmployeeId, hrStaffIds)) {
    return {
      ok: false,
      message: "You do not have access to this employee record.",
    };
  }
  return { ok: true };
}
