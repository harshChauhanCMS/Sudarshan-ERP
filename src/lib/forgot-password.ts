import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import nodemailer from "nodemailer";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

const OTP_EXPIRY_MS = 30 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 8;

function generateOtp() {
  return String(randomInt(100_000, 1_000_000));
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

function buildOtpEmail({
  name,
  otp,
  expiresMinutes,
}: {
  name: string;
  otp: string;
  expiresMinutes: number;
}) {
  const text = [
    `Hello ${name},`,
    "",
    "You requested to reset your Sudarshan ERP password.",
    "",
    `Your verification code: ${otp}`,
    "",
    `This code expires in ${expiresMinutes} minutes.`,
    "",
    "If you did not request this, you can ignore this email.",
    "",
    "Sudarshan Group",
  ].join("\n");

  const html = `
    <p>Hello <strong>${name}</strong>,</p>
    <p>You requested to reset your Sudarshan ERP password.</p>
    <p style="margin:24px 0;font-size:28px;font-weight:700;letter-spacing:6px;font-family:monospace;">${otp}</p>
    <p style="color:#64748b;">This code expires in <strong>${expiresMinutes} minutes</strong>.</p>
    <p style="color:#64748b;font-size:13px;">If you did not request this, you can ignore this email.</p>
    <p>Sudarshan Group</p>
  `;

  return { text, html };
}

export async function sendForgotPasswordOtp(
  email: string,
): Promise<{ sent: boolean; reason?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return { sent: false, reason: "invalid_email" };
  }

  await connectDB();
  const user = await User.findOne({ email: normalizedEmail }).lean();
  if (!user) {
    return { sent: true };
  }

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  await User.collection.updateOne(
    { email: normalizedEmail },
    {
      $set: {
        forgotPasswordOtpHash: otpHash,
        forgotPasswordOtpExpires: expiresAt,
      },
    },
  );

  const transporter = getMailTransporter();
  if (!transporter) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[dev] Forgot password OTP for ${normalizedEmail}: ${otp} (expires ${expiresAt.toISOString()})`,
      );
      return { sent: true, reason: "email_not_configured_dev" };
    }
    return { sent: false, reason: "email_not_configured" };
  }

  const expiresMinutes = OTP_EXPIRY_MS / (60 * 1000);
  const { text, html } = buildOtpEmail({
    name: (user.name as string) || normalizedEmail,
    otp,
    expiresMinutes,
  });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_ID,
      to: normalizedEmail,
      subject: "Sudarshan ERP — Password reset code",
      text,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error("Failed to send forgot password email:", err);
    return { sent: false, reason: "send_failed" };
  }
}

export async function verifyForgotPasswordOtp({
  email,
  otp,
  newPassword,
  confirmPassword,
}: {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedOtp = otp.trim();

  if (!normalizedEmail || !trimmedOtp || !newPassword || !confirmPassword) {
    return {
      ok: false,
      message: "Email, verification code, and new password are required.",
      status: 400,
    };
  }

  if (!/^\d{6}$/.test(trimmedOtp)) {
    return {
      ok: false,
      message: "Verification code must be a 6-digit number.",
      status: 400,
    };
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      status: 400,
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      ok: false,
      message: "New password and confirmation do not match.",
      status: 400,
    };
  }

  await connectDB();
  const user = await User.collection.findOne({ email: normalizedEmail });
  const otpHash =
    typeof user?.forgotPasswordOtpHash === "string"
      ? user.forgotPasswordOtpHash
      : "";
  const otpExpires = user?.forgotPasswordOtpExpires
    ? new Date(user.forgotPasswordOtpExpires)
    : null;

  if (!otpHash || !otpExpires) {
    return {
      ok: false,
      message: "Invalid or expired verification code.",
      status: 400,
    };
  }

  if (Date.now() > otpExpires.getTime()) {
    await User.collection.updateOne(
      { email: normalizedEmail },
      { $unset: { forgotPasswordOtpHash: "", forgotPasswordOtpExpires: "" } },
    );
    return {
      ok: false,
      message: "Verification code has expired. Please request a new one.",
      status: 400,
    };
  }

  const otpValid = await bcrypt.compare(trimmedOtp, otpHash);
  if (!otpValid) {
    return {
      ok: false,
      message: "Invalid verification code.",
      status: 401,
    };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await User.updateOne(
    { email: normalizedEmail },
    {
      $set: {
        passwordHash,
        requiresPasswordReset: false,
        passwordResetDeadline: null,
      },
      $unset: { forgotPasswordOtpHash: "", forgotPasswordOtpExpires: "" },
    },
  );

  return { ok: true };
}

export { OTP_EXPIRY_MS, MIN_PASSWORD_LENGTH };
