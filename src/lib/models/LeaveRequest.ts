import mongoose, { Schema } from "mongoose";

const LeaveRequestSchema = new Schema(
  {
    employeeId: { type: String, required: true, index: true, trim: true },
    employeeName: { type: String, trim: true },
    department: { type: String, trim: true, index: true },
    reportingManager: { type: String, trim: true },
    leaveType: {
      type: String,
      enum: ["casual", "sick", "privilege", "compOff", "unpaid"],
      required: true,
      index: true,
    },
    fromDate: { type: Date, required: true, index: true },
    toDate: { type: Date, required: true },
    /** Server-derived working-day count — never taken from the client. */
    days: { type: Number, required: true, min: 0.5 },
    /**
     * Half-day shape of the request. Stored so payroll and the balance can
     * recompute the day count precisely; older rows have no value and are
     * treated as "full".
     */
    duration: {
      type: String,
      enum: [
        "full",
        "first-half-first",
        "second-half-first",
        "first-half-last",
        "second-half-last",
      ],
      default: "full",
    },
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

// Next.js HMR can cache a stale schema across reloads in dev.
if (mongoose.models.LeaveRequest && !mongoose.models.LeaveRequest.schema.path("duration")) {
  mongoose.deleteModel("LeaveRequest");
}

export default mongoose.models.LeaveRequest ||
  mongoose.model("LeaveRequest", LeaveRequestSchema);
