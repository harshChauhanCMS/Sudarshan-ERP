import { connectDB } from "@/lib/db";
import Notification from "@/lib/models/Notification";
import { ownerAdminEmails } from "@/lib/notify-roles";

type PoNotificationInput = {
  id: string;
  vendor: string;
  total: number;
};

function fmtINR(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export async function notifyPoNeedsApproval(
  po: PoNotificationInput,
  creator: { name?: string; email: string },
): Promise<void> {
  try {
    await connectDB();
    const recipients = await ownerAdminEmails();
    if (!recipients.length) return;

    const message = `${creator.name || creator.email} raised PO ${po.id} for ${po.vendor} — ${fmtINR(po.total)} — needs verification`;

    await Notification.insertMany(
      recipients.map((recipientEmail) => ({
        recipientEmail,
        category: "procurement",
        type: "info",
        message,
        target: "/procurement/po",
        read: false,
      })),
    );
  } catch (e) {
    console.error("notifyPoNeedsApproval failed:", e);
  }
}

export async function notifyPoDecision(
  po: PoNotificationInput,
  decision: "approved" | "rejected",
  createdByEmail: string | undefined,
  actorEmail: string,
): Promise<void> {
  try {
    if (!createdByEmail) return;
    await connectDB();

    const message = `Your PO ${po.id} for ${po.vendor} was ${decision} by ${actorEmail}`;

    await Notification.create({
      recipientEmail: createdByEmail.trim().toLowerCase(),
      category: "procurement",
      type: decision === "approved" ? "success" : "alert",
      message,
      target: "/procurement/po",
      read: false,
    });
  } catch (e) {
    console.error("notifyPoDecision failed:", e);
  }
}
