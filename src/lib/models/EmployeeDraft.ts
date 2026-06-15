import mongoose, { Schema } from "mongoose";

const EmployeeDraftSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    userEmail: { type: String, trim: true, lowercase: true },
    currentStep: { type: Number, default: 0, min: 0 },
    formData: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export default mongoose.models.EmployeeDraft ||
  mongoose.model("EmployeeDraft", EmployeeDraftSchema);
