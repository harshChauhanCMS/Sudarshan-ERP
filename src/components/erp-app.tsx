// @ts-nocheck
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { message } from "antd";
import { ErpDataProvider, useErpData } from "@/context/erp-data-provider";
import type { ErpData } from "@/lib/seed-data";
import { Login, Forgot, CompanySelect, ResetPassword } from "@/components/erp/auth";
import { Sidebar, Topbar } from "@/components/layout";
import { renderErpRoute } from "@/components/erp/render-route";
import { ERP_ROUTES, pathToRoute } from "@/lib/erp-routes";
import {
  canAccessRoute,
  getDefaultLandingRoute,
} from "@/lib/nav-permissions";
import type { PermissionsMap } from "@/lib/permission-types";
import { PageShell } from "@/components/layout/page-shell";
import { sidebarBadges } from "@/lib/erp-stats";
import {
  GROUP_BRAND_TOAST_MESSAGE,
  isGroupBrandRoute,
} from "@/lib/group-brand-routes";

type Company = ErpData["COMPANIES"][number] & { group?: boolean };

function ErpAppInner({ segments, children }: { segments?: string[], children?: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data, meta, loading, error } = useErpData();
  const badgeMap = useMemo(() => sidebarBadges(data), [data]);
  const route =
    pathname === "/login" ||
    pathname === "/forgot" ||
    pathname === "/select-company" ||
    pathname === "/reset-password"
      ? pathname
      : pathname.startsWith("/hrms/") ||
          (ERP_ROUTES as readonly string[]).includes(pathname)
        ? pathname
        : pathToRoute(
            segments ?? pathname.replace(/^\//, "").split("/").filter(Boolean)
          );
  const [company, setCompany] = useState<Company | null>(null);
  const [notifUnreadCount, setNotifUnreadCount] = useState(0);
  const [sessionUser, setSessionUser] = useState<{
    email: string;
    name: string;
    role: string;
    employeeId?: string;
    permissions?: PermissionsMap;
    mustResetPassword?: boolean;
  } | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(248);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const prevRouteRef = useRef<string | null>(null);
  const notifInFlightRef = useRef(false);

  const navigate = useCallback((path: string) => {
    router.push(path.startsWith("/") ? path : `/${path}`);
  }, [router]);

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
    setMobileSidebarOpen(false);
  }, [navigate]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobileViewport(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileSidebarOpen) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileSidebarOpen]);

  const loadNotificationBadge = useCallback(() => {
    if (!sessionUser?.email || notifInFlightRef.current) return;
    notifInFlightRef.current = true;
    fetch("/api/notifications?limit=1")
      .then((r) => r.json())
      .then((j) => {
        if (j.data) setNotifUnreadCount(j.data.unreadCount ?? 0);
      })
      .catch(() => {})
      .finally(() => {
        notifInFlightRef.current = false;
      });
  }, [sessionUser?.email]);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((j) => {
        if (j.data?.user) setSessionUser(j.data.user);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!sessionUser?.email) return;
    loadNotificationBadge();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") loadNotificationBadge();
    }, 60000);
    return () => clearInterval(timer);
  }, [sessionUser?.email, loadNotificationBadge]);

  useEffect(() => {
    if (route === "/hrms/notifications" && sessionUser?.email) {
      loadNotificationBadge();
    }
  }, [route, sessionUser?.email, loadNotificationBadge]);

  useEffect(() => {
    const authedRoute = !["/login", "/select-company", "/forgot"].includes(route);
    if (authedRoute && !company && data.COMPANIES[0]) {
      setCompany(data.COMPANIES[0]);
    }
  }, [route, company, data.COMPANIES]);

  useEffect(() => {
    if (sessionUser?.mustResetPassword && route !== "/reset-password") {
      navigate("/reset-password");
      return;
    }
  }, [sessionUser?.mustResetPassword, route, navigate]);

  useEffect(() => {
    if (!sessionUser?.permissions) return;
    if (["/login", "/select-company", "/forgot", "/reset-password"].includes(route)) return;
    if (canAccessRoute(route, sessionUser.permissions, sessionUser.role)) return;
    const fallback = getDefaultLandingRoute(
      sessionUser.permissions,
      sessionUser.role
    );
    if (fallback !== route) {
      message.warning("You do not have access to that page.");
      navigate(fallback);
    }
  }, [route, sessionUser, navigate]);

  useEffect(() => {
    if (["/login", "/select-company", "/forgot"].includes(route)) {
      prevRouteRef.current = route;
      return;
    }
    if (data.COMPANIES.length < 2) {
      prevRouteRef.current = route;
      return;
    }

    const prev = prevRouteRef.current;
    const enteringGroup =
      isGroupBrandRoute(route) && !isGroupBrandRoute(prev ?? "");

    prevRouteRef.current = route;

    if (enteringGroup) {
      message.info(GROUP_BRAND_TOAST_MESSAGE, 4);
    }
  }, [route, data.COMPANIES.length]);

  const handleLogin = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    if (json.data?.user) setSessionUser(json.data.user);
    navigate(json.data?.next ?? "/select-company");
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setSessionUser(null);
    setCompany(null);
    navigate("/login");
  };

  if (route === "/login" || pathname === "/login") {
    return (
      <Login
        userEmail={sessionUser?.email}
        onLogin={handleLogin}
        onForgot={() => navigate("/forgot")}
      />
    );
  }
  if (route === "/forgot" || pathname === "/forgot") {
    return (
      <Forgot
        onBack={() => navigate("/login")}
        onComplete={(msg) => {
          message.success(
            msg || "Password updated. Sign in with your new password.",
          );
          navigate("/login");
        }}
      />
    );
  }
  if (route === "/reset-password" || pathname === "/reset-password") {
    return (
      <ResetPassword
        userEmail={sessionUser?.email}
        userName={sessionUser?.name}
        onComplete={(next) => {
          setSessionUser((prev) =>
            prev ? { ...prev, mustResetPassword: false } : prev
          );
          message.success("Password updated successfully.");
          navigate(next ?? "/select-company");
        }}
        onLogout={handleLogout}
      />
    );
  }
  if (route === "/select-company" || pathname === "/select-company") {
    return (
      <CompanySelect
        companies={data.COMPANIES}
        dataWarning={meta?.warning}
        userEmail={sessionUser?.email}
        onSelect={(c) => {
          setCompany(c);
          navigate(
            getDefaultLandingRoute(
              sessionUser?.permissions,
              sessionUser?.role
            )
          );
        }}
        onLogout={handleLogout}
      />
    );
  }

  const activeCo = company || data.COMPANIES[0];
  if (!activeCo) {
    return (
      <PageShell loading={loading} error={error} meta={meta}>
        <div style={{ padding: 24, fontSize: 14, color: "var(--fg-muted)" }}>
          No companies in the database. Run <code>npm run seed</code> after setting{" "}
          <code>MONGODB_URI</code>.
        </div>
      </PageShell>
    );
  }

  return (
    <div
      className={`app${mobileSidebarOpen ? " sidebar-mobile-open" : ""}`}
      style={{ "--sidebar-w": isSidebarCollapsed ? "72px" : `${sidebarWidth}px` } as any}
    >
      <div
        className={`sidebar-backdrop${mobileSidebarOpen ? " visible" : ""}`}
        onClick={() => setMobileSidebarOpen(false)}
        aria-hidden={!mobileSidebarOpen}
      />
      <Sidebar
        route={route}
        navigate={handleNavigate}
        company={activeCo}
        companies={data.COMPANIES}
        onCompanyClick={() => {
          navigate("/select-company");
          setMobileSidebarOpen(false);
        }}
        badgeMap={badgeMap}
        sidebarWidth={sidebarWidth}
        setSidebarWidth={setSidebarWidth}
        isCollapsed={isMobileViewport ? false : isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        permissions={sessionUser?.permissions}
        userName={sessionUser?.name}
        userRole={sessionUser?.role}
      />
      <div className="main">
        <Topbar
          route={route}
          onNotifClick={() => navigate("/hrms/notifications")}
          onMobileClick={() => window.open("/mobile", "_blank")}
          onLogout={handleLogout}
          onMenuClick={() => setMobileSidebarOpen((v) => !v)}
          menuOpen={mobileSidebarOpen}
          notifUnreadCount={notifUnreadCount}
        />
        <div className="content">
          <PageShell loading={loading} error={error} meta={meta}>
            {children ? children : renderErpRoute(route, navigate)}
          </PageShell>
        </div>
      </div>
    </div>
  );
}

export function ErpApp({ segments, children }: { segments?: string[], children?: React.ReactNode }) {
  return (
    <ErpDataProvider>
      <ErpAppInner segments={segments}>{children}</ErpAppInner>
    </ErpDataProvider>
  );
}
