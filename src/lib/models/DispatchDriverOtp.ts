import mongoose, { Schema } from "mongoose";

const DispatchDriverOtpSchema = new Schema(
  {
    trackToken: { type: String, required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    driverId: { type: String, required: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

DispatchDriverOtpSchema.index({ trackToken: 1, email: 1 }, { unique: true });

export default mongoose.models.DispatchDriverOtp ||
  mongoose.model("DispatchDriverOtp", DispatchDriverOtpSchema);
