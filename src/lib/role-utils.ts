/** Client-safe role helpers (no server/session imports). */

export function isAdminOrOwner(role?: string): boolean {
  const r = role?.toLowerCase();
  return r === "admin" || r === "owner";
}
