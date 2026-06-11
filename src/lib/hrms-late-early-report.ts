export type LateEarlyEmployeeRow = {
  employeeId: string;
  employeeName: string;
  department: string;
  shift: string;
  unit: string;
  latePunches: number;
  totalLateMins: number;
  avgLateMins: number;
  earlyGoing: number;
  totalEarlyMins: number;
  repeatOffender: boolean;
  critical: boolean;
};

export type LateEarlyDeptRow = {
  department: string;
  headcount: number;
  lateIncidents: number;
  lateMinsTotal: number;
  avgLatePerEmp: number;
  earlyGoingIncidents: number;
  compliancePct: number;
};

export type LateEarlyShiftRow = {
  shift: string;
  lateIncidents: number;
  avgLateMins: number;
  earlyGoing: number;
};

export type LateEarlyUnitRow = {
  unit: string;
  headcount: number;
  late: number;
  early: number;
  compliancePct: number;
};

export type LateEarlyKpi = {
  latePunches: number;
  lateAvgMins: number;
  lateEmployeesAffected: number;
  earlyIncidents: number;
  earlyAvgMins: number;
  earlyEmployees: number;
  repeatOffenders: number;
  criticalOffenders: number;
  onTimeCount: number;
  totalEmployees: number;
};

export type LateEarlyReportData = {
  kpi: LateEarlyKpi;
  employees: LateEarlyEmployeeRow[];
  departments: LateEarlyDeptRow[];
  shifts: LateEarlyShiftRow[];
  units: LateEarlyUnitRow[];
  filterDepartments: string[];
};

type EmployeeInput = {
  employeeId: string;
  fullName: string;
  department?: string;
  locationUnit?: string;
  primaryShift?: string;
};

type DayPunch = {
  employeeId: string;
  inAt: Date | null;
  outAt: Date | null;
};

const GRACE_MINUTES = 15;

export function shiftStartHour(primaryShift: string): number | null {
  const m = primaryShift?.match(/(\d{2}):(\d{2})\s*to/i);
  if (!m) return null;
  return parseInt(m[1], 10) + parseInt(m[2], 10) / 60;
}

export function shiftEndHour(primaryShift: string): number | null {
  const m = primaryShift?.match(/to\s*(\d{2}):(\d{2})/i);
  if (!m) return null;
  return parseInt(m[1], 10) + parseInt(m[2], 10) / 60;
}

function shiftLabel(primaryShift?: string): string {
  if (!primaryShift?.trim()) return "—";
  const part = primaryShift.split("—")[0]?.trim();
  return part || primaryShift;
}

function hourOf(d: Date): number {
  return d.getHours() + d.getMinutes() / 60;
}

function lateMinutes(inAt: Date, shiftStart: number): number {
  const punchHour = hourOf(inAt);
  const lateHours = punchHour - shiftStart - GRACE_MINUTES / 60;
  return lateHours > 0 ? Math.round(lateHours * 60) : 0;
}

function earlyMinutes(outAt: Date, shiftEnd: number): number {
  const outHour = hourOf(outAt);
  const earlyHours = shiftEnd - outHour - GRACE_MINUTES / 60;
  return earlyHours > 0 ? Math.round(earlyHours * 60) : 0;
}

function compliancePct(
  headcount: number,
  lateIncidents: number,
  earlyIncidents: number,
  workingDays: number
): number {
  const expected = headcount * workingDays;
  if (!expected) return 100;
  const issues = lateIncidents + earlyIncidents;
  return Math.max(0, Math.round(((expected - issues) / expected) * 100));
}

export function buildLateEarlyReport(
  employees: EmployeeInput[],
  dayPunches: DayPunch[],
  workingDays: number,
  minMinutes = 0
): LateEarlyReportData {
  const punchesByEmployee = new Map<string, DayPunch[]>();
  for (const row of dayPunches) {
    const list = punchesByEmployee.get(row.employeeId) ?? [];
    list.push(row);
    punchesByEmployee.set(row.employeeId, list);
  }

  const employeeRows: LateEarlyEmployeeRow[] = employees.map((emp) => {
    const eid = String(emp.employeeId);
    const primaryShift = String(emp.primaryShift || "");
    const start = shiftStartHour(primaryShift);
    const end = shiftEndHour(primaryShift);
    const rows = punchesByEmployee.get(eid) ?? [];

    let latePunches = 0;
    let totalLateMins = 0;
    let earlyGoing = 0;
    let totalEarlyMins = 0;

    for (const day of rows) {
      if (day.inAt && start !== null) {
        const mins = lateMinutes(day.inAt, start);
        if (mins >= minMinutes) {
          latePunches += 1;
          totalLateMins += mins;
        }
      }
      if (day.outAt && end !== null) {
        const mins = earlyMinutes(day.outAt, end);
        if (mins >= minMinutes) {
          earlyGoing += 1;
          totalEarlyMins += mins;
        }
      }
    }

    const totalEvents = latePunches + earlyGoing;
    return {
      employeeId: eid,
      employeeName: emp.fullName,
      department: emp.department || "—",
      shift: shiftLabel(primaryShift),
      unit: emp.locationUnit || "—",
      latePunches,
      totalLateMins,
      avgLateMins: latePunches ? Math.round(totalLateMins / latePunches) : 0,
      earlyGoing,
      totalEarlyMins,
      repeatOffender: latePunches >= 5 || earlyGoing >= 3,
      critical: totalEvents >= 10,
    };
  });

  const departments = aggregateDepartments(employeeRows, workingDays);
  const shifts = aggregateShifts(employeeRows);
  const units = aggregateUnits(employeeRows, workingDays);

  const lateEmployeesAffected = employeeRows.filter((e) => e.latePunches > 0).length;
  const earlyEmployees = employeeRows.filter((e) => e.earlyGoing > 0).length;
  const totalLateMins = employeeRows.reduce((s, e) => s + e.totalLateMins, 0);
  const totalLatePunches = employeeRows.reduce((s, e) => s + e.latePunches, 0);
  const totalEarlyMins = employeeRows.reduce((s, e) => s + e.totalEarlyMins, 0);
  const totalEarlyIncidents = employeeRows.reduce((s, e) => s + e.earlyGoing, 0);

  const kpi: LateEarlyKpi = {
    latePunches: totalLatePunches,
    lateAvgMins: totalLatePunches
      ? Math.round(totalLateMins / totalLatePunches)
      : 0,
    lateEmployeesAffected,
    earlyIncidents: totalEarlyIncidents,
    earlyAvgMins: totalEarlyIncidents
      ? Math.round(totalEarlyMins / totalEarlyIncidents)
      : 0,
    earlyEmployees,
    repeatOffenders: employeeRows.filter((e) => e.repeatOffender).length,
    criticalOffenders: employeeRows.filter((e) => e.critical).length,
    onTimeCount: employeeRows.filter(
      (e) => e.latePunches === 0 && e.earlyGoing === 0
    ).length,
    totalEmployees: employeeRows.length,
  };

  const filterDepartments = [
    ...new Set(employeeRows.map((e) => e.department).filter((d) => d && d !== "—")),
  ].sort();

  return {
    kpi,
    employees: employeeRows,
    departments,
    shifts,
    units,
    filterDepartments,
  };
}

