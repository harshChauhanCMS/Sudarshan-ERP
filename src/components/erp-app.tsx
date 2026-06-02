// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ErpDataProvider, useErpData } from "@/context/erp-data-provider";
import type { ErpData } from "@/lib/seed-data";
import { Login, Forgot, CompanySelect } from "@/components/erp/auth";
import { Sidebar, Topbar } from "@/components/layout";
import { Btn } from "@/components/ui";
import { Icon } from "@/components/erp/icons";
import { renderErpRoute } from "@/components/erp/render-route";
import { ERP_ROUTES, pathToRoute } from "@/lib/erp-routes";
import { PageShell } from "@/components/layout/page-shell";
import { sidebarBadges } from "@/lib/erp-stats";

type Company = ErpData["COMPANIES"][number] & { group?: boolean };

const NotifsPanel = ({
  open,
  onClose,
  navigate,
}: {
  open: boolean;
  onClose: () => void;
  navigate: (path: string) => void;
}) => {
  const { data } = useErpData();
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60 }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          top: 56,
          right: 16,
          width: 380,
          background: "var(--bg-elev)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          boxShadow: "var(--shadow-pop)",
          maxHeight: "calc(100vh - 80px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "pop 120ms var(--ease-out)",
        }}
      >
        <div
          style={{
            padding: "12px 14px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Notifications
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Btn variant="ghost" size="sm">
              Mark all read
            </Btn>
            <button className="tb-iconbtn" onClick={onClose}>
              <Icon name="x" size={14} />
            </button>
          </div>
        </div>
        <div style={{ overflowY: "auto" }}>
          {data.NOTIFS.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                navigate(n.target);
                onClose();
              }}
              style={{
                padding: "12px 14px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                gap: 10,
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-sunken)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "";
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  flexShrink: 0,
                  display: "grid",
                  placeItems: "center",
                  background:
                    n.type === "alert"
                      ? "var(--danger-soft)"
                      : n.type === "success"
                        ? "var(--success-soft)"
                        : "var(--info-soft)",
                  color:
                    n.type === "alert"
                      ? "var(--danger)"
                      : n.type === "success"
                        ? "var(--success)"
                        : "var(--info)",
                }}
              >
                <Icon
                  name={
                    n.type === "alert"
                      ? "alert"
                      : n.type === "success"
                        ? "check"
                        : "info"
                  }
                  size={14}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: "var(--fg)" }}>{n.text}</div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--fg-subtle)",
                    marginTop: 4,
                  }}
                >
                  {n.time} ago
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

function ErpAppInner({ segments, children }: { segments?: string[], children?: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data, meta, loading, error } = useErpData();
  const badgeMap = useMemo(() => sidebarBadges(data), [data]);
  const route =
    pathname === "/login" ||
    pathname === "/forgot" ||
    pathname === "/select-company"
      ? pathname
      : pathname.startsWith("/hrms/") ||
          (ERP_ROUTES as readonly string[]).includes(pathname)
        ? pathname
        : pathToRoute(
            segments ?? pathname.replace(/^\//, "").split("/").filter(Boolean)
          );
  const [company, setCompany] = useState<Company | null>(null);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [sessionUser, setSessionUser] = useState<{
    email: string;
    name: string;
  } | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(248);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const navigate = (path: string) => {
    router.push(path.startsWith("/") ? path : `/${path}`);
  };

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((j) => {
        if (j.data?.user) setSessionUser(j.data.user);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const authedRoute = !["/login", "/select-company", "/forgot"].includes(route);
    if (authedRoute && !company && data.COMPANIES[0]) {
      setCompany(data.COMPANIES[0]);
    }
  }, [route, company, data.COMPANIES]);

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
    return <Forgot onBack={() => navigate("/login")} />;
  }
  if (route === "/select-company" || pathname === "/select-company") {
    return (
      <CompanySelect
        companies={data.COMPANIES}
        dataWarning={meta?.warning}
        userEmail={sessionUser?.email ?? "rajiv@sudarshan.co.in"}
        onSelect={(c) => {
          setCompany(c);
          navigate("/dashboard/master");
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
    <div className="app" style={{ "--sidebar-w": isSidebarCollapsed ? "72px" : `${sidebarWidth}px` } as any}>
      <Sidebar
        route={route}
        navigate={navigate}
        company={activeCo}
        onCompanyClick={() => navigate("/select-company")}
        badgeMap={badgeMap}
        sidebarWidth={sidebarWidth}
        setSidebarWidth={setSidebarWidth}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      <div className="main">
        <Topbar
          route={route}
          onNotifClick={() => setNotifsOpen((v) => !v)}
          onMobileClick={() => window.open("/mobile", "_blank")}
          onLogout={handleLogout}
        />
        <div className="content">
          <PageShell loading={loading} error={error} meta={meta}>
            {children ? children : renderErpRoute(route, navigate)}
          </PageShell>
        </div>
        <NotifsPanel
          open={notifsOpen}
          onClose={() => setNotifsOpen(false)}
          navigate={navigate}
        />
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
