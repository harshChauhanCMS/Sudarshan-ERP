/**
 * Canonicalises legacy leave-type spellings in MongoDB (`earned` -> `privilege`).
 *
 * The application no longer depends on this — every read and write normalises
 * through `normalizeLeaveType` — but migrating removes the split so the data
 * matches the schema enum and future queries need no alias handling.
 *
 *   npx tsx scripts/migrate-leave-type-aliases.ts            # dry run, writes nothing
 *   npx tsx scripts/migrate-leave-type-aliases.ts --apply    # performs the update
 *
 * Safe to re-run: already-canonical rows are skipped.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import LeaveRequest from "@/lib/models/LeaveRequest";
import LeavePolicy from "@/lib/models/LeavePolicy";
import { LEAVE_TYPE_ALIASES } from "@/lib/leave-apply";

const APPLY = process.argv.includes("--apply");

(async () => {
  await connectDB();
  console.log(`db: ${mongoose.connection.name}`);
  console.log(APPLY ? "MODE: APPLY (will write)\n" : "MODE: DRY RUN (no writes)\n");

  for (const [alias, canonical] of Object.entries(LEAVE_TYPE_ALIASES)) {
    const leaveN = await LeaveRequest.countDocuments({ leaveType: alias });
    const polN = await LeavePolicy.countDocuments({ leaveType: alias });
    if (!leaveN && !polN) continue;

    console.log(`${alias} -> ${canonical}`);
    console.log(`   leave requests: ${leaveN}`);
    console.log(`   policy rows   : ${polN}`);

    // A canonical policy row may already exist; two rows would violate the
    // unique index on leaveType, so report rather than collide.
    const clash = polN > 0 && (await LeavePolicy.countDocuments({ leaveType: canonical })) > 0;
    if (clash) {
      console.log(`   !! a "${canonical}" policy already exists — resolve by hand:`);
      const rows = await LeavePolicy.find({ leaveType: { $in: [alias, canonical] } })
        .select({ leaveType: 1, label: 1, annualQuota: 1, isActive: 1 }).lean();
      for (const r of rows as Record<string, unknown>[]) console.log("     ", r);
    }

    if (!APPLY) { console.log("   (dry run — nothing written)\n"); continue; }

    if (leaveN) {
      const r = await LeaveRequest.updateMany({ leaveType: alias }, { $set: { leaveType: canonical } });
      console.log(`   updated ${r.modifiedCount} leave request(s)`);
    }
    if (polN && !clash) {
      const r = await LeavePolicy.updateMany({ leaveType: alias }, { $set: { leaveType: canonical } });
      console.log(`   updated ${r.modifiedCount} policy row(s)`);
    }
    console.log("");
  }

  await mongoose.disconnect();
  console.log(APPLY ? "migration complete" : "dry run complete — re-run with --apply to write");
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
