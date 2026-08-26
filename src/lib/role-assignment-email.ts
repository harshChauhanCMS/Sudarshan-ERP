import nodemailer from "nodemailer";
import Notification from "@/lib/models/Notification";
import { ownerAdminEmails } from "@/lib/notify-roles";

export type RoleAssignmentPayload = {
  employeeId: string;
  employeeName: string;
  /** Employee's login/contact email — empty when they have no account yet. */
  employeeEmail: string;
  previousRoleLabel: string;
  newRoleLabel: string;
  newRoleKey: string;
  /** False when only the designation moved and the access role stayed put. */
  roleChanged: boolean;
  /** Set only when the designation (the plain-string job title) changed. */
  previousDesignation?: string;
  newDesignation?: string;
  /** Name of the admin/owner who made the change. */
  actedBy: string;
};

function designationChanged(p: RoleAssignmentPayload): boolean {
  return typeof p.newDesignation === "string";
}

/** "role", "designation", or "role and designation" — whatever actually moved. */
function changeSummary(p: RoleAssignmentPayload): string {
  if (p.roleChanged && designationChanged(p)) return "role and designation";
  return p.roleChanged ? "role" : "designation";
}

function row(label: string, value: string, bold = false) {
  return `<tr><td style="padding:4px 12px 4px 0;color:#64748b;">${label}</td><td style="padding:4px 0;${
    bold ? "font-weight:700;" : ""
  }">${value}</td></tr>`;
}

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

function getLoginUrl() {
  const base =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/login`;
}

function changedAtText() {
  return new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
}

function buildEmployeeEmail(p: RoleAssignmentPayload) {
  const subject = p.roleChanged
    ? `Your Sudarshan ERP role is now ${p.newRoleLabel}`
    : `Your Sudarshan ERP designation is now ${p.newDesignation}`;
  const loginUrl = getLoginUrl();

  const lines: string[] = [];
  const rows: string[] = [];
  rows.push(row("Employee ID", p.employeeId, true));

  if (p.roleChanged) {
    lines.push(`Previous role: ${p.previousRoleLabel}`, `New role: ${p.newRoleLabel}`);
    rows.push(row("Previous role", p.previousRoleLabel));
    rows.push(row("New role", p.newRoleLabel, true));
  }
  if (designationChanged(p)) {
    lines.push(
      `Previous designation: ${p.previousDesignation || "—"}`,
      `New designation: ${p.newDesignation}`,
    );
    rows.push(row("Previous designation", p.previousDesignation || "—"));
    rows.push(row("New designation", p.newDesignation as string, true));
  }

  lines.push(`Updated by: ${p.actedBy}`, `Updated on: ${changedAtText()} (IST)`);
  rows.push(row("Updated by", p.actedBy));
  rows.push(row("Updated on", `${changedAtText()} (IST)`));

  const accessNote = p.roleChanged
    ? "The screens and actions available to you will change the next time you sign in."
    : "Your access to the system is unchanged.";

  const text = [
    `Hello ${p.employeeName},`,
    "",
    `Your ${changeSummary(p)} in Sudarshan ERP has been updated.`,
    "",
    ...lines,
    "",
    accessNote,
    `Log in here: ${loginUrl}`,
    "",
    "If this looks wrong, please contact HR or your administrator.",
    "",
    "Best Regards,",
    "Sudarshan Group HR",
  ].join("\n");

  const html = `
    <p>Hello <strong>${p.employeeName}</strong>,</p>
    <p>Your ${changeSummary(p)} in Sudarshan ERP has been updated.</p>
    <table cellpadding="0" cellspacing="0" style="margin:16px 0;border-collapse:collapse;">
      ${rows.join("\n      ")}
    </table>
    <p>${accessNote}</p>
    <p><a href="${loginUrl}">Log in to Sudarshan ERP</a></p>
    <p style="color:#64748b;font-size:13px;">If this looks wrong, please contact HR or your administrator.</p>
    <p>Best Regards,<br/>Sudarshan Group HR</p>
  `;

  return { subject, text, html };
}

function buildAdminEmail(p: RoleAssignmentPayload) {
  const subject = p.roleChanged
    ? `Role updated — ${p.employeeName} (${p.employeeId}) → ${p.newRoleLabel}`
    : `Designation updated — ${p.employeeName} (${p.employeeId}) → ${p.newDesignation}`;

  const lines: string[] = [];
  const rows: string[] = [];
  rows.push(row("Employee", `${p.employeeName} (${p.employeeId})`, true));

  if (p.roleChanged) {
    lines.push(`Previous role: ${p.previousRoleLabel}`, `New role: ${p.newRoleLabel}`);
    rows.push(row("Previous role", p.previousRoleLabel));
    rows.push(row("New role", p.newRoleLabel, true));
  }
  if (designationChanged(p)) {
    lines.push(
      `Previous designation: ${p.previousDesignation || "—"}`,
      `New designation: ${p.newDesignation}`,
    );
    rows.push(row("Previous designation", p.previousDesignation || "—"));
    rows.push(row("New designation", p.newDesignation as string, true));
  }

  const loginEmail = p.employeeEmail || "— no login account —";
  lines.push(
    `Login email: ${loginEmail}`,
    `Changed by: ${p.actedBy}`,
    `Changed on: ${changedAtText()} (IST)`,
  );
  rows.push(row("Login email", loginEmail));
  rows.push(row("Changed by", p.actedBy));
  rows.push(row("Changed on", `${changedAtText()} (IST)`));

  const text = [
    `An employee's ${changeSummary(p)} was changed in Sudarshan ERP.`,
    "",
    `Employee: ${p.employeeName} (${p.employeeId})`,
    ...lines,
    "",
    "Best Regards,",
    "Sudarshan ERP",
  ].join("\n");

  const html = `
    <p>An employee's ${changeSummary(p)} was changed in Sudarshan ERP.</p>
    <table cellpadding="0" cellspacing="0" style="margin:16px 0;border-collapse:collapse;">
      ${rows.join("\n      ")}
    </table>
    <p>Best Regards,<br/>Sudarshan ERP</p>
  `;

  return { subject, text, html };
}

