import dayjs from "dayjs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Invoice, PurchaseOrder, Vendor } from "@/lib/entity-types";
import { INVOICE_STATUS_LABELS, normalizeInvoiceStatus } from "@/lib/procurement-workflow";

/**
 * The verified vendor invoice as a document — the record that ties the invoice
 * number, the purchase order and the goods receipt together on one page.
 *
 * The GRN line only appears once a receipt exists. An invoice still awaiting
 * verification prints without it rather than showing an empty box that reads
 * like a number was issued.
 */

const BAR = { r: 56, g: 79, b: 140 };
const TITLE = { r: 79, g: 110, b: 170 };
const INK = 35;
const GREY_FILL = 241;

const num = (n: number) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export type InvoicePdfInput = {
  invoice: Invoice;
  po?: PurchaseOrder | null;
  vendor?: Vendor | null;
  company?: { name: string; addressLines?: string[]; phone?: string } | null;
  logoDataUrl?: string | null;
};

export function invoicePdfFileName(invoice: Invoice): string {
  const base = invoice.grnNo || invoice.vendorInvoiceNo || invoice.id;
  return `${String(base).replace(/[^A-Za-z0-9._-]+/g, "-")}.pdf`;
}

function labelValue(doc: jsPDF, label: string, value: string, x: number, y: number) {
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  doc.setFont("helvetica", "normal");
  doc.text(label.toUpperCase(), x, y);
  doc.setFontSize(10);
  doc.setTextColor(INK, INK, INK);
  doc.setFont("helvetica", "bold");
  doc.text(value || "—", x, y + 5);
}

