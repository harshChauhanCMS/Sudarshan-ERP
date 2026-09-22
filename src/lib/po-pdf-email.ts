import nodemailer from "nodemailer";

/**
 * Emails the purchase-order PDF to the address typed on the PO form. The PDF
 * is built in the browser and posted here as base64, so the vendor's copy is
 * byte-for-byte the copy that was downloaded.
 */

export type PoEmailPayload = {
  to: string;
  /** "issue" is the order itself; "failed" is the rejected-invoice notice. */
  kind?: "issue" | "failed";
  /** Why the invoice failed — required for the failed notice. */
  reason?: string;
  /** Invoice the failure was recorded against, when there is one. */
  invoiceRef?: string;
  poId: string;
  vendorName: string;
  total: number;
  expectedDelivery?: string;
  fileName: string;
  pdfBase64: string;
  /** Who raised the PO — signs off the email body. */
  raisedBy?: string;
};

function getMailTransporter() {
  if (!process.env.EMAIL_ID || !process.env.EMAIL_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_ID,
      pass: process.env.EMAIL_PASS,
    },
  });
}

function html(payload: PoEmailPayload): string {
  const total = `₹${Number(payload.total || 0).toLocaleString("en-IN")}`;
  const delivery = payload.expectedDelivery
    ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b;">Expected delivery</td><td style="padding:4px 0;">${payload.expectedDelivery}</td></tr>`
    : "";
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <p>Dear ${payload.vendorName || "Vendor"},</p>
    <p>Please find attached purchase order <strong>${payload.poId}</strong> from Sudarshan Group.</p>
    <table style="border-collapse:collapse;font-size:14px;margin:12px 0;">
      <tr><td style="padding:4px 12px 4px 0;color:#64748b;">PO number</td><td style="padding:4px 0;font-weight:700;">${payload.poId}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Order value</td><td style="padding:4px 0;font-weight:700;">${total}</td></tr>
      ${delivery}
    </table>
    <p>Kindly acknowledge receipt and confirm the delivery schedule.</p>
    <p style="margin-top:20px;">Regards,<br/>${payload.raisedBy || "Procurement"}<br/>Sudarshan Group</p>
  </div>`;
}

function failedHtml(payload: PoEmailPayload): string {
  const total = `₹${Number(payload.total || 0).toLocaleString("en-IN")}`;
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <p>Dear ${payload.vendorName || "Vendor"},</p>
    <p>
      The invoice submitted against purchase order <strong>${payload.poId}</strong>
      ${payload.invoiceRef ? `(our reference <strong>${payload.invoiceRef}</strong>)` : ""}
      could not be verified.
    </p>
    <table style="border-collapse:collapse;font-size:14px;margin:12px 0;">
      <tr><td style="padding:4px 12px 4px 0;color:#64748b;">PO number</td><td style="padding:4px 0;font-weight:700;">${payload.poId}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#64748b;">PO value</td><td style="padding:4px 0;font-weight:700;">${total}</td></tr>
    </table>
    <p style="padding:10px 12px;background:#fdecef;border-left:3px solid #c41e3a;">
      <strong>Reason:</strong> ${payload.reason || "See the attached purchase order."}
    </p>
    <p>
      Please correct the invoice and resend it. The purchase order is attached
      for reference, marked with this reason.
    </p>
    <p style="margin-top:20px;">Regards,<br/>${payload.raisedBy || "Procurement"}<br/>Sudarshan Group</p>
  </div>`;
}

/** Returns true when the mail actually went out. */
export async function sendPoPdfEmail(payload: PoEmailPayload): Promise<boolean> {
  const transporter = getMailTransporter();
  if (!transporter) return false;

  const failed = payload.kind === "failed";
  await transporter.sendMail({
    from: process.env.EMAIL_ID,
    to: payload.to,
    subject: failed
      ? `Invoice not verified — Purchase Order ${payload.poId}`
      : `Purchase Order ${payload.poId} — Sudarshan Group`,
    html: failed ? failedHtml(payload) : html(payload),
    attachments: [
      {
        filename: payload.fileName,
        content: Buffer.from(payload.pdfBase64, "base64"),
        contentType: "application/pdf",
      },
    ],
  });
  return true;
}
