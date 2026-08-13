/**
 * Insert 10 sample employees into MongoDB.
 * Usage: npm run seed:employees
 *
 * Skips records whose employeeId already exists (safe to re-run).
 */
import { config } from "dotenv";
import mongoose from "mongoose";
import Employee from "../src/lib/models/Employee";

config({ path: ".env" });
config({ path: ".env.local" });

const LOCATIONS = [
  "Sudarshan Minerals (Udaipur — Plant 1)",
  "Sudarshan Minerals (Udaipur — Plant 2)",
  "Sudarshan Microns (Udaipur)",
] as const;

const SHIFTS = [
  "Shift A — 06:00 to 14:00",
  "Shift B — 14:00 to 22:00",
  "Shift C — 22:00 to 06:00",
] as const;

type SeedEmployee = {
  employeeId: string;
  fullName: string;
  fatherName: string;
  dob: string;
  gender: string;
  qualification: string;
  experience: string;
  castCategory: string;
  primaryContact: string;
  personalEmail: string;
  officialEmail: string;
  currentAddress: string;
  currentStatePin: string;
  permanentAddress: string;
  permanentStatePin: string;
  aadhar: string;
  pan: string;
  bankName: string;
  accountNo: string;
  ifscCode: string;
  department: string;
  designation: string;
  locationUnit: string;
  workLocationType?: string;
  reportingManager: string;
  employmentType: string;
  dateJoining: string;
  dateConfirmation: string;
  probationMonths: number;
  shiftMode: string;
  primaryShift: string;
  rotationPattern: string;
  workingHours: number;
  weeklyOff: string;
  overtimeApplicable: boolean;
  compensationType: string;
  annualCtc?: number;
  monthlyGross?: number;
  basicSalary?: number;
  hra?: number;
  otherConveyance?: number;
  dailyWageRate?: number;
  skillCategory?: string;
  tradeJobRole?: string;
  engagedVia?: string;
  payFrequency?: string;
  paymentMode?: string;
};

