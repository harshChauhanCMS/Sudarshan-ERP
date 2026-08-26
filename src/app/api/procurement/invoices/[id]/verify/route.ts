import { ok, fail } from "@/lib/api-response";
import { requireSession, requirePermission } from "@/lib/api-auth";
import { isDbConfigured } from "@/lib/mongodb";
import { verifyInvoice, WorkflowError } from "@/lib/invoice-service";
import { notifyInvoiceDecision } from "@/lib/po-approval-notifications";

/**
 * PATCH /api/procurement/invoices/[id]/verify — invoice matches the PO, mark
 * it verified and ready for payment. Requires `approve`, not `edit`: signing
 * off a payable is a different authority from raising the invoice.
 *
 * Body: { note?: string }
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
  const body = await request.json().catch(() => ({}));

  try {
    const { invoice } = await verifyInvoice(id, body?.note, {
      email: user.email,
      name: user.name,
    });
    void notifyInvoiceDecision(invoice, "verified", user.email);
    return ok({ updated: true, invoice });
  } catch (e) {
    if (e instanceof WorkflowError) return fail(e.message, e.status);
    return fail(e instanceof Error ? e.message : "Verify failed", 500);
  }
}
