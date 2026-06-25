/**
 * Upsert owner@sudarshan.com without wiping other users.
 * Usage: npx tsx scripts/upsert-owner.ts
 */
import { config } from "dotenv";
import { upsertOwnerEmployee } from "../src/lib/seed-owner-employee";
import { upsertSeedUser } from "../src/lib/seed-users";
import { isDbConfigured } from "../src/lib/mongodb";

config({ path: ".env" });

async function main() {
  if (!isDbConfigured()) {
    console.error("MONGODB_URI is not set.");
    process.exit(1);
  }

  const user = await upsertSeedUser("owner@sudarshan.com");
  const employee = await upsertOwnerEmployee();
  console.log(JSON.stringify({ user, employee }, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
