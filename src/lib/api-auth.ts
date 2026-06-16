import { fail } from "@/lib/api-response";
import { canPerform } from "@/lib/permission-types";
import type { ModuleKey, ModulePermission } from "@/lib/permission-types";
import { isAdminOrOwner } from "@/lib/role-utils";
import { getSession, type SessionUser } from "@/lib/session";

export { isAdminOrOwner } from "@/lib/role-utils";

export async function requireSession() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.user) {
    return { session: null as null, user: null as null, error: fail("Unauthorized", 401) };
  }
  return { session, user: session.user, error: null as null };
}

export function requireAdminOrOwner(user: SessionUser) {
  if (!isAdminOrOwner(user.role)) return fail("Forbidden", 403);
  return null;
}

export function requirePermission(
  user: SessionUser,
  module: ModuleKey,
  action: keyof ModulePermission = "view",
) {
  if (isAdminOrOwner(user.role)) return null;
  if (!canPerform(user.permissions, module, action)) {
    return fail("Forbidden", 403);
  }
  return null;
}

export function requireAnyPermission(
  user: SessionUser,
  checks: Array<[ModuleKey, keyof ModulePermission]>,
) {
  if (isAdminOrOwner(user.role)) return null;
  for (const [module, action] of checks) {
    if (canPerform(user.permissions, module, action)) return null;
  }
  return fail("Forbidden", 403);
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function blockInProduction() {
  if (isProduction()) return fail("Not available in production", 403);
  return null;
}
