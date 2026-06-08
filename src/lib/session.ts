import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import type { PermissionsMap } from "@/lib/permission-types";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  employeeId?: string;
  permissions?: PermissionsMap;
  mustResetPassword?: boolean;
};

export type SessionData = {
  user?: SessionUser;
  isLoggedIn: boolean;
};

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "sudarshan-dev-session-secret-min-32-chars",
  cookieName: "sudarshan_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
