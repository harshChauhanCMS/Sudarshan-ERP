import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { message } from "antd";
import type { AttendanceDailyRow } from "@/lib/attendance-report-dummy";
import {
  buildEmployeeChartData,
  buildEmployeeDailyReport,
  expandLeaveDays,
  type EmployeeDailyReportRow,
  type EmployeeLeaveRow,
} from "@/lib/employee-attendance-report";
import type { HolidayInfo } from "@/lib/holiday-rules";

export type EmployeeReportProfile = {
  employeeId: string;
  employeeName: string;
  department?: string;
  primaryShift?: string;
  weeklyOff?: string;
};

export function useEmployeeAttendanceReport(
  employeeId: string | undefined,
  from: string,
  to: string,
) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<EmployeeDailyReportRow[]>([]);
  const [holidays, setHolidays] = useState<HolidayInfo[]>([]);
  const [employee, setEmployee] = useState<EmployeeReportProfile | null>(null);

  useEffect(() => {
    if (!employeeId || !from || !to) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          from,
          to,
          employeeId,
        });

        const [reportRes, leaveRes] = await Promise.all([
          fetch(`/api/hrms/attendance/report/extended?${params}`),
          fetch(`/api/hrms/leave?employeeId=${encodeURIComponent(employeeId)}`),
        ]);

        const reportJson = await reportRes.json();
        const leaveJson = await leaveRes.json();

        if (!reportRes.ok) {
          throw new Error(reportJson?.error || "Failed to load attendance");
        }

        const daily: AttendanceDailyRow[] = reportJson.data?.daily ?? [];
        const summaryRow = (reportJson.data?.summary ?? []).find(
          (s: { employeeId?: string }) => s.employeeId === employeeId,
        );

        const leaves: EmployeeLeaveRow[] = (leaveJson.data ?? []).map(
          (l: Record<string, unknown>) => ({
            leaveType: String(l.leaveType ?? ""),
            fromDate: String(l.fromDate ?? ""),
            toDate: String(l.toDate ?? ""),
            days: Number(l.days ?? 0),
            status: String(l.status ?? ""),
            reason: typeof l.reason === "string" ? l.reason : "",
          }),
        );

        const leaveByDay = expandLeaveDays(leaves, from, to);

        if (!cancelled) {
          setEmployee(
            summaryRow
              ? {
                  employeeId: summaryRow.employeeId,
                  employeeName: summaryRow.employeeName,
                  department: summaryRow.department,
                  primaryShift: summaryRow.primaryShift,
                  weeklyOff: summaryRow.weeklyOff,
                }
              : { employeeId, employeeName: employeeId },
          );
          setRows(buildEmployeeDailyReport(daily, leaveByDay));
          setHolidays(reportJson.data?.holidays ?? []);
        }
      } catch (e) {
        if (!cancelled) {
          setRows([]);
          setHolidays([]);
          setEmployee(
            employeeId ? { employeeId, employeeName: employeeId } : null,
          );
          message.error(e instanceof Error ? e.message : "Failed to load report");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [employeeId, from, to]);

  const chartData = useMemo(() => buildEmployeeChartData(rows), [rows]);

  const holidayDays = useMemo(
    () => new Set(holidays.map((h) => h.date)),
    [holidays],
  );

  const summary = useMemo(
    () => ({
      present: rows.filter((r) => r.present).length,
      // A holiday is never an absence, even when nothing was punched.
      absent: rows.filter(
        (r) => r.absent && !r.onLeave && !holidayDays.has(r.day),
      ).length,
      late: rows.filter((r) => r.late).length,
      // …and never counted as leave either.
      leave: rows.filter((r) => r.onLeave && !holidayDays.has(r.day)).length,
      holiday: holidays.length,
    }),
    [rows, holidays, holidayDays],
  );

  return { loading, rows, holidays, chartData, summary, employee };
}
