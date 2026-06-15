import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import EmployeeDraft from "@/lib/models/EmployeeDraft";
import { canManageEmployees } from "@/lib/hrms-access";
import { isManagerRole } from "@/lib/manager-scope";
import {
  EMPLOYEE_WRITABLE_FIELDS,
  pickAllowedFields,
} from "@/lib/field-allowlists";
import { getSession } from "@/lib/session";

function assertDraftAccess(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session.isLoggedIn || !session.user) {
    return { ok: false as const, status: 401, message: "Unauthorized" };
  }
  if (!canManageEmployees(session.user)) {
    return {
      ok: false as const,
      status: 403,
      message: "You are not authorized to manage employee drafts.",
    };
  }
  if (isManagerRole(session.user.role)) {
    return {
      ok: false as const,
      status: 403,
      message: "Managers cannot add employees.",
    };
  }
  return { ok: true as const, userId: String(session.user.id) };
}

export async function GET() {
  try {
    await connectDB();
    const session = await getSession();
    const access = assertDraftAccess(session);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status });
    }

    const draft = await EmployeeDraft.findOne({ userId: access.userId }).lean();
    if (!draft) {
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({
      success: true,
      data: {
        formData: draft.formData ?? {},
        currentStep: draft.currentStep ?? 0,
        updatedAt: draft.updatedAt,
      },
    });
  } catch (error) {
    console.error("GET Employee Draft API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await connectDB();
    const session = await getSession();
    const access = assertDraftAccess(session);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const rawFormData =
      body.formData && typeof body.formData === "object" ? body.formData : {};
    const formData = pickAllowedFields(
      rawFormData as Record<string, unknown>,
      EMPLOYEE_WRITABLE_FIELDS,
    );

    const currentStep = Number.isFinite(Number(body.currentStep))
      ? Math.max(0, Math.floor(Number(body.currentStep)))
      : 0;

    const draft = await EmployeeDraft.findOneAndUpdate(
      { userId: access.userId },
      {
        $set: {
          userEmail: session.user!.email,
          formData,
          currentStep,
        },
      },
      { upsert: true, new: true, runValidators: true },
    ).lean();

    return NextResponse.json({
      success: true,
      data: {
        formData: draft?.formData ?? formData,
        currentStep: draft?.currentStep ?? currentStep,
        updatedAt: draft?.updatedAt,
      },
    });
  } catch (error) {
    console.error("PUT Employee Draft API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await connectDB();
    const session = await getSession();
    const access = assertDraftAccess(session);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status });
    }

    await EmployeeDraft.deleteOne({ userId: access.userId });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE Employee Draft API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
