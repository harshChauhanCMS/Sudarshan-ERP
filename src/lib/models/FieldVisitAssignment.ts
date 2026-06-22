import mongoose, { Schema } from "mongoose";

const VisitLocationSchema = new Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    accuracy: { type: Number },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
  },
  { _id: false }
);

const FieldVisitAssignmentSchema = new Schema(
  {
    visitId: { type: String, required: true, unique: true, trim: true, index: true },
    assignedEmployeeId: { type: String, required: true, trim: true, index: true },
    assignedEmployeeName: { type: String, required: true, trim: true },
    assignedEmployeeEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    createdByEmail: { type: String, required: true, lowercase: true, trim: true },
    createdByName: { type: String, trim: true },
    company: { type: String, trim: true, default: "smi" },
    visitDate: { type: Date, required: true, index: true },
    visitType: {
      type: String,
      enum: ["Customer", "Vendor", "Market", "Other"],
      default: "Customer",
    },
    partyName: { type: String, required: true, trim: true },
    locationText: { type: String, trim: true },
    startTime: { type: String, trim: true, default: "09:00" },
    returnTime: { type: String, trim: true, default: "17:00" },
    purpose: { type: String, trim: true },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "in-progress", "completed", "cancelled"],
      default: "pending",
      index: true,
    },
    acceptedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancelReason: { type: String, trim: true },
    visitLocation: { type: VisitLocationSchema },
  },
  { timestamps: true }
);

FieldVisitAssignmentSchema.index({ visitDate: -1, status: 1 });
FieldVisitAssignmentSchema.index({ assignedEmployeeId: 1, visitDate: -1 });

export default mongoose.models.FieldVisitAssignment ||
  mongoose.model("FieldVisitAssignment", FieldVisitAssignmentSchema);
