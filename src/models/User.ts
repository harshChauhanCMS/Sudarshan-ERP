import mongoose, { Schema, models, model } from "mongoose";

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
    employeeId: { type: String },
    passwordHash: { type: String, required: true },
    requiresPasswordReset: { type: Boolean, default: false },
    passwordResetDeadline: { type: Date },
    forgotPasswordOtpHash: { type: String },
    forgotPasswordOtpExpires: { type: Date },
  },
  { timestamps: true }
);

// Next.js HMR can cache an older User schema; re-register when OTP fields are missing.
if (models.User && !models.User.schema.path("forgotPasswordOtpHash")) {
  mongoose.deleteModel("User");
}

export const User = models.User || model("User", UserSchema);
