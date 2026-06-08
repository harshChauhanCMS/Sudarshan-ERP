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
  },
  { timestamps: true }
);

export const User = models.User || model("User", UserSchema);
