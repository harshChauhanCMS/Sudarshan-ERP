import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Employee from "@/lib/models/Employee";
import { allocateHrmsEmployeeId } from "@/lib/hrms-employee-id";
import {
  employeeUniqueConflictMessage,
  findEmployeeUniqueConflict,
} from "@/lib/hrms-employee-uniqueness";
import { provisionEmployeeLoginAndSendWelcomeEmail } from "@/lib/hrms-employee-welcome";

export async function GET() {
  try {
    await connectDB();
    const employees = await Employee.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, count: employees.length, data: employees });
  } catch (error: any) {
    console.error("GET Employees API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const payload = await req.json();

    const requiredFields = [
      "fullName",
      "primaryContact",
      "department",
      "designation",
      "locationUnit",
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

    const targetEmail = payload.officialEmail || payload.personalEmail;
    let credentialsEmail: { sent: boolean; reason?: string } = {
      sent: false,
      reason: "no_email",
    };

    if (targetEmail) {
      credentialsEmail = await provisionEmployeeLoginAndSendWelcomeEmail({
        fullName: payload.fullName,
        employeeId: newEmployee.employeeId,
        email: targetEmail,
        role: payload.department,
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
