import Role, { DEFAULT_ROLES } from "@/lib/models/Role";
import {
  MODULE_KEYS,
  type ModulePermission,
  type PermissionsMap,
} from "@/lib/permission-types";

const ROLE_ALIASES: Record<string, string> = {
  rm: "rm-procurement",
  pack: "packaging-procurement",
  spare: "spare-parts-procurement",
  prod: "production",
  disp: "dispatch",
  sales: "dispatch",
  employee: "store",
};

const emptyPerm = (): ModulePermission => ({
  view: false,
  add: false,
  edit: false,
  approve: false,
  export: false,
});

export function emptyPermissions(): PermissionsMap {
  return Object.fromEntries(
    MODULE_KEYS.map((key) => [key, emptyPerm()])
  ) as PermissionsMap;
}

function dashboardOnlyPermissions(): PermissionsMap {
  const perms = emptyPermissions();
  perms.dashboard = { ...emptyPerm(), view: true };
  return perms;
}

async function ensureDefaultRoles() {
  const count = await Role.countDocuments();
  if (count === 0) {
    await Role.insertMany(DEFAULT_ROLES);
  }
}

export async function resolvePermissionsForRole(
  roleKey: string
): Promise<PermissionsMap> {
  await ensureDefaultRoles();

  const normalized = ROLE_ALIASES[roleKey.toLowerCase()] ?? roleKey.toLowerCase();
  const role = await Role.findOne({ roleKey: normalized }).lean();

  if (!role?.permissions) {
    if (normalized === "owner" || normalized === "admin") {
      const fallback = await Role.findOne({ roleKey: normalized }).lean();
      if (fallback?.permissions) {
        return fallback.permissions as PermissionsMap;
      }
    }
    return dashboardOnlyPermissions();
  }

  return role.permissions as PermissionsMap;
}
