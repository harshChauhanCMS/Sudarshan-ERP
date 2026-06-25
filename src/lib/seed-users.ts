import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { SEED_DATA } from "@/lib/seed-data";

const DEFAULT_PASSWORD = "sudarshan123";

/** Per-user passwords used only when seeding (not stored in seed-data). */
const USER_PASSWORDS: Record<string, string> = {
  "owner@sudarshan.com": "Test@123",
};

async function hashForEmail(email: string): Promise<string> {
  const password = USER_PASSWORDS[email.toLowerCase()] ?? DEFAULT_PASSWORD;
  return bcrypt.hash(password, 10);
}

export async function seedUsers() {
  await connectDB();
  await User.deleteMany({});
  const users = await Promise.all(
    SEED_DATA.USERS.map(async (u) => ({
      email: u.email,
      name: u.name,
      role: u.role,
      employeeId: u.employeeId,
      passwordHash: await hashForEmail(u.email),
    })),
  );
  await User.insertMany(users);
  return { seeded: true, count: SEED_DATA.USERS.length };
}

export async function upsertSeedUser(email: string) {
  const normalized = email.trim().toLowerCase();
  const seedUser = SEED_DATA.USERS.find((u) => u.email.toLowerCase() === normalized);
  if (!seedUser) {
    throw new Error(`No seed user defined for ${email}`);
  }

  await connectDB();
  const passwordHash = await hashForEmail(seedUser.email);
  const user = await User.findOneAndUpdate(
    { email: normalized },
    {
      email: normalized,
      name: seedUser.name,
      role: seedUser.role,
      employeeId: seedUser.employeeId,
      passwordHash,
      requiresPasswordReset: false,
      passwordResetDeadline: null,
      forgotPasswordOtpHash: null,
      forgotPasswordOtpExpires: null,
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  return {
    upserted: true,
    user: {
      id: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
      employeeId: user.employeeId,
    },
  };
}
