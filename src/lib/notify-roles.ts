import { User } from "@/models/User";

/** Emails of every owner/admin user — used to fan out "needs approval"-style notifications. */
export async function ownerAdminEmails(): Promise<string[]> {
  const users = await User.find({ role: { $in: ["owner", "admin"] } })
    .select({ email: 1 })
    .lean();
  return users
    .map((u) => u.email?.trim().toLowerCase())
    .filter(Boolean) as string[];
}
