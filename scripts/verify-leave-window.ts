/**
 * Regression checks for leave-day attribution to a payroll cycle.
 * Run: npx tsx scripts/verify-leave-window.ts
 */
import { leaveDaysInWindow, countLeaveWorkingDays } from "@/lib/leave-window";
import { normalizeLeaveType, leaveTypeQueryValues } from "@/lib/leave-apply";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${name}`);
  if (!ok) console.log(`        expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const noHolidays = new Map<string, unknown>();
const jan = [new Date(2026, 0, 1, 0, 0, 0), new Date(2026, 0, 31, 23, 59, 59)] as const;
const feb = [new Date(2026, 1, 1, 0, 0, 0), new Date(2026, 1, 28, 23, 59, 59)] as const;

console.log("\n[P2] cross-month leave is split, not double-charged");
{
  // 28 Jan - 5 Feb 2026, stored days = 9 (raw calendar span)
  const leave = { fromDate: "2026-01-28", toDate: "2026-02-05", days: 9 };
  const inJan = leaveDaysInWindow(leave, jan[0], jan[1], "Sunday", noHolidays);
  const inFeb = leaveDaysInWindow(leave, feb[0], feb[1], "Sunday", noHolidays);
  // Jan 28,29,30,31 -> Sun 1 Feb excluded; Feb 2,3,4,5 (1st is Sunday)
  check("Jan share", inJan, 4);
  check("Feb share", inFeb, 4);
  check("no cycle sees the full 9 days", inJan + inFeb <= 9, true);
}

console.log("\n[P2] weekly offs are not charged as leave");
{
  // Mon 4 May - Sun 10 May 2026 = 7 calendar days, 6 working
  const may = [new Date(2026, 4, 1), new Date(2026, 4, 31, 23, 59, 59)] as const;
  const leave = { fromDate: "2026-05-04", toDate: "2026-05-10", days: 7 };
  check("Sunday excluded", leaveDaysInWindow(leave, may[0], may[1], "Sunday", noHolidays), 6);
  const monOff = leaveDaysInWindow(leave, may[0], may[1], "Monday", noHolidays);
  check("honours a non-Sunday weekly off", monOff, 6);
}

console.log("\n[P2] holidays inside a leave are not charged as leave");
{
  const may = [new Date(2026, 4, 1), new Date(2026, 4, 31, 23, 59, 59)] as const;
  const holidays = new Map<string, unknown>([["2026-05-05", { name: "Holiday" }]]);
  const leave = { fromDate: "2026-05-04", toDate: "2026-05-08", days: 5 };
  check("5-day leave with 1 holiday -> 4", leaveDaysInWindow(leave, may[0], may[1], "Sunday", holidays), 4);
}

console.log("\n[regression] half-days survive");
{
  const may = [new Date(2026, 4, 1), new Date(2026, 4, 31, 23, 59, 59)] as const;
  const leave = { fromDate: "2026-05-06", toDate: "2026-05-06", days: 0.5 };
  check("single half-day stays 0.5", leaveDaysInWindow(leave, may[0], may[1], "Sunday", noHolidays), 0.5);
}

console.log("\n[edge] non-overlapping and invalid input");
{
  const leave = { fromDate: "2026-03-01", toDate: "2026-03-05", days: 5 };
  check("leave outside the window -> 0", leaveDaysInWindow(leave, jan[0], jan[1], "Sunday", noHolidays), 0);
  check("invalid dates -> 0",
    leaveDaysInWindow({ fromDate: "nonsense", toDate: "nonsense", days: 3 }, jan[0], jan[1], "Sunday", noHolidays), 0);
  const allOff = { fromDate: "2026-05-10", toDate: "2026-05-10", days: 1 };
  const may = [new Date(2026, 4, 1), new Date(2026, 4, 31, 23, 59, 59)] as const;
  check("leave entirely on a weekly off -> 0", leaveDaysInWindow(allOff, may[0], may[1], "Sunday", noHolidays), 0);
}

console.log("\n[authoritative count] countLeaveWorkingDays — the figure that gets stored");
{
  const none = new Set<string>();
  // Mon 4 May - Sun 10 May 2026: 7 calendar days, 6 working
  check("full week excludes the weekly off",
    countLeaveWorkingDays("2026-05-04", "2026-05-10", "full", "Sunday", none), 6);
  check("honours a non-Sunday weekly off",
    countLeaveWorkingDays("2026-05-04", "2026-05-10", "full", "Wednesday", none), 6);
  check("holiday inside the range is not leave",
    countLeaveWorkingDays("2026-05-04", "2026-05-08", "full", "Sunday", new Set(["2026-05-06"])), 4);

  check("single full day", countLeaveWorkingDays("2026-05-06", "2026-05-06", "full", "Sunday", none), 1);
  check("single half day", countLeaveWorkingDays("2026-05-06", "2026-05-06", "first-half-first", "Sunday", none), 0.5);

  check("half day at the start",
    countLeaveWorkingDays("2026-05-04", "2026-05-08", "second-half-first", "Sunday", none), 4.5);
  check("half day at the end",
    countLeaveWorkingDays("2026-05-04", "2026-05-08", "first-half-last", "Sunday", none), 4.5);

  // Fri 8 - Sun 10 May, half-day on the last day, which is the weekly off:
  // no half-day is consumed because that day was never counted.
  check("half day on a weekly off costs nothing",
    countLeaveWorkingDays("2026-05-08", "2026-05-10", "first-half-last", "Sunday", none), 2);

  check("range entirely on weekly offs -> 0",
    countLeaveWorkingDays("2026-05-10", "2026-05-10", "full", "Sunday", none), 0);
  check("reversed range -> 0",
    countLeaveWorkingDays("2026-05-10", "2026-05-04", "full", "Sunday", none), 0);
  check("invalid dates -> 0",
    countLeaveWorkingDays("nonsense", "nonsense", "full", "Sunday", none), 0);
}

console.log("\n[payroll] stored duration is honoured for new rows");
{
  const may = [new Date(2026, 4, 1), new Date(2026, 4, 31, 23, 59, 59)] as const;
  const half = { fromDate: "2026-05-04", toDate: "2026-05-08", days: 4.5, duration: "first-half-last" };
  check("half-day leave keeps its .5 in payroll",
    leaveDaysInWindow(half, may[0], may[1], "Sunday", new Map()), 4.5);
}

console.log("\n[alias] earned / privilege must resolve to one type");
{
  check("earned -> privilege", normalizeLeaveType("earned"), "privilege");
  check("EARNED is case-insensitive", normalizeLeaveType("EARNED"), "privilege");
  check("privilege stays privilege", normalizeLeaveType("privilege"), "privilege");
  check("casual untouched", normalizeLeaveType("casual"), "casual");
  check("unknown type passed through", normalizeLeaveType("sabbatical"), "sabbatical");
  check("empty -> empty", normalizeLeaveType(""), "");
  check("null -> empty", normalizeLeaveType(null), "");
  check("policy query matches both spellings",
    leaveTypeQueryValues("privilege").sort(), ["earned", "el", "pl", "privilege"]);
  check("non-aliased type queries only itself",
    leaveTypeQueryValues("casual"), ["casual"]);
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
