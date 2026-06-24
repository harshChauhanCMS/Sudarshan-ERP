import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import nodemailer from "nodemailer";
import { connectDB, isDbConfigured } from "@/lib/mongodb";
import Driver from "@/lib/models/Driver";
import DispatchDriverOtp from "@/lib/models/DispatchDriverOtp";
import { getEntityItems } from "@/lib/db-entities";
import type { Dispatch } from "@/lib/entity-types";
import { createDispatchDriverToken } from "@/lib/dispatch-driver-session";

const OTP_EXPIRY_MS = 10 * 60 * 1000;

function generateOtp() {
  return String(randomInt(100_000, 1_000_000));
}

function getMailTransporter() {
  if (!process.env.EMAIL_ID || !process.env.EMAIL_PASS) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_ID,
      pass: process.env.EMAIL_PASS,
    },
  });
}

async function findDispatchByToken(token: string): Promise<Dispatch | null> {
  const items = await getEntityItems<Dispatch>("dispatches");
  return items.find((d) => d.checkInToken === token) ?? null;
}

function normalizeVehicle(value: string | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

function normalizeDriverName(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export async function resolveDriverForDispatch(trackToken: string, email: string) {
  if (!isDbConfigured()) throw new Error("Database not configured");

  const dispatch = await findDispatchByToken(trackToken.trim());
  if (!dispatch) throw new Error("Invalid dispatch tracking link");
  if (!dispatch.vehicle || dispatch.vehicle === "—") {
    throw new Error("Vehicle is not assigned for this dispatch yet");
  }
  if (dispatch.status === "delivered" || dispatch.status === "cancelled") {
    throw new Error("This dispatch is no longer active");
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) throw new Error("Email is required");

  await connectDB();
  const driver = await Driver.findOne({ email: normalizedEmail, status: "active" }).lean();
  if (!driver) {
    throw new Error("No registered driver found for this email. Use the email from driver registration.");
  }

  const vehicleMatch =
    normalizeVehicle(driver.vehicleNumber) === normalizeVehicle(dispatch.vehicle);
  const dispatchDriver = normalizeDriverName(dispatch.driver);
  const registeredName = normalizeDriverName(driver.name);
  const nameMatch =
    Boolean(dispatchDriver && dispatchDriver !== "—") && dispatchDriver === registeredName;

  if (!vehicleMatch && !nameMatch) {
    throw new Error("This email is not assigned to this dispatch");
  }

  return { dispatch, driver };
}

export async function sendDispatchDriverOtp(
  trackToken: string,
  email: string
): Promise<{ sent: boolean; reason?: string }> {
  const { driver, dispatch } = await resolveDriverForDispatch(trackToken, email);
  const normalizedEmail = email.trim().toLowerCase();
  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  await connectDB();
  await DispatchDriverOtp.findOneAndUpdate(
    { trackToken: trackToken.trim(), email: normalizedEmail },
    {
      trackToken: trackToken.trim(),
      email: normalizedEmail,
      driverId: String(driver._id),
      otpHash,
      expiresAt,
    },
    { upsert: true, new: true }
  );

  const transporter = getMailTransporter();
  if (!transporter) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[dev] Dispatch driver OTP for ${normalizedEmail} (${dispatch.id}): ${otp} (expires ${expiresAt.toISOString()})`
      );
      return { sent: true, reason: "email_not_configured_dev" };
    }
    return { sent: false, reason: "email_not_configured" };
  }

  const expiresMinutes = OTP_EXPIRY_MS / (60 * 1000);
  const text = [
    `Hello ${driver.name},`,
    "",
    `Your driver check-in code for dispatch ${dispatch.id} is: ${otp}`,
    "",
    `This code expires in ${expiresMinutes} minutes.`,
    "",
    "Sudarshan Group",
  ].join("\n");

  const html = `
    <p>Hello <strong>${driver.name}</strong>,</p>
    <p>Your driver check-in code for dispatch <strong>${dispatch.id}</strong>:</p>
    <p style="margin:24px 0;font-size:28px;font-weight:700;letter-spacing:6px;font-family:monospace;">${otp}</p>
    <p style="color:#64748b;">Expires in <strong>${expiresMinutes} minutes</strong>.</p>
    <p>Sudarshan Group</p>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_ID,
      to: normalizedEmail,
      subject: `Sudarshan — Driver check-in code (${dispatch.id})`,
      text,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error("Failed to send dispatch driver OTP:", err);
    return { sent: false, reason: "send_failed" };
  }
}

export async function verifyDispatchDriverOtp(
  trackToken: string,
  email: string,
  otp: string
): Promise<{ driverSessionToken: string; driverName: string; dispatchId: string }> {
  if (!isDbConfigured()) throw new Error("Database not configured");

  const normalizedEmail = email.trim().toLowerCase();
  const code = otp.trim();
  if (!/^\d{6}$/.test(code)) throw new Error("Enter the 6-digit OTP");

  const { dispatch, driver } = await resolveDriverForDispatch(trackToken, normalizedEmail);

  await connectDB();
  const record = await DispatchDriverOtp.findOne({
    trackToken: trackToken.trim(),
    email: normalizedEmail,
  }).lean();

  if (!record?.otpHash || !record.expiresAt) {
    throw new Error("OTP not found. Request a new code.");
  }
  if (new Date(record.expiresAt).getTime() < Date.now()) {
    throw new Error("OTP has expired. Request a new code.");
  }

  const valid = await bcrypt.compare(code, record.otpHash);
  if (!valid) throw new Error("Invalid OTP");

  await DispatchDriverOtp.deleteOne({ _id: record._id });

  const driverSessionToken = await createDispatchDriverToken({
    trackToken: trackToken.trim(),
    dispatchId: dispatch.id,
    driverId: String(driver._id),
    email: normalizedEmail,
    name: driver.name,
  });

  return {
    driverSessionToken,
    driverName: driver.name,
    dispatchId: dispatch.id,
  };
}

export { OTP_EXPIRY_MS };
