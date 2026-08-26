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

/** Fan-out to whoever raised the PO, falling back to owners/admins. */
async function notifyOne(
  recipient: string | undefined,
  payload: { message: string; type: string; target: string },
): Promise<void> {
  await connectDB();
  const recipients = recipient
    ? [recipient.trim().toLowerCase()]
    : await ownerAdminEmails();
  if (!recipients.length) return;
  await Notification.insertMany(
    recipients.map((recipientEmail) => ({
      recipientEmail,
      category: "procurement",
      read: false,
      ...payload,
    })),
  );
}

export async function notifyPoSentToVendor(
  po: PoNotificationInput,
  actorEmail: string,
): Promise<void> {
  try {
    await notifyOne(undefined, {
      message: `PO ${po.id} (${po.vendor}, ${fmtINR(po.total)}) was sent to the vendor by ${actorEmail}`,
      type: "info",
      target: "/procurement/po",
    });
  } catch (e) {
    console.error("notifyPoSentToVendor failed:", e);
  }
}

export async function notifyPoVendorResponse(
  po: PoNotificationInput,
  accepted: boolean,
  note: string,
  createdByEmail: string | undefined,
): Promise<void> {
  try {
    const tail = accepted ? "" : ` — reason: ${note}`;
    await notifyOne(createdByEmail, {
      message: `Vendor ${accepted ? "accepted" : "declined"} PO ${po.id} (${po.vendor})${tail}`,
      type: accepted ? "success" : "alert",
      target: "/procurement/po",
    });
  } catch (e) {
    console.error("notifyPoVendorResponse failed:", e);
  }
}

type InvoiceNotificationInput = {
  id: string;
  po: string;
  vendor: string;
  invAmt: number;
  raisedByEmail?: string;
  mismatchNote?: string;
};

export async function notifyInvoiceRaised(
  invoice: InvoiceNotificationInput,
  poCreatedByEmail: string | undefined,
): Promise<void> {
  try {
    // Verification is an owner/approver job, so this goes wide rather than
    // only to whoever raised the PO.
    await notifyOne(undefined, {
      message: `Invoice ${invoice.id} from ${invoice.vendor} for ${fmtINR(invoice.invAmt)} against PO ${invoice.po} — pending verification`,
      type: "info",
      target: "/procurement/invoices",
    });
    if (poCreatedByEmail) {
      await notifyOne(poCreatedByEmail, {
        message: `Invoice ${invoice.id} was raised against your PO ${invoice.po}`,
        type: "info",
        target: "/procurement/invoices",
      });
    }
  } catch (e) {
    console.error("notifyInvoiceRaised failed:", e);
  }
}

export async function notifyInvoiceDecision(
  invoice: InvoiceNotificationInput,
  decision: "verified" | "mismatch",
  actorEmail: string,
): Promise<void> {
  try {
    const message =
      decision === "verified"
        ? `Invoice ${invoice.id} (PO ${invoice.po}) verified by ${actorEmail} — ready for payment`
        : `Invoice ${invoice.id} (PO ${invoice.po}) marked mismatch by ${actorEmail} — ${invoice.mismatchNote ?? "see note"}`;
    await notifyOne(invoice.raisedByEmail, {
      message,
      type: decision === "verified" ? "success" : "alert",
      target: "/procurement/invoices",
    });
  } catch (e) {
    console.error("notifyInvoiceDecision failed:", e);
  }
}

export async function notifyInvoiceResubmitted(
  invoice: InvoiceNotificationInput,
): Promise<void> {
  try {
    await notifyOne(undefined, {
      message: `Invoice ${invoice.id} (PO ${invoice.po}) was corrected and resubmitted — pending verification`,
      type: "info",
      target: "/procurement/invoices",
    });
  } catch (e) {
    console.error("notifyInvoiceResubmitted failed:", e);
  }
}
