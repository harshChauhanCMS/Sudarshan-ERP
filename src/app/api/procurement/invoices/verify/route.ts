import { ok, fail } from "@/lib/api-response";
import { requireSession, requirePermission } from "@/lib/api-auth";
import { isDbConfigured } from "@/lib/mongodb";
import { verifyPoInvoice, WorkflowError } from "@/lib/invoice-service";
import { notifyInvoiceDecision } from "@/lib/po-approval-notifications";

/**
 * POST /api/procurement/invoices/verify — verify a purchase order's invoice.
 *
 * The invoice does not exist until this call: its details are typed in from
 * the vendor's copy, checked against the PO, and the record is created with
 * its generated invoice number and the status the verifier picked. Needs
 * `approve`, since verifying receives goods and clears a payable.
 *
 * Body: { poId, status, invoiceVendorName?, materialName?, vendorInvoiceNo?,
 *         invDate?, invAmt, subtotal?, taxAmount?, rate?, quantityReceived?,
 *         unit?, receivedDate?, challanNo?, note? }
 */
export async function POST(request: Request) {
  if (!isDbConfigured()) return fail("Database not configured", 503);

  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requirePermission(user, "procurement_invoice", "approve");
  if (permErr) return permErr;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return fail("Invalid request body", 400);

  try {
    const { invoice, receipt, grn } = await verifyPoInvoice(String(body.poId ?? ""), body, {
      email: user.email,
      name: user.name,
    });
    if (invoice.status === "verified" || invoice.status === "failed") {
      void notifyInvoiceDecision(
        invoice,
        invoice.status === "verified" ? "verified" : "mismatch",
        user.email,
      );
    }
    return ok({ created: true, invoice, receipt, grn }, 201);
  } catch (e) {
    if (e instanceof WorkflowError) return fail(e.message, e.status);
    return fail(e instanceof Error ? e.message : "Verification failed", 500);
  }
}
