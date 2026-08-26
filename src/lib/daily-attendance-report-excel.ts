import dayjs from "dayjs";
import type { AttendanceDailyRow, AttendanceSummaryRow } from "@/hooks/use-attendance-report";

function fmtHoursColon(decimalHours: number | null | undefined) {
  const hours = typeof decimalHours === "number" && Number.isFinite(decimalHours) ? decimalHours : 0;
  const totalMinutes = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

function attendanceStatusLabel(row: AttendanceDailyRow) {
  if (row.holiday && !row.present) return `Holiday — ${row.holiday.name}`;
  if (row.absent) return "Absent";
  if (row.late && row.present) return "Present (Late)";
  if (row.late) return "Late";
  if (!row.inAt || !row.outAt) return "Single Punch";
  return "Present";
}

export async function downloadDailyAttendanceReportExcel(
  dailyRows: AttendanceDailyRow[],
  summaryRows: AttendanceSummaryRow[] = [],
  filenamePrefix = "daily-attendance"
) {
  if (dailyRows.length === 0) return;
  const designationByEmployee = new Map(
    summaryRows.map((s) => [s.employeeId, s.designation])
  );

  const headers = [
    "Employee Id",
    "Employee Name",
    "Department",
    "Designation",
    "Location Unit",
    "Shift",
    "In Date",
    "In time",
    "Out Date",
    "Out time",
    "Working Hours",
    "Over Time",
    "Attendance Status",
    "Approval Status",
  ];
  const rows = dailyRows.map((row) => {
    const formattedDate = row.day ? dayjs(row.day).format("DD-MM-YYYY") : "";
    return [
      row.employeeId,
      row.employeeName,
      row.department,
      designationByEmployee.get(row.employeeId) ?? "",
      row.locationUnit ?? "",
      row.primaryShift ?? "",
      row.inAt ? dayjs(row.inAt).format("DD-MM-YYYY") : formattedDate,
      row.inAt ? dayjs(row.inAt).format("H:mm") : "0:00",
      row.outAt ? dayjs(row.outAt).format("DD-MM-YYYY") : formattedDate,
      row.outAt ? dayjs(row.outAt).format("H:mm") : "0:00",
      fmtHoursColon(row.workedHours),
      fmtHoursColon(row.overtime),
      attendanceStatusLabel(row),
      "",
    ];
  });

  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = headers.map((h, i) => {
    let maxLen = h.length;
    for (const row of rows) {
      const len = String(row[i] ?? "").length;
      if (len > maxLen) maxLen = len;
    }
    return { wch: Math.min(Math.max(maxLen + 2, 10), 42) };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");
  XLSX.writeFile(wb, `${filenamePrefix}-${dayjs().format("YYYY-MM-DD")}.xlsx`);
}
