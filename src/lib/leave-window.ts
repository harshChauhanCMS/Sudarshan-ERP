import { isWeeklyOffDate } from "@/lib/shift-utils";

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

export function leaveDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type LeaveWindowInput = {
  fromDate: Date | string;
  toDate: Date | string;
  /** Stored day count. Server-derived for new rows; a raw calendar span on
   *  rows created before that fix. */
  days?: number;
  /** Half-day shape. Absent on rows created before the field existed. */
  duration?: string;
};

/**
 * Working days of a leave that actually fall inside a payroll window —
 * excluding the employee's weekly off and company holidays.
 *
 * `LeaveRequest.days` is a raw calendar span (see `calcLeaveDays`), and the
 * payroll query matches any leave *overlapping* the cycle. Using the stored
 * figure therefore charged weekly offs as leave and, for a leave straddling two
 * months, charged its full length to both cycles.
 *
 * Half-days: the model stores no duration field, so a half-day is only visible
 * as a `.5` in `days`. When the whole leave sits inside the window the stored
 * figure is used as an upper bound, which preserves it; a leave crossing the
 * window boundary is counted in whole days.
 */
export function leaveDaysInWindow(
  leave: LeaveWindowInput,
  windowStart: Date,
  windowEnd: Date,
  weeklyOff: string | undefined,
  holidayMap: Map<string, unknown>,
): number {
  const from = startOfDay(new Date(leave.fromDate));
  const to = endOfDay(new Date(leave.toDate));
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;

  const overlapStart = from > windowStart ? from : windowStart;
  const overlapEnd = to < windowEnd ? to : windowEnd;
  if (overlapStart > overlapEnd) return 0;

  let count = 0;
  const cur = startOfDay(overlapStart);
  while (cur <= overlapEnd) {
    if (!isWeeklyOffDate(cur, weeklyOff) && !holidayMap.has(leaveDayKey(cur))) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }

  const whollyInside = from >= windowStart && to <= windowEnd;

  // New rows carry an explicit half-day shape, so the reduction can be applied
  // exactly — and only when the boundary day actually falls in this window.
  if (isLeaveDuration(leave.duration) && leave.duration !== "full") {
    if (from.getTime() === startOfDay(to).getTime()) return count > 0 ? 0.5 : 0;
    let days = count;
    const firstHalf =
      leave.duration === "first-half-first" || leave.duration === "second-half-first";
    const lastHalf =
      leave.duration === "first-half-last" || leave.duration === "second-half-last";
    if (firstHalf && from >= windowStart && !isWeeklyOffDate(from, weeklyOff)
        && !holidayMap.has(leaveDayKey(from))) days -= 0.5;
    const lastDay = startOfDay(to);
    if (lastHalf && to <= windowEnd && !isWeeklyOffDate(lastDay, weeklyOff)
        && !holidayMap.has(leaveDayKey(lastDay))) days -= 0.5;
    return Math.max(0, Math.round(days * 100) / 100);
  }

  // Legacy rows: `days` is a raw calendar span, so it is only safe as an upper
  // bound, and only when the whole leave sits inside this window.
  const stored = Number(leave.days) || 0;
  return whollyInside && stored > 0 ? Math.min(count, stored) : count;
}


/* ============================================================
   AUTHORITATIVE LEAVE DAY COUNT
   ============================================================ */

export const LEAVE_DURATIONS = [
  "full",
  "first-half-first",
  "second-half-first",
  "first-half-last",
  "second-half-last",
] as const;

export type LeaveDuration = (typeof LEAVE_DURATIONS)[number];

export function isLeaveDuration(v: unknown): v is LeaveDuration {
  return typeof v === "string" && (LEAVE_DURATIONS as readonly string[]).includes(v);
}

/** A day that counts against leave: not a weekly off, not a company holiday. */
function isCountableDay(
  d: Date,
  weeklyOff: string | undefined,
  holidayKeys: Set<string>,
): boolean {
  return !isWeeklyOffDate(d, weeklyOff) && !holidayKeys.has(leaveDayKey(d));
}

/**
 * The number of days a leave actually consumes — the single source of truth for
 * both the entitlement balance and payroll.
 *
 * Counts only working days: an employee's weekly off and a company holiday
 * falling inside a leave are not leave. A half-day at either end reduces the
 * count by 0.5, but only when that boundary day is itself countable — a leave
 * ending "half day" on a Sunday should not lose half a day it never consumed.
 *
 * Returns 0 for an invalid or fully non-working range, so callers should treat
 * 0 as "nothing to consume" rather than an error.
 */
export function countLeaveWorkingDays(
  fromDate: Date | string,
  toDate: Date | string,
  duration: LeaveDuration,
  weeklyOff: string | undefined,
  holidayKeys: Set<string>,
): number {
  const from = startOfDay(new Date(fromDate));
  const to = startOfDay(new Date(toDate));
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
  if (to < from) return 0;

  let count = 0;
  const cur = new Date(from);
  while (cur <= to) {
    if (isCountableDay(cur, weeklyOff, holidayKeys)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  if (count === 0) return 0;

  const sameDay = from.getTime() === to.getTime();
  if (sameDay) {
    return duration === "full" ? count : 0.5;
  }

  let days = count;
  if (
    (duration === "first-half-first" || duration === "second-half-first") &&
    isCountableDay(from, weeklyOff, holidayKeys)
  ) {
    days -= 0.5;
  }
  if (
    (duration === "first-half-last" || duration === "second-half-last") &&
    isCountableDay(to, weeklyOff, holidayKeys)
  ) {
    days -= 0.5;
  }
  return Math.max(0.5, Math.round(days * 100) / 100);
}
