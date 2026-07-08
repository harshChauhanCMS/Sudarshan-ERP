import mongoose, { Schema } from "mongoose";

export const PACKAGING_UNITS = ["pcs", "MT", "mtr"] as const;

export const PACKAGING_MATERIAL_TYPES = [
  "HDPE",
  "LDPE",
  "PP Woven",
  "Laminated",
  "Paper",
] as const;

export const PACKAGING_STATUSES = ["ok", "low", "critical"] as const;

const PackagingSchema = new Schema(
  {
    code: {
      type: String,
      required: [true, "Bag code is required"],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9-]+$/, "Bag code must be alphanumeric (hyphens allowed)"],
    },
    name: {
      type: String,
      required: [true, "Packaging type is required"],
      trim: true,
      maxlength: [150, "Name must be at most 150 characters"],
    },
    capacity: {
      type: Number,
      min: [0, "Capacity cannot be negative"],
    },
    unit: {
      type: String,
      required: [true, "Unit is required"],
      enum: { values: PACKAGING_UNITS, message: "Invalid unit" },
      default: "pcs",
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, "Stock cannot be negative"],
    },
    reorder: {
      type: Number,
      required: [true, "Reorder quantity is required"],
      min: [0, "Reorder quantity must be at least 0"],
      default: 0,
    },
    minStock: {
      type: Number,
      min: [0, "Minimum stock must be at least 0"],
      default: 0,
    },
    gradeCompatibility: {
      type: String,
      trim: true,
      default: "",
      maxlength: [200, "Grade compatibility must be at most 200 characters"],
    },
    supplier: {
      type: String,
      trim: true,
      default: "",
    },
    materialType: {
      type: String,
      trim: true,
      enum: {
        values: [...PACKAGING_MATERIAL_TYPES, ""],
        message: "Invalid material type",
      },
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Notes must be at most 500 characters"],
    },
    status: {
      type: String,
      enum: PACKAGING_STATUSES,
      default: "ok",
    },
    trend: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

/** Status is always derived server-side — never trust a client-supplied value. */
PackagingSchema.pre("validate", function computeStatus() {
  const stock = this.stock ?? 0;
  const reorder = this.reorder ?? 0;
  const minStock = this.minStock ?? 0;
  if (minStock > 0 && stock <= minStock) this.status = "critical";
  else if (reorder > 0 && stock < reorder) this.status = "low";
  else this.status = "ok";
});

// Next.js HMR can cache a stale schema across reloads in dev — re-register when fields are missing.
if (mongoose.models.Packaging && !mongoose.models.Packaging.schema.path("capacity")) {
  mongoose.deleteModel("Packaging");
}

export default mongoose.models.Packaging ||
  mongoose.model("Packaging", PackagingSchema);
