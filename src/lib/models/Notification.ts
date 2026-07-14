import mongoose, { Schema } from "mongoose";

const NotificationSchema = new Schema(
  {
    recipientEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      enum: ["attendance", "leave", "system", "field_sales", "procurement"],
      default: "attendance",
      index: true,
    },
    type: {
      type: String,
      enum: ["info", "success", "alert"],
      default: "info",
    },
    punchType: { type: String, enum: ["in", "out"] },
    employeeId: { type: String, trim: true, index: true },
    employeeName: { type: String, trim: true },
    message: { type: String, required: true, trim: true },
    target: { type: String, trim: true, default: "/hrms/reports/attendance" },
    read: { type: Boolean, default: false, index: true },
    punchedAt: { type: Date },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipientEmail: 1, createdAt: -1 });
NotificationSchema.index({ recipientEmail: 1, read: 1 });

export default mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
