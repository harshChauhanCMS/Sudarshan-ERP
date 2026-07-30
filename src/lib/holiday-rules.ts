/**
 * Client-safe half of the holiday rules — no DB imports, so UI components and
 * server code share one implementation of "what does this day count as".
 *
 * The business rules, stated once:
 *   Holiday ≠ Leave   — a holiday never consumes leave balance
 *   Holiday ≠ Absent  — a holiday is never counted as an absence
 *   Holiday = Paid    — a holiday never reduces salary
 *   Holidays outrank a missing punch, but not an actual one: someone who
 *   worked a holiday still shows as Present.
 */

export type HolidayInfo = {
  /** ISO day, YYYY-MM-DD. */
  date: string;
  name: string;
  /** Short badge text for calendar cells: "Independence Day" → "ID". */
  initials: string;
  type: string;
};

/** Local-time ISO day key. `toISOString()` would shift dates across timezones. */
export function toDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * "Independence Day" → "ID", "Diwali" → "D", "Maha Shivaratri" → "MS".
 * Capped at 3 characters so it still fits a calendar cell.
 */
export function holidayInitials(name: string): string {
  const words = String(name ?? "")
    .trim()
    .split(/[\s\-/]+/)
    .filter(Boolean);
  if (words.length === 0) return "H";
  return words
    .slice(0, 3)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export type DayStatus =
  | "present"
  | "absent"
  | "leave"
  | "holiday"
  | "week-off"
  | "half-day";

export const DAY_STATUS_LABELS: Record<DayStatus, string> = {
  present: "Present",
  absent: "Absent",
  leave: "Leave",
  holiday: "Holiday",
  "week-off": "Week Off",
  "half-day": "Half Day",
};

/** Single-letter/short codes for calendar cells. */
export const DAY_STATUS_CODES: Record<DayStatus, string> = {
  present: "P",
  absent: "A",
  leave: "L",
  holiday: "H",
  "week-off": "WO",
  "half-day": "HD",
};

/** Colour tokens; the calendar maps these to CSS custom properties. */
export const DAY_STATUS_TONES: Record<DayStatus, string> = {
  present: "green",
  absent: "red",
  leave: "yellow",
  holiday: "blue",
  "week-off": "grey",
  "half-day": "orange",
};

export type ResolveDayInput = {
  /** True when the employee actually punched in that day. */
  present: boolean;
  /** Worked less than the half-day threshold but did attend. */
  halfDay?: boolean;
  onLeave?: boolean;
  isHoliday?: boolean;
  isWeekOff?: boolean;
};

/**
 * Resolves one day to a single status.
 *
 * Order matters: a real punch always wins, so working a holiday or a week-off
 * still reads as Present. Only after that does a holiday take precedence over
 * leave and absence — which is what stops an unmarked holiday showing as
 * Absent and what keeps it off the leave ledger.
 */
export function resolveDayStatus(input: ResolveDayInput): DayStatus {
  if (input.present) return input.halfDay ? "half-day" : "present";
  if (input.isHoliday) return "holiday";
  if (input.onLeave) return "leave";
  if (input.isWeekOff) return "week-off";
  return "absent";
}

/** Days that are paid: worked, on paid leave, a holiday, or a week off. */
export function isPaidDay(status: DayStatus): boolean {
  return status !== "absent";
}

/** Days that count toward the attendance-percentage denominator. */
export function countsTowardAttendance(status: DayStatus): boolean {
  return status !== "holiday" && status !== "week-off";
}

export type AttendanceTotals = {
  present: number;
  halfDay: number;
  absent: number;
  leave: number;
  holiday: number;
  weekOff: number;
  /** Denominator for the percentage — excludes holidays and week-offs. */
  payableDays: number;
  attendancePct: number;
};

/**
 * Rolls a list of day statuses into totals.
 *
 * Holidays and week-offs are excluded from `payableDays`, so they can neither
 * dilute nor inflate the attendance percentage — the spec's "attendance
 * percentage calculations should ignore holidays".
 */
export function summariseDays(statuses: DayStatus[]): AttendanceTotals {
  const totals: AttendanceTotals = {
    present: 0,
    halfDay: 0,
    absent: 0,
    leave: 0,
    holiday: 0,
    weekOff: 0,
    payableDays: 0,
    attendancePct: 0,
  };

  for (const status of statuses) {
    if (status === "present") totals.present += 1;
    else if (status === "half-day") totals.halfDay += 1;
    else if (status === "absent") totals.absent += 1;
    else if (status === "leave") totals.leave += 1;
    else if (status === "holiday") totals.holiday += 1;
    else if (status === "week-off") totals.weekOff += 1;

    if (countsTowardAttendance(status)) totals.payableDays += 1;
  }

  const credited = totals.present + totals.halfDay * 0.5;
  totals.attendancePct =
    totals.payableDays > 0
      ? Math.round((credited / totals.payableDays) * 1000) / 10
      : 0;

  return totals;
}