export function buildInvoicePdf({
  invoice,
  po,
  vendor,
  company,
  logoDataUrl,
}: InvoicePdfInput): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const right = pageW - margin;
  const status = normalizeInvoiceStatus(invoice.status);
  const issuer = company ?? { name: "Sudarshan Group" };

  // ── Letterhead ───────────────────────────────────────────────────────────
  let textX = margin;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", margin, 13, 16, 18, undefined, "FAST");
      textX = margin + 20;
    } catch {
      textX = margin;
    }
  }

  // The top-right slot names the goods receipt rather than the document
  // itself: this is a copy of a vendor invoice, but what a reader glances at
  // this corner for is whether — and when — the goods actually arrived.
  const grnLabel = invoice.grnNo ? `GOODS RECEIVED — ${invoice.grnNo}` : "GOODS RECEIVED";
  const grnDateLabel = invoice.grnAt ? dayjs(invoice.grnAt).format("DD MMM YYYY, hh:mm A") : "";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const grnLabelW = doc.getTextWidth(grnLabel);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const grnDateW = grnDateLabel ? doc.getTextWidth(grnDateLabel) : 0;
  const rightBlockW = Math.max(grnLabelW, grnDateW);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(27);
  doc.setTextColor(INK, INK, INK);
  let nameSize = 16;
  doc.setFontSize(nameSize);
  while (nameSize > 10 && doc.getTextWidth(issuer.name) > right - rightBlockW - 6 - textX) {
    nameSize -= 0.5;
    doc.setFontSize(nameSize);
  }
  doc.text(
    (doc.splitTextToSize(issuer.name, right - rightBlockW - 6 - textX) as string[]).slice(0, 2),
    textX,
    20,
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  (issuer.addressLines ?? []).slice(0, 2).forEach((line, i) => {
    doc.text(line, textX, 27 + i * 4.6);
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(22, 138, 82);
  doc.text(grnLabel, right, 18, { align: "right" });
  if (grnDateLabel) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    doc.text(grnDateLabel, right, 24, { align: "right" });
  }

  // ── Reference block: invoice, PO and GRN together ────────────────────────
  let y = 44;
  doc.setFillColor(BAR.r, BAR.g, BAR.b);
  doc.rect(margin, y, pageW - margin * 2, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("REFERENCES", margin + 2.5, y + 4.8);
  y += 13;

  const colW = (pageW - margin * 2) / 4;
  labelValue(doc, "Invoice no.", invoice.vendorInvoiceNo || invoice.id, margin, y);
  labelValue(doc, "Invoice date", invoice.invDate ? dayjs(invoice.invDate).format("DD MMM YYYY") : "", margin + colW, y);
  labelValue(doc, "PO number", invoice.po, margin + colW * 2, y);
  // Pending invoices have no receipt, and must not look as if they do.
  labelValue(doc, "GRN number", invoice.grnNo || "Not generated", margin + colW * 3, y);
  y += 14;

  labelValue(doc, "Status", INVOICE_STATUS_LABELS[status] ?? status, margin, y);
  labelValue(
    doc,
    "Goods received on",
    invoice.grnAt
      ? dayjs(invoice.grnAt).format("DD MMM YYYY")
      : invoice.receivedDate
        ? dayjs(invoice.receivedDate).format("DD MMM YYYY")
        : "",
    margin + colW,
    y,
  );
  labelValue(doc, "Challan / GRN ref", invoice.challanNo || "", margin + colW * 2, y);
  labelValue(
    doc,
    "Verified by",
    invoice.verifiedByName || invoice.verifiedByEmail || "",
    margin + colW * 3,
    y,
  );
  y += 16;

  // ── Vendor ───────────────────────────────────────────────────────────────
  doc.setFillColor(BAR.r, BAR.g, BAR.b);
  doc.rect(margin, y, pageW - margin * 2, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("VENDOR", margin + 2.5, y + 4.8);
  y += 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(INK, INK, INK);
  for (const line of [
    invoice.invoiceVendorName || vendor?.name || invoice.vendor,
    vendor?.contactPerson || "",
    vendor?.address || "",
    vendor?.gstin ? `GSTIN: ${vendor.gstin}` : "",
    vendor?.phone ? `Phone: ${vendor.phone}` : "",
  ].filter(Boolean)) {
    doc.text(String(line), margin, y);
    y += 4.6;
  }
  y += 4;

  // ── Items ────────────────────────────────────────────────────────────────
  const qty = Number(invoice.quantityReceived) || 0;
  const rate = Number(invoice.rate) || Number(po?.rate) || 0;
  const taxable = Number(invoice.subtotal) || Math.round(qty * rate * 100) / 100;
  const tax = Number(invoice.taxAmount) || 0;
  const total = Number(invoice.invAmt) || 0;
  const orderedQty = Number(po?.quantity) || 0;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["DESCRIPTION", "ORDERED", "RECEIVED", "RATE", "TAXABLE VALUE"]],
    body: [
      [
        [invoice.materialName || po?.materialName || "—", invoice.materialCode || po?.materialCode || ""]
          .filter(Boolean)
          .join("\n"),
        orderedQty ? `${orderedQty} ${po?.unit ?? ""}`.trim() : "—",
        qty ? `${qty} ${invoice.unit ?? ""}`.trim() : "—",
        num(rate),
        num(taxable),
      ],
    ],
    theme: "grid",
    styles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: [INK, INK, INK],
      lineColor: [170, 170, 170],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [BAR.r, BAR.g, BAR.b],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 26, halign: "center" },
      2: { cellWidth: 26, halign: "center" },
      3: { cellWidth: 28, halign: "right" },
      4: { cellWidth: 34, halign: "right", fillColor: [GREY_FILL, GREY_FILL, GREY_FILL] },
    },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // ── Totals ───────────────────────────────────────────────────────────────
  const labelW = 36;
  const valueW = 34;
  const totalsX = right - labelW - valueW;
  const rowH = 7;
  const rows: [string, string, boolean][] = [
    ["TAXABLE VALUE", num(taxable), false],
    ["TAX / GST", num(tax), false],
    ["INVOICE TOTAL", `Rs. ${num(total)}`, true],
  ];
  for (const [label, value, strong] of rows) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(INK, INK, INK);
    doc.text(label, totalsX + labelW - 2, y + rowH - 2.2, { align: "right" });
    if (strong) {
      doc.setFillColor(TITLE.r, TITLE.g, TITLE.b);
      doc.rect(totalsX + labelW, y, valueW, rowH, "F");
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setFillColor(GREY_FILL, GREY_FILL, GREY_FILL);
      doc.setDrawColor(170, 170, 170);
      doc.rect(totalsX + labelW, y, valueW, rowH, "FD");
      doc.setFont("helvetica", "normal");
    }
    doc.text(value, right - 2, y + rowH - 2.2, { align: "right" });
    y += rowH;
  }

  // ── Receipt confirmation ─────────────────────────────────────────────────
  y += 8;
  if (invoice.grnNo) {
    doc.setFillColor(22, 138, 82);
    doc.rect(margin, y, pageW - margin * 2, 9, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`GOODS RECEIVED — ${invoice.grnNo}`, margin + 3, y + 6.2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(
      invoice.grnAt ? dayjs(invoice.grnAt).format("DD MMM YYYY, hh:mm A") : "",
      right - 3,
      y + 6.2,
      { align: "right" },
    );
    y += 13;
    doc.setFontSize(9);
    doc.setTextColor(INK, INK, INK);
    doc.text(
      `${qty} ${invoice.unit ?? ""} received against purchase order ${invoice.po}${
        invoice.inventoryCode ? ` and taken into stock as ${invoice.inventoryCode}` : ""
      }.`,
      margin,
      y,
    );
    y += 6;
  } else {
    doc.setDrawColor(184, 106, 0);
    doc.setFillColor(255, 248, 235);
    doc.rect(margin, y, pageW - margin * 2, 12, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(138, 80, 0);
    doc.text(
      "No goods receipt yet — a GRN is issued when this invoice is verified.",
      margin + 3,
      y + 7.5,
    );
    y += 16;
  }

  if (invoice.verificationNote || invoice.reason) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(110, 110, 110);
    doc.text("VERIFICATION NOTE", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(INK, INK, INK);
    doc.text(
      doc.splitTextToSize(
        String(invoice.verificationNote || invoice.reason),
        pageW - margin * 2,
      ),
      margin,
      y + 5,
    );
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  doc.setDrawColor(226, 226, 226);
  doc.line(margin, pageH - 22, right, pageH - 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  doc.text(
    `Generated ${dayjs().format("DD MMM YYYY, hh:mm A")} · Sudarshan ERP`,
    margin,
    pageH - 16,
  );
  doc.text(`Internal reference ${invoice.id}`, right, pageH - 16, { align: "right" });

  return doc;
}
