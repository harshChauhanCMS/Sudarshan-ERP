import { ok, fail } from "@/lib/api-response";
import { requireSession, requirePermission } from "@/lib/api-auth";
import { isDbConfigured } from "@/lib/mongodb";
import {
  listInvoices,
  raiseInvoiceForPo,
  WorkflowError,
} from "@/lib/invoice-service";
import { normalizeInvoiceStatus } from "@/lib/procurement-workflow";
import { notifyInvoiceRaised } from "@/lib/po-approval-notifications";

export const dynamic = "force-dynamic";

/** GET /api/procurement/invoices — list, with optional ?status=&po= filters. */
export async function GET(request: Request) {
  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requirePermission(user, "procurement_invoice", "view");
  if (permErr) return permErr;

  if (!isDbConfigured()) return fail("Database not configured", 503);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const po = searchParams.get("po");

  try {
    const invoices = (await listInvoices()).map((i) => ({
      ...i,
      status: normalizeInvoiceStatus(i.status),
    }));
    const filtered = invoices.filter((i) => {
      if (status && status !== "all" && i.status !== status) return false;
      if (po && i.po !== po) return false;
      return true;
    });
    return ok(filtered);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Load failed", 500);
  }
}

/**
 * POST /api/procurement/invoices — the vendor's invoice against an accepted
 * PO. Lands in `pending_verification`; nothing here can mark it verified.
 *
 * Body: { poId, invAmt, vendorInvoiceNo?, invDate?, notes? }
 */
export async function POST(request: Request) {
  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requirePermission(user, "procurement_invoice", "add");
  if (permErr) return permErr;

  if (!isDbConfigured()) return fail("Database not configured", 503);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return fail("Invalid request body", 400);

  try {
    const { invoice, po } = await raiseInvoiceForPo(body, {
      email: user.email,
      name: user.name,
    });
    void notifyInvoiceRaised(invoice, po.createdByEmail);
    return ok({ created: true, invoice, po }, 201);
  } catch (e) {
    if (e instanceof WorkflowError) return fail(e.message, e.status);
    return fail(e instanceof Error ? e.message : "Create failed", 500);
  }
}
