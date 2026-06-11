import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";
import SalarySheet from "@/lib/models/SalarySheet";
import { getSession } from "@/lib/session";
import { canManagePayroll } from "@/lib/hrms-access";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/octet-stream",
]);

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.user) return fail("Unauthorized", 401);
  if (!canManagePayroll(session.user)) return fail("Forbidden", 403);

  try {
    await connectDB();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const cycle = formData.get("cycle") as string | null;

    if (!file) return fail("file is required", 400);
    if (file.size > MAX_UPLOAD_BYTES) {
      return fail("File must be 5 MB or smaller", 400);
    }
    const mime = file.type || "";
    const name = file.name?.toLowerCase() ?? "";
    if (
      mime &&
      !ALLOWED_MIME.has(mime) &&
      !name.endsWith(".xlsx") &&
      !name.endsWith(".xls")
    ) {
      return fail("Only Excel files (.xlsx, .xls) are allowed", 400);
    }
    if (!cycle || !/^\d{4}-\d{2}$/.test(cycle)) return fail("cycle (YYYY-MM) is required", 400);

    // Dynamically import xlsx so it only loads server-side
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: null });

    const NUMERIC_FIELDS = [
      "basicSalary", "da", "hra", "otherConveyance", "specialBonus",
      "grossSalary", "workingDays", "daysPresent", "leaveDays", "unpaidLeaveDays",
      "leaveDeduction", "overtimeHours", "overtimeAmount",
      "pfEmployee", "pfEmployer", "esi", "tds", "otherDeductions", "netPayable",
    ];

    const results: { employeeId: string; action: string; error?: string }[] = [];

    for (const row of rows) {
      const employeeId = String(row.employeeId || "").trim();
      if (!employeeId) continue;

      const update: Record<string, any> = {};
      for (const f of NUMERIC_FIELDS) {
        if (row[f] != null && !Number.isNaN(Number(row[f]))) {
          update[f] = Number(row[f]);
        }
      }
      if (row.notes) update.notes = String(row.notes);
      if (row.tds)   update.tds = Number(row.tds);

      try {
        const existing = await SalarySheet.findOneAndUpdate(
          { cycle, employeeId },
          { $set: update },
          { new: true, upsert: false }
        );
        if (!existing) {
          results.push({ employeeId, action: "skipped", error: "Sheet not found; generate first" });
        } else {
          results.push({ employeeId, action: "updated" });
        }
      } catch (e) {
        results.push({ employeeId, action: "error", error: e instanceof Error ? e.message : "Failed" });
      }
    }

    return ok({
      cycle,
      processed: rows.length,
      updated: results.filter((r) => r.action === "updated").length,
      results,
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Bulk upload failed", 500);
  }
}
