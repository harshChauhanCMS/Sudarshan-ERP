import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";

const PUBLIC_PATHS = ["/login", "/forgot", "/mobile"];
const PUBLIC_API = [
  "/api/auth/login",
  "/api/auth/forgot",
  "/api/auth/reset-password",
  "/api/seed",
  "/api/bootstrap",
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

  if (
    PUBLIC_API.some((p) => pathname === p || pathname.startsWith(p)) ||
    pathname.startsWith("/api/design-canvas")
  ) {
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

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
