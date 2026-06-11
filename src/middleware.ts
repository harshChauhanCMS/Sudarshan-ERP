import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import {
  canAccessRoute,
  getDefaultLandingRoute,
  isDashboardRoute,
} from "@/lib/nav-permissions";
import {
  isManagerBlockedRoute,
  isManagerRole,
} from "@/lib/manager-scope-shared";

const PUBLIC_PATHS = ["/login", "/forgot", "/mobile"];
const PUBLIC_API = [
  "/api/auth/login",
  "/api/auth/forgot",
  "/api/auth/forgot/verify",
  "/api/auth/reset-password",
  "/api/integrations/biometric",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".ico")
  ) {
    return NextResponse.next();
  }

  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return NextResponse.next();
  }

  if (PUBLIC_API.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    const res = NextResponse.next();
    const session = await getIronSession<SessionData>(
      request,
      res,
      sessionOptions,
    );
    if (!session.isLoggedIn) {
      return NextResponse.json(
        { data: null, error: "Unauthorized" },
        { status: 401 },
      );
    }
    return res;
  }

  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(
    request,
    res,
    sessionOptions,
  );

  if (!session.isLoggedIn) {
    const login = new URL("/login", request.url);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }

  if (
    session.user?.mustResetPassword &&
    pathname !== "/reset-password" &&
    !pathname.startsWith("/api/auth/reset-password")
  ) {
    return NextResponse.redirect(new URL("/reset-password", request.url));
  }

  if (
    !session.user?.mustResetPassword &&
    pathname === "/reset-password"
  ) {
    return NextResponse.redirect(new URL("/select-company", request.url));
  }

  const permissions = session.user?.permissions;
  const role = session.user?.role;

  if (
    isManagerRole(role) &&
    isManagerBlockedRoute(pathname)
  ) {
    const fallback = getDefaultLandingRoute(permissions, role);
    return NextResponse.redirect(new URL(fallback, request.url));
  }

  if (isDashboardRoute(pathname)) {
    if (!canAccessRoute(pathname, permissions, role)) {
      const fallback = getDefaultLandingRoute(permissions, role);
      return NextResponse.redirect(new URL(fallback, request.url));
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
