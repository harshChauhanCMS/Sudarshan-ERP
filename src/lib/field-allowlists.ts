export const EMPLOYEE_WRITABLE_FIELDS = [
  "fullName",
  "fatherName",
  "dob",
  "gender",
  "qualification",
  "experience",
  "castCategory",
  "primaryContact",
  "personalEmail",
  "alternateContact",
  "emergencyContact",
  "emergencyNameRelation",
  "officialEmail",
  "currentAddress",
  "currentStatePin",
  "permanentAddress",
  "permanentStatePin",
  "aadhar",
  "pan",
  "pfUan",
  "esiIp",
  "bankName",
  "accountNo",
  "ifscCode",
  "department",
  "designation",
  "locationUnit",
  "workLocationType",
  "companies",
  "reportingManager",
  "employmentType",
  "dateJoining",
  "dateConfirmation",
  "probationMonths",
  "shiftMode",
  "primaryShift",
  "eligibleShifts",
  "rotationPattern",
  "workingHours",
  "weeklyOff",
  "overtimeApplicable",
  "compensationType",
  "annualCtc",
  "monthlyGross",
  "basicSalary",
  "hra",
  "otherConveyance",
  "specialBonus",
  "reimbursementCap",
  "arrears",
  "deductionRates",
  "dailyWageRate",
  "skillCategory",
  "tradeJobRole",
  "engagedVia",
  "payFrequency",
  "paymentMode",
] as const;

export const SALARY_PATCH_FIELDS = [
  "employeeName",
  "department",
  "designation",
  "basicSalary",
  "hra",
  "otherConveyance",
  "specialBonus",
  "arrears",
  "grossSalary",
  "workingDays",
  "daysPresent",
  "leaveDays",
  "unpaidLeaveDays",
  "leaveDeduction",
  "overtimeHours",
  "overtimeAmount",
  "pfEmployee",
  "pfEmployer",
  "esi",
  "tds",
  "advance",
  "otherDeductions",
  "netPayable",
  "notes",
  "status",
] as const;

export const LEAVE_PATCH_FIELDS = [
  "leaveType",
  "fromDate",
  "toDate",
  "days",
  "reason",
] as const;

export const ROLE_WRITABLE_FIELDS = [
  "label",
  "description",
  "permissions",
  "isActive",
] as const;

export const LEAVE_POLICY_WRITABLE_FIELDS = [
  "label",
  "annualQuota",
  "carryForwardAllowed",
  "carryForwardMax",
  "applicableTo",
  "isActive",
  "description",
] as const;

export function pickAllowedFields(
  source: Record<string, unknown>,
  allowed: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      out[key] = source[key];
    }
  }
  return out;
}
