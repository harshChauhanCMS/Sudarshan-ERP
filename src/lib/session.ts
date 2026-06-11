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

function resolveSessionPassword(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set (min 32 characters) in production");
  }
  return "sudarshan-dev-session-secret-min-32-chars";
}

let cachedSessionOptions: SessionOptions | null = null;

/** Resolved lazily so `next build` does not require SESSION_SECRET at import time. */
export function getSessionOptions(): SessionOptions {
  if (!cachedSessionOptions) {
    cachedSessionOptions = {
      password: resolveSessionPassword(),
      cookieName: "sudarshan_session",
      cookieOptions: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      },
    };
  }
  return cachedSessionOptions;
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), getSessionOptions());
}
