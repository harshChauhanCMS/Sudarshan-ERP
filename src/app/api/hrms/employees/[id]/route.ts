import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Employee from "@/lib/models/Employee";
import {
  employeeUniqueConflictMessage,
  findEmployeeUniqueConflict,
} from "@/lib/hrms-employee-uniqueness";
import { assertEmployeeVisibleToViewer } from "@/lib/hr-staff-visibility";
import { assertManagerCanAccessEmployee, isManagerRole } from "@/lib/manager-scope";
import { canManageEmployees } from "@/lib/hrms-access";
import { validateEmployeePayload } from "@/lib/hrms-validation";
import {
  EMPLOYEE_WRITABLE_FIELDS,
  pickAllowedFields,
} from "@/lib/field-allowlists";
import { getSession } from "@/lib/session";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const session = await getSession();
    const managerAccess = await assertManagerCanAccessEmployee(session.user, id);
    if (!managerAccess.ok) {
      return NextResponse.json({ error: managerAccess.message }, { status: 403 });
    }
    const access = await assertEmployeeVisibleToViewer(session.user?.role, id);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: 403 });
    }

    const employee = await Employee.findOne({ employeeId: id });
    if (!employee) {
      return NextResponse.json(
        { error: `Employee not found with ID: ${id}` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: employee });
  } catch (error: any) {
    console.error("GET Employee Details API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const session = await getSession();
    if (!session.user || !canManageEmployees(session.user)) {
      return NextResponse.json(
        { error: "You are not authorized to edit employees." },
        { status: 403 },
      );
    }
    if (isManagerRole(session.user.role)) {
      return NextResponse.json(
        { error: "Managers can view team profiles but cannot edit employee records." },
        { status: 403 },
      );
    }
    const managerAccess = await assertManagerCanAccessEmployee(session.user, id);
    if (!managerAccess.ok) {
      return NextResponse.json({ error: managerAccess.message }, { status: 403 });
    }
    const access = await assertEmployeeVisibleToViewer(session.user.role, id);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: 403 });
    }

    const raw = await req.json();
    const payload = pickAllowedFields(raw, EMPLOYEE_WRITABLE_FIELDS);
    const validationErr = validateEmployeePayload(payload);
    if (validationErr) {
      return NextResponse.json({ error: validationErr }, { status: 400 });
    }

    const employee = await Employee.findOne({ employeeId: id });
    if (!employee) {
      return NextResponse.json(
        { error: `Employee not found with ID: ${id}` },
        { status: 404 }
      );
    }

    // Lock employeeId updates
    if (payload.employeeId && payload.employeeId !== id) {
      return NextResponse.json(
        { error: "Modifying Employee ID is not permitted" },
        { status: 400 }
      );
    }

    // Required fields check
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
      if (payload[field] !== undefined && !payload[field]) {
        return NextResponse.json(
          { error: `${field} cannot be empty` },
          { status: 400 }
        );
      }
    }

    const uniqueConflict = await findEmployeeUniqueConflict(payload, id);
    if (uniqueConflict) {
      return NextResponse.json(
        { error: employeeUniqueConflictMessage(uniqueConflict) },
        { status: 409 }
      );
    }

    const updatedEmployee = await Employee.findOneAndUpdate(
      { employeeId: id },
      { $set: payload },
      { new: true, runValidators: true }
    );

    return NextResponse.json({ success: true, data: updatedEmployee });
  } catch (error: any) {
    console.error("PUT Employee Details API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
