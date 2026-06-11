import Employee from "@/lib/models/Employee";

export type SessionEmployeeUser = {
  email?: string;
  employeeId?: string;
  name?: string;
};

export async function resolveSessionEmployee(user?: SessionEmployeeUser | null) {
  if (!user?.email && !user?.employeeId) {
    return null;
  }

  const normalizedEmail = user.email?.trim().toLowerCase();
  if (normalizedEmail) {
    const byEmail = await Employee.findOne({
      $or: [
        { officialEmail: normalizedEmail },
        { personalEmail: normalizedEmail },
      ],
    }).lean();
    if (byEmail) return byEmail;
  }

  if (user.employeeId) {
    const byId = await Employee.findOne({
      employeeId: String(user.employeeId).trim(),
    }).lean();
    if (byId) return byId;
  }

  return null;
}

const ON_BEHALF_ROLES = new Set(["admin", "owner", "hr"]);

export function canApplyLeaveOnBehalf(role?: string): boolean {
  if (!role) return false;
  return ON_BEHALF_ROLES.has(role.toLowerCase());
}
