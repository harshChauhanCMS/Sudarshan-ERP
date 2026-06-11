import { connectDB } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";
import LeavePolicy, { DEFAULT_LEAVE_POLICIES } from "@/lib/models/LeavePolicy";
import { requireSession, requirePermission, isAdminOrOwner } from "@/lib/api-auth";
import { pickAllowedFields, LEAVE_POLICY_WRITABLE_FIELDS } from "@/lib/field-allowlists";

async function seedIfEmpty() {
  const count = await LeavePolicy.countDocuments();
  if (count === 0) await LeavePolicy.insertMany(DEFAULT_LEAVE_POLICIES);
}

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  try {
    await connectDB();
    await seedIfEmpty();
    const policies = await LeavePolicy.find({}).sort({ leaveType: 1 }).lean();
    return ok(policies);
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
    if (!body?.leaveType || !body?.label) return fail("leaveType and label required", 400);

    const existing = await LeavePolicy.findOne({ leaveType: body.leaveType });
    if (existing) return fail(`Policy for ${body.leaveType} already exists`, 409);

    const safe = pickAllowedFields(body, [...LEAVE_POLICY_WRITABLE_FIELDS, "leaveType"]);
    const policy = await LeavePolicy.create(safe);
    return ok({ policy }, 201);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed", 500);
  }
}
