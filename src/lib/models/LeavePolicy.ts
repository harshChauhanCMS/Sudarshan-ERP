import mongoose, { Schema } from "mongoose";

const LeavePolicySchema = new Schema(
  {
    leaveType: {
      type: String,
      enum: ["casual", "sick", "privilege", "unpaid"],
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
    isActive: { type: Boolean, default: true },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

export const DEFAULT_LEAVE_POLICIES = [
  { leaveType: "casual", label: "Casual Leave", annualQuota: 12, carryForwardAllowed: false, carryForwardMax: 0, applicableTo: "all" },
  { leaveType: "sick", label: "Sick Leave", annualQuota: 12, carryForwardAllowed: false, carryForwardMax: 0, applicableTo: "all" },
  { leaveType: "privilege", label: "Privilege Leave", annualQuota: 15, carryForwardAllowed: true, carryForwardMax: 30, applicableTo: "permanent" },
  { leaveType: "unpaid", label: "Unpaid Leave", annualQuota: 0, carryForwardAllowed: false, carryForwardMax: 0, applicableTo: "all" },
];

export default mongoose.models.LeavePolicy ||
  mongoose.model("LeavePolicy", LeavePolicySchema);
