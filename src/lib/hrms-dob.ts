import dayjs, { type Dayjs } from "dayjs";

export const MIN_EMPLOYEE_AGE_YEARS = 18;

/** Latest DOB allowed — employee must be at least 18 years old today */
export function latestAllowedEmployeeDob(
  minAgeYears = MIN_EMPLOYEE_AGE_YEARS
): Dayjs {
  return dayjs().subtract(minAgeYears, "year").startOf("day");
}

/** Disable calendar dates that would make the employee younger than 18 */
export function disableEmployeeDobUnder18(current: Dayjs): boolean {
  if (!current) return false;
  return current.isAfter(latestAllowedEmployeeDob(), "day");
}

export const employeeMinAgeDobRule = {
  validator: (_: unknown, value: Dayjs | null | undefined) => {
    if (!value) return Promise.resolve();
    if (value.isAfter(latestAllowedEmployeeDob(), "day")) {
      return Promise.reject(new Error("Employee must be at least 18 years old"));
    }
    return Promise.resolve();
  },
};
