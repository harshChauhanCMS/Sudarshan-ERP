/** Demo data for HR attendance reports UI */

export type AttendanceSummaryRow = {
  employeeId: string;
  employeeName: string;
  department: string;
  designation: string;
  locationUnit: string;
  primaryShift: string;
  empType?: string;
  dateJoining?: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalWorkedHours: number;
  totalShortfall: number;
  totalOvertime: number;
};

export type AttendanceDailyRow = {
  employeeId: string;
  employeeName: string;
  department: string;
  locationUnit?: string;
  primaryShift?: string;
  day: string;
  inAt: string | null;
  outAt: string | null;
  present: boolean;
  absent: boolean;
  late: boolean;
  workedHours: number;
  shortfall: number;
  overtime: number;
};

export type AttendanceReportKpi = {
  totalEmployees: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalShortfall: number;
  totalOvertime: number;
};

export type AttendanceGpsSummary = {
  gpsPunches: number;
  biometricPunches: number;
  gpsPercent: number;
};

export type WeeklyTrendPoint = {
  week: string;
  present: number;
  absent: number;
};

export type DeptBreakdownPoint = {
  dept: string;
  presentPct: number;
};

const WEEKLY_TREND: WeeklyTrendPoint[] = [
  { week: "W1", present: 312, absent: 18 },
  { week: "W2", present: 298, absent: 24 },
  { week: "W3", present: 325, absent: 15 },
  { week: "W4", present: 318, absent: 21 },
  { week: "W5", present: 286, absent: 28 },
];

const DEPT_BREAKDOWN: DeptBreakdownPoint[] = [
  { dept: "Production", presentPct: 86 },
  { dept: "Quality", presentPct: 94 },
  { dept: "Stores", presentPct: 100 },
  { dept: "Logistics", presentPct: 80 },
  { dept: "Maintenance", presentPct: 90 },
  { dept: "HR", presentPct: 95 },
  { dept: "Sales / Field", presentPct: 82 },
  { dept: "Field Sales", presentPct: 78 },
];

const UNIT_UDAI = "Sudarshan Minerals & Industries (Udaipur — Plant 1)";
const UNIT_MAKRANA = "Sudarshan Marble (Makrana)";

