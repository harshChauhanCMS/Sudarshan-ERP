import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { allocateHrmsEmployeeId } from "@/lib/hrms-employee-id";

export async function GET() {
  try {
    await connectDB();
    const employeeId = await allocateHrmsEmployeeId();
    return NextResponse.json({ success: true, employeeId });
  } catch (error: unknown) {
    console.error("GET next employee ID error:", error);
    return NextResponse.json({ error: "Could not generate employee ID" }, { status: 500 });
  }
}
