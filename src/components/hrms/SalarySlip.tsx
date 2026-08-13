import dayjs from "dayjs";
import jsPDF from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";

import { isCustomDeductionName } from "@/lib/salary-calc";

/** Letterhead details printed on every payslip. Override via env to rebrand. */
export const COMPANY_NAME =
  process.env.NEXT_PUBLIC_COMPANY_NAME || "SUDARSHAN MICRONS";
export const COMPANY_ADDRESS =
  process.env.NEXT_PUBLIC_COMPANY_ADDRESS ||
  "MADRI INDUSTRIAL AREA, UDAIPUR, RAJASTHAN 313003";
export const COMPANY_LOGO_SRC =
  process.env.NEXT_PUBLIC_COMPANY_LOGO || "/sudarshan-group-logo.png";

export type SalarySlipData = {
  _id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  designation?: string;
  grossSalary: number;
  netPayable: number;
  status: string;
  workingDays: number;
  daysPresent: number;
  holidayDays?: number;
  leaveDays?: number;
  unpaidLeaveDays?: number;
  leaveDeduction: number;
  advance?: number;
  pfEmployee: number;
  pfEmployer: number;
  esi: number;
  tds: number;
  overtimeHours: number;
  overtimeAmount: number;
  basicSalary?: number;
  hra?: number;
  otherConveyance?: number;
  specialBonus?: number;
  arrears?: number;
  otherDeductions?: number;
  /**
   * Per-rule amounts snapshotted when the sheet was generated. Rules without a
   * fixed row on the slip (anything HR defines beyond TDS/PF/ESIC/Advance/Other)
   * are printed as their own deduction rows.
   */
  deductionBreakdown?: { name: string; percentage?: number; amount: number }[];
  cycle?: string;
  // Employee master details shown on the slip header
  pfUan?: string;
  esiIp?: string;
  accountNo?: string;
  locationUnit?: string;
  dateJoining?: string;
  annualCtc?: number;
  monthlyGross?: number;
};

