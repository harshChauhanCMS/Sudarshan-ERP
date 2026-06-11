import { connectDB } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";
import Holiday from "@/lib/models/Holiday";
import { requireSession, requirePermission, isAdminOrOwner } from "@/lib/api-auth";

export async function GET(request: Request) {
  const { error } = await requireSession();
  if (error) return error;

  try {
    await connectDB();
    const url = new URL(request.url);
    const year = url.searchParams.get("year") ? Number(url.searchParams.get("year")) : new Date().getFullYear();
    const holidays = await Holiday.find({ year }).sort({ date: 1 }).lean();
    return ok(holidays);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed", 500);
  }
}

export async function POST(request: Request) {
  const { user, error } = await requireSession();
  if (error) return error;
  if (!isAdminOrOwner(user.role)) {
    const permErr = requirePermission(user, "hr", "edit");
    if (permErr) return permErr;
  }

  try {
    await connectDB();
    const body = await request.json().catch(() => null);
    if (!body?.name || !body?.date) return fail("name and date are required", 400);

    const date = new Date(body.date);
    if (Number.isNaN(date.getTime())) return fail("Invalid date", 400);

    const holiday = await Holiday.create({
      name: body.name,
      date,
      type: body.type || "national",
      year: date.getFullYear(),
      description: body.description || "",
    });
    return ok({ holiday }, 201);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed", 500);
  }
}
