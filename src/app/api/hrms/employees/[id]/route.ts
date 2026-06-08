import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Employee from "@/lib/models/Employee";
import {
  employeeUniqueConflictMessage,
  findEmployeeUniqueConflict,
} from "@/lib/hrms-employee-uniqueness";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

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
    const payload = await req.json();

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
      "locationUnit",
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
