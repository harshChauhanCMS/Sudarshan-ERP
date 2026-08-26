import { connectDB } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";
import { getUserFromRequest } from "@/lib/api-request-auth";
import { resolveSessionEmployee } from "@/lib/resolve-session-employee";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return fail("Unauthorized", 401);

  try {
    await connectDB();
    const employee = await resolveSessionEmployee(user);
    if (!employee) {
      return fail(
        "No employee profile is linked to your login. Contact HR to link your official email or employee ID.",
        404,
      );
    }

    return ok({
      employeeId: String(employee.employeeId),
      fullName: employee.fullName,
      department: employee.department,
      designation: employee.designation,
      primaryContact: employee.primaryContact ?? "",
      officialEmail: employee.officialEmail ?? "",
      personalEmail: employee.personalEmail ?? "",
      primaryShift: employee.primaryShift ?? "",
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to load profile", 500);
  }
}
