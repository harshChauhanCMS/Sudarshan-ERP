import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { User } from "@/models/User";

const PASSWORD_RESET_WINDOW_MS = 60 * 60 * 1000;

function generatePassword(length = 10) {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let value = "";
  for (let i = 0; i < length; i += 1) {
    value += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return value;
}

function formatDeadline(deadline: Date) {
  return deadline.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
}

function getLoginUrl() {
  const base =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/login`;
}

function buildWelcomeEmail({
  fullName,
  employeeId,
  email,
  tempPassword,
  resetDeadline,
}: {
  fullName: string;
  employeeId: string;
  email: string;
  tempPassword: string;
  resetDeadline: Date;
}) {
  const deadlineText = formatDeadline(resetDeadline);
  const loginUrl = getLoginUrl();

  const text = [
    `Hello ${fullName},`,
    "",
    "Your Sudarshan Group employee account has been created.",
    "",
    `Employee ID: ${employeeId}`,
    `Login email: ${email}`,
    `Temporary password: ${tempPassword}`,
    "",
    "Please log in using the credentials above and reset your password within 1 hour.",
    `You must change this temporary password before ${deadlineText} (IST).`,
    "",
    `Login here: ${loginUrl}`,
    "",
    "If you did not expect this email, please contact HR immediately.",
    "",
    "Best Regards,",
    "Sudarshan Group HR",
  ].join("\n");

  const html = `
    <p>Hello <strong>${fullName}</strong>,</p>
    <p>Your Sudarshan Group employee account has been created.</p>
    <table cellpadding="0" cellspacing="0" style="margin:16px 0;border-collapse:collapse;">
      <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Employee ID</td><td style="padding:4px 0;font-weight:700;">${employeeId}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Login email</td><td style="padding:4px 0;">${email}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Temporary password</td><td style="padding:4px 0;font-family:monospace;">${tempPassword}</td></tr>
    </table>
    <p><strong>Please log in using the credentials above and reset your password within 1 hour.</strong></p>
    <p>You must change this temporary password before <strong>${deadlineText} (IST)</strong>.</p>
    <p><a href="${loginUrl}">Log in to Sudarshan ERP</a></p>
    <p style="color:#64748b;font-size:13px;">If you did not expect this email, please contact HR immediately.</p>
    <p>Best Regards,<br/>Sudarshan Group HR</p>
  `;

  return { text, html };
}

export async function provisionEmployeeLoginAndSendWelcomeEmail({
  fullName,
  employeeId,
  email,
  role,
}: {
  fullName: string;
  employeeId: string;
  email: string;
  role?: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return { sent: false, reason: "no_email" };
  }

  const existingUser = await User.findOne({ email: normalizedEmail }).lean();
  if (existingUser) {
    return { sent: false, reason: "user_exists" };
  }

  const tempPassword = generatePassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  const passwordResetDeadline = new Date(Date.now() + PASSWORD_RESET_WINDOW_MS);

  await User.create({
    email: normalizedEmail,
    name: fullName.trim(),
    role: role?.trim() || "store",
    employeeId,
    passwordHash,
    requiresPasswordReset: true,
    passwordResetDeadline,
  });

  if (!process.env.EMAIL_ID || !process.env.EMAIL_PASS) {
    console.warn("Employee welcome email skipped: EMAIL_ID or EMAIL_PASS not configured");
    return { sent: false, reason: "email_not_configured" };
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_ID,
      pass: process.env.EMAIL_PASS,
    },
  });

  const { text, html } = buildWelcomeEmail({
    fullName: fullName.trim(),
    employeeId,
    email: normalizedEmail,
    tempPassword,
    resetDeadline: passwordResetDeadline,
  });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_ID,
      to: normalizedEmail,
      subject: `Welcome to Sudarshan Group — Employee ID ${employeeId}`,
      text,
      html,
    });
    return { sent: true };
  } catch (mailErr) {
    console.error("Failed to send employee welcome email:", mailErr);
    return { sent: false, reason: "send_failed" };
  }
}

export { PASSWORD_RESET_WINDOW_MS };
