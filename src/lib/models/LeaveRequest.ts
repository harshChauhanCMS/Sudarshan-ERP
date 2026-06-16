import mongoose, { Schema } from "mongoose";

const LeaveRequestSchema = new Schema(
  {
    employeeId: { type: String, required: true, index: true, trim: true },
    employeeName: { type: String, trim: true },
    department: { type: String, trim: true, index: true },
    reportingManager: { type: String, trim: true },
    leaveType: {
      type: String,
      enum: ["casual", "sick", "privilege", "unpaid"],
      required: true,
      index: true,
    },
    fromDate: { type: Date, required: true, index: true },
    toDate: { type: Date, required: true },
    days: { type: Number, required: true, min: 0.5 },
    reason: { type: String, trim: true },
    status: {
      type: String,
      enum: ["pending", "hod_approved", "approved", "rejected", "cancelled", "rolled_back", "completed"],
      default: "pending",
      index: true,
    },
    hodApprovedAt: { type: Date },
    hodApprovedBy: { type: String, trim: true },
    hrApprovedAt: { type: Date },
    hrApprovedBy: { type: String, trim: true },
    rejectionReason: { type: String, trim: true },
    rollbackReason: { type: String, trim: true },
    rollbackAt: { type: Date },
  },
  { timestamps: true }
);

LeaveRequestSchema.index({ employeeId: 1, fromDate: -1 });
LeaveRequestSchema.index({ status: 1, department: 1 });

export default mongoose.models.LeaveRequest ||
  mongoose.model("LeaveRequest", LeaveRequestSchema);
