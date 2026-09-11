import mongoose, { Schema } from "mongoose";

/**
 * One outbound stores transaction — a spare part drawn from the rack and fitted
 * to a machine. This is the event that makes `SparePart.lastIssuedAt`, coverage
 * and consumption trend real numbers instead of hand-typed ones.
 *
 * Rows are immutable history: correct a mistake by reversing it, never by editing.
 */
const SparePartIssueSchema = new Schema(
  {
    partCode: {
      type: String,
      required: [true, "Part code is required"],
      trim: true,
      uppercase: true,
      index: true,
    },
    qty: {
      type: Number,
      required: [true, "Issue quantity is required"],
      min: [0.0001, "Issue quantity must be greater than zero"],
    },
    unit: {
      type: String,
      trim: true,
      default: "",
    },
    machineId: {
      type: String,
      trim: true,
      default: "",
    },
    issuedTo: {
      type: String,
      required: [true, "Issued-to is required"],
      trim: true,
      maxlength: [120, "Issued-to must be at most 120 characters"],
    },
    workOrder: {
      type: String,
      trim: true,
      default: "",
      maxlength: [60, "Work order must be at most 60 characters"],
    },
    /** Rate at the moment of issue, so historical consumption value never shifts. */
    rateAtIssue: {
      type: Number,
      min: [0, "Rate cannot be negative"],
      default: 0,
    },
    issuedAt: {
      type: Date,
      required: [true, "Issue date is required"],
      default: Date.now,
      index: true,
    },
    issuedBy: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Notes must be at most 500 characters"],
    },
  },
  { timestamps: true },
);

/** Newest-first history per part, and the `max(issuedAt)` lookup behind lastIssuedAt. */
SparePartIssueSchema.index({ partCode: 1, issuedAt: -1 });

export default mongoose.models.SparePartIssue ||
  mongoose.model("SparePartIssue", SparePartIssueSchema);
