import { connectDB } from "@/lib/db";
import Employee from "@/lib/models/Employee";
import Notification from "@/lib/models/Notification";
import { User } from "@/models/User";
import {
  parseReportingManagerId,
  reportingManagerMatches,
} from "@/lib/manager-scope-shared";

const GLOBAL_ATTENDANCE_ROLES = new Set(["admin", "owner", "hr"]);

type PunchNotificationInput = {
  employeeId?: string | null;
  employeeName?: string | null;
  userEmail?: string | null;
  punchType: "in" | "out";
  punchedAt: Date;
  source?: string;
  punchId?: string;
};

function formatPunchTime(d: Date): string {
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sourceLabel(source?: string): string {
  if (source === "machine") return "Biometric";
  if (source === "mobile") return "Mobile";
  return "Web";
}

async function resolveEmployeeDisplay(input: PunchNotificationInput) {
  await connectDB();
  if (input.employeeId) {
    const emp = await Employee.findOne({ employeeId: input.employeeId })
      .select({ employeeId: 1, fullName: 1, reportingManager: 1 })
      .lean();
    if (emp) {
      return {
        employeeId: String(emp.employeeId),
        employeeName: String(emp.fullName),
        reportingManager: emp.reportingManager
          ? String(emp.reportingManager)
          : undefined,
      };
    }
  }
  if (input.userEmail) {
    const emp = await Employee.findOne({
      $or: [
        { officialEmail: input.userEmail.trim().toLowerCase() },
        { personalEmail: input.userEmail.trim().toLowerCase() },
      ],
    })
      .select({ employeeId: 1, fullName: 1, reportingManager: 1 })
      .lean();
    if (emp) {
      return {
        employeeId: String(emp.employeeId),
        employeeName: String(emp.fullName),
        reportingManager: emp.reportingManager
          ? String(emp.reportingManager)
          : undefined,
      };
    }
  }
  return {
    employeeId: input.employeeId ? String(input.employeeId) : undefined,
    employeeName: input.employeeName || input.userEmail || "Employee",
    reportingManager: undefined as string | undefined,
  };
}

async function resolveRecipientEmails(
  employeeId: string | undefined,
  reportingManager: string | undefined,
  puncherEmail?: string | null
): Promise<string[]> {
  const users = await User.find({
    role: { $in: ["admin", "owner", "hr", "manager"] },
  })
    .select({ email: 1, role: 1, employeeId: 1 })
    .lean();

  const managerEmployeeId = parseReportingManagerId(reportingManager);
  const recipients = new Set<string>();
  const puncher = puncherEmail?.trim().toLowerCase();

  for (const user of users) {
    const email = user.email?.trim().toLowerCase();
    if (!email || email === puncher) continue;

    const role = String(user.role || "").toLowerCase();
    if (GLOBAL_ATTENDANCE_ROLES.has(role)) {
      recipients.add(email);
      continue;
    }

    if (role === "manager" && managerEmployeeId && user.employeeId) {
      if (
        reportingManagerMatches(reportingManager, String(user.employeeId)) ||
        String(user.employeeId).toUpperCase() === managerEmployeeId
      ) {
        recipients.add(email);
      }
    }
  }

  return Array.from(recipients);
}

export async function notifyAttendancePunch(
  input: PunchNotificationInput
): Promise<void> {
  try {
    await connectDB();

    const display = await resolveEmployeeDisplay(input);
    const recipients = await resolveRecipientEmails(
      display.employeeId,
      display.reportingManager,
      input.userEmail
    );

    if (!recipients.length) return;

    const time = formatPunchTime(input.punchedAt);
    const src = sourceLabel(input.source);
    const action = input.punchType === "in" ? "punched in" : "punched out";
    const idPart = display.employeeId ? ` (${display.employeeId})` : "";
    const message = `${display.employeeName}${idPart} ${action} at ${time} · ${src}`;
    const target = display.employeeId
      ? `/hrms/employees/${display.employeeId}`
      : "/hrms/reports/attendance";

    await Notification.insertMany(
      recipients.map((recipientEmail) => ({
        recipientEmail,
        category: "attendance",
        type: input.punchType === "in" ? "success" : "info",
        punchType: input.punchType,
        employeeId: display.employeeId,
        employeeName: display.employeeName,
        message,
        target,
        punchedAt: input.punchedAt,
        read: false,
      }))
    );
  } catch (e) {
    console.error("notifyAttendancePunch failed:", e);
  }
}
