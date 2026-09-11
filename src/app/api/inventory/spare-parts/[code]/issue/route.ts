import { ok, fail } from "@/lib/api-response";
import { requireSession, requirePermission } from "@/lib/api-auth";
import { isDbConfigured } from "@/lib/mongodb";
import { issueSparePart, listSparePartIssues } from "@/lib/spare-part-service";

type Params = { params: Promise<{ code: string }> };

/** GET /api/inventory/spare-parts/[code]/issue — issue history, newest first. */
export async function GET(request: Request, { params }: Params) {
  const { code } = await params;
  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requirePermission(user, "inventory_spares", "view");
  if (permErr) return permErr;

  if (!isDbConfigured()) return ok([]);

  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit")) || 50;
    return ok(await listSparePartIssues(code, limit));
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Load failed", 500);
  }
}

/** POST /api/inventory/spare-parts/[code]/issue — issue stock out to a machine. */
export async function POST(request: Request, { params }: Params) {
  const { code } = await params;
  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requirePermission(user, "inventory_spares", "edit");
  if (permErr) return permErr;

  if (!isDbConfigured()) return fail("Database not configured", 503);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return fail("Invalid request body", 400);
  }

  try {
    const result = await issueSparePart(
      code,
      body as Record<string, unknown>,
      user.name || user.email,
    );
    return ok({ issued: true, ...result }, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Issue failed";
    return fail(message, message.startsWith("Record not found") ? 404 : 400);
  }
}
