import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Employee from "@/lib/models/Employee";
import { allocateHrmsEmployeeId } from "@/lib/hrms-employee-id";
import {
  employeeUniqueConflictMessage,
  findEmployeeUniqueConflict,
} from "@/lib/hrms-employee-uniqueness";
import { provisionEmployeeLoginAndSendWelcomeEmail } from "@/lib/hrms-employee-welcome";
import { isManagerRole } from "@/lib/manager-scope";
import {
  canManageEmployees,
  filterEmployeeRowsForViewer,
  resolveHrDataScope,
  scopeEmployeeFilter,
} from "@/lib/hrms-access";
import { validateEmployeePayload } from "@/lib/hrms-validation";
import {
  EMPLOYEE_WRITABLE_FIELDS,
  pickAllowedFields,
} from "@/lib/field-allowlists";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    await connectDB();
    const session = await getSession();
    const scope = await resolveHrDataScope(session.user);
    const filter = scopeEmployeeFilter(scope);
    const employees = await Employee.find(filter ?? {})
      .sort({ createdAt: -1 })
      .lean();
    let visible = employees.map((emp) => ({
      ...emp,
      employeeId: String(emp.employeeId),
    }));
    visible = await filterEmployeeRowsForViewer(visible, session.user);
    return NextResponse.json({
      success: true,
      count: visible.length,
      data: visible,
    });
  } catch (error: any) {
    console.error("GET Employees API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const session = await getSession();
    if (!session.user || !canManageEmployees(session.user)) {
      return NextResponse.json(
        { error: "You are not authorized to add employees." },
        { status: 403 },
      );
    }
    if (isManagerRole(session.user.role)) {
      return NextResponse.json(
        { error: "Managers cannot add employees." },
        { status: 403 },
      );
    }
    const raw = await req.json();
    const payload = pickAllowedFields(raw, EMPLOYEE_WRITABLE_FIELDS);

    const requiredFields = [
      "fullName",
      "primaryContact",
      "department",
      "designation",
      "employmentType",
      "dateJoining",
      "compensationType",
    ];

    for (const field of requiredFields) {
      const value = payload[field];
      const isEmpty =
        value == null ||
        (typeof value === "string" && !value.trim());
      if (isEmpty) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const validationErr = validateEmployeePayload(payload);
    if (validationErr) {
      return NextResponse.json({ error: validationErr }, { status: 400 });
    }

    const uniqueConflict = await findEmployeeUniqueConflict(payload);
    if (uniqueConflict) {
      return NextResponse.json(
        { error: employeeUniqueConflictMessage(uniqueConflict) },
        { status: 409 }
      );
    }

    const employeeId =
      typeof payload.employeeId === "string" && payload.employeeId.trim()
        ? payload.employeeId.trim().toUpperCase()
        : await allocateHrmsEmployeeId();

    const existingEmployee = await Employee.findOne({ employeeId });
    if (existingEmployee) {
      return NextResponse.json(
        { error: `Employee ID ${employeeId} already exists` },
        { status: 409 }
      );
    }

    const newEmployee = await Employee.create({ ...payload, employeeId });

    const targetEmail =
      (typeof payload.officialEmail === "string" && payload.officialEmail) ||
      (typeof payload.personalEmail === "string" && payload.personalEmail) ||
      "";
    let credentialsEmail: { sent: boolean; reason?: string } = {
      sent: false,
      reason: "no_email",
    };

    if (targetEmail) {
      credentialsEmail = await provisionEmployeeLoginAndSendWelcomeEmail({
        fullName: String(payload.fullName ?? ""),
        employeeId: newEmployee.employeeId,
        email: targetEmail,
        role: String(payload.department ?? ""),
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: newEmployee,
        credentialsEmail,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST Employee API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
