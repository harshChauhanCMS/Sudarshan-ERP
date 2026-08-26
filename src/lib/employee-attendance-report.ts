import dayjs from "dayjs";
import type { AttendanceDailyRow } from "@/lib/attendance-report-dummy";
import { formatWorkedDuration } from "@/lib/format-duration";
import { API_LEAVE_LABELS } from "@/lib/leave-apply";

export type EmployeeLeaveRow = {
  _id?: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  days: number;
  status: string;
  reason?: string;
};

export type EmployeeDailyReportRow = AttendanceDailyRow & {
  leaveType?: string;
  leaveLabel?: string;
  onLeave: boolean;
};

export type EmployeeDailyChartPoint = {
  day: string;
  label: string;
  late: number;
  leave: number;
  present: number;
  absent: number;
};

export function leaveTypeLabel(type: string) {
  return API_LEAVE_LABELS[type] ?? type;
}

export function expandLeaveDays(
  leaves: EmployeeLeaveRow[],
  from: string,
  to: string,
): Map<string, { leaveType: string; leaveLabel: string }> {
  const map = new Map<string, { leaveType: string; leaveLabel: string }>();
  const rangeStart = dayjs(from);
  const rangeEnd = dayjs(to);

  for (const leave of leaves) {
    if (!["approved", "hod_approved"].includes(leave.status)) continue;
    const start = dayjs(leave.fromDate);
    const end = dayjs(leave.toDate);
    if (!start.isValid() || !end.isValid()) continue;
    if (end.isBefore(rangeStart, "day") || start.isAfter(rangeEnd, "day")) continue;

    let cur = start.isBefore(rangeStart, "day") ? rangeStart : start;
    const last = end.isAfter(rangeEnd, "day") ? rangeEnd : end;
    while (!cur.isAfter(last, "day")) {
      if (cur.day() !== 0) {
        const key = cur.format("YYYY-MM-DD");
        map.set(key, {
          leaveType: leave.leaveType,
          leaveLabel: leaveTypeLabel(leave.leaveType),
        });
      }
      cur = cur.add(1, "day");
    }
  }

  return map;
}

export function buildEmployeeDailyReport(
  daily: AttendanceDailyRow[],
  leaveByDay: Map<string, { leaveType: string; leaveLabel: string }>,
): EmployeeDailyReportRow[] {
  return [...daily]
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((row) => {
      const leave = leaveByDay.get(row.day);
      return {
        ...row,
        onLeave: !!leave,
        leaveType: leave?.leaveType,
        leaveLabel: leave?.leaveLabel,
      };
    });
}

export function buildEmployeeChartData(
  rows: EmployeeDailyReportRow[],
): EmployeeDailyChartPoint[] {
  return rows.map((row) => ({
    day: row.day,
    label: dayjs(row.day).format("DD MMM"),
    late: row.late ? 1 : 0,
    leave: row.onLeave ? 1 : 0,
    present: row.present ? 1 : 0,
    absent: row.absent && !row.onLeave ? 1 : 0,
  }));
}

export function employeeReportToCsv(
  employee: { employeeId: string; employeeName: string },
  rangeLabel: string,
  rows: EmployeeDailyReportRow[],
) {
  const header = [
    "Employee ID",
    "Employee Name",
    "Period",
    "Date",
    "Day",
    "In",
    "Out",
    "Worked (h m)",
    "Present",
    "Absent",
    "Late",
    "On Leave",
    "Leave Type",
  ];

  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[,"\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };

  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        employee.employeeId,
        employee.employeeName,
        rangeLabel,
        row.day,
        dayjs(row.day).format("dddd"),
        row.inAt ? dayjs(row.inAt).format("HH:mm") : "",
        row.outAt ? dayjs(row.outAt).format("HH:mm") : "",
        formatWorkedDuration(row.workedHours),
        row.present ? "Yes" : "No",
        row.absent && !row.onLeave ? "Yes" : "No",
        row.late ? "Yes" : "No",
        row.onLeave ? "Yes" : "No",
        row.leaveLabel ?? "",
      ]
        .map(escape)
        .join(","),
    );
  }
  return lines.join("\n");
}

export function downloadEmployeeReportCsv(
  employee: { employeeId: string; employeeName: string },
  rangeLabel: string,
  rows: EmployeeDailyReportRow[],
) {
  const csv = employeeReportToCsv(employee, rangeLabel, rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `employee-report-${employee.employeeId}-${dayjs().format("YYYY-MM-DD")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
