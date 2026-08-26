import { connectDB } from "@/lib/mongodb";
import Employee from "@/lib/models/Employee";

export const OWNER_EMPLOYEE_ID = "E-OWNER";
export const OWNER_EMPLOYEE_EMAIL = "owner@sudarshan.com";

const OWNER_EMPLOYEE_PROFILE = {
  employeeId: OWNER_EMPLOYEE_ID,
  fullName: "Sudarshan Owner",
  fatherName: "—",
  dob: "01/01/1980",
  gender: "Male",
  qualification: "MBA",
  experience: "15+ years",
  castCategory: "General",
  primaryContact: "9876500000",
  personalEmail: "owner.personal@sudarshan.co.in",
  officialEmail: OWNER_EMPLOYEE_EMAIL,
  currentAddress: "Sudarshan Group HQ, Udaipur",
  currentStatePin: "Rajasthan — 313001",
  permanentAddress: "Sudarshan Group HQ, Udaipur",
  permanentStatePin: "Rajasthan — 313001",
  aadhar: "0000 0000 0000",
  pan: "OWNER0000O",
  bankName: "State Bank of India",
  accountNo: "00000000001",
  ifscCode: "SBIN0001234",
  department: "Leadership",
  designation: "Owner",
  locationUnit: "Sudarshan Minerals (Udaipur — Plant 1)",
  workLocationType: "Onsite",
  companies: ["Sudarshan Minerals & Industries", "Sudarshan Microns"],
  reportingManager: "—",
  employmentType: "Permanent",
  dateJoining: "01/01/2014",
  dateConfirmation: "01/01/2014",
  probationMonths: 0,
  shiftMode: "Single shift (fixed)",
  primaryShift: "Shift A — 06:00 to 14:00",
  rotationPattern: "None",
  workingHours: 8,
  weeklyOff: "Sunday",
  overtimeApplicable: false,
  compensationType: "Monthly CTC",
  annualCtc: 0,
  monthlyGross: 0,
  basicSalary: 0,
  hra: 0,
  otherConveyance: 0,
};

export async function upsertOwnerEmployee() {
  await connectDB();
  const employee = await Employee.findOneAndUpdate(
    { employeeId: OWNER_EMPLOYEE_ID },
    { $set: OWNER_EMPLOYEE_PROFILE },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  return {
    upserted: true,
    employee: {
      employeeId: employee?.employeeId,
      fullName: employee?.fullName,
      officialEmail: employee?.officialEmail,
    },
  };
}
