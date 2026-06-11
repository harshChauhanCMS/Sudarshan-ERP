import { getSession, type SessionUser } from "@/lib/session";
import {
  bearerTokenFromRequest,
  userFromMobileToken,
} from "@/lib/mobile-auth";

export async function getUserFromRequest(
  request: Request,
): Promise<SessionUser | null> {
  const mobileUser = await userFromMobileToken(bearerTokenFromRequest(request));
  if (mobileUser) {
    return {
      id: mobileUser.id,
      email: mobileUser.email,
      name: mobileUser.name,
      role: mobileUser.role,
      employeeId: mobileUser.employeeId,
    };
  }

  const session = await getSession();
  if (session.isLoggedIn && session.user) return session.user;
  return null;
}
