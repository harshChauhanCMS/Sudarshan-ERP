import dayjs from "dayjs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const BRAND = { r: 55, g: 77, b: 149 };

export function downloadDepartmentAttendanceReportPdf(
  rangeLabel: string,
  deptCompliance: { department: string; presentPct: number; absentPct: number; late: number; text: string }[],
  kpi: any
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, pageW, 36, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Department Attendance Report", margin, 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(rangeLabel, margin, 23);

  doc.setTextColor(90, 90, 90);
  doc.setFontSize(9);
  doc.text(`Generated on ${dayjs().format("dddd, DD MMMM YYYY")}`, pageW - margin, 30, {
    align: "right",
  });

  let y = 44;
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);

  if (kpi) {
    doc.setFont("helvetica", "bold");
    doc.text("Company Summary", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    
    const presentAvg = kpi.totalEmployees ? (kpi.presentDays / kpi.totalEmployees).toFixed(1) : "0";
    
    doc.text(
      `Employees: ${kpi.totalEmployees} · Present days (avg): ${presentAvg} · Absent days (total): ${kpi.absentDays} · Late punches: ${kpi.lateDays}`,
      margin,
      y
    );
    y += 8;
  }

  if (deptCompliance.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text("No department records for this period.", margin, y);
    doc.save(`department-report-${dayjs().format("YYYY-MM-DD")}.pdf`);
    return;
  }

  const body = deptCompliance.map((row, i) => [
    String(i + 1),
    row.department,
    row.presentPct + "%",
    row.absentPct + "%",
    String(row.late),
    row.text,
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["#", "Department", "Present %", "Absent %", "Late (count)", "Compliance"]],
    body,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 3,
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
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 50 },
      2: { cellWidth: 25, halign: "right" },
      3: { cellWidth: 25, halign: "right" },
      4: { cellWidth: 25, halign: "right" },
      5: { cellWidth: "auto" },
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

  doc.save(`department-report-${dayjs().format("YYYY-MM-DD")}.pdf`);
}
