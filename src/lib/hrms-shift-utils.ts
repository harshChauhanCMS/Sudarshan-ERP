export const PUNCH_IN_MAX_LATE_HOURS = 4;

export const PUNCH_IN_LATE_ABSENT_MESSAGE =
  "For today, absent is already marked because you are late by 4 hours. Kindly contact HR.";

/** Parse "Shift A — 06:00 to 14:00" → decimal hour in local time */
export function shiftStartHour(primaryShift: string): number | null {
  const m = primaryShift?.match(/(\d{2}):(\d{2})\s*to/i);
  if (!m) return null;
  return parseInt(m[1], 10) + parseInt(m[2], 10) / 60;
}

export function hourOfDate(d: Date): number {
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
}

/** True when punch-in is blocked (4+ hours after shift start). */
export function isPunchInLateAbsent(
  now: Date,
  primaryShift?: string | null
): boolean {
  const shiftStart = shiftStartHour(String(primaryShift || ""));
  if (shiftStart === null) return false;
  return hourOfDate(now) >= shiftStart + PUNCH_IN_MAX_LATE_HOURS;
}
