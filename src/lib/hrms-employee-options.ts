export const EMPLOYEE_EXPERIENCE_OPTIONS = [
  { value: "0-1 year", label: "0-1 year" },
  { value: "1-2 years", label: "1-2 years" },
  { value: "3 years", label: "3 years" },
  { value: "Above 3 years", label: "Above 3 years" },
] as const;

/** Department role keys where the employee is a reporting manager — no RM field needed. */
export const DEPARTMENTS_WITHOUT_REPORTING_MANAGER = new Set(["manager"]);

/** Login roles excluded from HR employee department / access dropdowns. */
export const HR_EMPLOYEE_EXCLUDED_ROLE_KEYS = new Set([
  "owner",
  "admin",
  "master",
]);

export function isHrAssignableRole(roleKey?: string | null): boolean {
  if (!roleKey?.trim()) return false;
  return !HR_EMPLOYEE_EXCLUDED_ROLE_KEYS.has(roleKey.trim().toLowerCase());
}

export function filterHrAssignableRoles<
  T extends { roleKey?: string; value?: string; label?: string; disabled?: boolean },
>(roles: T[]): T[] {
  return roles.filter((role) => {
    const key = String(role.roleKey ?? role.value ?? "").trim().toLowerCase();
    return key && isHrAssignableRole(key);
  });
}

/** Options for department select; keeps current privileged role visible on edit only. */
export function hrAssignableRoleOptions(
  roles: { roleKey: string; label: string }[],
  currentRoleKey?: string | null,
): { value: string; label: string; disabled?: boolean }[] {
  const base = filterHrAssignableRoles(
    roles.map((role) => ({
      value: role.roleKey,
      label: role.label,
      roleKey: role.roleKey,
    })),
  );

  const current = currentRoleKey?.trim().toLowerCase();
  if (!current || !HR_EMPLOYEE_EXCLUDED_ROLE_KEYS.has(current)) {
    return base;
  }

  const match = roles.find((role) => role.roleKey.toLowerCase() === current);
  if (!match || base.some((option) => option.value === match.roleKey)) {
    return base;
  }

  return [
    {
      value: match.roleKey,
      label: `${match.label} (restricted)`,
      disabled: true,
    },
    ...base,
  ];
}

export function departmentSkipsReportingManager(
  department?: string | null
): boolean {
  if (!department?.trim()) return false;
  return DEPARTMENTS_WITHOUT_REPORTING_MANAGER.has(department.trim().toLowerCase());
}

export const EMPLOYEE_QUALIFICATION_OPTIONS = [
  { value: "10th", label: "10th" },
  { value: "12th", label: "12th" },
  { value: "Diploma", label: "Diploma" },
  { value: "Graduation", label: "Graduation" },
  { value: "Post Graduation", label: "Post Graduation" },
] as const;
