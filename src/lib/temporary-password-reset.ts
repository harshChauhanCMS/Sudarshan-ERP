import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { resolvePermissionsForRole } from "@/lib/resolve-user-permissions";

type ResolvedPermissions = Awaited<ReturnType<typeof resolvePermissionsForRole>>;

export const MIN_TEMPORARY_PASSWORD_RESET_LENGTH = 8;

export type TemporaryPasswordResetInput = {
  email: string;
  temporaryPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type TemporaryPasswordResetResult =
  | {
      ok: true;
      user: {
        id: string;
        email: string;
        name: string;
        role: string;
        employeeId?: string;
        permissions: ResolvedPermissions;
        mustResetPassword: false;
      };
    }
  | { ok: false; message: string; status: number };

export async function resetPasswordWithTemporaryCredentials(
  input: TemporaryPasswordResetInput,
): Promise<TemporaryPasswordResetResult> {
  const email = input.email.trim().toLowerCase();
  const temporaryPassword = input.temporaryPassword;
  const newPassword = input.newPassword;
  const confirmPassword = input.confirmPassword;

  if (!email || !temporaryPassword || !newPassword || !confirmPassword) {
    return {
      ok: false,
      message: "Email, temporary password, new password, and confirmation are required.",
      status: 400,
    };
  }

  if (newPassword.length < MIN_TEMPORARY_PASSWORD_RESET_LENGTH) {
    return {
      ok: false,
      message: `New password must be at least ${MIN_TEMPORARY_PASSWORD_RESET_LENGTH} characters.`,
      status: 400,
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      ok: false,
      message: "New password and confirmation do not match.",
      status: 400,
    };
  }

  if (newPassword === temporaryPassword) {
    return {
      ok: false,
      message: "New password must be different from the temporary password.",
      status: 400,
    };
  }

  await connectDB();
  const user = await User.findOne({ email });
  if (!user) {
    return { ok: false, message: "No account found for this email address.", status: 404 };
  }

  if (!user.requiresPasswordReset) {
    return {
      ok: false,
      message:
        "No temporary password is active for this account. Please contact HR or Admin to receive a new temporary password by email.",
      status: 400,
    };
  }

  if (user.passwordResetDeadline) {
    const deadline = new Date(user.passwordResetDeadline);
    if (Date.now() > deadline.getTime()) {
      return {
        ok: false,
        message:
          "Your temporary password has expired. Please contact HR or Admin for a new temporary password.",
        status: 403,
      };
    }
  }

  const tempValid = await bcrypt.compare(temporaryPassword, user.passwordHash);
  if (!tempValid) {
    return { ok: false, message: "Temporary password is incorrect.", status: 400 };
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.requiresPasswordReset = false;
  user.passwordResetDeadline = null;
  await user.save();

  const permissions = await resolvePermissionsForRole(user.role);

  return {
    ok: true,
    user: {
      id: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
      employeeId: user.employeeId ? String(user.employeeId) : undefined,
      permissions,
      mustResetPassword: false,
    },
  };
}
