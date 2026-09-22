import dayjs from "dayjs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { PurchaseOrder, Vendor } from "@/lib/entity-types";

/**
 * The purchase order as the classic one-page PO document: issuing company and
 * PO number at the top, vendor and ship-to blocks, the shipping strip, a line
 * -item table with its totals, comments, and a contact footer.
 *
 * The same builder backs the download and the copy emailed to the vendor, so
 * both are byte-for-byte identical.
 */

/** Dark blue of the section bars and table head. */
const BAR = { r: 56, g: 79, b: 140 };
/** Lighter blue of the "PURCHASE ORDER" wordmark and the grand-total row. */
const TITLE = { r: 79, g: 110, b: 170 };
const INK = 35;
const GREY_FILL = 241;

const num = (n: number) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export type PoPdfCompany = {
  name: string;
  addressLines?: string[];
  phone?: string;
  fax?: string;
  website?: string;
};

/** Path of the letterhead logo, overridable the same way the payslip's is. */
export const PO_LOGO_SRC =
  process.env.NEXT_PUBLIC_COMPANY_LOGO || "/sudarshan-group-logo.png";

/**
 * Reads the logo as a data URL so jsPDF can embed it. Browser-only, and
 * best-effort: a missing or blocked file just means a PO without a logo, never
 * a failed document.
 */
export async function loadPoLogo(src: string = PO_LOGO_SRC): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export type PoPdfInput = {
  po: PurchaseOrder;
  /** Letterhead logo as a data URL — see `loadPoLogo`. */
  logoDataUrl?: string | null;
  vendor?: Vendor | null;
  /** Issuing company printed top-left; defaults to the group name. */
  company?: PoPdfCompany | null;
  /** Delivery address block; defaults to the PO's delivery location. */
  shipTo?: string[];
  /** Readable delivery location ("Warehouse A — Main") for the F.O.B. cell. */
  deliveryLocationLabel?: string;
  /** Who raised it — the requisitioner, and the footer contact. */
  raisedBy?: string;
  raisedByEmail?: string;
  raisedByPhone?: string;
  /** Overrides the "raised at" stamp; defaults to now (i.e. creation time). */
  raisedAt?: Date;
  /**
   * Marks the document as a failed-invoice notice: the PO is reprinted with a
   * FAILED stamp and the verifier's reason, so the vendor can see exactly what
   * was rejected and against which order.
   */
  failure?: {
    reason: string;
    /** Invoice number the failure was recorded against, when there is one. */
    invoiceRef?: string;
    at?: Date;
  };
};

export function poPdfFileName(po: PurchaseOrder, failed = false): string {
  const base = String(po.id || "purchase-order").replace(/[^A-Za-z0-9._-]+/g, "-");
  return failed ? `${base}-invoice-failed.pdf` : `${base}.pdf`;
}

/** Filled section bar with white, letter-spaced caption. */
function bar(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  caption: string,
) {
  doc.setFillColor(BAR.r, BAR.g, BAR.b);
  doc.rect(x, y, w, h, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(caption.toUpperCase(), x + 2.5, y + h - 2.2);
}

function stack(doc: jsPDF, lines: string[], x: number, y: number, gap = 4.6) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(INK, INK, INK);
  let cursor = y;
  for (const raw of lines) {
    if (!raw) continue;
    doc.text(raw, x, cursor);
    cursor += gap;
  }
  return cursor;
}

