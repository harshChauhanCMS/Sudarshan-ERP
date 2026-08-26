import {
  getEntityItems,
  upsertEntity,
  appendEntityItem,
  updateEntityItem,
  removeEntityItem,
  displayOrderedItems,
  KEY_MAP,
} from "@/lib/db-entities";
import { EMPTY_ERP_DATA } from "@/lib/empty-erp-data";
import { isDbConfigured } from "@/lib/mongodb";
import { useMockDataEnabled } from "@/lib/bootstrap-meta";
import { SEED_DATA } from "@/lib/seed-data";
import { ok, fail } from "@/lib/api-response";
import {
  requireSession,
  requirePermission,
  isAdminOrOwner,
} from "@/lib/api-auth";
import {
  moduleForEntityKey,
  sanitizeEntityPatch,
} from "@/lib/entity-permissions";
import { notifyPoNeedsApproval } from "@/lib/po-approval-notifications";

const REVERSE_MAP = Object.fromEntries(
  Object.entries(KEY_MAP).map(([field, key]) => [key, field])
);

type Params = { params: Promise<{ key: string }> };

function requireEntityAccess(
  user: NonNullable<Awaited<ReturnType<typeof requireSession>>["user"]>,
  key: string,
  action: "view" | "add" | "edit",
) {
  const module = moduleForEntityKey(key);
  if (!module) return fail("Unknown entity key", 404);
  // Company directory is reference/branding metadata, not sensitive settings —
  // any authenticated session may read it. Writes stay settings-gated below.
  if (key === "companies" && action === "view") return null;
  if (["permissions", "roles"].includes(key) && !isAdminOrOwner(user.role)) {
    return requirePermission(user, "user_management", action);
  }
  return requirePermission(user, module, action);
}

export async function GET(_req: Request, { params }: Params) {
  const { key } = await params;
  if (!REVERSE_MAP[key]) return fail("Unknown entity key", 404);

  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requireEntityAccess(user, key, "view");
  if (permErr) return permErr;

  try {
    if (!isDbConfigured()) {
      if (!useMockDataEnabled()) {
        if (key === "attendanceToday") return ok(EMPTY_ERP_DATA.ATTENDANCE_TODAY);
        return ok([]);
      }
      const field = REVERSE_MAP[key] as keyof typeof SEED_DATA;
      const value = SEED_DATA[field];
      return ok(Array.isArray(value) ? displayOrderedItems(key, value) : value);
    }
    if (key === "attendanceToday") {
      const { EntityStore } = await import("@/models/EntityStore");
      const doc = await EntityStore.findOne({ key }).lean();
      return ok(doc?.meta ?? EMPTY_ERP_DATA.ATTENDANCE_TODAY);
    }
    const items = await getEntityItems(key);
    return ok(displayOrderedItems(key, items));
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Load failed", 500);
  }
}

export async function POST(request: Request, { params }: Params) {
  const { key } = await params;
  if (!REVERSE_MAP[key]) return fail("Unknown entity key", 404);
  if (!isDbConfigured()) return fail("Database not configured", 503);

  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requireEntityAccess(user, key, "add");
  if (permErr) return permErr;

  const body = await request.json().catch(() => null);
  if (!body?.item || typeof body.item !== "object") {
    return fail("Body must include item object", 400);
  }

  const item = sanitizeEntityPatch(body.item as Record<string, unknown>);

  // Purchase order status/verification is never client-controlled: owner/admin
  // self-verify on issue, everyone else needs owner/admin sign-off.
  let notifyPending = false;
  if (key === "purchaseOrders") {
    const intent = item.status === "draft" ? "draft" : "submitted";
    if (intent === "draft") {
      item.status = "draft";
    } else if (isAdminOrOwner(user.role)) {
      item.status = "approved";
      item.verifiedBy = user.email;
      item.verifiedAt = new Date().toISOString();
    } else {
      item.status = "pending_verification";
      notifyPending = true;
    }
    item.createdByEmail = user.email;
    item.createdByName = user.name;
    item.createdByRole = user.role;
  }

  try {
    const created = await appendEntityItem(key, item);
    if (notifyPending) {
      void notifyPoNeedsApproval(
        created as { id: string; vendor: string; total: number },
        { name: user.name, email: user.email },
      );
    }
    return ok({ created: true, item: created });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Create failed", 500);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const { key } = await params;
  if (!REVERSE_MAP[key]) return fail("Unknown entity key", 404);
  if (!isDbConfigured()) return fail("Database not configured", 503);

  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requireEntityAccess(user, key, "edit");
  if (permErr) return permErr;

  const body = await request.json().catch(() => null);
  if (!body) return fail("Invalid body", 400);

  try {
    if ("items" in body) {
      if (!isAdminOrOwner(user.role) && ["roles", "permissions"].includes(key)) {
        return fail("Forbidden", 403);
      }
      await upsertEntity(key, body.items);
      return ok({ updated: true });
    }

    if (key === "attendanceToday" && body.meta) {
      await upsertEntity(key, body.meta);
      return ok({ updated: true });
    }

    if (body.id != null && body.patch) {
      const item = await updateEntityItem(
        key,
        String(body.id),
        sanitizeEntityPatch(body.patch as Record<string, unknown>),
        body.idField
      );
      return ok({ updated: true, item });
    }

    return fail("Body must include items array, meta object, or id + patch", 400);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Update failed", 500);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { key } = await params;
  if (!REVERSE_MAP[key]) return fail("Unknown entity key", 404);
  if (!isDbConfigured()) return fail("Database not configured", 503);

  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requireEntityAccess(user, key, "edit");
  if (permErr) return permErr;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return fail("Query param id is required", 400);

  try {
    await removeEntityItem(key, id, searchParams.get("idField") ?? undefined);
    return ok({ deleted: true });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Delete failed", 500);
  }
}
