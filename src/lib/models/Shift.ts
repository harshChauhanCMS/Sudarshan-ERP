import mongoose, { Schema } from "mongoose";

/**
 * A named working shift, e.g. "Shift A · 06:00–14:00".
 *
 * Start/end are stored as **minutes since midnight** rather than a display
 * string, so duration arithmetic is exact and night shifts that wrap past
 * midnight (22:00 → 06:00) are representable without a date component.
 */
const ShiftSchema = new Schema(
  {
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },
    name: { type: String, required: true, trim: true },
    startMinutes: { type: Number, required: true, min: 0, max: 1439 },
    endMinutes: { type: Number, required: true, min: 0, max: 1439 },
    /** Unpaid break inside the shift, subtracted from the worked duration. */
    breakMinutes: { type: Number, default: 0, min: 0, max: 720 },
    weeklyOff: { type: String, trim: true, default: "Sunday" },
    isNightShift: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.Shift || mongoose.model("Shift", ShiftSchema);
