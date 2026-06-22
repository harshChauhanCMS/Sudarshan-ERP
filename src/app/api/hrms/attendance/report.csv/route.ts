import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Employee from "@/lib/models/Employee";
import AttendancePunch from "@/lib/models/AttendancePunch";
import { fail } from "@/lib/api-response";

function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[,"\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

export async function GET(request: Request) {
  try {
    await connectDB();

    const url = new URL(request.url);
    const from = parseDateParam(url.searchParams.get("from"));
    const to = parseDateParam(url.searchParams.get("to"));
    if (!from || !to) return fail("Query params from and to are required (ISO date)", 400);

    const employeeId = url.searchParams.get("employeeId")?.trim() || null;

    const fromD = startOfDay(from);
    const toD = endOfDay(to);

    const query: Record<string, any> = { punchedAt: { $gte: fromD, $lte: toD } };
    if (employeeId) query.employeeId = employeeId;

    const punches = await AttendancePunch.find(query).sort({ punchedAt: 1 }).lean();

    // (employee, day) -> first in, last out
    const map = new Map<string, { employeeId: string; day: string; inAt: Date | null; outAt: Date | null }>();

    for (const p of punches) {
      const emp = String(p.employeeId || "");
      if (!emp) continue;
      const d = dayKey(new Date(p.punchedAt));
      const k = `${emp}|${d}`;
      const cur = map.get(k) ?? { employeeId: emp, day: d, inAt: null, outAt: null };

      const punchedAt = new Date(p.punchedAt);
      if (p.punchType === "in") {
        if (!cur.inAt || punchedAt < cur.inAt) cur.inAt = punchedAt;
      } else if (p.punchType === "out") {
        if (!cur.outAt || punchedAt > cur.outAt) cur.outAt = punchedAt;
      }
      map.set(k, cur);
    }

    const employeeIds = Array.from(new Set(Array.from(map.values()).map((x) => x.employeeId)));
    const employees = await Employee.find({ employeeId: { $in: employeeIds } })
      .select({ employeeId: 1, fullName: 1, department: 1, designation: 1, locationUnit: 1 })
      .lean();

    const empById = new Map<string, any>();
    for (const e of employees) empById.set(String(e.employeeId), e);

    const header = [
      "employeeId",
      "employeeName",
      "department",
      "designation",
      "locationUnit",
      "day",
      "inAt",
      "outAt",
    ];

    const lines: string[] = [];
    lines.push(header.join(","));

    const rows = Array.from(map.values()).sort((a, b) =>
      a.employeeId === b.employeeId ? a.day.localeCompare(b.day) : a.employeeId.localeCompare(b.employeeId)
    );

    for (const r of rows) {
      const emp = empById.get(r.employeeId);
      lines.push(
        [
          r.employeeId,
          emp?.fullName ?? "",
          emp?.department ?? "",
          emp?.designation ?? "",
          emp?.locationUnit ?? "",
          r.day,
          r.inAt?.toISOString() ?? "",
          r.outAt?.toISOString() ?? "",
        ]
          .map(csvEscape)
          .join(",")
      );
    }

    const csv = lines.join("\n");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="attendance-report.csv"',
      },
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to build report CSV", 500);
  }
}

