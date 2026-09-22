import { ok, fail } from "@/lib/api-response";
import { requireSession, requirePermission } from "@/lib/api-auth";
import { isDbConfigured } from "@/lib/mongodb";
import { recordManualVerification, WorkflowError } from "@/lib/invoice-service";
import { notifyInvoiceDecision } from "@/lib/po-approval-notifications";

/**
 * PATCH /api/procurement/invoices/[id]/manual-verify — the manual check.
 *
 * The verifier types the invoice's details in from the paper copy and picks
 * the outcome themselves; nothing is decided automatically. Marking it
 * `verified` receives the quantity into inventory, so this needs `approve`,
 * the same authority as signing off a payable.
 *
 * Body: { status, vendorInvoiceNo?, invDate?, invAmt?, subtotal?, taxAmount?,
 *         quantityReceived?, unit?, receivedDate?, challanNo?, note? }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDbConfigured()) return fail("Database not configured", 503);

  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requirePermission(user, "procurement_invoice", "approve");
  if (permErr) return permErr;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return fail("Invalid request body", 400);

  try {
    const { invoice, receipt } = await recordManualVerification(id, body, {
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
    return ok({ updated: true, invoice, receipt });
  } catch (e) {
    if (e instanceof WorkflowError) return fail(e.message, e.status);
    return fail(e instanceof Error ? e.message : "Verification failed", 500);
  }
}
