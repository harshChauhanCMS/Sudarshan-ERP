import mongoose, { Schema } from "mongoose";

const EmployeeSchema = new Schema(
  {
    // Profile details
    employeeId: {
      type: String,
      required: [true, "Please provide an Employee ID"],
      unique: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: [true, "Please provide the full name"],
      trim: true,
    },
    fatherName: { type: String, trim: true },
    dob: { type: String, trim: true }, // Format: YYYY-MM-DD or DD/MM/YYYY
    gender: { type: String, trim: true },
    qualification: { type: String, trim: true },
    experience: { type: String, trim: true },
    castCategory: { type: String, trim: true },

    // Contact & address
    primaryContact: {
      type: String,
      required: [true, "Please provide a primary contact number"],
      trim: true,
    },
    personalEmail: { type: String, trim: true, lowercase: true },
    alternateContact: { type: String, trim: true },
    emergencyContact: { type: String, trim: true },
    emergencyNameRelation: { type: String, trim: true },
    officialEmail: { type: String, trim: true, lowercase: true },
    currentAddress: { type: String, trim: true },
    currentStatePin: { type: String, trim: true },
    permanentAddress: { type: String, trim: true },
    permanentStatePin: { type: String, trim: true },

    // Identity & bank
    aadhar: { type: String, trim: true },
    pan: { type: String, trim: true },
    pfUan: { type: String, trim: true },
    esiIp: { type: String, trim: true },
    bankName: { type: String, trim: true },
    accountNo: { type: String, trim: true },
    ifscCode: { type: String, trim: true },

    // Employment & payroll
    department: {
      type: String,
      required: [true, "Please specify a department"],
      trim: true,
    },
    designation: {
      type: String,
      required: [true, "Please specify a designation"],
      trim: true,
    },
    locationUnit: { type: String, trim: true },
    workLocationType: {
      type: String,
      trim: true,
      enum: ["Onsite", "Field", "Remote"],
      default: "Onsite",
    },
    companies: {
      type: [String],
      default: [],
    },
    reportingManager: { type: String, trim: true },
    employmentType: {
      type: String,
      required: [true, "Please specify the employment type"],
      trim: true,
    },
    dateJoining: {
      type: String,
      required: [true, "Please specify the date of joining"],
      trim: true,
    },
    dateConfirmation: { type: String, trim: true },
    probationMonths: { type: Number, default: 0 },

    // Shift assignment
    shiftMode: { type: String, trim: true },
    primaryShift: { type: String, trim: true },
    eligibleShifts: { type: [String], default: [] },
    rotationPattern: { type: String, trim: true },
    workingHours: { type: Number, default: 8 },
    weeklyOff: { type: String, trim: true },
    overtimeApplicable: { type: Boolean, default: false },

    // Salary structure
    compensationType: {
      type: String,
      required: [true, "Please specify the compensation type"],
      trim: true,
    },
    // Monthly CTC details
    annualCtc: { type: Number, default: 0 },
    monthlyGross: { type: Number, default: 0 },
    basicSalary: { type: Number, default: 0 },
    da: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    otherConveyance: { type: Number, default: 0 },
    specialBonus: { type: Number, default: 0 },
    reimbursementCap: { type: Number, default: 0 },
    // Daily wage details
    dailyWageRate: { type: Number, default: 0 },
    skillCategory: { type: String, trim: true },
    tradeJobRole: { type: String, trim: true },
    engagedVia: { type: String, trim: true },
    payFrequency: { type: String, trim: true },
    paymentMode: { type: String, trim: true },
  },
  { timestamps: true }
);

// Prevent compiling model multiple times due to Next.js HMR
export default mongoose.models.Employee || mongoose.model("Employee", EmployeeSchema);
