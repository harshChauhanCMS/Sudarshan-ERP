import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Role, { DEFAULT_ROLES } from "@/lib/models/Role";
import {
  requireSession,
  requirePermission,
  isAdminOrOwner,
} from "@/lib/api-auth";
import { pickAllowedFields, ROLE_WRITABLE_FIELDS } from "@/lib/field-allowlists";

async function seedDefaultRoles() {
  const count = await Role.countDocuments();
  if (count === 0) {
    await Role.insertMany(DEFAULT_ROLES);
  }
}

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  try {
    await connectDB();
    await seedDefaultRoles();
    const roles = await Role.find({}).sort({ isSystem: -1, label: 1 });
    return NextResponse.json({ success: true, data: roles });
  } catch (error: unknown) {
    console.error("GET Roles Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { user, error } = await requireSession();
  if (error) return error;
  if (!isAdminOrOwner(user.role)) {
    const permErr = requirePermission(user, "user_management", "add");
    if (permErr) return permErr;
  }

  try {
    await connectDB();
    const payload = await req.json();

    if (!payload.roleKey || !payload.label) {
      return NextResponse.json({ error: "roleKey and label are required" }, { status: 400 });
    }

    const existing = await Role.findOne({ roleKey: payload.roleKey.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: `Role key "${payload.roleKey}" already exists` }, { status: 409 });
    }

    const safe = pickAllowedFields(payload, [...ROLE_WRITABLE_FIELDS, "roleKey"]);
    const role = await Role.create({
      ...safe,
      roleKey: String(safe.roleKey).toLowerCase(),
      isSystem: false,
    });

    return NextResponse.json({ success: true, data: role }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST Role Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
