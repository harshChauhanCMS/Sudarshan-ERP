import { connectDB } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";
import Employee from "@/lib/models/Employee";
import AttendancePunch from "@/lib/models/AttendancePunch";
import LeaveRequest from "@/lib/models/LeaveRequest";
import SalarySheet from "@/lib/models/SalarySheet";
import { calcSalary } from "@/lib/salary-calc";
import { getSession } from "@/lib/session";
import { canManagePayroll } from "@/lib/hrms-access";

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d: Date)   { const x = new Date(d); x.setHours(23,59,59,999); return x; }
function dayKey(d: Date)     { return d.toISOString().slice(0, 10); }

function countWorkingDays(from: Date, to: Date): number {
  let count = 0;
  const cur = new Date(startOfDay(from));
  while (cur <= to) {
    if (cur.getDay() !== 0) count++; // exclude Sundays
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.user) return fail("Unauthorized", 401);
  if (!canManagePayroll(session.user)) return fail("Forbidden", 403);

  try {
    await connectDB();
    const body = await request.json().catch(() => ({}));

    // Accept either: { from, to } date strings  OR  legacy { cycle: "YYYY-MM" }
    let start: Date, end: Date, cycle: string;

    if (body.from && body.to) {
      start = startOfDay(new Date(body.from));
      end   = endOfDay(new Date(body.to));
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return fail("Invalid from/to dates", 400);
      }
      // Derive cycle label from start date
      cycle = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
      // If range spans more than one month append end month too
      const endCycle = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}`;
      if (endCycle !== cycle) cycle = `${cycle}_${endCycle}`;
    } else {
      // Legacy: derive from cycle param
      const c: string = body.cycle || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
      if (!/^\d{4}-\d{2}$/.test(c)) return fail("cycle must be YYYY-MM", 400);
      const [year, month] = c.split("-").map(Number);
      start = new Date(year, month - 1, 1, 0, 0, 0, 0);
      end   = new Date(year, month, 0, 23, 59, 59, 999);
      cycle = c;
    }

    const workingDays = countWorkingDays(start, end);

    const employees = await Employee.find({}).lean();

    // Build attendance map
    const punches = await AttendancePunch.find({
      punchedAt: { $gte: start, $lte: end },
    }).sort({ punchedAt: 1 }).lean();

    const punchDayMap = new Map<string, { inAt: Date | null; outAt: Date | null }>();
    for (const p of punches) {
      const eid = String(p.employeeId || "");
      if (!eid) continue;
      const d = dayKey(new Date(p.punchedAt));
      const k = `${eid}|${d}`;
      const cur = punchDayMap.get(k) ?? { inAt: null, outAt: null };
      const t = new Date(p.punchedAt);
      if (p.punchType === "in"  && (!cur.inAt  || t < cur.inAt))  cur.inAt  = t;
      if (p.punchType === "out" && (!cur.outAt || t > cur.outAt)) cur.outAt = t;
      punchDayMap.set(k, cur);
    }

    // Approved leaves in the range
    const leaves = await LeaveRequest.find({
      status: "approved",
      fromDate: { $lte: end },
      toDate:   { $gte: start },
    }).lean();

    const leaveByEmp = new Map<string, { paid: number; unpaid: number }>();
    for (const l of leaves) {
      const eid = String(l.employeeId);
      const cur = leaveByEmp.get(eid) ?? { paid: 0, unpaid: 0 };
      if (l.leaveType === "unpaid") cur.unpaid += l.days;
      else cur.paid += l.days;
      leaveByEmp.set(eid, cur);
    }

    const results: { employeeId: string; action: string }[] = [];

    for (const emp of employees) {
      const eid = String(emp.employeeId);
      const expectedHours = typeof emp.workingHours === "number" && emp.workingHours > 0
        ? emp.workingHours : 8;

      let daysPresent = 0;
      let overtimeHours = 0;

      const cur = new Date(startOfDay(start));
      while (cur <= end) {
        if (cur.getDay() !== 0) {
          const k = `${eid}|${dayKey(cur)}`;
          const entry = punchDayMap.get(k);
          if (entry?.inAt) {
            daysPresent++;
            if (entry.outAt && emp.overtimeApplicable) {
              const workedH = (entry.outAt.getTime() - entry.inAt.getTime()) / 36e5;
              if (workedH > expectedHours) overtimeHours += workedH - expectedHours;
            }
          }
        }
        cur.setDate(cur.getDate() + 1);
      }

      const leaveInfo = leaveByEmp.get(eid) ?? { paid: 0, unpaid: 0 };

      const result = calcSalary({
        basicSalary: emp.basicSalary || 0,
        da: emp.da || 0,
        hra: emp.hra || 0,
        otherConveyance: emp.otherConveyance || 0,
        specialBonus: emp.specialBonus || 0,
        workingDays,
        daysPresent,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        workingHoursPerDay: expectedHours,
        overtimeApplicable: emp.overtimeApplicable === true,
        approvedLeaveDays: leaveInfo.paid,
        unpaidLeaveDays: leaveInfo.unpaid,
      });

      const sheet = {
        employeeId: eid,
        employeeName: emp.fullName,
        cycle,
        department: emp.department,
        designation: emp.designation,
        locationUnit: emp.locationUnit,
        compensationType: emp.compensationType,
        basicSalary: emp.basicSalary || 0,
        da: emp.da || 0,
        hra: emp.hra || 0,
        otherConveyance: emp.otherConveyance || 0,
        specialBonus: emp.specialBonus || 0,
        grossSalary: result.grossSalary,
        workingDays,
        daysPresent,
        leaveDays: leaveInfo.paid,
        unpaidLeaveDays: leaveInfo.unpaid,
        leaveDeduction: result.leaveDeduction,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        overtimeAmount: result.overtimeAmount,
        pfEmployee: result.pfEmployee,
        pfEmployer: result.pfEmployer,
        esi: result.esi,
        tds: result.tds,
        otherDeductions: result.otherDeductions,
        netPayable: result.netPayable,
        status: "draft",
      };

      const existing = await SalarySheet.findOne({ cycle, employeeId: eid });
      if (existing) {
        await SalarySheet.findByIdAndUpdate(existing._id, { $set: sheet });
        results.push({ employeeId: eid, action: "updated" });
      } else {
        await SalarySheet.create(sheet);
        results.push({ employeeId: eid, action: "created" });
      }
    }

    return ok({
      cycle,
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
      workingDays,
      generated: results.length,
      results,
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Generate failed", 500);
  }
}