/** Numeric cell: blank amounts print as a dash, like the reference slip. */
const amt = (n: number | undefined) =>
  n
    ? Number(n).toLocaleString("en-IN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
    : "-";

/** Keeps only the last 4 characters of an identifier visible. */
const mask = (value: string | undefined) => {
  const v = (value || "").trim();
  if (!v) return "-";
  if (v.length <= 4) return v;
  return `${"X".repeat(v.length - 4)}${v.slice(-4)}`;
};

const text = (value: string | undefined) => (value || "").trim() || "-";

export function salarySlipCycleLabel(cycle?: string): string {
  return cycle ? dayjs(cycle, "YYYY-MM").format("MMMM, YYYY") : "";
}

function monthDays(cycle?: string): number {
  const d = cycle ? dayjs(cycle, "YYYY-MM", true) : null;
  return d?.isValid() ? d.daysInMonth() : 0;
}

type SlipRow = { label: string; value: string; bold?: boolean };

const BLANK_ROW: SlipRow = { label: "", value: "" };

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Pairs the earnings and deductions columns into table rows, padding the
 * shorter side — the deductions column grows with every custom rule, so the two
 * are no longer the same height.
 */
function pairColumns(left: SlipRow[], right: SlipRow[]): [SlipRow, SlipRow][] {
  const rows = Math.max(left.length, right.length);
  return Array.from({ length: rows }, (_, i): [SlipRow, SlipRow] => [
    left[i] ?? BLANK_ROW,
    right[i] ?? BLANK_ROW,
  ]);
}

/** Single source of truth for what the on-screen slip and the PDF render. */
function buildSlipView(sheet: SalarySlipData) {
  const days = monthDays(sheet.cycle) || sheet.workingDays || 0;
  const lwpDays = sheet.unpaidLeaveDays || 0;
  const payDays = Math.max(0, days - lwpDays);
  const workedDays = sheet.daysPresent || 0;
  const paidNonWorkingDays = Math.max(0, payDays - workedDays);

  const monthlyCtc = sheet.annualCtc
    ? Math.round(sheet.annualCtc / 12)
    : (sheet.grossSalary || 0) + (sheet.pfEmployer || 0);

  const grossPay =
    (sheet.grossSalary || 0) + (sheet.overtimeAmount || 0) + (sheet.arrears || 0);
  const totalDeductions =
    (sheet.tds || 0) +
    (sheet.pfEmployee || 0) +
    (sheet.esi || 0) +
    (sheet.advance || 0) +
    (sheet.leaveDeduction || 0) +
    (sheet.otherDeductions || 0);

  // Deductions HR defined beyond the five fixed rows get a row each, so every
  // rule applied to the employee is visible by name on the slip.
  const customDeductions = (sheet.deductionBreakdown ?? []).filter((line) =>
    isCustomDeductionName(line.name || ""),
  );
  const customTotal = round2(
    customDeductions.reduce((sum, line) => sum + (line.amount || 0), 0),
  );

  // `otherDeductions` on the sheet is the catch-all bucket: it already contains
  // every custom rule's amount, so what stays on the "Other Deduction" row is
  // whatever is left once those are printed separately. Attendance-driven leave
  // deduction has no row of its own and rides here too, keeping
  // Gross − Total = Net true on the printed page.
  const otherDeductionTotal = round2(
    (sheet.otherDeductions || 0) + (sheet.leaveDeduction || 0) - customTotal,
  );

  const details: [SlipRow, SlipRow][] = [
    [
      { label: "Employee Code No.", value: text(sheet.employeeId) },
      { label: "UAN No.", value: mask(sheet.pfUan) },
    ],
    [
      { label: "Name:", value: text(sheet.employeeName) },
      { label: "ESIC No.", value: mask(sheet.esiIp) },
    ],
    [
      { label: "Department :", value: text(sheet.department) },
      { label: "Bank A/C Number", value: mask(sheet.accountNo) },
    ],
    [
      { label: "Designation :", value: text(sheet.designation) },
      { label: "Working Days:", value: String(workedDays) },
    ],
    [
      { label: "Employee CTC", value: amt(monthlyCtc), bold: true },
      { label: "Week Off , CL & PL", value: String(paidNonWorkingDays) },
    ],
    [
      { label: "Location :", value: text(sheet.locationUnit) },
      { label: "Pay Days", value: String(payDays) },
    ],
    [
      {
        label: "Date of Joining",
        value: sheet.dateJoining
          ? dayjs(sheet.dateJoining).isValid()
            ? dayjs(sheet.dateJoining).format("DD MMM YYYY")
            : sheet.dateJoining
          : "-",
      },
      { label: "LWP Days", value: String(lwpDays) },
    ],
  ];

  const earnings: SlipRow[] = [
    { label: "Basic Salary (BS)", value: amt(sheet.basicSalary) },
    { label: "House Rent Allowance (HRA)", value: amt(sheet.hra) },
    { label: "Special Allowance (SA)", value: amt(sheet.specialBonus) },
    { label: "Other Allowances", value: amt(sheet.otherConveyance) },
    {
      label: sheet.overtimeHours
        ? `Incentives (${sheet.overtimeHours} hrs)`
        : "Incentives",
      value: amt(sheet.overtimeAmount),
    },
    { label: "Arrears", value: amt(sheet.arrears) },
  ];

  const deductions: SlipRow[] = [
    { label: "Tax Deducted at Source (TDS)", value: amt(sheet.tds) },
    { label: "Provident Fund", value: amt(sheet.pfEmployee) },
    { label: "ESIC", value: amt(sheet.esi) },
    { label: "Advance", value: amt(sheet.advance) },
    ...customDeductions.map((line) => ({
      label: line.name,
      value: amt(line.amount),
    })),
    { label: "Other Deduction", value: amt(otherDeductionTotal) },
    { label: "Total Deductions (B)", value: amt(totalDeductions), bold: true },
  ];

  return {
    monthLabel: salarySlipCycleLabel(sheet.cycle),
    details,
    lines: pairColumns(earnings, deductions),
    grossPay,
    totalDeductions,
    netPay: sheet.netPayable || 0,
  };
}

type Logo = { dataUrl: string; width: number; height: number };

let logoCache: Logo | null | undefined;

/**
 * Loads the letterhead logo and re-encodes it as PNG through a canvas, so any
 * source format (png/webp/svg) ends up in a format jsPDF can embed.
 */
async function loadLogo(): Promise<Logo | null> {
  if (logoCache !== undefined) return logoCache;
  try {
    logoCache = await new Promise<Logo>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx || !canvas.width || !canvas.height) {
          reject(new Error("Cannot rasterise logo"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve({
          dataUrl: canvas.toDataURL("image/png"),
          width: canvas.width,
          height: canvas.height,
        });
      };
      img.onerror = () => reject(new Error("Logo not found"));
      img.src = COMPANY_LOGO_SRC;
    });
  } catch {
    logoCache = null;
  }
  return logoCache;
}

