import { useState, useMemo, useEffect } from "react";
import dayjs from "dayjs";
import { message } from "antd";
import {
  type AttendanceSummaryRow,
  type AttendanceDailyRow,
  type AttendanceReportKpi,
  type AttendanceGpsSummary,
  type WeeklyTrendPoint,
  type DeptBreakdownPoint,
} from "@/lib/attendance-report-dummy";
import { filterBySearch } from "@/lib/filter-search";

const EMPTY_KPI: AttendanceReportKpi = {
  totalEmployees: 0,
  presentDays: 0,
  absentDays: 0,
  lateDays: 0,
  totalShortfall: 0,
  totalOvertime: 0,
};

const EMPTY_GPS: AttendanceGpsSummary = {
  gpsPunches: 0,
  biometricPunches: 0,
  gpsPercent: 0,
};

export type {
  AttendanceSummaryRow,
  AttendanceDailyRow,
  AttendanceReportKpi,
  AttendanceGpsSummary,
  WeeklyTrendPoint,
  DeptBreakdownPoint,
};

type AttendanceReportOptions = {
  variant?: "default" | "daily";
};

export function useAttendanceReport(options?: AttendanceReportOptions) {
  const isDaily = options?.variant === "daily";
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>(
    isDaily
      ? [dayjs().startOf("day"), dayjs().endOf("day")]
      : [dayjs().startOf("month"), dayjs().endOf("month")]
  );
  const [dept, setDept] = useState("all");
  const [employeeId, setEmployeeId] = useState<string | undefined>(undefined);
  const [shift, setShift] = useState("all");
  const [unit, setUnit] = useState("all");
  const [period, setPeriod] = useState(isDaily ? "today" : "month");
  const [search, setSearch] = useState("");
  const [kpi, setKpi] = useState<AttendanceReportKpi | null>(null);
  const [workingDays, setWorkingDays] = useState(0);
  const [gpsSummary, setGpsSummary] = useState<AttendanceGpsSummary | null>(null);
  const [summary, setSummary] = useState<AttendanceSummaryRow[]>([]);
  const [daily, setDaily] = useState<AttendanceDailyRow[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/system/roles").then((r) => r.json()),
      fetch("/api/hrms/departments").then((r) => r.json()),
    ])
      .then(([rolesRes, deptRes]) => {
        const fromRoles: string[] = (rolesRes?.data ?? []).map(
          (role: { roleKey?: string }) => role.roleKey
        ).filter(Boolean);
        const fromDistinct: string[] = deptRes?.data ?? [];
        const merged = [...new Set([...fromRoles, ...fromDistinct])].sort(
          (a, b) => a.localeCompare(b)
        );
        if (merged.length) setDepartments(merged);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalize = (value: string) => value.trim().toLowerCase();

  const filterSummaryRows = (
    rows: AttendanceSummaryRow[],
    opts: { dept: string; unit: string }
  ) => {
    let filtered = rows;
    if (opts.dept !== "all") {
      const dept = normalize(opts.dept);
      filtered = filtered.filter((r) => normalize(r.department || "") === dept);
    }
    if (opts.unit !== "all") {
      const unit = normalize(opts.unit);
      filtered = filtered.filter(
        (r) => normalize(r.locationUnit || "") === unit
      );
    }
    return filtered;
  };

  const filterAndSortDailyRows = (
    rows: AttendanceDailyRow[],
    opts: { dept: string; shift: string; unit: string; employeeId?: string }
  ) => {
    let filtered = rows;
    if (opts.employeeId) {
      filtered = filtered.filter((r) => r.employeeId === opts.employeeId);
    }
    if (opts.dept !== "all") {
      const dept = normalize(opts.dept);
      filtered = filtered.filter((r) => normalize(r.department || "") === dept);
    }
    if (opts.unit !== "all") {
      const unit = normalize(opts.unit);
      filtered = filtered.filter(
        (r) => normalize(r.locationUnit || "") === unit
      );
    }
    if (opts.shift !== "all") {
      const shift = normalize(opts.shift);
      filtered = filtered.filter((r) =>
        normalize(r.primaryShift || "").includes(shift)
      );
    }
    return [...filtered].sort((a, b) => {
      const dayCmp = b.day.localeCompare(a.day);
      if (dayCmp !== 0) return dayCmp;
      return (a.employeeName || "").localeCompare(b.employeeName || "");
    });
  };

  const applyEmpty = () => {
    setKpi(EMPTY_KPI);
    setWorkingDays(0);
    setGpsSummary(EMPTY_GPS);
    setSummary([]);
    setDaily([]);
  };

  const load = async (opts: {
    dept: string;
    shift: string;
    unit: string;
    employeeId?: string;
    range: [dayjs.Dayjs, dayjs.Dayjs];
  }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from: opts.range[0].format("YYYY-MM-DD"),
        to: opts.range[1].format("YYYY-MM-DD"),
      });
      if (opts.dept !== "all") params.set("department", opts.dept);
      if (opts.shift !== "all") params.set("shift", opts.shift);
      if (opts.unit !== "all") params.set("locationUnit", opts.unit);
      if (opts.employeeId) params.set("employeeId", opts.employeeId);

      const res = await fetch(`/api/hrms/attendance/report/extended?${params}`);
      const json = await res.json();
      if (!res.ok || json?.error) throw new Error(json?.error ?? "Failed");

      let rows: AttendanceSummaryRow[] = json.data.summary ?? [];
      rows = filterSummaryRows(rows, { dept: opts.dept, unit: opts.unit });

      let dailyRows: AttendanceDailyRow[] = json.data.daily ?? [];
      dailyRows = filterAndSortDailyRows(dailyRows, opts);

      if (isDaily && dailyRows.length) {
        const logParams = new URLSearchParams({
          from: opts.range[0].format("YYYY-MM-DD"),
          to: opts.range[1].format("YYYY-MM-DD"),
        });
        const logRes = await fetch(`/api/hrms/attendance/log?${logParams}`);
        const logJson = await logRes.json().catch(() => ({}));
        if (logRes.ok && !logJson?.error) {
          const logRows: Array<{
            day: string;
            id: string;
            inAddress?: string;
            outAddress?: string;
            inLat?: number | null;
            inLng?: number | null;
            outLat?: number | null;
            outLng?: number | null;
          }> = logJson?.data?.rows ?? [];
          const locByKey = new Map(
            logRows.map((row) => [
              `${row.id}|${row.day}`,
              row,
            ]),
          );
          dailyRows = dailyRows.map((row) => {
            const loc = locByKey.get(`${row.employeeId}|${row.day}`);
            if (!loc) return row;
            return {
              ...row,
              inAddress: loc.inAddress,
              outAddress: loc.outAddress,
              inLat: loc.inLat,
              inLng: loc.inLng,
              outLat: loc.outLat,
              outLng: loc.outLng,
            };
          });
        }
      }

      setKpi(json.data.kpi ?? EMPTY_KPI);
      setWorkingDays(json.data.workingDays ?? 0);
      setGpsSummary(json.data.gpsSummary ?? EMPTY_GPS);
      setSummary(rows);
      setDaily(dailyRows);
    } catch {
      applyEmpty();
      message.warning("Could not load attendance report");
    } finally {
      setLoading(false);
    }
  };

  const defaultPeriod = isDaily ? "today" : "month";
  const defaultRange = (): [dayjs.Dayjs, dayjs.Dayjs] =>
    isDaily
      ? [dayjs().startOf("day"), dayjs().endOf("day")]
      : [dayjs().startOf("month"), dayjs().endOf("month")];

  const handleApply = () => {
    let newRange = range;
    if (period === "today") {
      const today = dayjs();
      newRange = [today.startOf("day"), today.endOf("day")];
      setRange(newRange);
    } else if (period === "date") {
      newRange = [range[0].startOf("day"), range[0].endOf("day")];
      setRange(newRange);
    } else if (period === "last") {
      const last = dayjs().subtract(1, "month");
      newRange = [last.startOf("month"), last.endOf("month")];
      setRange(newRange);
    } else if (period === "month") {
      newRange = [dayjs().startOf("month"), dayjs().endOf("month")];
      setRange(newRange);
    }
    void load({ dept, shift, unit, employeeId, range: newRange });
  };

  const handleClearFilters = () => {
    const nextRange = defaultRange();
    setPeriod(defaultPeriod);
    setDept("all");
    setShift("all");
    setUnit("all");
    setEmployeeId(undefined);
    setSearch("");
    setRange(nextRange);
    void load({
      dept: "all",
      shift: "all",
      unit: "all",
      employeeId: undefined,
      range: nextRange,
    });
  };

  const buildCsvUrl = () => {
    const params = new URLSearchParams({
      from: range[0].format("YYYY-MM-DD"),
      to: range[1].format("YYYY-MM-DD"),
    });
    if (dept !== "all") params.set("department", dept);
    if (shift !== "all") params.set("shift", shift);
    if (unit !== "all") params.set("locationUnit", unit);
    if (employeeId) params.set("employeeId", employeeId);
    return params;
  };

  const units = useMemo(
    () => [...new Set(summary.map((s) => s.locationUnit).filter(Boolean))].sort(),
    [summary]
  );

  const searchedSummary = useMemo(
    () =>
      filterBySearch(summary, search, (r) => [
        r.employeeId,
        r.employeeName,
        r.department,
        r.designation,
        r.locationUnit,
        r.primaryShift,
      ]),
    [summary, search]
  );

  const searchedDaily = useMemo(
    () =>
      filterBySearch(daily, search, (r) => [
        r.employeeId,
        r.employeeName,
        r.department,
        r.locationUnit,
        r.primaryShift,
        r.day,
      ]),
    [daily, search]
  );

  const rangeFrom = range[0].format("YYYY-MM-DD");
  const rangeTo = range[1].format("YYYY-MM-DD");

  const weeklyTrend = useMemo((): WeeklyTrendPoint[] => {
    if (!searchedDaily.length) return [];
    const rangeStart = dayjs(rangeFrom).startOf("day");
    const buckets = new Map<number, { present: number; absent: number }>();
    for (const row of searchedDaily) {
      const weekIndex = Math.floor(dayjs(row.day).diff(rangeStart, "day") / 7);
      const cur = buckets.get(weekIndex) ?? { present: 0, absent: 0 };
      if (row.present) cur.present += 1;
      if (row.absent) cur.absent += 1;
      buckets.set(weekIndex, cur);
    }
    return [...buckets.entries()]
      .sort(([a], [b]) => a - b)
      .map(([idx, v]) => ({
        week: `W${idx + 1}`,
        present: v.present,
        absent: v.absent,
      }));
  }, [searchedDaily, rangeFrom, rangeTo]);

  const deptBreakdown = useMemo((): DeptBreakdownPoint[] => {
    const map = new Map<string, { present: number; absent: number }>();
    for (const s of searchedSummary) {
      const cur = map.get(s.department) ?? { present: 0, absent: 0 };
      cur.present += s.presentDays;
      cur.absent += s.absentDays;
      map.set(s.department, cur);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dept, v]) => {
        const total = v.present + v.absent || 1;
        return { dept, presentPct: Math.round((v.present / total) * 100) };
      });
  }, [searchedSummary]);

  const fieldRows = useMemo(
    () => searchedSummary.filter((s) => /sales|field/i.test(s.department)),
    [searchedSummary]
  );

  const officeStats = useMemo(() => {
    const fieldDays = fieldRows.reduce((a, s) => a + s.presentDays, 0);
    const totalPresent = searchedSummary.reduce((a, s) => a + s.presentDays, 0);
    const inOfficeDays = totalPresent - fieldDays;
    const totalExpected = summary.length * workingDays || 1;
    return {
      inOfficePct: Math.round((inOfficeDays / totalExpected) * 100),
      fieldPct: Math.round((fieldDays / totalExpected) * 100),
      inOfficeDays,
      fieldDays,
      fieldEmployees: fieldRows.length,
      totalEmployees: searchedSummary.length,
    };
  }, [searchedSummary, fieldRows, workingDays]);

  const unitTable = useMemo(() => {
    const map = new Map<
      string,
      { unit: string; employees: number; present: number; absent: number; late: number; inOffice: number; fieldDays: number }
    >();
    for (const s of searchedSummary) {
      const key = s.locationUnit || "—";
      const cur = map.get(key) ?? {
        unit: key, employees: 0, present: 0, absent: 0, late: 0, inOffice: 0, fieldDays: 0,
      };
      const isField = /sales|field/i.test(s.department);
      cur.employees += 1;
      cur.present += s.presentDays;
      cur.absent += s.absentDays;
      cur.late += s.lateDays;
      if (isField) cur.fieldDays += s.presentDays;
      else cur.inOffice += s.presentDays;
      map.set(key, cur);
    }
    return Array.from(map.values()).map((u) => {
      const total = u.present + u.absent || 1;
      return { ...u, compliance: Math.round((u.present / total) * 100) };
    });
  }, [searchedSummary]);

  const deptCompliance = useMemo(() => {
    const map = new Map<string, { department: string; present: number; absent: number; late: number }>();
    for (const s of searchedSummary) {
      const cur = map.get(s.department) ?? {
        department: s.department, present: 0, absent: 0, late: 0,
      };
      cur.present += s.presentDays;
      cur.absent += s.absentDays;
      cur.late += s.lateDays;
      map.set(s.department, cur);
    }
    return Array.from(map.values()).map((d) => {
      const total = d.present + d.absent || 1;
      const presentPct = Math.round((d.present / total) * 100);
      let text: "Good" | "Review" | "Poor" = "Good";
      let color: "success" | "warning" | "error" = "success";
      if (presentPct < 95) { text = "Review"; color = "warning"; }
      if (presentPct < 85) { text = "Poor"; color = "error"; }
      return { ...d, presentPct, absentPct: 100 - presentPct, text, color };
    });
  }, [searchedSummary]);

  const rangeLabel = useMemo(() => {
    if (
      period === "today" ||
      period === "date" ||
      range[0].isSame(range[1], "day")
    ) {
      return range[0].format("DD MMM YYYY");
    }
    if (
      range[0].isSame(range[1], "month") &&
      range[0].date() === 1 &&
      range[1].date() === range[1].daysInMonth()
    ) {
      return range[0].format("MMM YYYY");
    }
    return `${range[0].format("DD MMM YYYY")} – ${range[1].format("DD MMM YYYY")}`;
  }, [range, period]);

  return {
    range, setRange,
    dept, setDept,
    employeeId, setEmployeeId,
    shift, setShift,
    unit, setUnit,
    period, setPeriod,
    search, setSearch,
    departments, units,
    loading,
    kpi, workingDays, gpsSummary,
    summary: searchedSummary,
    daily: searchedDaily,
    weeklyTrend, deptBreakdown,
    fieldRows, officeStats, unitTable, deptCompliance,
    handleApply, handleClearFilters, buildCsvUrl,
    rangeLabel,
  };
}
