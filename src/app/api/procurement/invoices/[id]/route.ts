import { ok, fail } from "@/lib/api-response";
import { requireSession, requirePermission } from "@/lib/api-auth";
import { isDbConfigured } from "@/lib/mongodb";
import { getInvoiceWithPo, WorkflowError } from "@/lib/invoice-service";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/procurement/invoices/[id] — the invoice, the PO it was raised
 * against, and the computed amount comparison, so the verification screen can
 * show both sides without a second round trip.
 */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;

  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requirePermission(user, "procurement_invoice", "view");
  if (permErr) return permErr;

  if (!isDbConfigured()) return fail("Database not configured", 503);

  try {
    return ok(await getInvoiceWithPo(id));
  } catch (e) {
    if (e instanceof WorkflowError) return fail(e.message, e.status);
    return fail(e instanceof Error ? e.message : "Load failed", 500);
  }
}
