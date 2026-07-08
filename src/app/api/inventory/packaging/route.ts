import { ok, fail } from "@/lib/api-response";
import { requireSession, requirePermission } from "@/lib/api-auth";
import { isDbConfigured } from "@/lib/mongodb";
import { listPackaging, createPackaging } from "@/lib/packaging-service";

/** GET /api/inventory/packaging — list, with optional ?search=&status= filters. */
export async function GET(request: Request) {
  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requirePermission(user, "inventory_packaging", "view");
  if (permErr) return permErr;

  if (!isDbConfigured()) return ok([]);

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim().toLowerCase() ?? "";
    const status = searchParams.get("status")?.trim() ?? "";

    let items = await listPackaging();
    if (status) items = items.filter((p) => p.status === status);
    if (search) {
      items = items.filter(
        (p) =>
          p.code.toLowerCase().includes(search) ||
          p.name.toLowerCase().includes(search),
      );
    }

    return ok(items);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Load failed", 500);
  }
}

/** POST /api/inventory/packaging — create a packaging master record. */
export async function POST(request: Request) {
  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requirePermission(user, "inventory_packaging", "add");
  if (permErr) return permErr;

  if (!isDbConfigured()) return fail("Database not configured", 503);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return fail("Invalid request body", 400);
  }

  try {
    const item = await createPackaging(body as Record<string, unknown>);
    return ok({ created: true, item }, 201);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Create failed", 400);
  }
}
