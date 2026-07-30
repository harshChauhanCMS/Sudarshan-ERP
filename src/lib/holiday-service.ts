import { connectDB } from "@/lib/db";
import Holiday from "@/lib/models/Holiday";
import { holidayInitials, toDayKey, type HolidayInfo } from "@/lib/holiday-rules";

/**
 * Server-side holiday lookup — the single source of truth shared by
 * Attendance, Payroll and Reports so the three can never disagree about what
 * is a holiday.
 *
 * The rules themselves (Holiday ≠ Leave, ≠ Absent, = Paid) live in
 * `holiday-rules.ts`, which is client-safe and carries no DB import, so the
 * calendar UI and the server evaluate identical logic.
 */

export type { HolidayInfo };
export { holidayInitials, toDayKey };

function toInfo(doc: { name: string; date: Date | string; type?: string }): HolidayInfo {
  const date = doc.date instanceof Date ? doc.date : new Date(doc.date);
  return {
    date: toDayKey(date),
    name: doc.name,
    initials: holidayInitials(doc.name),
    type: doc.type ?? "national",
  };
}

/**
 * Holidays between two dates, keyed by ISO day for O(1) lookup while walking a
 * date range. Spans years correctly — the stored `year` field is deliberately
 * not used as a filter, because a from/to range can straddle a year boundary.
 */
export async function getHolidayMap(
  from: Date,
  to: Date
): Promise<Map<string, HolidayInfo>> {
  await connectDB();

  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(23, 59, 59, 999);

  const docs = await Holiday.find({ date: { $gte: start, $lte: end } })
    .sort({ date: 1 })
    .lean();

  const map = new Map<string, HolidayInfo>();
  for (const doc of docs as { name: string; date: Date; type?: string }[]) {
    const info = toInfo(doc);
    // Two holidays on one date: keep the first by date order, deterministically.
    if (!map.has(info.date)) map.set(info.date, info);
  }
  return map;
}

export async function listHolidaysInRange(
  from: Date,
  to: Date
): Promise<HolidayInfo[]> {
  return [...(await getHolidayMap(from, to)).values()];
}

/** Count of holidays in a range — payroll uses this to credit paid days. */
export async function countHolidaysInRange(from: Date, to: Date): Promise<number> {
  return (await getHolidayMap(from, to)).size;
}
