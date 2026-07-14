import dayjs from "dayjs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const BRAND = { r: 55, g: 77, b: 149 };

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function downloadGenericTablePdf(
  title: string,
  subtitle: string,
  head: string[],
  body: (string | number)[][]
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, pageW, 36, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(title, margin, 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(subtitle, margin, 23);

  doc.setTextColor(90, 90, 90);
  doc.setFontSize(9);
  doc.text(
    `Generated on ${dayjs().format("dddd, DD MMMM YYYY")}`,
    pageW - margin,
    30,
    { align: "right" }
  );

  const y = 44;

  if (body.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text("No records for this report.", margin, y);
    doc.save(`${slugify(title)}-${dayjs().format("YYYY-MM-DD")}.pdf`);
    return;
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [head],
    body,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2.5,
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

  doc.save(`${slugify(title)}-${dayjs().format("YYYY-MM-DD")}.pdf`);
}
