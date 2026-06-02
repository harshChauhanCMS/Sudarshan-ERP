import dayjs from "dayjs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type HolidayPdfRow = {
  name: string;
  date: string;
  type: "national" | "regional" | "optional";
  description?: string;
};

const BRAND = { r: 55, g: 77, b: 149 };
const TYPE_LABEL: Record<HolidayPdfRow["type"], string> = {
  national: "National",
  regional: "Regional",
  optional: "Optional",
};

export function downloadHolidayCalendarPdf(
  holidays: HolidayPdfRow[],
  year: number,
  companyName = "Sudarshan Group",
) {
  const sorted = [...holidays].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, pageW, 36, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Company Holiday Calendar", margin, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`${companyName}`, margin, 24);
  doc.text(`Calendar year ${year}`, margin, 30);

  doc.setTextColor(90, 90, 90);
  doc.setFontSize(9);
  doc.text(`Generated on ${dayjs().format("dddd, DD MMMM YYYY")}`, pageW - margin, 30, {
    align: "right",
  });

  const counts = {
    national: sorted.filter((h) => h.type === "national").length,
    regional: sorted.filter((h) => h.type === "regional").length,
    optional: sorted.filter((h) => h.type === "optional").length,
  };

  let y = 44;
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Summary", margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `Total holidays: ${sorted.length}   ·   National: ${counts.national}   ·   Regional: ${counts.regional}   ·   Optional: ${counts.optional}`,
    margin,
    y,
  );
  y += 8;

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    "Legend: National = company-wide closed day · Regional = plant/location specific · Optional = restricted holiday",
    margin,
    y,
  );

  if (sorted.length === 0) {
    y += 12;
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text(`No holidays are recorded for ${year}.`, margin, y);
    doc.save(`holiday-calendar-${year}.pdf`);
    return;
  }

  const body = sorted.map((h, i) => [
    String(i + 1),
    dayjs(h.date).format("DD MMM YYYY"),
    dayjs(h.date).format("dddd"),
    h.name,
    TYPE_LABEL[h.type],
    h.description?.trim() || "—",
  ]);

  autoTable(doc, {
    startY: y + 6,
    margin: { left: margin, right: margin },
    head: [["#", "Date", "Day", "Holiday", "Type", "Description"]],
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
      1: { cellWidth: 28 },
      2: { cellWidth: 22 },
      3: { cellWidth: 52 },
      4: { cellWidth: 22 },
      5: { cellWidth: "auto" },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(130, 130, 130);
      doc.text(
        `Sudarshan ERP · Holiday calendar ${year} · Page ${data.pageNumber} of ${pageCount}`,
        pageW / 2,
        pageH - 8,
        { align: "center" },
      );
    },
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
    ?.finalY;
  if (finalY && finalY < doc.internal.pageSize.getHeight() - 24) {
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      "This document is for internal HR and employee reference. Confirm optional holidays with your manager before availing.",
      margin,
      finalY + 8,
      { maxWidth: pageW - margin * 2 },
    );
  }

  doc.save(`holiday-calendar-${year}.pdf`);
}
