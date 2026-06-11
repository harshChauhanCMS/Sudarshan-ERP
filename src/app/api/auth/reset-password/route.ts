import bcrypt from "bcryptjs";
import { connectDB, isDbConfigured } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getSession } from "@/lib/session";
import { ok, fail } from "@/lib/api-response";

const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return fail("Database not configured.", 503);
  }

  const session = await getSession();
  if (!session.isLoggedIn || !session.user?.email) {
    return fail("You must be signed in to reset your password.", 401);
  }

  const body = await request.json().catch(() => ({}));
  const temporaryPassword =
    typeof body.temporaryPassword === "string" ? body.temporaryPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  const confirmPassword =
    typeof body.confirmPassword === "string" ? body.confirmPassword : "";

  if (!temporaryPassword || !newPassword || !confirmPassword) {
    return fail("Temporary password, new password, and confirmation are required.", 400);
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return fail(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`, 400);
  }

  if (newPassword !== confirmPassword) {
    return fail("New password and confirmation do not match.", 400);
  }

  if (newPassword === temporaryPassword) {
    return fail("New password must be different from the temporary password.", 400);
  }

  try {
    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return fail("User account not found.", 404);
    }

    if (!user.requiresPasswordReset) {
      return fail("Password reset is not required for this account.", 400);
    }

    if (user.passwordResetDeadline) {
      const deadline = new Date(user.passwordResetDeadline);
      if (Date.now() > deadline.getTime()) {
        return fail(
          "Your temporary password has expired. Please contact HR for new credentials.",
          403
        );
      }
    }

    const tempValid = await bcrypt.compare(temporaryPassword, user.passwordHash);
    if (!tempValid) {
      return fail("Temporary password is incorrect.", 401);
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.requiresPasswordReset = false;
    user.passwordResetDeadline = null;
    await user.save();

    session.user.mustResetPassword = false;
    await session.save();

    return ok({ reset: true, next: "/select-company" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Password reset failed";
    return fail(message, 500);
  }
}
