import dayjs from "dayjs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import type { AttendanceDailyRow } from "@/hooks/use-attendance-report";
import { formatWorkedDuration } from "@/lib/format-duration";

const BRAND = { r: 55, g: 77, b: 149 };

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return dayjs(iso).format("HH:mm");
}

function statusLabel(row: AttendanceDailyRow) {
  const parts: string[] = [];
  if (row.present) parts.push("Present");
  if (row.absent) parts.push("Absent");
  if (row.late) parts.push("Late");
  return parts.join(", ") || "—";
}

function locationLabel(
  address?: string,
  lat?: number | null,
  lng?: number | null
) {
  if (address?.trim()) return address.trim();
  if (lat != null && lng != null) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  return "—";
}

export function downloadDailyAttendanceReportPdf(
  rangeLabel: string,
  rows: AttendanceDailyRow[]
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  // ─── Branded header ───
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, pageW, 36, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Daily Attendance Report", margin, 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(rangeLabel, margin, 23);

  doc.setTextColor(90, 90, 90);
  doc.setFontSize(9);
  doc.text(
    `Generated on ${dayjs().format("dddd, DD MMMM YYYY")}`,
    pageW - margin,
    30,
    { align: "right" }
  );

  // ─── Quick summary line ───
  let y = 44;
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const presentCount = rows.filter((r) => r.present).length;
  const absentCount = rows.filter((r) => r.absent).length;
  const lateCount = rows.filter((r) => r.late).length;
  doc.text(
    `Total records: ${rows.length} · Present: ${presentCount} · Absent: ${absentCount} · Late: ${lateCount}`,
    margin,
    y
  );
  y += 8;

  if (rows.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text("No attendance records for this period.", margin, y);
    doc.save(`daily-attendance-${dayjs().format("YYYY-MM-DD")}.pdf`);
    return;
  }

  // ─── Table ───
  const body = rows.map((row, i) => [
    String(i + 1),
    row.day ? dayjs(row.day).format("DD MMM YYYY") : "—",
    row.employeeId,
    row.employeeName,
    row.department || "—",
    fmtTime(row.inAt),
    fmtTime(row.outAt),
    locationLabel(row.inAddress, row.inLat, row.inLng),
    locationLabel(row.outAddress, row.outLat, row.outLng),
    formatWorkedDuration(row.workedHours),
    statusLabel(row),
    row.shortfall > 0 ? `${row.shortfall.toFixed(2)}h` : "—",
    row.overtime > 0 ? `${row.overtime.toFixed(2)}h` : "—",
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [
      [
        "#",
        "Date",
        "Emp ID",
        "Name",
        "Dept",
        "In",
        "Out",
        "Punch In GPS",
        "Punch Out GPS",
        "Worked",
        "Status",
        "Shortfall",
        "OT",
      ],
    ],
    body,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: 2,
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [BRAND.r, BRAND.g, BRAND.b],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "left",
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 24 },
      2: { cellWidth: 18 },
      3: { cellWidth: 30 },
      4: { cellWidth: 22 },
      5: { cellWidth: 14, halign: "center" },
      6: { cellWidth: 14, halign: "center" },
      7: { cellWidth: 40 },
      8: { cellWidth: 40 },
      9: { cellWidth: 18, halign: "right" },
      10: { cellWidth: 22 },
      11: { cellWidth: 18, halign: "right" },
      12: { cellWidth: 14, halign: "right" },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(130, 130, 130);
      doc.text(
        `Sudarshan ERP · Page ${data.pageNumber} of ${pageCount}`,
        pageW / 2,
        pageH - 8,
        { align: "center" }
      );
    },
  });

  doc.save(`daily-attendance-${dayjs().format("YYYY-MM-DD")}.pdf`);
}
