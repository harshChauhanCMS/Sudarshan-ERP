import mongoose, { Schema } from "mongoose";

export const SPARE_PART_CATEGORIES = [
  "Bearing",
  "Belt",
  "Motor",
  "Seal",
  "Gearbox",
  "Filter",
  "Valve",
  "Chain",
  "Pump",
  "Electrical",
  "Instrument",
  "Lubricant",
] as const;

export const SPARE_PART_UNITS = ["pcs", "set", "mtr", "kg", "drum"] as const;

export const SPARE_PART_CRITICALITIES = [
  "critical",
  "high",
  "medium",
  "low",
  "",
] as const;

export const SPARE_PART_STATUSES = ["ok", "low", "critical"] as const;

const SparePartSchema = new Schema(
  {
    code: {
      type: String,
      required: [true, "Part code is required"],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9-]+$/, "Part code must be alphanumeric (hyphens allowed)"],
    },
    name: {
      type: String,
      required: [true, "Part name is required"],
      trim: true,
      maxlength: [120, "Part name must be at most 120 characters"],
    },
    vendor: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: { values: SPARE_PART_CATEGORIES, message: "Invalid category" },
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, "Stock cannot be negative"],
    },
    unit: {
      type: String,
      required: [true, "Unit is required"],
      enum: { values: SPARE_PART_UNITS, message: "Invalid unit" },
      default: "pcs",
    },
    reorder: {
      type: Number,
      required: [true, "Minimum stock is required"],
      min: [0, "Minimum stock must be at least 0"],
      default: 0,
    },
    value: {
      type: Number,
      min: [0, "Value cannot be negative"],
      default: 0,
    },
    location: {
      type: String,
      trim: true,
      default: "—",
    },
    status: {
      type: String,
      enum: SPARE_PART_STATUSES,
      default: "ok",
    },
    trend: {
      type: Number,
      default: 0,
    },
    critical: {
      type: Boolean,
      default: false,
    },
    lastIssued: {
      type: String,
      trim: true,
      default: "—",
    },
    machineName: {
      type: String,
      trim: true,
      default: "",
    },
    standardRate: {
      type: Number,
      min: [0, "Standard rate cannot be negative"],
      default: 0,
    },
    criticality: {
      type: String,
      enum: { values: SPARE_PART_CRITICALITIES, message: "Invalid criticality" },
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

/**
 * `critical`, `status`, and `value` are always derived server-side — never trust
 * client-supplied values for these. Mirrors the same rule used by RawMaterial/Packaging.
 */
SparePartSchema.pre("validate", function computeDerived() {
  const stock = this.stock ?? 0;
  const reorder = this.reorder ?? 0;
  const standardRate = this.standardRate ?? 0;

  this.critical = this.criticality === "critical" || this.criticality === "high";

  if (stock === 0) this.status = "critical";
  else if (this.critical && stock <= reorder) this.status = "critical";
  else if (stock <= reorder) this.status = "low";
  else this.status = "ok";

  this.value = stock * standardRate;
});

// Next.js HMR can cache a stale schema across reloads in dev — re-register when fields are missing.
if (mongoose.models.SparePart && !mongoose.models.SparePart.schema.path("criticality")) {
  mongoose.deleteModel("SparePart");
}

export default mongoose.models.SparePart ||
  mongoose.model("SparePart", SparePartSchema);