async function recordNotifications(p: RoleAssignmentPayload, adminEmails: string[]) {
  const docs: Array<Record<string, unknown>> = [];

  if (p.employeeEmail) {
    docs.push({
      recipientEmail: p.employeeEmail,
      category: "system",
      type: "info",
      employeeId: p.employeeId,
      employeeName: p.employeeName,
      message: p.roleChanged
        ? `Your role has been updated to ${p.newRoleLabel} by ${p.actedBy}.`
        : `Your designation has been updated to ${p.newDesignation} by ${p.actedBy}.`,
      target: "/dashboard",
    });
  }

  for (const email of adminEmails) {
    docs.push({
      recipientEmail: email,
      category: "system",
      type: "info",
      employeeId: p.employeeId,
      employeeName: p.employeeName,
      message: p.roleChanged
        ? `${p.employeeName} (${p.employeeId}) was assigned the ${p.newRoleLabel} role by ${p.actedBy}.`
        : `${p.employeeName} (${p.employeeId}) is now designated ${p.newDesignation} by ${p.actedBy}.`,
      target: "/users",
    });
  }

  if (!docs.length) return;
  try {
    await Notification.insertMany(docs);
  } catch (err) {
    console.error("Failed to record role assignment notifications:", err);
  }
}

/**
 * Emails the employee whose role and/or designation changed, plus every
 * owner/admin, and records the same change as in-app notifications. Never
 * throws — a mail failure must not roll back an already-persisted change.
 */
export async function sendRoleAssignmentNotifications(
  payload: RoleAssignmentPayload,
): Promise<{
  employeeNotified: boolean;
  adminsNotified: number;
  reason?: string;
}> {
  const adminEmails = (await ownerAdminEmails().catch(() => [])).filter(
    (email) => email !== payload.employeeEmail,
  );

  await recordNotifications(payload, adminEmails);

  const transporter = getMailTransporter();
  if (!transporter) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[dev] Role assignment email skipped (email not configured):\n${buildEmployeeEmail(payload).text}`,
      );
    }
    return { employeeNotified: false, adminsNotified: 0, reason: "email_not_configured" };
  }

  let employeeNotified = false;
  if (payload.employeeEmail) {
    const { subject, text, html } = buildEmployeeEmail(payload);
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_ID,
        to: payload.employeeEmail,
        subject,
        text,
        html,
      });
      employeeNotified = true;
    } catch (err) {
      console.error("Failed to send role assignment email to employee:", err);
    }
  }

  let adminsNotified = 0;
  if (adminEmails.length) {
    const { subject, text, html } = buildAdminEmail(payload);
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_ID,
        to: adminEmails,
        subject,
        text,
        html,
      });
      adminsNotified = adminEmails.length;
    } catch (err) {
      console.error("Failed to send role assignment email to owners/admins:", err);
    }
  }

  return {
    employeeNotified,
    adminsNotified,
    reason: payload.employeeEmail ? undefined : "no_employee_email",
  };
}
