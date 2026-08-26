import mongoose, { Schema } from "mongoose";

/**
 * A reusable salary deduction master, e.g. "Provident Fund · 12% of basic".
 *
 * Deductions are referenced by employees (`Employee.deductionIds`) rather than
 * copied onto them, so editing a rate here re-rates every assigned employee on
 * the next payroll run. The amount is snapshotted onto the salary sheet at
 * generation time, so already-generated payslips never change retroactively.
 *
 * `maxAmount` and `applicableUpToGross` exist so the statutory deductions this
 * replaced stay representable: PF is 12% of basic *capped at ₹1,800*, and ESIC
 * is 0.75% of gross but *only while gross is ≤ ₹21,000*.
 */
const DeductionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    /** Percentage of the basis, e.g. 12 for 12%. */
    percentage: { type: Number, required: true, min: 0, max: 100 },
    /** What the percentage is taken of. */
    basis: {
      type: String,
      enum: ["gross", "basic"],
      default: "gross",
      required: true,
    },
    /** Optional monthly ceiling on the deducted amount (0 = uncapped). */
    maxAmount: { type: Number, default: 0, min: 0 },
    /** Optional gross-salary eligibility ceiling (0 = always applicable). */
    applicableUpToGross: { type: Number, default: 0, min: 0 },
    /** Pre-selected on the add-employee form. */
    isDefault: { type: Boolean, default: false },
    /**
     * Set on the built-in payslip rows (see `deduction-defaults.ts`). Marks a
     * row as backfilled by the system, so it is deactivated rather than deleted
     * — a hard delete would just be re-created by the next backfill.
     */
    seedKey: { type: String, trim: true, index: true, sparse: true },
    isActive: { type: Boolean, default: true },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.Deduction ||
  mongoose.model("Deduction", DeductionSchema);
