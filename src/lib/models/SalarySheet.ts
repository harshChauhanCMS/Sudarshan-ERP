import mongoose, { Schema } from "mongoose";

const SalarySheetSchema = new Schema(
  {
    employeeId: { type: String, required: true, index: true, trim: true },
    employeeName: { type: String, trim: true },
    cycle: { type: String, required: true, index: true, trim: true }, // YYYY-MM
    department: { type: String, trim: true, index: true },
    designation: { type: String, trim: true },
    locationUnit: { type: String, trim: true },
    compensationType: { type: String, trim: true },

    // Earnings
    basicSalary: { type: Number, default: 0 },
    da: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    otherConveyance: { type: Number, default: 0 },
    specialBonus: { type: Number, default: 0 },
    grossSalary: { type: Number, default: 0 },

    // Overtime
    overtimeHours: { type: Number, default: 0 },
    overtimeAmount: { type: Number, default: 0 },

    // Leave
    workingDays: { type: Number, default: 0 },
    daysPresent: { type: Number, default: 0 },
    /** Paid company holidays — never deducted, never counted as leave/absence. */
    holidayDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    leaveDays: { type: Number, default: 0 },
    unpaidLeaveDays: { type: Number, default: 0 },
    leaveDeduction: { type: Number, default: 0 },

    // Deductions
    pfEmployee: { type: Number, default: 0 },
    pfEmployer: { type: Number, default: 0 },
    esi: { type: Number, default: 0 },
    tds: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },

    // Net
    netPayable: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["draft", "approved", "disbursed"],
      default: "draft",
      index: true,
    },
    approvedAt: { type: Date },
    approvedBy: { type: String, trim: true },
    disbursedAt: { type: Date },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

SalarySheetSchema.index({ cycle: 1, employeeId: 1 }, { unique: true });

export default mongoose.models.SalarySheet ||
  mongoose.model("SalarySheet", SalarySheetSchema);
