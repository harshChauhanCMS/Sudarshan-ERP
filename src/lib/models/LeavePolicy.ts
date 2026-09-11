import mongoose, { Schema } from "mongoose";

const LeavePolicySchema = new Schema(
  {
    leaveType: {
      type: String,
      enum: ["casual", "sick", "privilege", "compOff", "unpaid"],
      required: true,
      unique: true,
    },
    label: { type: String, required: true, trim: true },
    annualQuota: { type: Number, required: true, default: 0 },
    carryForwardAllowed: { type: Boolean, default: false },
    carryForwardMax: { type: Number, default: 0 },
    applicableTo: {
      type: String,
      enum: ["all", "permanent", "contractual"],
      default: "all",
    },
    /**
     * Cap on a single request, in working days. `annualQuota` cannot police
     * unpaid leave (its quota is 0, meaning "no entitlement to draw down"),
     * so without this an employee could apply for six months of LWP unchecked.
     * 0 means no per-request cap.
     */
    maxDaysPerRequest: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

export const DEFAULT_LEAVE_POLICIES = [
  { leaveType: "casual", label: "Casual Leave", annualQuota: 12, carryForwardAllowed: false, carryForwardMax: 0, applicableTo: "all" },
  { leaveType: "sick", label: "Sick Leave", annualQuota: 12, carryForwardAllowed: false, carryForwardMax: 0, applicableTo: "all" },
  { leaveType: "privilege", label: "Privilege Leave", annualQuota: 15, carryForwardAllowed: true, carryForwardMax: 30, applicableTo: "permanent" },
  { leaveType: "compOff", label: "Compensatory Off", annualQuota: 0, carryForwardAllowed: false, carryForwardMax: 0, applicableTo: "all" },
  { leaveType: "unpaid", label: "Unpaid Leave", annualQuota: 0, carryForwardAllowed: false, carryForwardMax: 0, applicableTo: "all", maxDaysPerRequest: 30 },
];

// Next.js HMR can cache a stale schema across reloads in dev.
if (mongoose.models.LeavePolicy && !mongoose.models.LeavePolicy.schema.path("maxDaysPerRequest")) {
  mongoose.deleteModel("LeavePolicy");
}

export default mongoose.models.LeavePolicy ||
  mongoose.model("LeavePolicy", LeavePolicySchema);
