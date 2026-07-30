import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { assertEmployeeVisibleToViewer } from "@/lib/hr-staff-visibility";
import {
  assertCanAccessEmployee,
  canResendEmployeeCredentials,
} from "@/lib/hrms-access";
import {
  getEmployeeCredentialStatus,
  resendExpiredEmployeeTemporaryPassword,
} from "@/lib/hrms-employee-welcome";
import { getSession } from "@/lib/session";

// The status is time-sensitive (it flips when the temporary password expires),
// so it must never be served from a cache.
export const dynamic = "force-dynamic";

function credentialErrorMessage(reason?: string): string {
  switch (reason) {
    case "no_account":
      return "This employee does not have a login account yet.";
    case "no_email":
      return "Add an official or personal email before sending login credentials.";
    case "already_activated":
      return "This employee has already set their password.";
    case "forgot_password":
      return "Employee account is active.";
    case "not_expired":
      return "The temporary password is still valid. Resend is only available after it expires.";
    case "email_not_configured":
      return "Email is not configured on the server.";
    case "send_failed":
      return "Failed to send the credentials email. Try again later.";
    case "employee_not_found":
      return "Employee not found.";
    default:
      return "Unable to resend credentials.";
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();
    const { id } = await params;
    const session = await getSession();

    if (!session.user || !canResendEmployeeCredentials(session.user)) {
      return NextResponse.json(
        { error: "You are not authorized to manage login credentials." },
        { status: 403 },
      );
    }

    const access = await assertCanAccessEmployee(session.user, id);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: 403 });
    }

    const visibility = await assertEmployeeVisibleToViewer(session.user.role, id);
    if (!visibility.ok) {
      return NextResponse.json({ error: visibility.message }, { status: 403 });
    }

    const status = await getEmployeeCredentialStatus(id);
    return NextResponse.json(
      { success: true, data: status },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("GET employee credentials status error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();
    const { id } = await params;
    const session = await getSession();

    if (!session.user || !canResendEmployeeCredentials(session.user)) {
      return NextResponse.json(
        { error: "You are not authorized to manage login credentials." },
        { status: 403 },
      );
    }

    const access = await assertCanAccessEmployee(session.user, id);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: 403 });
    }

    const visibility = await assertEmployeeVisibleToViewer(session.user.role, id);
    if (!visibility.ok) {
      return NextResponse.json({ error: visibility.message }, { status: 403 });
    }

    const result = await resendExpiredEmployeeTemporaryPassword(id);
    if (!result.sent) {
      return NextResponse.json(
        { error: credentialErrorMessage(result.reason), reason: result.reason },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        sent: true,
        loginEmail: result.loginEmail,
      },
    });
  } catch (error) {
    console.error("POST resend employee credentials error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
