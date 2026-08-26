import { connectDB } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";
import Employee from "@/lib/models/Employee";
import AttendancePunch from "@/lib/models/AttendancePunch";
import LeaveRequest from "@/lib/models/LeaveRequest";
import SalarySheet from "@/lib/models/SalarySheet";
import Deduction from "@/lib/models/Deduction";
import { calcSalary } from "@/lib/salary-calc";
import { resolveEmployeeDeductions } from "@/lib/deduction-utils";
import { getHolidayMap } from "@/lib/holiday-service";
import { getSession } from "@/lib/session";
import { canManagePayroll } from "@/lib/hrms-access";
import { User } from "@/models/User";
import Notification from "@/lib/models/Notification";
import { isWeeklyOffDate } from "@/lib/shift-utils";

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d: Date)   { const x = new Date(d); x.setHours(23,59,59,999); return x; }
function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function countWorkingDays(from: Date, to: Date, weeklyOff?: string): number {
  let count = 0;
  const cur = new Date(startOfDay(from));
  while (cur <= to) {
    if (!isWeeklyOffDate(cur, weeklyOff)) count++;
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

    // Informational only — each employee's actual working-day count below
    // honours their own `weeklyOff`; this is the Sunday-based figure shown
    // as the batch-level summary when employees don't share one schedule.
    const workingDays = countWorkingDays(start, end);
    // Same holiday source as attendance and reports — see holiday-service.
    const holidayMap = await getHolidayMap(start, end);

    const employeeIds: string[] = Array.isArray(body.employeeIds)
      ? body.employeeIds.map((id: unknown) => String(id)).filter(Boolean)
      : [];

    const employees = await Employee.find(
      employeeIds.length > 0 ? { employeeId: { $in: employeeIds } } : {}
    ).lean();

    // Employees whose sheet for this cycle already exists are skipped, so a
    // second "Generate All" can't rebuild — and reset to draft — sheets that
    // were edited, approved or already disbursed. `regenerate: true` rebuilds
    // them from current salary, attendance and deduction rules, but only while
    // they are still drafts: an approved or disbursed sheet is a record of what
    // was paid and is never rewritten.
    const regenerate = body.regenerate === true;
    const existingSheets = await SalarySheet.find({ cycle })
      .select({ employeeId: 1, status: 1 })
      .lean();
    const existingByEmployee = new Map(
      existingSheets.map((s) => [
        String(s.employeeId),
        { id: String(s._id), status: String(s.status || "draft") },
      ]),
    );

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

    // Approved leaves in the range (includes leaves auto-marked "completed"
    // once their end date has passed — see syncCompletedLeaveStatuses)
    const leaves = await LeaveRequest.find({
      status: { $in: ["approved", "completed"] },
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

    // Deduction masters resolved once for the whole run. Each employee's rate
    // is resolved against the *full* master list (not just the rows already on
    // their record), so an employee who never customized a default deduction
    // keeps following its current master percentage — see
    // `resolveEmployeeDeductions` for the inherit-vs-pinned rules.
    const deductionDocs = await Deduction.find({}).lean();
    const deductionMasters = deductionDocs.map((d: any) => ({
      _id: String(d._id),
      name: d.name,
      percentage: d.percentage,
      basis: d.basis === "basic" ? ("basic" as const) : ("gross" as const),
      maxAmount: d.maxAmount,
      applicableUpToGross: d.applicableUpToGross,
      isDefault: d.isDefault,
      isActive: d.isActive,
    }));

    const results: { employeeId: string; action: string }[] = [];

    for (const emp of employees) {
      const eid = String(emp.employeeId);

      const existing = existingByEmployee.get(eid);
      if (existing && !regenerate) {
        results.push({ employeeId: eid, action: "skipped" });
        continue;
      }
      if (existing && existing.status !== "draft") {
        results.push({ employeeId: eid, action: "locked" });
        continue;
      }

      const expectedHours = typeof emp.workingHours === "number" && emp.workingHours > 0
        ? emp.workingHours : 8;
      const empWorkingDays = countWorkingDays(start, end, emp.weeklyOff);

      let daysPresent = 0;
      let overtimeHours = 0;
      let unworkedHolidays = 0;

      const cur = new Date(startOfDay(start));
      while (cur <= end) {
        if (!isWeeklyOffDate(cur, emp.weeklyOff)) {
          const key = dayKey(cur);
          const entry = punchDayMap.get(`${eid}|${key}`);
          if (entry?.inAt) {
            daysPresent++;
            if (entry.outAt && emp.overtimeApplicable) {
              const workedH = (entry.outAt.getTime() - entry.inAt.getTime()) / 36e5;
              if (workedH > expectedHours) overtimeHours += workedH - expectedHours;
            }
          } else if (holidayMap.has(key)) {
            // Counted only when *not* worked — a worked holiday is already in
            // daysPresent, and double-counting would over-credit the employee.
            unworkedHolidays++;
          }
        }
        cur.setDate(cur.getDate() + 1);
      }

      const leaveInfo = leaveByEmp.get(eid) ?? { paid: 0, unpaid: 0 };

      // The employee supplies a pinned rate where they have one; otherwise it
      // follows the master's current default (see resolveEmployeeDeductions).
      const appliedDeductions = resolveEmployeeDeductions(
        deductionMasters,
        emp.deductionRates || [],
      );

      const result = calcSalary({
        basicSalary: emp.basicSalary || 0,
        hra: emp.hra || 0,
        otherConveyance: emp.otherConveyance || 0,
        specialBonus: emp.specialBonus || 0,
        workingDays: empWorkingDays,
        daysPresent,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        workingHoursPerDay: expectedHours,
        overtimeApplicable: emp.overtimeApplicable === true,
        approvedLeaveDays: leaveInfo.paid,
        unpaidLeaveDays: leaveInfo.unpaid,
        holidayDays: unworkedHolidays,
        arrears: emp.arrears || 0,
        deductions: appliedDeductions,
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
        hra: emp.hra || 0,
        otherConveyance: emp.otherConveyance || 0,
        specialBonus: emp.specialBonus || 0,
        arrears: emp.arrears || 0,
        grossSalary: result.grossSalary,
        workingDays: empWorkingDays,
        daysPresent,
        holidayDays: unworkedHolidays,
        absentDays: result.absentDays,
        leaveDays: leaveInfo.paid,
        unpaidLeaveDays: leaveInfo.unpaid,
        leaveDeduction: result.leaveDeduction,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        overtimeAmount: result.overtimeAmount,
        pfEmployee: result.pfEmployee,
        pfEmployer: result.pfEmployer,
        esi: result.esi,
        tds: result.tds,
        advance: result.advance,
        otherDeductions: result.otherDeductions,
        deductionBreakdown: result.deductionLines,
        netPayable: result.netPayable,
        status: "draft",
      };

      if (existing) {
        await SalarySheet.findByIdAndUpdate(existing.id, { $set: sheet });
        results.push({ employeeId: eid, action: "updated" });
      } else {
        await SalarySheet.create(sheet);
        results.push({ employeeId: eid, action: "created" });
      }
    }

    const skipped = results.filter((r) => r.action === "skipped").length;
    const locked = results.filter((r) => r.action === "locked").length;
    const generated = results.length - skipped - locked;

    if (generated > 0) {
      try {
        const targetRoles = ["admin", "owner", "master", "hr"];
        const admins = await User.find({ role: { $in: targetRoles } }).select("email").lean();
        
        if (admins.length > 0) {
          const notifications = admins.map((admin: any) => ({
            recipientEmail: admin.email,
            category: "system",
            type: "info",
            message: `Monthly salary generated for ${cycle} (${generated} employees).`,
            target: "/hrms/salary/monthly",
            read: false,
          }));
          await Notification.insertMany(notifications);
        }
      } catch (err) {
        console.error("Failed to send salary generation notifications:", err);
      }
    }

    return ok({
      cycle,
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
      workingDays,
      generated,
      skipped,
      locked,
      created: results.filter((r) => r.action === "created").length,
      updated: results.filter((r) => r.action === "updated").length,
      results,
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Generate failed", 500);
  }
}