function aggregateDepartments(
  rows: LateEarlyEmployeeRow[],
  workingDays: number
): LateEarlyDeptRow[] {
  const map = new Map<string, LateEarlyDeptRow>();
  for (const row of rows) {
    const cur = map.get(row.department) ?? {
      department: row.department,
      headcount: 0,
      lateIncidents: 0,
      lateMinsTotal: 0,
      avgLatePerEmp: 0,
      earlyGoingIncidents: 0,
      compliancePct: 100,
    };
    cur.headcount += 1;
    cur.lateIncidents += row.latePunches;
    cur.lateMinsTotal += row.totalLateMins;
    cur.earlyGoingIncidents += row.earlyGoing;
    map.set(row.department, cur);
  }
  return Array.from(map.values())
    .map((d) => ({
      ...d,
      avgLatePerEmp: d.headcount
        ? Math.round(d.lateMinsTotal / d.headcount)
        : 0,
      compliancePct: compliancePct(
        d.headcount,
        d.lateIncidents,
        d.earlyGoingIncidents,
        workingDays
      ),
    }))
    .sort((a, b) => a.department.localeCompare(b.department));
}

function aggregateShifts(rows: LateEarlyEmployeeRow[]): LateEarlyShiftRow[] {
  const map = new Map<string, LateEarlyShiftRow & { lateMins: number }>();
  for (const row of rows) {
    const cur = map.get(row.shift) ?? {
      shift: row.shift,
      lateIncidents: 0,
      avgLateMins: 0,
      earlyGoing: 0,
      lateMins: 0,
    };
    cur.lateIncidents += row.latePunches;
    cur.lateMins += row.totalLateMins;
    cur.earlyGoing += row.earlyGoing;
    map.set(row.shift, cur);
  }
  return Array.from(map.values())
    .map((s) => ({
      shift: s.shift,
      lateIncidents: s.lateIncidents,
      avgLateMins: s.lateIncidents
        ? Math.round(s.lateMins / s.lateIncidents)
        : 0,
      earlyGoing: s.earlyGoing,
    }))
    .sort((a, b) => a.shift.localeCompare(b.shift));
}

function aggregateUnits(
  rows: LateEarlyEmployeeRow[],
  workingDays: number
): LateEarlyUnitRow[] {
  const map = new Map<string, LateEarlyUnitRow>();
  for (const row of rows) {
    const cur = map.get(row.unit) ?? {
      unit: row.unit,
      headcount: 0,
      late: 0,
      early: 0,
      compliancePct: 100,
    };
    cur.headcount += 1;
    cur.late += row.latePunches;
    cur.early += row.earlyGoing;
    map.set(row.unit, cur);
  }
  return Array.from(map.values())
    .map((u) => ({
      ...u,
      compliancePct: compliancePct(u.headcount, u.late, u.early, workingDays),
    }))
    .sort((a, b) => a.unit.localeCompare(b.unit));
}

export function filterLateEarlyEmployees(
  rows: LateEarlyEmployeeRow[],
  opts: {
    department?: string;
    shift?: string;
    unit?: string;
    reportType?: string;
    minMinutes?: number;
  }
): LateEarlyEmployeeRow[] {
  return rows.filter((e) => {
    if (opts.department && opts.department !== "all" && e.department !== opts.department) {
      return false;
    }
    if (opts.shift && opts.shift !== "all" && !e.shift.includes(opts.shift)) {
      return false;
    }
    if (opts.unit && opts.unit !== "all" && e.unit !== opts.unit) {
      return false;
    }
    const min = opts.minMinutes ?? 0;
    if (e.avgLateMins < min && e.totalEarlyMins < min && e.latePunches === 0) {
      return false;
    }
    if (opts.reportType === "late" && e.latePunches === 0) return false;
    if (opts.reportType === "early" && e.earlyGoing === 0) return false;
    if (
      opts.reportType === "both" &&
      e.latePunches === 0 &&
      e.earlyGoing === 0
    ) {
      return false;
    }
    return true;
  });
}