export async function downloadSalarySlipPdf(sheet: SalarySlipData) {
  const view = buildSlipView(sheet);
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const MARGIN = 10;
  const WIDTH = 190;
  const HEADER_H = 30;
  const COLS = { 0: { cellWidth: 53 }, 1: { cellWidth: 42 }, 2: { cellWidth: 53 }, 3: { cellWidth: 42 } };
  const BASE = {
    font: "times" as const,
    fontSize: 10,
    textColor: [0, 0, 0] as [number, number, number],
    lineColor: [0, 0, 0] as [number, number, number],
    lineWidth: 0.2,
    cellPadding: 1.6,
    valign: "middle" as const,
  };

  doc.setDrawColor(0);
  doc.setLineWidth(0.4);
  doc.rect(MARGIN, MARGIN, WIDTH, HEADER_H);

  const logo = await loadLogo();
  const BOX = 24;
  doc.setLineWidth(0.2);
  doc.rect(MARGIN + 4, MARGIN + 3, BOX, BOX);
  if (logo) {
    try {
      // Fit inside the logo box without distorting the aspect ratio.
      const scale = Math.min((BOX - 2) / logo.width, (BOX - 2) / logo.height);
      const w = logo.width * scale;
      const h = logo.height * scale;
      const x = MARGIN + 4 + (BOX - w) / 2;
      const y = MARGIN + 3 + (BOX - h) / 2;
      doc.addImage(logo.dataUrl, "PNG", x, y, w, h, undefined, "FAST");
    } catch {
      /* keep the empty logo box if the image cannot be embedded */
    }
  } else {
    doc.setFont("times", "normal");
    doc.setFontSize(7);
    doc.text("COMPANY\nLOGO", MARGIN + 16, MARGIN + 14, { align: "center" });
  }

  const centerX = MARGIN + WIDTH / 2;
  doc.setTextColor(0);
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.text(COMPANY_NAME, centerX, MARGIN + 11, { align: "center" });
  doc.setFontSize(10);
  doc.text(COMPANY_ADDRESS, centerX, MARGIN + 18, { align: "center" });
  doc.text(`Salary Slip for the Month of ${view.monthLabel}`, centerX, MARGIN + 25, {
    align: "center",
  });

  autoTable(doc, {
    startY: MARGIN + HEADER_H,
    margin: { left: MARGIN, right: MARGIN },
    theme: "grid",
    styles: BASE,
    columnStyles: COLS,
    body: view.details.map(([left, right]) => [
      left.label,
      { content: left.value, styles: { fontStyle: left.bold ? "bold" : "normal" } },
      right.label,
      { content: right.value, styles: { fontStyle: right.bold ? "bold" : "normal" } },
    ]),
  });

  const boldCenter = { fontStyle: "bold" as const, halign: "center" as const };
  const boldRight = { fontStyle: "bold" as const, halign: "right" as const };

  autoTable(doc, {
    startY: (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY,
    margin: { left: MARGIN, right: MARGIN },
    theme: "grid",
    styles: BASE,
    columnStyles: COLS,
    body: [
      [
        { content: "EARNINGS", colSpan: 2, styles: boldCenter },
        { content: "DEDUCTIONS", colSpan: 2, styles: boldCenter },
      ],
      [
        { content: "EMOLUMENTS", styles: { fontStyle: "bold" as const } },
        { content: "Amount Rs.", styles: boldRight },
        { content: "DEDUCTIONS", styles: { fontStyle: "bold" as const } },
        { content: "Amount Rs.", styles: boldRight },
      ],
      ...view.lines.map(([left, right]) => [
        left.label,
        { content: left.value, styles: { fontStyle: left.bold ? "bold" : "normal" } },
        { content: right.label, styles: { fontStyle: right.bold ? "bold" : "normal" } },
        { content: right.value, styles: { fontStyle: right.bold ? "bold" : "normal" } },
      ]),
      [
        { content: "Gross Pay (A)", styles: boldRight },
        { content: amt(view.grossPay), styles: { fontStyle: "bold" as const } },
        { content: "Net Pay (A-B)", styles: { fontStyle: "bold" as const } },
        { content: amt(view.netPay), styles: { fontStyle: "bold" as const } },
      ],
      [
        {
          content: "This is a computer generated pay slip hence does not require signature.",
          colSpan: 4,
          styles: boldCenter,
        },
      ],
    ] as RowInput[],
  });

  const name = (sheet.employeeName || sheet.employeeId).replace(/\s+/g, "_");
  doc.save(`Payslip_${name}_${sheet.cycle || ""}.pdf`);
}

const cell: React.CSSProperties = {
  border: "1px solid #000",
  padding: "5px 8px",
  fontSize: 13,
  color: "#000",
  verticalAlign: "middle",
};

export function SalarySlipCard({ salarySheet }: { salarySheet: SalarySlipData }) {
  const view = buildSlipView(salarySheet);

  return (
    <div
      className="payslip-container"
      style={{
        background: "#fff",
        color: "#000",
        padding: 16,
        fontFamily: '"Times New Roman", Times, serif',
      }}
    >
      <div style={{ border: "2px solid #000" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: 12,
            borderBottom: "2px solid #000",
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              flex: "0 0 auto",
              border: "1px solid #000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={COMPANY_LOGO_SRC}
              alt={`${COMPANY_NAME} logo`}
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
            />
          </div>
          <div style={{ flex: 1, textAlign: "center", paddingRight: 96 }}>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "0.01em" }}>
              {COMPANY_NAME}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>
              {COMPANY_ADDRESS}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>
              Salary Slip for the Month of {view.monthLabel}
            </div>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <tbody>
            {view.details.map(([left, right]) => (
              <tr key={left.label}>
                <td style={cell}>{left.label}</td>
                <td style={{ ...cell, fontWeight: left.bold ? 700 : 400 }}>{left.value}</td>
                <td style={cell}>{right.label}</td>
                <td style={{ ...cell, fontWeight: right.bold ? 700 : 400 }}>{right.value}</td>
              </tr>
            ))}

            <tr>
              <td style={{ ...cell, textAlign: "center", fontWeight: 700 }} colSpan={2}>
                EARNINGS
              </td>
              <td style={{ ...cell, textAlign: "center", fontWeight: 700 }} colSpan={2}>
                DEDUCTIONS
              </td>
            </tr>
            <tr>
              <td style={{ ...cell, fontWeight: 700 }}>EMOLUMENTS</td>
              <td style={{ ...cell, fontWeight: 700, textAlign: "right" }}>Amount Rs.</td>
              <td style={{ ...cell, fontWeight: 700 }}>DEDUCTIONS</td>
              <td style={{ ...cell, fontWeight: 700, textAlign: "right" }}>Amount Rs.</td>
            </tr>
            {view.lines.map(([left, right], i) => (
              <tr key={left.label || `line-${i}`}>
                <td style={cell}>{left.label}</td>
                <td style={{ ...cell, fontWeight: left.bold ? 700 : 400 }}>{left.value}</td>
                <td style={{ ...cell, fontWeight: right.bold ? 700 : 400 }}>{right.label}</td>
                <td style={{ ...cell, fontWeight: right.bold ? 700 : 400 }}>{right.value}</td>
              </tr>
            ))}
            <tr>
              <td style={{ ...cell, fontWeight: 700, textAlign: "right" }}>Gross Pay (A)</td>
              <td style={{ ...cell, fontWeight: 700 }}>{amt(view.grossPay)}</td>
              <td style={{ ...cell, fontWeight: 700 }}>Net Pay (A-B)</td>
              <td style={{ ...cell, fontWeight: 700 }}>{amt(view.netPay)}</td>
            </tr>
            <tr>
              <td style={{ ...cell, textAlign: "center", fontWeight: 700 }} colSpan={4}>
                This is a computer generated pay slip hence does not require signature.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
