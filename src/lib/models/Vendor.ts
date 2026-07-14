import mongoose, { Schema } from "mongoose";

export const VENDOR_PAYMENT_TERMS = ["cod", "15", "30", "45", "60"] as const;
export const VENDOR_STATUSES = ["active", "inactive"] as const;

const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;
const PHONE_PATTERN = /^\d{10}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cityFromAddress(address: string): string {
  const line = address.trim().split("\n")[0] || address.trim();
  const parts = line.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return parts.slice(-2).join(", ");
  return parts[0] || "—";
}

function categoryFromMaterials(materials: string): string {
  const text = materials.toLowerCase();
  if (text.includes("pack") || text.includes("bag") || text.includes("fibc")) {
    return "Packaging";
  }
  if (text.includes("spare") || text.includes("bearing") || text.includes("motor")) {
    return "Spare Parts";
  }
  if (text.includes("chemical") || text.includes("soda") || text.includes("stpp")) {
    return "Chemical";
  }
  return "Raw Material";
}

const VendorSchema = new Schema(
  {
    id: {
      type: String,
      required: [true, "Vendor code is required"],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Za-z0-9-]+$/, "Vendor code must be alphanumeric (hyphens allowed)"],
    },
    name: {
      type: String,
      required: [true, "Vendor name is required"],
      trim: true,
      maxlength: [120, "Vendor name must be at most 120 characters"],
    },
    city: {
      type: String,
      trim: true,
      default: "—",
    },
    category: {
      type: String,
      trim: true,
      default: "Raw Material",
    },
    contactPerson: {
      type: String,
      trim: true,
      default: "",
      maxlength: [120, "Contact person must be at most 120 characters"],
    },
    phone: {
      type: String,
      trim: true,
      default: "",
      match: [PHONE_PATTERN, "Phone number must be 10 digits"],
      validate: {
        validator: (v: string) => !v || PHONE_PATTERN.test(v),
        message: "Phone number must be 10 digits",
      },
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
      validate: {
        validator: (v: string) => !v || EMAIL_PATTERN.test(v),
        message: "Enter a valid email address",
      },
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
      validate: {
        validator: (v: string) => !v || GSTIN_PATTERN.test(v),
        message: "Enter a valid 15-character GSTIN",
      },
    },
    address: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Address must be at most 500 characters"],
    },
    materialsSupplied: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Materials supplied must be at most 500 characters"],
    },
    paymentTerms: {
      type: String,
      enum: { values: VENDOR_PAYMENT_TERMS, message: "Invalid payment terms" },
      default: "30",
    },
    leadTime: {
      type: Number,
      min: [1, "Lead time must be at least 1 day"],
      max: [90, "Lead time must be at most 90 days"],
      default: 7,
    },
    status: {
      type: String,
      enum: { values: VENDOR_STATUSES, message: "Invalid status" },
      default: "active",
    },
    poCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    ytd: {
      type: Number,
      default: 0,
      min: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
  },
  { timestamps: true },
);

/** City and category are always derived server-side — never trust client-supplied values. */
VendorSchema.pre("validate", function deriveFields() {
  this.city = cityFromAddress(String(this.address || ""));
  this.category = categoryFromMaterials(String(this.materialsSupplied || ""));
});

// Next.js HMR can cache a stale schema across reloads in dev — re-register when fields are missing.
if (mongoose.models.Vendor && !mongoose.models.Vendor.schema.path("gstin")) {
  mongoose.deleteModel("Vendor");
}

export default mongoose.models.Vendor || mongoose.model("Vendor", VendorSchema);
