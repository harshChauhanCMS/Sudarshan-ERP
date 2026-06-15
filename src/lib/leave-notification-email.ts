import nodemailer from "nodemailer";
import Employee from "@/lib/models/Employee";
import { User } from "@/models/User";

const LEAVE_TYPE_LABELS: Record<string, string> = {
  casual: "Casual Leave (CL)",
  sick: "Sick Leave (SL)",
  earned: "Earned Leave (EL)",
  unpaid: "Leave Without Pay (LWP)",
};

export type LeaveEmailPayload = {
  employeeId: string;
  employeeName?: string;
  leaveType: string;
  fromDate: Date | string;
  toDate: Date | string;
  days: number;
  reason?: string;
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

function formatLeaveDate(value: Date | string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function leaveTypeLabel(leaveType: string) {
  return LEAVE_TYPE_LABELS[leaveType] || leaveType;
}

async function resolveEmployeeEmail(employeeId: string): Promise<{
  email: string;
  name: string;
} | null> {
  const emp = await Employee.findOne({ employeeId })
    .select({ fullName: 1, officialEmail: 1, personalEmail: 1 })
    .lean();

  const fromEmployee =
    emp?.officialEmail?.trim() || emp?.personalEmail?.trim() || "";

  if (fromEmployee) {
    return {
      email: fromEmployee.toLowerCase(),
      name: emp?.fullName?.trim() || employeeId,
    };
  }

  const user = await User.findOne({ employeeId }).select({ email: 1, name: 1 }).lean();
  if (user?.email) {
    return {
      email: String(user.email).trim().toLowerCase(),
      name: user.name?.trim() || employeeId,
    };
  }

  return null;
}

function buildLeaveDecisionEmail({
  name,
  leave,
  decision,
  actedBy,
  rejectionReason,
}: {
  name: string;
  leave: LeaveEmailPayload;
  decision: "approved" | "rejected";
  actedBy?: string;
  rejectionReason?: string;
}) {
  const typeLabel = leaveTypeLabel(leave.leaveType);
  const from = formatLeaveDate(leave.fromDate);
  const to = formatLeaveDate(leave.toDate);
  const employeeName = leave.employeeName?.trim() || name;
  const isApproved = decision === "approved";

  const subject = isApproved
    ? `Leave approved — ${from} to ${to}`
    : `Leave rejected — ${from} to ${to}`;

  const statusLine = isApproved
    ? "Your leave request has been approved."
    : "Your leave request has been rejected.";

  const reasonBlock = isApproved
    ? ""
    : `\nRejection reason: ${rejectionReason?.trim() || "Not specified"}\n`;

  const text = [
    `Hello ${employeeName},`,
    "",
    statusLine,
    "",
    `Employee ID: ${leave.employeeId}`,
    `Leave type: ${typeLabel}`,
    `Dates: ${from} to ${to}`,
    `Days: ${leave.days}`,
    leave.reason?.trim() ? `Your reason: ${leave.reason.trim()}` : "",
    actedBy ? `Action by: ${actedBy}` : "",
    reasonBlock,
    "",
    "You can view your leave history in Sudarshan ERP.",
    "",
    "Sudarshan Group HR",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <p>Hello <strong>${employeeName}</strong>,</p>
    <p style="color:${isApproved ? "#059669" : "#dc2626"};font-weight:700;">
      ${statusLine}
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:16px 0;border-collapse:collapse;">
      <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Employee ID</td><td style="padding:4px 0;">${leave.employeeId}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Leave type</td><td style="padding:4px 0;">${typeLabel}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Dates</td><td style="padding:4px 0;">${from} → ${to}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Days</td><td style="padding:4px 0;">${leave.days}</td></tr>
      ${leave.reason?.trim() ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b;">Your reason</td><td style="padding:4px 0;">${leave.reason.trim()}</td></tr>` : ""}
      ${actedBy ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b;">Action by</td><td style="padding:4px 0;">${actedBy}</td></tr>` : ""}
      ${
        !isApproved
          ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b;">Rejection reason</td><td style="padding:4px 0;">${rejectionReason?.trim() || "Not specified"}</td></tr>`
          : ""
      }
    </table>
    <p style="color:#64748b;font-size:13px;">You can view your leave history in Sudarshan ERP.</p>
    <p>Sudarshan Group HR</p>
  `;

  return { subject, text, html };
}

function buildLeaveRollbackEmail({
  name,
  leave,
  rollbackReason,
  actedBy,
}: {
  name: string;
  leave: LeaveEmailPayload;
  rollbackReason: string;
  actedBy?: string;
}) {
  const typeLabel = leaveTypeLabel(leave.leaveType);
  const from = formatLeaveDate(leave.fromDate);
  const to = formatLeaveDate(leave.toDate);
  const employeeName = leave.employeeName?.trim() || name;
  const reason = rollbackReason.trim() || "Not specified";

  const subject = `Leave approval rolled back — ${from} to ${to}`;

  const text = [
    `Hello ${employeeName},`,
    "",
    "Your approved leave request has been rolled back and is pending review again.",
    "",
    `Employee ID: ${leave.employeeId}`,
    `Leave type: ${typeLabel}`,
    `Dates: ${from} to ${to}`,
    `Days: ${leave.days}`,
    leave.reason?.trim() ? `Your reason: ${leave.reason.trim()}` : "",
    `Rollback reason: ${reason}`,
    actedBy ? `Action by: ${actedBy}` : "",
    "",
    "Please contact HR if you have questions.",
    "",
    "Sudarshan Group HR",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <p>Hello <strong>${employeeName}</strong>,</p>
    <p style="color:#d97706;font-weight:700;">
      Your approved leave request has been rolled back and is pending review again.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:16px 0;border-collapse:collapse;">
      <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Employee ID</td><td style="padding:4px 0;">${leave.employeeId}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Leave type</td><td style="padding:4px 0;">${typeLabel}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Dates</td><td style="padding:4px 0;">${from} → ${to}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Days</td><td style="padding:4px 0;">${leave.days}</td></tr>
      ${leave.reason?.trim() ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b;">Your reason</td><td style="padding:4px 0;">${leave.reason.trim()}</td></tr>` : ""}
      <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Rollback reason</td><td style="padding:4px 0;">${reason}</td></tr>
      ${actedBy ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b;">Action by</td><td style="padding:4px 0;">${actedBy}</td></tr>` : ""}
    </table>
    <p style="color:#64748b;font-size:13px;">Please contact HR if you have questions.</p>
    <p>Sudarshan Group HR</p>
  `;

  return { subject, text, html };
}

export async function sendLeaveRollbackEmail(
  leave: LeaveEmailPayload,
  options: { rollbackReason: string; actedBy?: string },
): Promise<{ sent: boolean; reason?: string }> {
  const recipient = await resolveEmployeeEmail(String(leave.employeeId));
  if (!recipient) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[dev] Leave rollback email skipped — no email for ${leave.employeeId}`,
      );
    }
    return { sent: false, reason: "no_email" };
  }

  const transporter = getMailTransporter();
  const { subject, text, html } = buildLeaveRollbackEmail({
    name: recipient.name,
    leave,
    rollbackReason: options.rollbackReason,
    actedBy: options.actedBy,
  });

  if (!transporter) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[dev] Leave rollback email for ${recipient.email}:\n${text}`,
      );
    }
    return { sent: false, reason: "email_not_configured" };
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_ID,
      to: recipient.email,
      subject,
      text,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error("Failed to send leave rollback email:", err);
    return { sent: false, reason: "send_failed" };
  }
}

export async function sendLeaveDecisionEmail(
  leave: LeaveEmailPayload,
  decision: "approved" | "rejected",
  options?: { actedBy?: string; rejectionReason?: string },
): Promise<{ sent: boolean; reason?: string }> {
  const recipient = await resolveEmployeeEmail(String(leave.employeeId));
  if (!recipient) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[dev] Leave ${decision} email skipped — no email for ${leave.employeeId}`,
      );
    }
    return { sent: false, reason: "no_email" };
  }

  const transporter = getMailTransporter();
  const { subject, text, html } = buildLeaveDecisionEmail({
    name: recipient.name,
    leave,
    decision,
    actedBy: options?.actedBy,
    rejectionReason: options?.rejectionReason,
  });

  if (!transporter) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[dev] Leave ${decision} email for ${recipient.email}:\n${text}`,
      );
    }
    return { sent: false, reason: "email_not_configured" };
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_ID,
      to: recipient.email,
      subject,
      text,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error(`Failed to send leave ${decision} email:`, err);
    return { sent: false, reason: "send_failed" };
  }
}
