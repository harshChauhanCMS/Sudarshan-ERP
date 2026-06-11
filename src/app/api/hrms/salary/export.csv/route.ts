import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SalarySheet from "@/lib/models/SalarySheet";
import { fail } from "@/lib/api-response";
import { filterRowsForHrViewer } from "@/lib/hr-staff-visibility";
import { getSession } from "@/lib/session";
import { canManagePayroll } from "@/lib/hrms-access";

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[,"\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

export async function GET(request: Request) {
  try {
    await connectDB();
    const url = new URL(request.url);
    const cycle = url.searchParams.get("cycle");
    if (!cycle) return fail("cycle param is required", 400);

    const session = await getSession();
    if (!session.isLoggedIn || !session.user) return fail("Unauthorized", 401);
    if (!canManagePayroll(session.user)) return fail("Forbidden", 403);

    const sheets = await filterRowsForHrViewer(
      (
        await SalarySheet.find({ cycle }).sort({ employeeName: 1 }).lean()
      ).map((sheet) => ({
        ...sheet,
        employeeId: String(sheet.employeeId),
      })),
      session.user?.role
    );

    const header = [
      "employeeId", "employeeName", "department", "designation", "cycle",
      "compensationType", "basicSalary", "da", "hra", "otherConveyance", "specialBonus",
      "grossSalary", "workingDays", "daysPresent", "leaveDays", "unpaidLeaveDays",
      "leaveDeduction", "overtimeHours", "overtimeAmount",
      "pfEmployee", "pfEmployer", "esi", "tds", "otherDeductions", "netPayable", "status",
    ];

    const lines = [header.join(",")];
    for (const s of sheets) {
      lines.push(
        header.map((h) => csvEscape((s as any)[h])).join(",")
      );
    }

    return new NextResponse(lines.join("\n"), {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="salary-${cycle}.csv"`,
      },
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Export failed", 500);
  }
}
