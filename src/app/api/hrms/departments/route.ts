import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Employee from "@/lib/models/Employee";
import Role from "@/lib/models/Role";
import { HR_EMPLOYEE_EXCLUDED_ROLE_KEYS } from "@/lib/hrms-employee-options";

export async function GET() {
  try {
    await connectDB();
    // Departments already in use on existing employee records...
    const usedDepartments = await Employee.distinct("department", { department: { $nin: [null, ""] } });
    // ...unioned with every currently assignable role, so a role created
    // today is immediately selectable as a department without needing an
    // existing employee to already carry that value.
    const roles = await Role.find({}, { roleKey: 1 }).lean();
    const assignableRoleKeys = roles
      .map((r) => r.roleKey)
      .filter((key): key is string => !!key && !HR_EMPLOYEE_EXCLUDED_ROLE_KEYS.has(key));

    const departments = [...new Set([...usedDepartments, ...assignableRoleKeys])];
    departments.sort((a, b) => a.localeCompare(b));
    return NextResponse.json({ success: true, data: departments });
  } catch (error: any) {
    console.error("GET Departments API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
