import type { DailyWageWorker, SkillLevel, PayMode } from "@/lib/daily-wage-dummy";

export const DAILY_WAGE_COMPENSATION = "Daily wage";

export function parsePayPeriod(period: string): { start: Date; end: Date } | null {
  if (!/^\d{4}-\d{2}$/.test(period)) return null;
  const [year, month] = period.split("-").map(Number);
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

export function normalizeSkillCategory(raw?: string): SkillLevel {
  const s = (raw || "").toLowerCase();
  if (s.includes("unskilled") || s === "unskilled") return "Unskilled";
  if (s.includes("semi")) return "Semi";
  if (s.includes("skilled")) return "Skilled";
  return "Unskilled";
}

export function normalizePayMode(raw?: string): PayMode {
  const s = (raw || "").toLowerCase();
  if (s.includes("cash")) return "Cash";
  return "Bank";
}

export function normalizeContractor(raw?: string): string {
  const s = (raw || "").trim();
  if (!s) return "Direct";
  if (/direct/i.test(s)) return "Direct";
  return s;
}

type PunchDay = { inAt: Date | null; outAt: Date | null };

export function buildAttendanceStats(
  employeeId: string,
  punchDayMap: Map<string, PunchDay>,
  start: Date,
  end: Date,
  expectedHours: number,
  otApplicable: boolean
) {
  let days = 0;
  let otHours = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endD = new Date(end);
  endD.setHours(23, 59, 59, 999);

  while (cur <= endD) {
    if (cur.getDay() !== 0) {
      const k = `${employeeId}|${cur.toISOString().slice(0, 10)}`;
      const entry = punchDayMap.get(k);
      if (entry?.inAt) {
        days++;
        if (entry.outAt && otApplicable) {
          const workedH =
            (entry.outAt.getTime() - entry.inAt.getTime()) / 36e5;
          if (workedH > expectedHours) otHours += workedH - expectedHours;
        }
      }
    }
    cur.setDate(cur.getDate() + 1);
  }

  return { days, otHours: Math.round(otHours * 100) / 100 };
}

type EmployeeInput = {
  employeeId: string;
  fullName: string;
  designation?: string;
  locationUnit?: string;
  dailyWageRate?: number;
  skillCategory?: string;
  tradeJobRole?: string;
  engagedVia?: string;
  paymentMode?: string;
  workingHours?: number;
  overtimeApplicable?: boolean;
};

export function employeeToDailyWageWorker(
  emp: EmployeeInput,
  stats: { days: number; otHours: number }
): DailyWageWorker {
  return {
    id: String(emp.employeeId),
    code: String(emp.employeeId),
    name: emp.fullName,
    skill: normalizeSkillCategory(emp.skillCategory),
    trade: emp.tradeJobRole || emp.designation || "—",
    contractor: normalizeContractor(emp.engagedVia),
    unit: emp.locationUnit || "—",
    dailyRate: emp.dailyWageRate || 0,
    days: stats.days,
    otHours: stats.otHours,
    advance: 0,
    esi: 0,
    mode: normalizePayMode(emp.paymentMode),
    status: "Pending",
  };
}
