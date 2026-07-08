import { ok, fail } from "@/lib/api-response";
import { requireSession, requirePermission } from "@/lib/api-auth";
import { isDbConfigured } from "@/lib/mongodb";
import { listRawMaterials, createRawMaterial } from "@/lib/raw-material-service";

/** GET /api/inventory/raw-materials — list, with optional ?search=&category=&status= filters. */
export async function GET(request: Request) {
  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requirePermission(user, "inventory_raw", "view");
  if (permErr) return permErr;

  if (!isDbConfigured()) return ok([]);

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim().toLowerCase() ?? "";
    const category = searchParams.get("category")?.trim() ?? "";
    const status = searchParams.get("status")?.trim() ?? "";

    let items = await listRawMaterials();
    if (category) items = items.filter((r) => r.category === category);
    if (status) items = items.filter((r) => r.status === status);
    if (search) {
      items = items.filter(
        (r) =>
          r.code.toLowerCase().includes(search) ||
          r.name.toLowerCase().includes(search) ||
          r.grade.toLowerCase().includes(search),
      );
    }

    return ok(items);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Load failed", 500);
  }
}

/** POST /api/inventory/raw-materials — create a raw material master record. */
export async function POST(request: Request) {
  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requirePermission(user, "inventory_raw", "add");
  if (permErr) return permErr;

  if (!isDbConfigured()) return fail("Database not configured", 503);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return fail("Invalid request body", 400);
  }

  try {
    const item = await createRawMaterial(body as Record<string, unknown>);
    return ok({ created: true, item }, 201);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Create failed", 400);
  }
}
