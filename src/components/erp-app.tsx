// @ts-nocheck
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { message } from "antd";
import { Login, Forgot, ResetPassword } from "@/components/erp/auth";
import { Sidebar, Topbar } from "@/components/layout";
import { renderErpRoute } from "@/components/erp/render-route";
import { ERP_ROUTES, isLegacyRenderRoute, pathToRoute } from "@/lib/erp-routes";
import {
  canAccessRoute,
  getDefaultLandingRoute,
} from "@/lib/nav-permissions";
import type { PermissionsMap } from "@/lib/permission-types";
import { PageShell } from "@/components/layout/page-shell";
import { sidebarBadges } from "@/lib/erp-stats";
import { usePackaging } from "@/hooks/use-packaging";
import { useCompanies, type Company as CompanyRecord } from "@/hooks/use-companies";
import { useRawMaterials } from "@/hooks/use-raw-materials";
import { usePurchaseOrders } from "@/hooks/use-purchase-orders";
import { useInvoices } from "@/hooks/use-invoices";
import { useOrders } from "@/hooks/use-orders";
import { useDispatches } from "@/hooks/use-dispatches";
import { useSystemStatus } from "@/hooks/use-system-status";
import { ErpDataProvider } from "@/context/erp-data-provider";
import {
  GROUP_BRAND_TOAST_MESSAGE,
  isGroupBrandRoute,
} from "@/lib/group-brand-routes";

type Company = CompanyRecord & { group?: boolean };

function ErpAppInner({ segments, children }: { segments?: string[], children?: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { companies, loading, error } = useCompanies();
  const { items: packagingItems } = usePackaging();
  const { items: rawMaterials } = useRawMaterials();
  const { purchaseOrders } = usePurchaseOrders();
  const { invoices } = useInvoices();
  const { orders } = useOrders();
  const { dispatches } = useDispatches();
  const status = useSystemStatus();
  const isEmpty = companies.length === 0 && orders.length === 0 && rawMaterials.length === 0;
  let warning: string | undefined;
  let warningTone: "mock" | "empty" | "danger" = "danger";
  if (status && !status.dbConfigured && status.mockDataEnabled) {
    warning =
      "MONGODB_URI is not set. Showing demo data (USE_MOCK_DATA=true). Set MONGODB_URI and run npm run seed for real data.";
    warningTone = "mock";
  } else if (status && !status.dbConfigured) {
    warning =
      "MONGODB_URI is not set. No ERP data loaded. Add MONGODB_URI to .env.local and run npm run seed — or set USE_MOCK_DATA=true for demo data only.";
    warningTone = "empty";
  } else if (status?.dbConfigured && isEmpty) {
    warning = "Database has no ERP entities. Run npm run seed to load demo data, or add records via the API.";
    warningTone = "empty";
  }
  const badgeMap = useMemo(
    () =>
      sidebarBadges({
        rawMaterials,
        packagingCount: packagingItems.length,
        purchaseOrders,
        invoices,
        orders,
        dispatches,
      }),
    [rawMaterials, packagingItems, purchaseOrders, invoices, orders, dispatches]
  );
  const route =
    pathname === "/login" ||
    pathname === "/forgot" ||
    pathname === "/reset-password"
      ? pathname
      : pathname.startsWith("/hrms/") ||
          pathname.startsWith("/inventory/") ||
          pathname.startsWith("/procurement/") ||
          pathname.startsWith("/dispatch/") ||
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
  const [sessionDepartment, setSessionDepartment] = useState<string | undefined>(undefined);
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

  const loadSession = useCallback(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((j) => {
        if (j.data?.user) setSessionUser(j.data.user);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Permissions are baked into the session at login and only refreshed by
  // /api/auth/session — without this, a role's permissions can change (e.g.
  // an admin edits it in Role Management) and an already-open tab keeps
  // enforcing the stale snapshot until a hard refresh or re-login.
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") loadSession();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [loadSession]);

  useEffect(() => {
    if (!sessionUser?.email) {
      setSessionDepartment(undefined);
      return;
    }
    fetch("/api/hrms/employees/me")
      .then((r) => r.json())
      .then((j) => {
        if (j.data?.department) setSessionDepartment(j.data.department);
      })
      .catch(() => {});
  }, [sessionUser?.email]);

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
    const authedRoute = !["/login", "/forgot"].includes(route);
    if (authedRoute && !company && companies[0]) {
      setCompany(companies[0]);
    }
  }, [route, company, companies]);

  useEffect(() => {
    if (sessionUser?.mustResetPassword && route !== "/reset-password") {
      navigate("/reset-password");
      return;
    }
  }, [sessionUser?.mustResetPassword, route, navigate]);

  useEffect(() => {
    if (!sessionUser?.permissions) return;
    if (["/login", "/forgot", "/reset-password", "/profile"].includes(route)) return;
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
    if (["/login", "/forgot"].includes(route)) {
      prevRouteRef.current = route;
      return;
    }
    if (companies.length < 2) {
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
  }, [route, companies.length]);

  const handleLogin = async (email: string, password: string) => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword }),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    if (json.data?.user) setSessionUser(json.data.user);
    navigate(json.data?.next ?? "/login");
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
          navigate(next ?? "/login");
        }}
        onLogout={handleLogout}
      />
    );
  }

  const activeCo = company || companies[0];
  if (!activeCo) {
    return (
      <PageShell loading={loading} error={error} warning={warning} warningTone={warningTone} showSeedHint={warningTone === "empty" && Boolean(status?.dbConfigured)}>
        <div style={{ padding: 24, fontSize: 14, color: "var(--fg-muted)" }}>
          No companies in the database. Run <code>npm run seed</code> after setting{" "}
          <code>MONGODB_URI</code>.
        </div>
      </PageShell>
    );
  }

  return (
    <ErpDataProvider>
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
        companies={companies}
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
        userDepartment={sessionDepartment}
      />
      <div className="main">
        <Topbar
          route={route}
          navigate={handleNavigate}
          onNotifClick={() => navigate("/hrms/notifications")}
          onLogout={handleLogout}
          onMenuClick={() => setMobileSidebarOpen((v) => !v)}
          menuOpen={mobileSidebarOpen}
          notifUnreadCount={notifUnreadCount}
        />
        <div className="content">
          <PageShell loading={loading} error={error} warning={warning} warningTone={warningTone} showSeedHint={warningTone === "empty" && Boolean(status?.dbConfigured)}>
            {isLegacyRenderRoute(route) ? renderErpRoute(route, navigate) : children}
          </PageShell>
        </div>
      </div>
    </div>
    </ErpDataProvider>
  );
}

export function ErpApp({ segments, children }: { segments?: string[], children?: React.ReactNode }) {
  return <ErpAppInner segments={segments}>{children}</ErpAppInner>;
}
