import { ok, fail } from "@/lib/api-response";
import { requireSession, requirePermission } from "@/lib/api-auth";
import { isDbConfigured } from "@/lib/mongodb";
import { getEntityItems, updateEntityItem } from "@/lib/db-entities";
import type { PurchaseOrder } from "@/lib/entity-types";
import { sendPoPdfEmail } from "@/lib/po-pdf-email";

/** A 10 MB base64 payload is ~7.5 MB of PDF — far more than a one-page PO. */
const MAX_PDF_BASE64 = 10 * 1024 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/procurement/po/[id]/send-pdf — emails the PO document to the
 * address entered on the form. The PDF comes from the browser as base64 so
 * the vendor receives exactly the file that was downloaded.
 *
 * Body: { email, fileName, pdfBase64 }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDbConfigured()) return fail("Database not configured", 503);

  const { user, error } = await requireSession();
  if (error) return error;
  // Either issuing the order or notifying the vendor that their invoice was
  // rejected — both are procurement actions on this PO.
  const permErr = requirePermission(user, "procurement_po", "add");
  if (permErr) return permErr;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return fail("Invalid request body", 400);

  const email = String(body.email ?? "").trim();
  if (!EMAIL_RE.test(email)) return fail("A valid email address is required", 400);

  const pdfBase64 = String(body.pdfBase64 ?? "");
  if (!pdfBase64) return fail("pdfBase64 is required", 400);
  if (pdfBase64.length > MAX_PDF_BASE64) return fail("PDF is too large to email", 413);

  try {
    const orders = await getEntityItems<PurchaseOrder>("purchaseOrders");
    const po = orders.find((p) => p.id === id);
    if (!po) return fail("Purchase order not found", 404);

    const kind = body.kind === "failed" ? ("failed" as const) : ("issue" as const);
    const reason = String(body.reason ?? "").trim().slice(0, 1000);
    if (kind === "failed" && !reason) {
      return fail("A reason is required on a failed-invoice notice", 400);
    }

    const sent = await sendPoPdfEmail({
      to: email,
      kind,
      reason,
      invoiceRef: String(body.invoiceRef ?? "").trim() || undefined,
      poId: po.id,
      vendorName: po.vendor,
      total: Number(po.total) || 0,
      expectedDelivery: po.expectedDelivery,
      fileName: String(body.fileName ?? `${po.id}.pdf`),
      pdfBase64,
      raisedBy: user.name || user.email,
    });

    if (!sent) {
      // Mail is not configured — the PO itself is already saved and the PDF
      // downloaded, so this is reported, not treated as a failure.
      return ok({ sent: false, reason: "Email is not configured on this server" });
    }

    // Only the order's own copy updates the PO's email stamp; a failure notice
    // is about an invoice, not a re-issue of the order.
    if (kind === "issue") {
      await updateEntityItem("purchaseOrders", po.id, {
        vendorEmail: email,
        pdfEmailedAt: new Date().toISOString(),
      });
    }

    return ok({ sent: true, email, kind });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to email the purchase order", 500);
  }
}
