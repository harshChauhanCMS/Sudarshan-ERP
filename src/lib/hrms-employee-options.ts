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

export const EMPLOYEE_WORK_LOCATION_TYPES = ["Onsite", "Field", "Remote"] as const;

export type EmployeeWorkLocationType = (typeof EMPLOYEE_WORK_LOCATION_TYPES)[number];

export const EMPLOYEE_WORK_LOCATION_OPTIONS = EMPLOYEE_WORK_LOCATION_TYPES.map(
  (value) => ({ value, label: value })
);

export const EMPLOYEE_LOCATION_UNIT_OPTIONS = [
  { value: "Sudarshan Minerals (Udaipur — Plant 1)", label: "Sudarshan Minerals (Udaipur — Plant 1)" },
  { value: "Sudarshan Minerals (Udaipur — Plant 2)", label: "Sudarshan Minerals (Udaipur — Plant 2)" },
  { value: "Sudarshan Microns (Udaipur)", label: "Sudarshan Microns (Udaipur)" },
] as const;

export function isFieldWorkLocation(
  workLocationType?: string | null
): boolean {
  return workLocationType?.trim().toLowerCase() === "field";
}
