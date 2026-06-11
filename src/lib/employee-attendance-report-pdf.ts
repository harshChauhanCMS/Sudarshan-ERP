import dayjs from "dayjs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { EmployeeDailyReportRow } from "@/lib/employee-attendance-report";

const BRAND = { r: 55, g: 77, b: 149 };

type EmployeeInfo = {
  employeeId: string;
  employeeName: string;
  department?: string;
  primaryShift?: string;
};

function attendanceStatus(row: EmployeeDailyReportRow) {
  const parts: string[] = [];
  if (row.onLeave) parts.push("Leave");
  if (row.absent && !row.onLeave) parts.push("Absent");
  if (row.present) parts.push("Present");
  if (row.late) parts.push("Late");
  return parts.length ? parts.join(", ") : "—";
}

export function downloadEmployeeAttendanceReportPdf(
  employee: EmployeeInfo,
  rangeLabel: string,
  rows: EmployeeDailyReportRow[],
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, pageW, 36, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Employee Attendance Report", margin, 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`${employee.employeeName} (${employee.employeeId})`, margin, 23);
  doc.text(rangeLabel, margin, 30);

  doc.setTextColor(90, 90, 90);
  doc.setFontSize(9);
  doc.text(`Generated on ${dayjs().format("dddd, DD MMMM YYYY")}`, pageW - margin, 30, {
    align: "right",
  });

  let y = 44;
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);

  const meta: string[] = [];
  if (employee.department) meta.push(`Department: ${employee.department}`);
  if (employee.primaryShift) meta.push(`Shift: ${employee.primaryShift}`);
  if (meta.length) {
    doc.text(meta.join("   ·   "), margin, y);
    y += 6;
  }

  const present = rows.filter((r) => r.present).length;
  const absent = rows.filter((r) => r.absent && !r.onLeave).length;
  const late = rows.filter((r) => r.late).length;
  const leave = rows.filter((r) => r.onLeave).length;

  doc.setFont("helvetica", "bold");
  doc.text("Summary", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(
    `${present} present · ${absent} absent · ${late} late · ${leave} leave days`,
    margin,
    y,
  );
  y += 8;

  if (rows.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text("No daily records for this period.", margin, y);
    doc.save(
      `employee-report-${employee.employeeId}-${dayjs().format("YYYY-MM-DD")}.pdf`,
    );
    return;
  }

  const body = rows.map((row, i) => [
    String(i + 1),
    dayjs(row.day).format("DD MMM YYYY"),
    dayjs(row.day).format("ddd"),
    row.inAt ? dayjs(row.inAt).format("HH:mm") : "—",
    row.outAt ? dayjs(row.outAt).format("HH:mm") : "—",
    row.workedHours?.toFixed(2) ?? "0.00",
    attendanceStatus(row),
    row.leaveLabel ?? "—",
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["#", "Date", "Day", "In", "Out", "Worked (h)", "Status", "Leave type"]],
    body,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2.5,
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [BRAND.r, BRAND.g, BRAND.b],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "left",
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 26 },
      2: { cellWidth: 14 },
      3: { cellWidth: 14 },
      4: { cellWidth: 14 },
      5: { cellWidth: 18, halign: "right" },
      6: { cellWidth: 32 },
      7: { cellWidth: "auto" },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(130, 130, 130);
      doc.text(
        `Sudarshan ERP · ${employee.employeeId} · Page ${data.pageNumber} of ${pageCount}`,
        pageW / 2,
        pageH - 8,
        { align: "center" },
      );
    },
  });

  doc.save(
    `employee-report-${employee.employeeId}-${dayjs().format("YYYY-MM-DD")}.pdf`,
  );
}