export function buildPoPdf({
  po,
  vendor,
  company,
  logoDataUrl,
  shipTo,
  deliveryLocationLabel,
  raisedBy,
  raisedByEmail,
  raisedByPhone,
  raisedAt,
  failure,
}: PoPdfInput): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const right = pageW - margin;
  const stamp = dayjs(raisedAt ?? new Date());
  const issuer: PoPdfCompany = company ?? { name: "Sudarshan Group" };

  // ── Letterhead ───────────────────────────────────────────────────────────
  let textX = margin;
  if (logoDataUrl) {
    try {
      // 420×474 source — kept to that ratio so the mark is not stretched.
      doc.addImage(logoDataUrl, "PNG", margin, 13, 16, 18, undefined, "FAST");
      textX = margin + 20;
    } catch {
      // A logo that will not decode must not cost us the document.
      textX = margin;
    }
  }

  // The wordmark is fixed to the right edge, so the name gets exactly what is
  // left of it: measured, not guessed, then shrunk and wrapped to fit.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(27);
  const wordmarkW = doc.getTextWidth("PURCHASE ORDER");
  const nameLimit = right - wordmarkW - 6 - textX;

  doc.setTextColor(INK, INK, INK);
  let nameSize = 17;
  doc.setFontSize(nameSize);
  while (nameSize > 10 && doc.getTextWidth(issuer.name) > nameLimit) {
    nameSize -= 0.5;
    doc.setFontSize(nameSize);
  }
  const nameLines = (doc.splitTextToSize(issuer.name, nameLimit) as string[]).slice(0, 2);
  doc.text(nameLines, textX, 20);

  stack(
    doc,
    [
      ...(issuer.addressLines ?? []),
      issuer.phone ? `Phone: ${issuer.phone}` : "",
      issuer.fax ? `Fax: ${issuer.fax}` : "",
      issuer.website ? `Website: ${issuer.website}` : "",
    ].filter(Boolean),
    textX,
    nameLines.length > 1 ? 32 : 27,
  );

  // Wordmark + the boxed DATE / PO # pair, right-aligned.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(27);
  doc.setTextColor(TITLE.r, TITLE.g, TITLE.b);
  doc.text("PURCHASE ORDER", right, 20, { align: "right" });

  const boxW = 34;
  const boxH = 6.5;
  const boxX = right - boxW;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(INK, INK, INK);
  doc.setDrawColor(90, 90, 90);
  doc.setLineWidth(0.2);

  doc.text("DATE", boxX - 3, 30.5, { align: "right" });
  doc.rect(boxX, 26, boxW, boxH);
  doc.setFont("helvetica", "normal");
  doc.text(
    po.poDate ? dayjs(po.poDate).format("D/M/YYYY") : stamp.format("D/M/YYYY"),
    boxX + boxW / 2,
    30.5,
    { align: "center" },
  );

  doc.setFont("helvetica", "bold");
  doc.text("PO #", boxX - 3, 38.5, { align: "right" });
  doc.rect(boxX, 34, boxW, boxH);
  doc.setFont("helvetica", "normal");
  doc.text(String(po.id ?? ""), boxX + boxW / 2, 38.5, { align: "center" });

  // Time is not on the template's face, so it rides just under the PO box
  // — the document still has to say when it was raised.
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text(`Raised ${stamp.format("DD MMM YYYY, hh:mm A")}`, right, 43.5, {
    align: "right",
  });

  // ── VENDOR / SHIP TO ─────────────────────────────────────────────────────
  const colW = (pageW - margin * 2 - 6) / 2;
  const colRx = margin + colW + 6;
  let y = 52;

  bar(doc, margin, y, colW, 7, "Vendor");
  bar(doc, colRx, y, colW, 7, "Ship to");
  y += 12;

  const vendorLines = [
    vendor?.name || po.vendor || "",
    vendor?.contactPerson || "",
    vendor?.address || "",
    [vendor?.city, vendor?.gstin ? `GSTIN: ${vendor.gstin}` : ""]
      .filter(Boolean)
      .join(" · "),
    vendor?.phone ? `Phone: ${vendor.phone}` : "",
    po.vendorEmail || vendor?.email ? `Email: ${po.vendorEmail || vendor?.email}` : "",
  ].filter(Boolean);

  const shipToLines =
    shipTo && shipTo.length
      ? shipTo
      : [
          issuer.name,
          deliveryLocationLabel || po.deliveryLocation || "",
          ...(issuer.addressLines ?? []),
        ].filter(
          Boolean,
        );

  const afterVendor = stack(doc, vendorLines, margin, y);
  const afterShip = stack(doc, shipToLines, colRx, y);
  y = Math.max(afterVendor, afterShip) + 4;

  // ── Requisitioner strip ──────────────────────────────────────────────────
  const stripCols = [
    { caption: "Requisitioner", value: raisedBy || po.createdByName || po.createdByEmail || "" },
    { caption: "Ship via", value: "" },
    { caption: "F.O.B.", value: deliveryLocationLabel || po.deliveryLocation || "" },
    { caption: "Shipping terms", value: vendor?.paymentTerms || "" },
  ];
  const stripW = (pageW - margin * 2) / stripCols.length;
  stripCols.forEach((col, i) => {
    const x = margin + stripW * i;
    bar(doc, x, y, stripW, 7, col.caption);
    doc.setDrawColor(150, 150, 150);
    doc.rect(x, y + 7, stripW, 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(INK, INK, INK);
    if (col.value) {
      doc.text(doc.splitTextToSize(col.value, stripW - 4)[0], x + 2.5, y + 12.3);
    }
  });
  y += 21;

  // ── Line items ───────────────────────────────────────────────────────────
  const qty = Number(po.quantity) || 0;
  const rate = Number(po.rate) || 0;
  const amount = Number(po.total) || qty * rate;
  const description = [po.materialName, po.grade && po.grade !== "—" ? `Grade ${po.grade}` : ""]
    .filter(Boolean)
    .join(" · ");

  /**
   * Blank rows keep the fixed-height look of the printed template. A failure
   * notice gives some of them up: the reason block has to fit above the footer
   * on the same page.
   */
  const BLANK_ROWS = failure ? 5 : 12;
  const body: string[][] = [
    [
      po.materialCode ?? "",
      description || po.materialName || "",
      qty ? `${qty.toLocaleString("en-IN")}${po.unit ? ` ${po.unit}` : ""}` : "",
      num(rate),
      num(amount),
    ],
    ...Array.from({ length: BLANK_ROWS }, () => ["", "", "", "", "-"]),
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["ITEM #", "DESCRIPTION", "QTY", "UNIT PRICE", "TOTAL"]],
    body,
    theme: "grid",
    styles: {
      fontSize: 8.5,
      cellPadding: 1.8,
      textColor: [INK, INK, INK],
      lineColor: [170, 170, 170],
      lineWidth: 0.15,
      minCellHeight: 6,
    },
    headStyles: {
      fillColor: [BAR.r, BAR.g, BAR.b],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      fontSize: 8.5,
    },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 24, halign: "center" },
      3: { cellWidth: 28, halign: "right" },
      4: { cellWidth: 30, halign: "right", fillColor: [GREY_FILL, GREY_FILL, GREY_FILL] },
    },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // ── Totals ───────────────────────────────────────────────────────────────
  const totalsLabelW = 32;
  const totalsValueW = 30;
  const totalsX = right - totalsLabelW - totalsValueW;
  const rowH = 7;
  const totals: [string, string, boolean][] = [
    ["SUBTOTAL", num(amount), false],
    ["TAX", "-", false],
    ["SHIPPING", "-", false],
    ["OTHER", "-", false],
    ["TOTAL", `Rs. ${num(amount)}`, true],
  ];

  let ty = y;
  totals.forEach(([label, value, strong]) => {
    doc.setDrawColor(170, 170, 170);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(INK, INK, INK);
    doc.text(label, totalsX + totalsLabelW - 2, ty + rowH - 2.2, { align: "right" });

    if (strong) {
      doc.setFillColor(TITLE.r, TITLE.g, TITLE.b);
      doc.rect(totalsX + totalsLabelW, ty, totalsValueW, rowH, "F");
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setFillColor(GREY_FILL, GREY_FILL, GREY_FILL);
      doc.rect(totalsX + totalsLabelW, ty, totalsValueW, rowH, "FD");
      doc.setFont("helvetica", "normal");
    }
    doc.text(value, right - 2, ty + rowH - 2.2, { align: "right" });
    ty += rowH;
  });

  // ── Comments box ─────────────────────────────────────────────────────────
  const commentsW = pageW - margin * 2 - totalsLabelW - totalsValueW - 8;
  const commentsH = Math.max(ty - y, 34);
  doc.setFillColor(214, 214, 214);
  doc.rect(margin, y, commentsW, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(INK, INK, INK);
  doc.text("Comments or Special Instructions", margin + 2.5, y + 5);
  doc.setDrawColor(170, 170, 170);
  doc.rect(margin, y + 7, commentsW, commentsH);
  if (po.notes?.trim()) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(
      doc.splitTextToSize(po.notes.trim(), commentsW - 5),
      margin + 2.5,
      y + 12.5,
    );
  }

  let contentBottom = Math.max(ty, y + 7 + commentsH);

  // Delivery expectation belongs with the instructions rather than being lost.
  if (po.expectedDelivery) {
    contentBottom += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(
      `Expected delivery: ${dayjs(po.expectedDelivery).format("DD MMM YYYY")}`,
      margin + 2.5,
      y + commentsH + 2.5,
    );
  }

  // ── Failed-invoice stamp ─────────────────────────────────────────────────
  if (failure) {
    const failedAt = dayjs(failure.at ?? new Date());
    const BANNER_H = 26;
    // Sits under the content, but never on top of the footer.
    const bannerY = Math.min(contentBottom + 6, pageH - 30 - BANNER_H);

    doc.setFillColor(196, 30, 58);
    doc.rect(margin, bannerY, pageW - margin * 2, 9, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(
      `INVOICE FAILED VERIFICATION${failure.invoiceRef ? ` — ${failure.invoiceRef}` : ""}`,
      margin + 3,
      bannerY + 6.3,
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(failedAt.format("DD MMM YYYY, hh:mm A"), right - 3, bannerY + 6.3, {
      align: "right",
    });

    doc.setDrawColor(196, 30, 58);
    doc.setLineWidth(0.3);
    doc.rect(margin, bannerY + 9, pageW - margin * 2, 17);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(196, 30, 58);
    doc.text("REASON", margin + 3, bannerY + 14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(INK, INK, INK);
    doc.text(
      doc.splitTextToSize(failure.reason || "No reason recorded", pageW - margin * 2 - 6).slice(0, 3),
      margin + 3,
      bannerY + 19,
    );

    // Diagonal watermark so a printed copy reads as rejected at a glance.
    doc.saveGraphicsState();
    // @ts-expect-error — GState is provided by jsPDF at runtime.
    doc.setGState(new doc.GState({ opacity: 0.12 }));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(74);
    doc.setTextColor(196, 30, 58);
    doc.text("FAILED", pageW / 2, pageH / 2, { align: "center", angle: 30 });
    doc.restoreGraphicsState();
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  const contact = [raisedBy || po.createdByName, raisedByPhone, raisedByEmail || po.createdByEmail]
    .filter(Boolean)
    .join(", ");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(INK, INK, INK);
  doc.text(
    "If you have any questions about this purchase order, please contact",
    pageW / 2,
    pageH - 22,
    { align: "center" },
  );
  doc.text(contact || issuer.name, pageW / 2, pageH - 17, { align: "center" });

  return doc;
}

/** Saves the PO to the user's downloads. */
export function downloadPoPdf(input: PoPdfInput): void {
  buildPoPdf(input).save(poPdfFileName(input.po));
}

/** The same document as base64, for posting to the email route. */
export function poPdfBase64(input: PoPdfInput): string {
  return buildPoPdf(input).output("datauristring").split(",")[1] ?? "";
}
