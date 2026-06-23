import { connectDB } from "@/lib/db";
import Notification from "@/lib/models/Notification";
import { User } from "@/models/User";
import type { FieldVisitView } from "@/lib/field-visit-types";
import { companyLabel, formatVisitTime12h } from "@/lib/field-visit-form";

function buildVisitAssignedMessage(visit: FieldVisitView): string {
  const lines = [
    `New field visit assigned to you`,
    `Party: ${visit.partyName}`,
    `Date: ${visit.visitDate}`,
    `Time: ${formatVisitTime12h(visit.startTime)} – ${formatVisitTime12h(visit.returnTime)}`,
    `Type: ${visit.visitType}`,
    `Location: ${visit.locationText || "TBD"}`,
    `Company: ${companyLabel(visit.company)}`,
  ];
  if (visit.purpose?.trim()) lines.push(`Purpose: ${visit.purpose.trim()}`);
  if (visit.notes?.trim()) lines.push(`Notes: ${visit.notes.trim()}`);
  if (visit.createdByName) lines.push(`Assigned by: ${visit.createdByName}`);
  return lines.join(" · ");
}

async function ownerEmails(): Promise<string[]> {
  const users = await User.find({ role: { $in: ["owner", "admin"] } })
    .select({ email: 1 })
    .lean();
  return users
    .map((u) => u.email?.trim().toLowerCase())
    .filter(Boolean) as string[];
}

export async function notifyFieldVisitAssigned(visit: FieldVisitView): Promise<void> {
  try {
    await connectDB();
    const email = visit.assignedEmployeeEmail.trim().toLowerCase();
    if (!email) return;

    await Notification.create({
      recipientEmail: email,
      category: "field_sales",
      type: "info",
      employeeId: visit.assignedEmployeeId,
      employeeName: visit.assignedEmployeeName,
      message: buildVisitAssignedMessage(visit),
      target: "/field-sales/visit-log",
      read: false,
    });
  } catch (e) {
    console.error("notifyFieldVisitAssigned failed:", e);
  }
}

export async function notifyFieldVisitStatusChange(
  visit: FieldVisitView,
  action: "accepted" | "completed" | "cancelled"
): Promise<void> {
  try {
    await connectDB();
    const recipients = await ownerEmails();
    if (!recipients.length) return;

    const messages = {
      accepted: `${visit.assignedEmployeeName} accepted visit to ${visit.partyName} (${visit.visitDate})`,
      completed: `${visit.assignedEmployeeName} completed visit to ${visit.partyName}`,
      cancelled: `${visit.assignedEmployeeName} cancelled visit to ${visit.partyName}${visit.cancelReason ? `: ${visit.cancelReason}` : ""}`,
    };

    const types = {
      accepted: "info",
      completed: "success",
      cancelled: "alert",
    } as const;

    await Notification.insertMany(
      recipients.map((recipientEmail) => ({
        recipientEmail,
        category: "field_sales",
        type: types[action],
        employeeId: visit.assignedEmployeeId,
        employeeName: visit.assignedEmployeeName,
        message: messages[action],
        target: "/field-sales/activity-dashboard",
        read: false,
      }))
    );
  } catch (e) {
    console.error("notifyFieldVisitStatusChange failed:", e);
  }
}

export async function notifyOnsitePunchLocation(input: {
  employeeId?: string;
  employeeName: string;
  punchedAt: Date;
  address?: string;
  city?: string;
  lat: number;
  lng: number;
  workLocationType?: string;
}): Promise<void> {
  try {
    await connectDB();
    const recipients = await ownerEmails();
    if (!recipients.length) return;

    const time = input.punchedAt.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const place = input.address || input.city || `${input.lat.toFixed(4)}, ${input.lng.toFixed(4)}`;
    const workType = input.workLocationType || "Onsite";
    const idPart = input.employeeId ? ` (${input.employeeId})` : "";
    const message = `${input.employeeName}${idPart} punched in at ${time} · ${workType} · ${place}`;

    await Notification.insertMany(
      recipients.map((recipientEmail) => ({
        recipientEmail,
        category: "field_sales",
        type: "success",
        employeeId: input.employeeId,
        employeeName: input.employeeName,
        message,
        target: "/field-sales/activity-dashboard",
        punchedAt: input.punchedAt,
        read: false,
      }))
    );
  } catch (e) {
    console.error("notifyOnsitePunchLocation failed:", e);
  }
}
