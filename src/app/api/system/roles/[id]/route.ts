import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Role from "@/lib/models/Role";
import {
  requireSession,
  requirePermission,
  isAdminOrOwner,
} from "@/lib/api-auth";
import { pickAllowedFields, ROLE_WRITABLE_FIELDS } from "@/lib/field-allowlists";

function requireRoleManagement(user: NonNullable<Awaited<ReturnType<typeof requireSession>>["user"]>) {
  if (isAdminOrOwner(user.role)) return null;
  return requirePermission(user, "user_management", "edit");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSession();
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const role = await Role.findOne({ roleKey: id });
    if (!role) {
      return NextResponse.json({ error: `Role "${id}" not found` }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: role });
  } catch (error: unknown) {
    console.error("GET Role Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requireRoleManagement(user);
  if (permErr) return permErr;

  try {
    await connectDB();
    const { id } = await params;
    const payload = await req.json();

    const role = await Role.findOne({ roleKey: id });
    if (!role) {
      return NextResponse.json({ error: `Role "${id}" not found` }, { status: 404 });
    }

    const safe = pickAllowedFields(payload, ROLE_WRITABLE_FIELDS);

    const updated = await Role.findOneAndUpdate(
      { roleKey: id },
      { $set: safe },
      { new: true, runValidators: true }
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error("PUT Role Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireSession();
  if (error) return error;
  const permErr = requireRoleManagement(user);
  if (permErr) return permErr;

  try {
    await connectDB();
    const { id } = await params;

    const role = await Role.findOne({ roleKey: id });
    if (!role) {
      return NextResponse.json({ error: `Role "${id}" not found` }, { status: 404 });
    }

    if (role.isSystem) {
      return NextResponse.json({ error: "System roles cannot be deleted" }, { status: 403 });
    }

    await Role.deleteOne({ roleKey: id });
    return NextResponse.json({ success: true, message: `Role "${id}" deleted` });
  } catch (error: unknown) {
    console.error("DELETE Role Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
