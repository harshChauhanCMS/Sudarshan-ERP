import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions, type SessionData } from "@/lib/session";
import { verifyMobileToken } from "@/lib/mobile-auth";
import {
  canAccessRoute,
  getDefaultLandingRoute,
  isDashboardRoute,
} from "@/lib/nav-permissions";
import {
  isManagerBlockedRoute,
  isManagerRole,
} from "@/lib/manager-scope-shared";

const PUBLIC_PATHS = ["/login", "/forgot", "/mobile", "/dispatch/track"];
const PUBLIC_API = [
  "/api/auth/login",
  "/api/auth/mobile/login",
  "/api/auth/mobile/forgot-password",
  "/api/auth/forgot",
  "/api/auth/forgot/verify",
  "/api/auth/reset-password",
  "/api/integrations/biometric",
  "/api/dispatch/track",
];

function withCors(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get("origin");
  response.headers.set("Access-Control-Allow-Origin", origin ?? "*");
  response.headers.set("Vary", "Origin");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  // Echo back whatever headers the preflight actually asked for (falls back to
  // a sane default) instead of a fixed list, so ad-hoc headers like ngrok's
  // browser-warning bypass don't get silently rejected.
  const requestedHeaders = request.headers.get("access-control-request-headers");
  response.headers.set(
    "Access-Control-Allow-Headers",
    requestedHeaders || "Content-Type, Authorization",
  );
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/") && request.method === "OPTIONS") {
    return withCors(request, new NextResponse(null, { status: 204 }));
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".webp") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".gif")
  ) {
    return NextResponse.next();
  }

  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return NextResponse.next();
  }

  if (PUBLIC_API.some((p) => pathname === p || pathname.startsWith(p))) {
    return withCors(request, NextResponse.next());
  }

  if (pathname.startsWith("/api/")) {
    const bearer = request.headers.get("authorization");
    const mobileToken = bearer?.startsWith("Bearer ")
      ? bearer.slice(7).trim()
      : "";

    if (mobileToken) {
      try {
        if (await verifyMobileToken(mobileToken)) {
          return withCors(request, NextResponse.next());
        }
      } catch {
        // Edge verify can fail if SESSION_SECRET is unavailable — route verifies in Node
      }
      // Mobile Bearer present: reach API route; getUserFromRequest validates in Node runtime
      return withCors(request, NextResponse.next());
    }

    const res = NextResponse.next();
    const session = await getIronSession<SessionData>(
      request,
      res,
      getSessionOptions(),
    );
    if (!session.isLoggedIn) {
      return withCors(
        request,
        NextResponse.json(
          { data: null, error: "Unauthorized" },
          { status: 401 },
        ),
      );
    }
    return withCors(request, res);
  }

  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(
    request,
    res,
    getSessionOptions(),
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
