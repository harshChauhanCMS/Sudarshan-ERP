import dayjs from "dayjs";
import type { AttendanceDailyRow } from "@/hooks/use-attendance-report";

export async function downloadPunchReportExcel(
  dailyRows: AttendanceDailyRow[],
  filenamePrefix = "punch-report"
) {
  if (dailyRows.length === 0) return;

  const headers = [
    "Employee Id",
    "Employee Name",
    "Department",
    "Location Unit",
    "Shift",
    "Date",
    "Punch In",
    "Punch Out",
  ];
  const rows = dailyRows.map((row) => {
    const formattedDate = row.day ? dayjs(row.day).format("DD-MM-YYYY") : "";
    return [
      row.employeeId,
      row.employeeName,
      row.department,
      row.locationUnit ?? "",
      row.primaryShift ?? "",
      formattedDate,
      row.inAt ? dayjs(row.inAt).format("DD-MM-YYYY H:mm") : "",
      row.outAt ? dayjs(row.outAt).format("DD-MM-YYYY H:mm") : "",
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
  XLSX.utils.book_append_sheet(wb, ws, "Punch Report");
  XLSX.writeFile(wb, `${filenamePrefix}-${dayjs().format("YYYY-MM-DD")}.xlsx`);
}
