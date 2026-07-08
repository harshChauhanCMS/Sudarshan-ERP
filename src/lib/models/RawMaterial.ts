import mongoose, { Schema } from "mongoose";

export const RAW_MATERIAL_CATEGORIES = [
  "minerals",
  "pigments",
  "fillers",
  "additives",
] as const;

export const RAW_MATERIAL_UNITS = ["MT", "KG", "L", "NOS"] as const;

export const RAW_MATERIAL_STATUSES = ["ok", "low", "critical"] as const;

const RawMaterialSchema = new Schema(
  {
    code: {
      type: String,
      required: [true, "Material code is required"],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9-]+$/, "Material code must be alphanumeric (hyphens allowed)"],
    },
    name: {
      type: String,
      required: [true, "Material name is required"],
      trim: true,
      maxlength: [100, "Material name must be at most 100 characters"],
    },
    grade: {
      type: String,
      trim: true,
      default: "—",
      maxlength: [100, "Grade must be at most 100 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: { values: RAW_MATERIAL_CATEGORIES, message: "Invalid category" },
    },
    unit: {
      type: String,
      required: [true, "Unit of measure is required"],
      enum: { values: RAW_MATERIAL_UNITS, message: "Invalid unit of measure" },
      default: "MT",
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, "Stock cannot be negative"],
    },
    reorder: {
      type: Number,
      required: [true, "Reorder level is required"],
      min: [0, "Reorder level must be at least 0"],
      default: 0,
    },
    minStock: {
      type: Number,
      min: [0, "Minimum stock level must be at least 0"],
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
      maxlength: [120, "Storage location must be at most 120 characters"],
    },
    preferredVendor: {
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
    status: {
      type: String,
      enum: RAW_MATERIAL_STATUSES,
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
RawMaterialSchema.pre("validate", function computeStatus() {
  const stock = this.stock ?? 0;
  const reorder = this.reorder ?? 0;
  const minStock = this.minStock ?? 0;
  if (minStock > 0 && stock <= minStock) this.status = "critical";
  else if (reorder > 0 && stock < reorder) this.status = "low";
  else this.status = "ok";
});

// Next.js HMR can cache a stale schema across reloads in dev — re-register when fields are missing.
if (mongoose.models.RawMaterial && !mongoose.models.RawMaterial.schema.path("category")) {
  mongoose.deleteModel("RawMaterial");
}

export default mongoose.models.RawMaterial ||
  mongoose.model("RawMaterial", RawMaterialSchema);
