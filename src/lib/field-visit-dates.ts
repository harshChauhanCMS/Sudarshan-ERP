const IST = "Asia/Kolkata";

/** Calendar date YYYY-MM-DD in India (IST). */
export function fieldVisitDateYmdIST(reference = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(reference);
}

/** Start/end of a calendar day in IST as UTC instants. */
export function fieldVisitDayBoundsIST(reference = new Date()): {
  start: Date;
  end: Date;
} {
  const ymd = fieldVisitDateYmdIST(reference);
  return {
    start: new Date(`${ymd}T00:00:00+05:30`),
    end: new Date(`${ymd}T23:59:59.999+05:30`),
  };
}

/** Parse API/mobile YYYY-MM-DD as midnight IST. */
export function parseFieldVisitDateYmd(ymd: string): Date {
  const trimmed = ymd.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error("Invalid visit date");
  }
  const parsed = new Date(`${trimmed}T00:00:00+05:30`);
  if (Number.isNaN(parsed.getTime())) throw new Error("Invalid visit date");
  return parsed;
}

/** Format stored visit date for API responses (IST calendar day). */
export function formatFieldVisitDateYmdIST(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return fieldVisitDateYmdIST(date);
}