const EMPLOYEES: AttendanceSummaryRow[] = [
  {
    employeeId: "EMP-2048",
    employeeName: "Ramesh Kumar",
    department: "Production",
    designation: "Senior Operator",
    locationUnit: UNIT_UDAI,
    primaryShift: "Shift A — 06:00 to 14:00",
    totalDays: 20,
    presentDays: 18,
    absentDays: 2,
    lateDays: 3,
    totalWorkedHours: 142,
    totalShortfall: 2,
    totalOvertime: 12,
  },
  {
    employeeId: "EMP-2051",
    employeeName: "Priya Sharma",
    department: "Quality",
    designation: "QC Manager",
    locationUnit: UNIT_UDAI,
    primaryShift: "General — 09:00 to 18:00",
    totalDays: 20,
    presentDays: 19,
    absentDays: 1,
    lateDays: 1,
    totalWorkedHours: 152,
    totalShortfall: 0,
    totalOvertime: 4,
  },
  {
    employeeId: "EMP-2055",
    employeeName: "Vikram Singh",
    department: "Production",
    designation: "Operator",
    locationUnit: UNIT_UDAI,
    primaryShift: "Shift B — 14:00 to 22:00",
    totalDays: 20,
    presentDays: 17,
    absentDays: 3,
    lateDays: 5,
    totalWorkedHours: 128,
    totalShortfall: 8,
    totalOvertime: 6,
  },
  {
    employeeId: "EMP-2060",
    employeeName: "Anita Desai",
    department: "Stores",
    designation: "Storekeeper",
    locationUnit: UNIT_UDAI,
    primaryShift: "General — 09:00 to 18:00",
    totalDays: 20,
    presentDays: 20,
    absentDays: 0,
    lateDays: 0,
    totalWorkedHours: 160,
    totalShortfall: 0,
    totalOvertime: 0,
  },
  {
    employeeId: "EMP-2063",
    employeeName: "Suresh Meena",
    department: "Logistics",
    designation: "Dispatch Coordinator",
    locationUnit: UNIT_UDAI,
    primaryShift: "Shift A — 06:00 to 14:00",
    totalDays: 20,
    presentDays: 16,
    absentDays: 4,
    lateDays: 2,
    totalWorkedHours: 120,
    totalShortfall: 12,
    totalOvertime: 8,
  },
  {
    employeeId: "EMP-2068",
    employeeName: "Pooja Verma",
    department: "Production",
    designation: "Operator",
    locationUnit: UNIT_MAKRANA,
    primaryShift: "Shift A — 06:00 to 14:00",
    totalDays: 20,
    presentDays: 15,
    absentDays: 5,
    lateDays: 4,
    totalWorkedHours: 112,
    totalShortfall: 16,
    totalOvertime: 2,
  },
  {
    employeeId: "EMP-2072",
    employeeName: "Kiran Patel",
    department: "Maintenance",
    designation: "Technician",
    locationUnit: UNIT_UDAI,
    primaryShift: "Shift C — 22:00 to 06:00",
    totalDays: 20,
    presentDays: 18,
    absentDays: 2,
    lateDays: 6,
    totalWorkedHours: 138,
    totalShortfall: 4,
    totalOvertime: 18,
  },
  {
    employeeId: "EMP-2075",
    employeeName: "Meena Joshi",
    department: "HR",
    designation: "HR Executive",
    locationUnit: UNIT_UDAI,
    primaryShift: "General — 09:00 to 18:00",
    totalDays: 20,
    presentDays: 19,
    absentDays: 1,
    lateDays: 0,
    totalWorkedHours: 154,
    totalShortfall: 0,
    totalOvertime: 0,
  },
  {
    employeeId: "EMP-2037",
    employeeName: "Rajesh Mehta",
    department: "Sales / Field",
    designation: "Field Executive",
    locationUnit: UNIT_UDAI,
    primaryShift: "Field — flexible",
    totalDays: 20,
    presentDays: 17,
    absentDays: 3,
    lateDays: 2,
    totalWorkedHours: 130,
    totalShortfall: 6,
    totalOvertime: 0,
  },
  {
    employeeId: "EMP-2080",
    employeeName: "Amit Rawat",
    department: "Sales / Field",
    designation: "Area Manager",
    locationUnit: UNIT_MAKRANA,
    primaryShift: "Field — flexible",
    totalDays: 20,
    presentDays: 16,
    absentDays: 4,
    lateDays: 1,
    totalWorkedHours: 124,
    totalShortfall: 10,
    totalOvertime: 0,
  },
  {
    employeeId: "EMP-F3011",
    employeeName: "Rohit Sharma",
    department: "Sales / Field",
    designation: "Field Representative",
    locationUnit: UNIT_UDAI,
    primaryShift: "Field — flexible",
    totalDays: 20,
    presentDays: 18,
    absentDays: 2,
    lateDays: 3,
    totalWorkedHours: 136,
    totalShortfall: 4,
    totalOvertime: 0,
  },
  {
    employeeId: "EMP-F3012",
    employeeName: "Neha Gupta",
    department: "Sales / Field",
    designation: "Customer Relations Executive",
    locationUnit: UNIT_UDAI,
    primaryShift: "Field — flexible",
    totalDays: 20,
    presentDays: 19,
    absentDays: 1,
    lateDays: 0,
    totalWorkedHours: 148,
    totalShortfall: 0,
    totalOvertime: 0,
  },
  {
    employeeId: "EMP-F3013",
    employeeName: "Manish Tiwari",
    department: "Field Sales",
    designation: "Territory Manager — South Rajasthan",
    locationUnit: UNIT_MAKRANA,
    primaryShift: "Field — flexible",
    totalDays: 20,
    presentDays: 15,
    absentDays: 5,
    lateDays: 2,
    totalWorkedHours: 118,
    totalShortfall: 14,
    totalOvertime: 0,
  },
  {
    employeeId: "EMP-F3014",
    employeeName: "Kavita Rao",
    department: "Sales / Field",
    designation: "Field Surveyor",
    locationUnit: UNIT_UDAI,
    primaryShift: "Field — flexible",
    totalDays: 20,
    presentDays: 17,
    absentDays: 3,
    lateDays: 4,
    totalWorkedHours: 128,
    totalShortfall: 8,
    totalOvertime: 0,
  },
  {
    employeeId: "EMP-F3015",
    employeeName: "Arjun Malhotra",
    department: "Field Sales",
    designation: "Sales Officer — Udaipur",
    locationUnit: UNIT_UDAI,
    primaryShift: "Field — flexible",
    totalDays: 20,
    presentDays: 14,
    absentDays: 6,
    lateDays: 1,
    totalWorkedHours: 108,
    totalShortfall: 18,
    totalOvertime: 0,
  },
  {
    employeeId: "EMP-F3016",
    employeeName: "Poonam Shukla",
    department: "Sales / Field",
    designation: "Field Coordinator",
    locationUnit: UNIT_MAKRANA,
    primaryShift: "Field — flexible",
    totalDays: 20,
    presentDays: 18,
    absentDays: 2,
    lateDays: 2,
    totalWorkedHours: 138,
    totalShortfall: 4,
    totalOvertime: 0,
  },
  {
    employeeId: "EMP-F3017",
    employeeName: "Vikas Chauhan",
    department: "Field Sales",
    designation: "Dealer Visit Executive",
    locationUnit: UNIT_UDAI,
    primaryShift: "Field — flexible",
    totalDays: 20,
    presentDays: 16,
    absentDays: 4,
    lateDays: 5,
    totalWorkedHours: 122,
    totalShortfall: 10,
    totalOvertime: 0,
  },
  {
    employeeId: "EMP-2084",
    employeeName: "Deepak Jain",
    department: "Quality",
    designation: "Inspector",
    locationUnit: UNIT_MAKRANA,
    primaryShift: "Shift B — 14:00 to 22:00",
    totalDays: 20,
    presentDays: 18,
    absentDays: 2,
    lateDays: 2,
    totalWorkedHours: 140,
    totalShortfall: 2,
    totalOvertime: 5,
  },
  {
    employeeId: "EMP-2090",
    employeeName: "Sunita Devi",
    department: "Production",
    designation: "Helper",
    locationUnit: UNIT_UDAI,
    primaryShift: "Shift A — 06:00 to 14:00",
    totalDays: 20,
    presentDays: 14,
    absentDays: 6,
    lateDays: 3,
    totalWorkedHours: 104,
    totalShortfall: 20,
    totalOvertime: 0,
  },
];

