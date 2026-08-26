/**
 * Shift time helpers. Times live as minutes-since-midnight so that a night
 * shift (22:00 → 06:00) is just "end < start" rather than needing a date.
 */

export const MINUTES_IN_DAY = 24 * 60;

export type ShiftTimeInput = { hour: number; minute: number };

export function toMinutes(hour: number, minute: number): number {
  return hour * 60 + minute;
}

export function splitMinutes(total: number): ShiftTimeInput {
  const safe = ((Math.round(total) % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  return { hour: Math.floor(safe / 60), minute: safe % 60 };
}

/** `545` → `"09:05"`. */
export function formatMinutes(total: number): string {
  const { hour, minute } = splitMinutes(total);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function isValidMinuteOfDay(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value < MINUTES_IN_DAY
  );
}

/**
 * Gross span in minutes. When `end <= start` the shift crosses midnight, so a
 * full day is added — that is what makes 22:00→06:00 come out as 8h and not
 * a negative number.
 */
export function shiftSpanMinutes(startMinutes: number, endMinutes: number): number {
  const raw = endMinutes - startMinutes;
  return raw > 0 ? raw : raw + MINUTES_IN_DAY;
}

/** Span minus the unpaid break — the hours an employee is actually paid for. */
export function shiftWorkMinutes(
  startMinutes: number,
  endMinutes: number,
  breakMinutes = 0
): number {
  return Math.max(0, shiftSpanMinutes(startMinutes, endMinutes) - (breakMinutes || 0));
}

/** `"8h 30m"`, or `"8h"` when it lands on the hour. */
export function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function crossesMidnight(startMinutes: number, endMinutes: number): boolean {
  return endMinutes <= startMinutes;
}

export type ShiftLike = {
  code: string;
  name: string;
  startMinutes: number;
  endMinutes: number;
  breakMinutes?: number;
};

/** The label the employee form shows: "Shift A — 06:00 to 14:00 (8h)". */
export function shiftLabel(shift: ShiftLike): string {
  const work = shiftWorkMinutes(
    shift.startMinutes,
    shift.endMinutes,
    shift.breakMinutes ?? 0
  );
  return `${shift.name} — ${formatMinutes(shift.startMinutes)} to ${formatMinutes(
    shift.endMinutes
  )} (${formatDuration(work)})`;
}

/**
 * Validates a shift payload. Returns an error string, or null when the body is
 * usable. Lives here rather than in the route so both POST and PATCH share it
 * and it stays importable without pulling in the DB connection.
 */
export function validateShiftBody(
  body: Record<string, unknown>,
  { partial = false } = {},
): string | null {
  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);

  if (!partial || has("name")) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return "Shift name is required";
    if (name.length > 60) return "Shift name must be at most 60 characters";
  }
  if (!partial || has("code")) {
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!code) return "Shift code is required";
    if (!/^[A-Za-z0-9-]{1,10}$/.test(code)) {
      return "Shift code must be 1–10 alphanumeric characters (hyphens allowed)";
    }
  }
  if (!partial || has("startMinutes")) {
    if (!isValidMinuteOfDay(body.startMinutes)) {
      return "Start time must be a valid hour and minute";
    }
  }
  if (!partial || has("endMinutes")) {
    if (!isValidMinuteOfDay(body.endMinutes)) {
      return "End time must be a valid hour and minute";
    }
  }
  if (has("breakMinutes") && body.breakMinutes != null) {
    const b = Number(body.breakMinutes);
    if (!Number.isInteger(b) || b < 0 || b > 720) {
      return "Break must be between 0 and 720 minutes";
    }
  }
  return null;
}

/**
 * A shift must be longer than its break, or the paid duration is zero/negative.
 * Checked against the merged record so a PATCH of one field can't break it.
 */
export function validateShiftDuration(shift: {
  startMinutes: number;
  endMinutes: number;
  breakMinutes?: number;
}): string | null {
  if (shift.startMinutes === shift.endMinutes) {
    return "Start and end time cannot be the same";
  }
  const span = shiftSpanMinutes(shift.startMinutes, shift.endMinutes);
  if ((shift.breakMinutes ?? 0) >= span) {
    return "Break must be shorter than the shift itself";
  }
  return null;
}

export const WEEKLY_OFF_OPTIONS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Rotating",
  "None",
] as const;

/** Every real calendar day an employee can pick as their weekly off. */
export const EMPLOYEE_WEEKLY_OFF_OPTIONS = WEEKLY_OFF_OPTIONS.filter(
  (d) => d !== "Rotating" && d !== "None"
);

const WEEKDAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/**
 * Resolves an employee/shift's `weeklyOff` string to a `Date#getDay()` index.
 * "None" has no weekly-off day at all. Any unrecognized value — including the
 * retired "Rotating" placeholder still sitting on older records — falls back
 * to Sunday until it's edited to a real day.
 */
export function weeklyOffDayIndex(weeklyOff?: string | null): number | null {
  const key = (weeklyOff || "").trim().toLowerCase();
  if (key === "none") return null;
  if (key in WEEKDAY_INDEX) return WEEKDAY_INDEX[key];
  return 0;
}

export function isWeeklyOffDate(date: Date, weeklyOff?: string | null): boolean {
  const idx = weeklyOffDayIndex(weeklyOff);
  return idx !== null && date.getDay() === idx;
}
