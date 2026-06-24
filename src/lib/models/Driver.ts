import mongoose, { Schema } from "mongoose";

const DriverSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    mobile: { type: String, required: true, trim: true, unique: true },
    vehicleNumber: { type: String, required: true, trim: true, uppercase: true, unique: true },
    vehicleCategory: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

DriverSchema.index({ email: 1 });
DriverSchema.index({ mobile: 1 });
DriverSchema.index({ vehicleNumber: 1 });

export default mongoose.models.Driver || mongoose.model("Driver", DriverSchema);
