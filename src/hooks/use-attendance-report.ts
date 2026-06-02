import { useState, useMemo, useEffect } from "react";
import dayjs from "dayjs";
import { message } from "antd";
import {
  getAttendanceReportDummy,
  isAttendanceReportEmpty,
  isAttendanceReportSparse,
  type AttendanceSummaryRow,
  type AttendanceDailyRow,
  type AttendanceReportKpi,
  type AttendanceGpsSummary,
  type WeeklyTrendPoint,
  type DeptBreakdownPoint,
} from "@/lib/attendance-report-dummy";

export type {
  AttendanceSummaryRow,
  AttendanceDailyRow,
  AttendanceReportKpi,
  AttendanceGpsSummary,
  WeeklyTrendPoint,
  DeptBreakdownPoint,
};

export function useAttendanceReport() {
  const dummy = getAttendanceReportDummy();

  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<string[]>(() => dummy.departments);
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [dept, setDept] = useState("all");
  const [employeeId, setEmployeeId] = useState<string | undefined>(undefined);
  const [shift, setShift] = useState("all");
  const [unit, setUnit] = useState("all");
  const [period, setPeriod] = useState("month");
  const [kpi, setKpi] = useState<AttendanceReportKpi | null>(() => dummy.kpi);
  const [workingDays, setWorkingDays] = useState(() => dummy.workingDays);
  const [gpsSummary, setGpsSummary] = useState<AttendanceGpsSummary | null>(
    () => dummy.gpsSummary
  );
  const [summary, setSummary] = useState<AttendanceSummaryRow[]>(() => dummy.summary);
  const [daily, setDaily] = useState<AttendanceDailyRow[]>(() => dummy.daily);
  const [usingDummy, setUsingDummy] = useState(true);
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrendPoint[]>(() => dummy.weeklyTrend);
  const [deptBreakdown, setDeptBreakdown] = useState<DeptBreakdownPoint[]>(
    () => dummy.deptBreakdown
  );

  useEffect(() => {
    fetch("/api/hrms/departments")
      .then((r) => r.json())
      .then((j) => {
        const fromApi: string[] = j?.data || [];
        if (fromApi.length) {
          setDepartments([...new Set([...dummy.departments, ...fromApi])]);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filterDailyByEmployee = (
    rows: AttendanceDailyRow[],
    empId?: string
  ) => (empId ? rows.filter((r) => r.employeeId === empId) : rows);

  const applyDummy = (month?: string, empId?: string) => {
    const demo = getAttendanceReportDummy(month);
    const dailyRows = filterDailyByEmployee(demo.daily, empId);
    setKpi(demo.kpi);
    setWorkingDays(demo.workingDays);
    setGpsSummary(demo.gpsSummary);
    setSummary(demo.summary);
    setDaily(dailyRows);
    setDepartments(demo.departments);
    setWeeklyTrend(demo.weeklyTrend);
    setDeptBreakdown(demo.deptBreakdown);
    setUsingDummy(true);
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
      if (opts.employeeId) params.set("employeeId", opts.employeeId);

      const res = await fetch(`/api/hrms/attendance/report/extended?${params}`);
      const json = await res.json();
      if (!res.ok || json?.error) throw new Error(json?.error ?? "Failed");

      let rows: AttendanceSummaryRow[] = json.data.summary ?? [];
      if (opts.unit !== "all") {
        rows = rows.filter((r) => r.locationUnit === opts.unit);
      }

      if (
        isAttendanceReportEmpty(rows) ||
        rows.length < 3 ||
        isAttendanceReportSparse(rows)
      ) {
        applyDummy(opts.range[0].format("YYYY-MM"), opts.employeeId);
        return;
      }

      let dailyRows: AttendanceDailyRow[] = json.data.daily ?? [];
      dailyRows = filterDailyByEmployee(dailyRows, opts.employeeId);

      const demo = getAttendanceReportDummy(opts.range[0].format("YYYY-MM"));

      setKpi(json.data.kpi);
      setWorkingDays(json.data.workingDays ?? 20);
      setGpsSummary(json.data.gpsSummary ?? demo.gpsSummary);
      setSummary(rows);
      setDaily(dailyRows);
      setWeeklyTrend(
        json.data.weeklyTrend?.length ? json.data.weeklyTrend : demo.weeklyTrend
      );
      setDeptBreakdown(
        json.data.deptBreakdown?.length ? json.data.deptBreakdown : demo.deptBreakdown
      );
      setUsingDummy(false);
    } catch {
      applyDummy(opts.range[0].format("YYYY-MM"), opts.employeeId);
      message.warning("Showing demo data — live report could not be loaded");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    let newRange = range;
    if (period === "last") {
      const last = dayjs().subtract(1, "month");
      newRange = [last.startOf("month"), last.endOf("month")];
      setRange(newRange);
    } else if (period === "month") {
      newRange = [dayjs().startOf("month"), dayjs().endOf("month")];
      setRange(newRange);
    }
    void load({ dept, shift, unit, employeeId, range: newRange });
  };

  const buildCsvUrl = () => {
    const params = new URLSearchParams({
      from: range[0].format("YYYY-MM-DD"),
      to: range[1].format("YYYY-MM-DD"),
    });
    if (dept !== "all") params.set("department", dept);
    if (shift !== "all") params.set("shift", shift);
    if (employeeId) params.set("employeeId", employeeId);
    return params;
  };

  const units = useMemo(
    () => [...new Set(summary.map((s) => s.locationUnit).filter(Boolean))].sort(),
    [summary]
  );

  const fieldRows = useMemo(
    () => summary.filter((s) => /sales|field/i.test(s.department)),
    [summary]
  );

  const officeStats = useMemo(() => {
    const fieldDays = fieldRows.reduce((a, s) => a + s.presentDays, 0);
    const totalPresent = summary.reduce((a, s) => a + s.presentDays, 0);
    const inOfficeDays = totalPresent - fieldDays;
    const totalExpected = summary.length * workingDays || 1;
    return {
      inOfficePct: Math.round((inOfficeDays / totalExpected) * 100),
      fieldPct: Math.round((fieldDays / totalExpected) * 100),
      inOfficeDays,
      fieldDays,
      fieldEmployees: fieldRows.length,
      totalEmployees: summary.length,
    };
  }, [summary, fieldRows, workingDays]);

  const unitTable = useMemo(() => {
    const map = new Map<
      string,
      { unit: string; employees: number; present: number; absent: number; late: number; inOffice: number; fieldDays: number }
    >();
    for (const s of summary) {
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
  }, [summary]);

  const deptCompliance = useMemo(() => {
    const map = new Map<string, { department: string; present: number; absent: number; late: number }>();
    for (const s of summary) {
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
  }, [summary]);

  return {
    range, setRange,
    dept, setDept,
    employeeId, setEmployeeId,
    shift, setShift,
    unit, setUnit,
    period, setPeriod,
    departments, units,
    loading,
    usingDummy,
    kpi, workingDays, gpsSummary, summary, daily, weeklyTrend, deptBreakdown,
    fieldRows, officeStats, unitTable, deptCompliance,
    handleApply, buildCsvUrl,
    rangeLabel: range[0].format("MMM YYYY"),
  };
}
