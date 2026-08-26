import { ok, fail } from "@/lib/api-response";
import { requireSession, requirePermission } from "@/lib/api-auth";
import { isDbConfigured } from "@/lib/mongodb";
import { resubmitInvoice, WorkflowError } from "@/lib/invoice-service";
import { notifyInvoiceResubmitted } from "@/lib/po-approval-notifications";

/**
 * PATCH /api/procurement/invoices/[id]/resubmit — the vendor corrected a
 * mismatched invoice and resent it. Goes back to `pending_verification` for
 * another review; the revision counter and history record the round trip.
 *
 * Body: { invAmt?, vendorInvoiceNo?, notes? }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDbConfigured()) return fail("Database not configured", 503);

  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requirePermission(user, "procurement_invoice", "edit");
  if (permErr) return permErr;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  try {
    const { invoice } = await resubmitInvoice(id, body ?? {}, {
      email: user.email,
      name: user.name,
    });
    void notifyInvoiceResubmitted(invoice);
    return ok({ updated: true, invoice });
  } catch (e) {
    if (e instanceof WorkflowError) return fail(e.message, e.status);
    return fail(e instanceof Error ? e.message : "Resubmit failed", 500);
  }
}
