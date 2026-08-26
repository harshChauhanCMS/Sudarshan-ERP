/**
 * Formats a worked duration (stored as decimal hours, e.g. 8.25) into an
 * hours-and-minutes label, e.g. "8h 15m". The stored value keeps its decimal
 * form; this is a display-only conversion used across the HRMS attendance
 * reports (tables, CSV and PDF exports).
 *
 * Rounds to the nearest minute and carries 60m up to the next hour, so values
 * like 8.999 render as "9h 0m" rather than "8h 60m".
 */
export function formatWorkedDuration(decimalHours: number | null | undefined): string {
  const hours = typeof decimalHours === "number" && Number.isFinite(decimalHours)
    ? decimalHours
    : 0;
  const totalMinutes = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}
