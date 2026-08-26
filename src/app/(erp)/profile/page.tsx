"use client";

import { useEffect, useState } from "react";
import { useSessionUser } from "@/hooks/use-session-user";
import { Btn } from "@/components/erp/ui";
import { Icon } from "@/components/erp/icons";

type EmployeeMe = {
  employeeId: string;
  fullName: string;
  department?: string;
  primaryContact?: string;
  officialEmail?: string;
  personalEmail?: string;
  primaryShift?: string;
};

export default function ProfilePage() {
  const { user, loading } = useSessionUser();
  const [employee, setEmployee] = useState<EmployeeMe | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch("/api/hrms/employees/me")
      .then((r) => r.json())
      .then((j) => {
        if (j.data) setEmployee(j.data);
      })
      .catch(() => {});
  }, [user]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--fg-muted)" }}>
        Loading profile...
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--fg-muted)" }}>
        <p>No user session found. Please log in.</p>
        <Btn variant="primary" onClick={() => window.location.href = "/login"}>Go to Login</Btn>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 32px", maxWidth: 900, margin: "0 auto" }}>
      <div className="page-head" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">My Profile</h1>
          <div className="page-sub">Manage your account settings and preferences</div>
        </div>
        <div className="page-head-actions">
          <Btn variant="danger" icon="logout" onClick={handleLogout}>
            Logout
          </Btn>
        </div>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: "32px 40px" }}>
          
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 24, 
            marginBottom: 32, 
            paddingBottom: 32, 
            borderBottom: "1px solid var(--border)" 
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "var(--primary-soft)", color: "var(--primary)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 32, fontWeight: 700, fontFamily: "var(--font-display)",
              flexShrink: 0
            }}>
              {user.name ? user.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() : "U"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontFamily: "var(--font-display)", 
                fontSize: 28, 
                fontWeight: 600, 
                letterSpacing: "-0.01em",
                color: "var(--fg)", 
                lineHeight: 1.2,
                marginBottom: 6 
              }}>
                {user.name || "—"}
              </div>
              <div style={{ 
                fontSize: 14, 
                color: "var(--fg-subtle)", 
                textTransform: "capitalize",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}>
                <Icon name="user" size={13} /> {employee?.department || user.role || "—"}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px 24px" }}>
            <div>
              <div style={{ 
                fontSize: 11, fontWeight: 600, color: "var(--fg-muted)", 
                textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 
              }}>
                Full Name
              </div>
              <div style={{ fontSize: 14, color: "var(--fg)", fontWeight: 500 }}>
                {user.name || "—"}
              </div>
            </div>

            <div>
              <div style={{
                fontSize: 11, fontWeight: 600, color: "var(--fg-muted)",
                textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6
              }}>
                Email Address
              </div>
              <div style={{ fontSize: 14, color: "var(--fg)", fontWeight: 500 }}>
                {employee?.officialEmail || user.email || "—"}
              </div>
            </div>

            <div>
              <div style={{
                fontSize: 11, fontWeight: 600, color: "var(--fg-muted)",
                textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6
              }}>
                Employee ID
              </div>
              <div style={{ fontSize: 14, color: "var(--fg)", fontWeight: 500 }}>
                {employee?.employeeId || user.employeeId || "—"}
              </div>
            </div>

            <div>
              <div style={{
                fontSize: 11, fontWeight: 600, color: "var(--fg-muted)",
                textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6
              }}>
                Phone Number
              </div>
              <div style={{ fontSize: 14, color: "var(--fg)", fontWeight: 500 }}>
                {employee?.primaryContact || "—"}
              </div>
            </div>

            <div>
              <div style={{
                fontSize: 11, fontWeight: 600, color: "var(--fg-muted)",
                textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6
              }}>
                Shift
              </div>
              <div style={{ fontSize: 14, color: "var(--fg)", fontWeight: 500 }}>
                {employee?.primaryShift || "—"}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