function isoDay(day: string, hour: number, minute = 0) {
  return `${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`;
}

function buildDailyRows(monthPrefix: string): AttendanceDailyRow[] {
  const days = ["05", "06", "07", "08", "11", "12"];
  const rows: AttendanceDailyRow[] = [];

  for (const emp of EMPLOYEES.slice(0, 6)) {
    for (const d of days) {
      const day = `${monthPrefix}-${d}`;
      const absent = d === "08" && emp.employeeId === "EMP-2055";
      const late = d === "07" && emp.lateDays > 0;
      rows.push({
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
        department: emp.department,
        day,
        inAt: absent ? null : isoDay(day, late ? 9 : 6, late ? 25 : 2),
        outAt: absent ? null : isoDay(day, 14, 5),
        present: !absent,
        absent,
        late: late && !absent,
        workedHours: absent ? 0 : late ? 7.5 : 8,
        shortfall: absent ? 8 : late ? 0.5 : 0,
        overtime: emp.totalOvertime > 10 && d === "12" ? 2 : 0,
      });
    }
  }
  return rows;
}

export function getAttendanceReportDummy(month?: string) {
  const monthPrefix = month ?? new Date().toISOString().slice(0, 7);
  const summary = EMPLOYEES;
  const workingDays = 20;

  const kpi: AttendanceReportKpi = {
    totalEmployees: summary.length,
    presentDays: summary.reduce((a, s) => a + s.presentDays, 0),
    absentDays: summary.reduce((a, s) => a + s.absentDays, 0),
    lateDays: summary.reduce((a, s) => a + s.lateDays, 0),
    totalShortfall: round1(summary.reduce((a, s) => a + s.totalShortfall, 0)),
    totalOvertime: Math.round(summary.reduce((a, s) => a + s.totalOvertime, 0)),
  };

  const gpsSummary: AttendanceGpsSummary = {
    gpsPunches: 3240,
    biometricPunches: 280,
    gpsPercent: 92,
  };

  return {
    kpi,
    summary,
    daily: buildDailyRows(monthPrefix),
    workingDays,
    gpsSummary,
    weeklyTrend: WEEKLY_TREND,
    deptBreakdown: DEPT_BREAKDOWN,
    departments: [
      "Production",
      "Quality",
      "Stores",
      "Logistics",
      "Maintenance",
      "HR",
      "Sales / Field",
      "Field Sales",
    ],
  };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function isAttendanceReportEmpty(summary: AttendanceSummaryRow[]) {
  return summary.length === 0;
}

/** Live employees exist but no punches recorded for the period */
export function isAttendanceReportSparse(summary: AttendanceSummaryRow[]) {
  if (summary.length === 0) return true;
  return summary.every((row) => row.presentDays === 0);
}

/** Field attendance report — demo rows + stats when live DB has no field staff */
export function getFieldAttendanceDummy() {
  const workingDays = 20;
  const fieldSummary = EMPLOYEES.filter((e) => /sales|field/i.test(e.department));
  const fieldDays = fieldSummary.reduce((a, s) => a + s.presentDays, 0);
  const totalPresent = EMPLOYEES.reduce((a, s) => a + s.presentDays, 0);
  const inOfficeDays = totalPresent - fieldDays;
  const totalExpected = EMPLOYEES.length * workingDays || 1;

  return {
    summary: fieldSummary,
    officeStats: {
      inOfficePct: Math.round((inOfficeDays / totalExpected) * 100),
      fieldPct: Math.round((fieldDays / totalExpected) * 100),
      inOfficeDays,
      fieldDays,
      fieldEmployees: fieldSummary.length,
      totalEmployees: EMPLOYEES.length,
    },
  };
}
