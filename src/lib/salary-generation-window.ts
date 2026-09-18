import dayjs from "dayjs";

/**
 * Payroll may only be run for a month that has actually finished — meaning the
 * month's last calendar day has arrived. Generating mid-month either pays a
 * full month's gross against a part month of attendance, or turns the days
 * still to come into absence; neither figure is payable, so the whole run is
 * held back until the last day.
 */

/** The first date on which `cycle` (YYYY-MM) may be generated. */
export function cycleUnlockDate(cycle: string): dayjs.Dayjs | null {
  const match = /^(\d{4})-(\d{2})$/.exec(String(cycle ?? "").trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  // Day 0 of the next month is the last day of this one.
  return dayjs(new Date(year, month, 0)).startOf("day");
}

/** True once today is the cycle's last day, or later. */
export function isCycleGeneratable(cycle: string, now: dayjs.ConfigType = undefined): boolean {
  const unlock = cycleUnlockDate(cycle);
  if (!unlock) return false;
  const today = dayjs(now).startOf("day");
  return !today.isBefore(unlock);
}

/** Why the run is blocked, phrased for a tooltip or an API error. */
export function cycleLockedReason(
  cycle: string,
  now: dayjs.ConfigType = undefined,
): string | null {
  const unlock = cycleUnlockDate(cycle);
  if (!unlock) return "Invalid payroll month.";
  if (isCycleGeneratable(cycle, now)) return null;

  const today = dayjs(now).startOf("day");
  const label = unlock.format("MMMM YYYY");
  if (unlock.isSame(today, "month")) {
    return `${label} is still in progress — salary can be generated on ${unlock.format(
      "D MMM YYYY",
    )}, the last day of the month.`;
  }
  return `${label} has not started yet — salary can be generated from ${unlock.format(
    "D MMM YYYY",
  )}.`;
}

/** A from/to pair that covers exactly one whole calendar month. */
export function isWholeMonthRange(from: Date, to: Date): boolean {
  const start = dayjs(from);
  const end = dayjs(to);
  if (!start.isValid() || !end.isValid()) return false;
  if (!start.isSame(end, "month")) return false;
  return start.isSame(start.startOf("month"), "day") && end.isSame(end.endOf("month"), "day");
}