const SAMPLE_EMPLOYEES: SeedEmployee[] = [
  {
    employeeId: "E-OWNER",
    fullName: "Sudarshan Owner",
    fatherName: "—",
    dob: "01/01/1980",
    gender: "Male",
    qualification: "MBA",
    experience: "15+ years",
    castCategory: "General",
    primaryContact: "9876500000",
    personalEmail: "owner.personal@sudarshan.co.in",
    officialEmail: "owner@sudarshan.com",
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
    locationUnit: LOCATIONS[0],
    workLocationType: "Onsite",
    reportingManager: "—",
    employmentType: "Permanent",
    dateJoining: "01/01/2014",
    dateConfirmation: "01/01/2014",
    probationMonths: 0,
    shiftMode: "Single shift (fixed)",
    primaryShift: SHIFTS[0],
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
  },
  {
    employeeId: "EMP-3001",
    fullName: "Amit Sharma",
    fatherName: "Ramesh Sharma",
    dob: "12/05/1990",
    gender: "Male",
    qualification: "B.Tech (Mechanical)",
    experience: "8 years",
    castCategory: "General",
    primaryContact: "9876500101",
    personalEmail: "amit.sharma.demo@sudarshan.co.in",
    officialEmail: "amit.sharma@sudarshan.co.in",
    currentAddress: "12, Sector 4, Hiran Magri",
    currentStatePin: "Rajasthan — 313001",
    permanentAddress: "12, Sector 4, Hiran Magri",
    permanentStatePin: "Rajasthan — 313001",
    aadhar: "4589 1234 5678",
    pan: "ABCPA1234A",
    bankName: "State Bank of India",
    accountNo: "38475612001",
    ifscCode: "SBIN0001234",
    department: "production",
    designation: "Production Supervisor",
    locationUnit: LOCATIONS[0],
    reportingManager: "EMP-2010 — Sunil Mehra (Plant Head)",
    employmentType: "Permanent",
    dateJoining: "01/04/2018",
    dateConfirmation: "01/04/2019",
    probationMonths: 12,
    shiftMode: "Single shift (fixed)",
    primaryShift: SHIFTS[0],
    rotationPattern: "None",
    workingHours: 8,
    weeklyOff: "Sunday",
    overtimeApplicable: true,
    compensationType: "Monthly CTC",
    annualCtc: 480000,
    monthlyGross: 40000,
    basicSalary: 20000,
    hra: 8000,
    otherConveyance: 4000,
  },
  {
    employeeId: "EMP-3002",
    fullName: "Priya Verma",
    fatherName: "Suresh Verma",
    dob: "22/08/1993",
    gender: "Female",
    qualification: "MBA (HR)",
    experience: "5 years",
    castCategory: "OBC",
    primaryContact: "9876500102",
    personalEmail: "priya.verma.demo@sudarshan.co.in",
    officialEmail: "priya@sudarshan.co.in",
    currentAddress: "45, Ashok Nagar",
    currentStatePin: "Rajasthan — 313002",
    permanentAddress: "45, Ashok Nagar",
    permanentStatePin: "Rajasthan — 313002",
    aadhar: "4589 1234 5679",
    pan: "ABCPV2345B",
    bankName: "HDFC Bank",
    accountNo: "38475612002",
    ifscCode: "HDFC0001234",
    department: "hr",
    designation: "HR Executive",
    locationUnit: LOCATIONS[2],
    reportingManager: "EMP-2014 — Rajiv Mehta (Owner)",
    employmentType: "Permanent",
    dateJoining: "15/06/2020",
    dateConfirmation: "15/06/2021",
    probationMonths: 12,
    shiftMode: "Single shift (fixed)",
    primaryShift: SHIFTS[0],
    rotationPattern: "None",
    workingHours: 8,
    weeklyOff: "Sunday",
    overtimeApplicable: false,
    compensationType: "Monthly CTC",
    annualCtc: 420000,
    monthlyGross: 35000,
    basicSalary: 17500,
    hra: 7000,
    otherConveyance: 3500,
  },
  {
    employeeId: "EMP-3003",
    fullName: "Rakesh Meena",
    fatherName: "Gopal Meena",
    dob: "03/11/1988",
    gender: "Male",
    qualification: "ITI (Fitter)",
    experience: "10 years",
    castCategory: "ST",
    primaryContact: "9876500103",
    personalEmail: "rakesh.meena.demo@sudarshan.co.in",
    officialEmail: "rakesh.meena@sudarshan.co.in",
    currentAddress: "Village Bedwas, Tehsil Mavli",
    currentStatePin: "Rajasthan — 313203",
    permanentAddress: "Village Bedwas, Tehsil Mavli",
    permanentStatePin: "Rajasthan — 313203",
    aadhar: "4589 1234 5680",
    pan: "ABCPM3456C",
    bankName: "Bank of Baroda",
    accountNo: "38475612003",
    ifscCode: "BARB0BEDWAS",
    department: "store",
    designation: "Store Keeper",
    locationUnit: LOCATIONS[0],
    reportingManager: "EMP-2010 — Sunil Mehra (Plant Head)",
    employmentType: "Permanent",
    dateJoining: "10/01/2016",
    dateConfirmation: "10/01/2017",
    probationMonths: 12,
    shiftMode: "Single shift (fixed)",
    primaryShift: SHIFTS[1],
    rotationPattern: "None",
    workingHours: 8,
    weeklyOff: "Sunday",
    overtimeApplicable: true,
    compensationType: "Monthly CTC",
    annualCtc: 360000,
    monthlyGross: 30000,
    basicSalary: 15000,
    hra: 6000,
    otherConveyance: 3000,
  },
  {
    employeeId: "EMP-3004",
    fullName: "Sunita Devi",
    fatherName: "Ram Lal",
    dob: "18/02/1995",
    gender: "Female",
    qualification: "B.Com",
    experience: "4 years",
    castCategory: "SC",
    primaryContact: "9876500104",
    personalEmail: "sunita.devi.demo@sudarshan.co.in",
    officialEmail: "sunita.devi@sudarshan.co.in",
    currentAddress: "78, Sukher Road",
    currentStatePin: "Rajasthan — 313001",
    permanentAddress: "78, Sukher Road",
    permanentStatePin: "Rajasthan — 313001",
    aadhar: "4589 1234 5681",
    pan: "ABCPS4567D",
    bankName: "Punjab National Bank",
    accountNo: "38475612004",
    ifscCode: "PUNB0123456",
    department: "admin",
    designation: "Accounts Assistant",
    locationUnit: LOCATIONS[2],
    reportingManager: "EMP-2014 — Rajiv Mehta (Owner)",
    employmentType: "Permanent",
    dateJoining: "01/07/2021",
    dateConfirmation: "01/07/2022",
    probationMonths: 12,
    shiftMode: "Single shift (fixed)",
    primaryShift: SHIFTS[0],
    rotationPattern: "None",
    workingHours: 8,
    weeklyOff: "Sunday",
    overtimeApplicable: false,
    compensationType: "Monthly CTC",
    annualCtc: 336000,
    monthlyGross: 28000,
    basicSalary: 14000,
    hra: 5600,
    otherConveyance: 2800,
  },
  {
    employeeId: "EMP-3005",
    fullName: "Vikram Singh",
    fatherName: "Dalip Singh",
    dob: "09/09/1991",
    gender: "Male",
    qualification: "Diploma (Electrical)",
    experience: "7 years",
    castCategory: "General",
    primaryContact: "9876500105",
    personalEmail: "vikram.singh.demo@sudarshan.co.in",
    officialEmail: "vikram.singh@sudarshan.co.in",
    currentAddress: "23, Industrial Area, Udaipur",
    currentStatePin: "Rajasthan — 313003",
    permanentAddress: "23, Industrial Area, Udaipur",
    permanentStatePin: "Rajasthan — 313003",
    aadhar: "4589 1234 5682",
    pan: "ABCPV5678E",
    bankName: "ICICI Bank",
    accountNo: "38475612005",
    ifscCode: "ICIC0001234",
    department: "production",
    designation: "Maintenance Electrician",
    locationUnit: LOCATIONS[1],
    reportingManager: "EMP-2010 — Sunil Mehra (Plant Head)",
    employmentType: "Permanent",
    dateJoining: "20/03/2019",
    dateConfirmation: "20/03/2020",
    probationMonths: 12,
    shiftMode: "Multiple shifts (rotating)",
    primaryShift: SHIFTS[2],
    rotationPattern: "Weekly rotation",
    workingHours: 8,
    weeklyOff: "Rotating",
    overtimeApplicable: true,
    compensationType: "Monthly CTC",
    annualCtc: 396000,
    monthlyGross: 33000,
    basicSalary: 16500,
    hra: 6600,
    otherConveyance: 3300,
  },
  {
    employeeId: "EMP-3006",
    fullName: "Kavita Joshi",
    fatherName: "Mohan Joshi",
    dob: "14/12/1992",
    gender: "Female",
    qualification: "M.Sc (Chemistry)",
    experience: "6 years",
    castCategory: "General",
    primaryContact: "9876500106",
    personalEmail: "kavita.joshi.demo@sudarshan.co.in",
    officialEmail: "kavita.joshi@sudarshan.co.in",
    currentAddress: "56, Fatehpura",
    currentStatePin: "Rajasthan — 313004",
    permanentAddress: "56, Fatehpura",
    permanentStatePin: "Rajasthan — 313004",
    aadhar: "4589 1234 5683",
    pan: "ABCPJ6789F",
    bankName: "Axis Bank",
    accountNo: "38475612006",
    ifscCode: "UTIB0001234",
    department: "production",
    designation: "Quality Analyst",
    locationUnit: LOCATIONS[0],
    reportingManager: "EMP-2010 — Sunil Mehra (Plant Head)",
    employmentType: "Permanent",
    dateJoining: "05/09/2019",
    dateConfirmation: "05/09/2020",
    probationMonths: 12,
    shiftMode: "Single shift (fixed)",
    primaryShift: SHIFTS[0],
    rotationPattern: "None",
    workingHours: 8,
    weeklyOff: "Sunday",
    overtimeApplicable: false,
    compensationType: "Monthly CTC",
    annualCtc: 450000,
    monthlyGross: 37500,
    basicSalary: 18750,
    hra: 7500,
    otherConveyance: 3750,
  },
  {
    employeeId: "EMP-3007",
    fullName: "Mohammed Irfan",
    fatherName: "Abdul Qadir",
    dob: "27/04/1987",
    gender: "Male",
    qualification: "10th Pass",
    experience: "12 years",
    castCategory: "OBC",
    primaryContact: "9876500107",
    personalEmail: "mohammed.irfan.demo@sudarshan.co.in",
    officialEmail: "",
    currentAddress: "Gudli Village, Udaipur",
    currentStatePin: "Rajasthan — 313001",
    permanentAddress: "Gudli Village, Udaipur",
    permanentStatePin: "Rajasthan — 313001",
    aadhar: "4589 1234 5684",
    pan: "ABCPI7890G",
    bankName: "State Bank of India",
    accountNo: "38475612007",
    ifscCode: "SBIN0005678",
    department: "production",
    designation: "Machine Operator",
    locationUnit: LOCATIONS[1],
    reportingManager: "EMP-2010 — Sunil Mehra (Plant Head)",
    employmentType: "Contractual",
    dateJoining: "01/02/2023",
    dateConfirmation: "",
    probationMonths: 0,
    shiftMode: "Single shift (fixed)",
    primaryShift: SHIFTS[1],
    rotationPattern: "None",
    workingHours: 8,
    weeklyOff: "Sunday",
    overtimeApplicable: true,
    compensationType: "Daily wage",
    dailyWageRate: 650,
    skillCategory: "Semi-skilled",
    tradeJobRole: "Crusher Operator",
    engagedVia: "Direct hire",
    payFrequency: "Weekly",
    paymentMode: "Bank transfer",
  },
  {
    employeeId: "EMP-3008",
    fullName: "Deepak Kumar",
    fatherName: "Shyam Kumar",
    dob: "06/07/1994",
    gender: "Male",
    qualification: "12th Pass",
    experience: "3 years",
    castCategory: "SC",
    primaryContact: "9876500108",
    personalEmail: "deepak.kumar.demo@sudarshan.co.in",
    officialEmail: "",
    currentAddress: "102, Bhuvana, Udaipur",
    currentStatePin: "Rajasthan — 313001",
    permanentAddress: "102, Bhuvana, Udaipur",
    permanentStatePin: "Rajasthan — 313001",
    aadhar: "4589 1234 5685",
    pan: "ABCPD8901H",
    bankName: "Bank of Baroda",
    accountNo: "38475612008",
    ifscCode: "BARB0UDAIPU",
    department: "dispatch",
    designation: "Loading Supervisor",
    locationUnit: LOCATIONS[0],
    reportingManager: "EMP-2010 — Sunil Mehra (Plant Head)",
    employmentType: "Contractual",
    dateJoining: "15/11/2023",
    dateConfirmation: "",
    probationMonths: 0,
    shiftMode: "Single shift (fixed)",
    primaryShift: SHIFTS[0],
    rotationPattern: "None",
    workingHours: 8,
    weeklyOff: "Sunday",
    overtimeApplicable: true,
    compensationType: "Daily wage",
    dailyWageRate: 700,
    skillCategory: "Skilled",
    tradeJobRole: "Dispatch / Loading",
    engagedVia: "Contractor",
    payFrequency: "Weekly",
    paymentMode: "Cash",
  },
  {
    employeeId: "EMP-3009",
    fullName: "Neha Patel",
    fatherName: "Harish Patel",
    dob: "30/01/1996",
    gender: "Female",
    qualification: "BBA",
    experience: "3 years",
    castCategory: "General",
    primaryContact: "9876500109",
    personalEmail: "neha.patel.demo@sudarshan.co.in",
    officialEmail: "neha.patel@sudarshan.co.in",
    currentAddress: "34, Saheli Marg",
    currentStatePin: "Rajasthan — 313001",
    permanentAddress: "34, Saheli Marg",
    permanentStatePin: "Rajasthan — 313001",
    aadhar: "4589 1234 5686",
    pan: "ABCPN9012J",
    bankName: "HDFC Bank",
    accountNo: "38475612009",
    ifscCode: "HDFC0005678",
    department: "procurement",
    designation: "Purchase Coordinator",
    locationUnit: LOCATIONS[2],
    reportingManager: "EMP-2014 — Rajiv Mehta (Owner)",
    employmentType: "Permanent",
    dateJoining: "01/01/2024",
    dateConfirmation: "01/01/2025",
    probationMonths: 12,
    shiftMode: "Single shift (fixed)",
    primaryShift: SHIFTS[0],
    rotationPattern: "None",
    workingHours: 8,
    weeklyOff: "Sunday",
    overtimeApplicable: false,
    compensationType: "Monthly CTC",
    annualCtc: 384000,
    monthlyGross: 32000,
    basicSalary: 16000,
    hra: 6400,
    otherConveyance: 3200,
  },
  {
    employeeId: "EMP-3010",
    fullName: "Sanjay Rathore",
    fatherName: "Bhanwar Lal Rathore",
    dob: "11/10/1989",
    gender: "Male",
    qualification: "ITI (Welder)",
    experience: "9 years",
    castCategory: "OBC",
    primaryContact: "9876500110",
    personalEmail: "sanjay.rathore.demo@sudarshan.co.in",
    officialEmail: "sanjay.rathore@sudarshan.co.in",
    currentAddress: "88, MIA Extension, Udaipur",
    currentStatePin: "Rajasthan — 313003",
    permanentAddress: "88, MIA Extension, Udaipur",
    permanentStatePin: "Rajasthan — 313003",
    aadhar: "4589 1234 5687",
    pan: "ABCPS0123K",
    bankName: "Punjab National Bank",
    accountNo: "38475612010",
    ifscCode: "PUNB0987654",
    department: "production",
    designation: "Welder",
    locationUnit: LOCATIONS[1],
    reportingManager: "EMP-2010 — Sunil Mehra (Plant Head)",
    employmentType: "Permanent",
    dateJoining: "12/08/2017",
    dateConfirmation: "12/08/2018",
    probationMonths: 12,
    shiftMode: "Multiple shifts (rotating)",
    primaryShift: SHIFTS[1],
    rotationPattern: "Fortnightly rotation",
    workingHours: 8,
    weeklyOff: "Rotating",
    overtimeApplicable: true,
    compensationType: "Monthly CTC",
    annualCtc: 372000,
    monthlyGross: 31000,
    basicSalary: 15500,
    hra: 6200,
    otherConveyance: 3100,
  },
];

async function connect() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error(
      "Database URI not set. Add MONGODB_URI or MONGO_URI to .env / .env.local",
    );
    process.exit(1);
  }
  await mongoose.connect(uri);
}

async function main() {
  await connect();

  const created: string[] = [];
  const skipped: string[] = [];

  for (const record of SAMPLE_EMPLOYEES) {
    const exists = await Employee.findOne({ employeeId: record.employeeId }).lean();
    if (exists) {
      skipped.push(record.employeeId);
      continue;
    }
    await Employee.create(record);
    created.push(`${record.employeeId} — ${record.fullName}`);
  }

  console.log(`\nEmployee seed complete`);
  console.log(`  Created: ${created.length}`);
  created.forEach((line) => console.log(`    + ${line}`));
  console.log(`  Skipped (already exist): ${skipped.length}`);
  skipped.forEach((id) => console.log(`    · ${id}`));

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
