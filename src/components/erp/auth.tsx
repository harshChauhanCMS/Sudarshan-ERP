// @ts-nocheck
"use client";

import React, { useState } from "react";
import { Icon } from "./icons";
import { useDATA } from "./data";
import { Btn, Badge } from "./ui";

/* ============================================================
   LOGIN  +  COMPANY SELECT  +  FORGOT PASSWORD
   ============================================================ */

const AuthAside = () => (
  <div className="auth-aside">
    <div className="auth-aside-head">
      <img
        src="/sudarshan-group-logo.webp"
        alt="Sudarshan Group Logo"
        style={{ width: 48, height: 48, objectFit: "contain", borderRadius: 8 }}
      />
      <div>
        <div>Sudarshan Group</div>
        <div
          style={{
            fontSize: 11,
            opacity: 0.7,
            fontFamily: "var(--font-sans)",
            fontWeight: 400,
          }}
        >
          Enterprise Resource Planning · v3.2
        </div>
      </div>
    </div>

    <div className="auth-aside-body">
      <div className="auth-aside-quote">
        Minerals, chemicals & industrial packaging —{" "}
        <span className="gold">run on one screen.</span>
      </div>
      <div className="auth-aside-meta">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              background: "#5ed280",
            }}
          ></span>
          All systems operational
        </span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>Last sync 32 s ago</span>
      </div>

      <div className="auth-aside-stat-grid">
        <div className="auth-aside-stat">
          <div className="auth-aside-stat-label">Active Orders</div>
          <div className="auth-aside-stat-value">78</div>
        </div>
        <div className="auth-aside-stat">
          <div className="auth-aside-stat-label">In Transit</div>
          <div className="auth-aside-stat-value">6</div>
        </div>
        <div className="auth-aside-stat">
          <div className="auth-aside-stat-label">Employees</div>
          <div className="auth-aside-stat-value">306</div>
        </div>
      </div>
    </div>
  </div>
);

const Login = ({ onLogin, onForgot, userEmail }) => {
  const [email, setEmail] = useState(userEmail || "rajiv@sudarshan.co.in");
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  return (
    <div className="auth-shell">
      <AuthAside />
      <div className="auth-form-wrap">
        <div className="auth-form">
          <div className="auth-form-head">
            <h1 className="auth-form-title">Sign in</h1>
            <div className="auth-form-sub">
              Welcome back. Continue to the Sudarshan ERP.
            </div>
          </div>

          <div className="field">
            <label className="field-label">Email or employee ID</label>
            <input
              className="input lg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label
              className="field-label"
              style={{ display: "flex", justifyContent: "space-between" }}
            >
              Password
              <a
                onClick={onForgot}
                style={{
                  cursor: "pointer",
                  color: "var(--primary)",
                  fontWeight: 500,
                }}
              >
                Forgot?
              </a>
            </label>
            <div style={{ position: "relative" }}>
              <input
                className="input lg"
                type={showPwd ? "text" : "password"}
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                style={{ paddingRight: 36 }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: 13,
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  color: "var(--fg-subtle)",
                }}
              >
                <Icon name={showPwd ? "eyeOff" : "eye"} size={14} />
              </button>
            </div>
          </div>

          <div className="between">
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                defaultChecked
                style={{ accentColor: "var(--primary)" }}
              />
              Keep me signed in
            </label>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                color: "var(--fg-subtle)",
                fontSize: 11,
              }}
            >
              <Icon name="shield" size={11} /> 256-bit TLS
            </span>
          </div>

          {error && (
            <div
              style={{ fontSize: 12, color: "var(--danger)", marginBottom: 8 }}
            >
              {error}
            </div>
          )}
          <Btn
            variant="primary"
            size="lg"
            className="block"
            onClick={async () => {
              setSubmitting(true);
              setError("");
              try {
                await onLogin(email, pwd || "sudarshan123");
              } catch (e) {
                setError(e?.message || "Sign in failed");
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? "Signing in…" : "Continue"}{" "}
            <Icon name="arrowRight" size={14} />
          </Btn>

          <div className="auth-foot">
            New to Sudarshan? <a>Request an account</a>
          </div>
        </div>
      </div>
    </div>
  );
};

const Forgot = ({ onBack }) => {
  const [sent, setSent] = useState(false);
  return (
    <div className="auth-shell">
      <AuthAside />
      <div className="auth-form-wrap">
        <div className="auth-form">
          <button
            className="btn ghost sm"
            onClick={onBack}
            style={{ marginBottom: 16, marginLeft: -8 }}
          >
            <Icon name="chevLeft" size={13} /> Back to sign in
          </button>
          <div className="auth-form-head">
            <h1 className="auth-form-title">Reset password</h1>
            <div className="auth-form-sub">
              {sent
                ? "We've sent reset instructions. Check your inbox."
                : "Enter your registered email. We'll send a reset link."}
            </div>
          </div>
          {!sent ? (
            <>
              <div className="field">
                <label className="field-label">Registered email</label>
                <input
                  className="input lg"
                  defaultValue="rajiv@sudarshan.co.in"
                />
              </div>
              <Btn
                variant="primary"
                size="lg"
                className="block"
                onClick={() => setSent(true)}
              >
                Send reset link
              </Btn>
            </>
          ) : (
            <>
              <div
                style={{
                  padding: 16,
                  background: "var(--success-soft)",
                  borderRadius: 10,
                  color: "var(--success)",
                  fontSize: 13,
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <Icon name="check" size={16} />
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    Reset link sent
                  </div>
                  <div style={{ color: "var(--fg-muted)" }}>
                    Sent to <strong>rajiv@sudarshan.co.in</strong>. Link expires
                    in 30 minutes.
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 16, textAlign: "center" }}>
                <Btn onClick={onBack} className="block">
                  Back to sign in
                </Btn>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   COMPANY SELECT
   ============================================================ */
const CompanySelect = ({
  onSelect,
  userEmail,
  onLogout,
  companies: companiesProp,
  dataWarning,
}) => {
  const DATA = useDATA();
  const companies = companiesProp ?? DATA.COMPANIES;
  const [hover, setHover] = useState(null);
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "grid",
        placeItems: "center",
        padding: 32,
      }}
    >
      <div style={{ width: "100%", maxWidth: 720 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 32,
          }}
        >
          <div
            className="sb-brand-mark"
            style={{ width: 36, height: 36, fontSize: 15 }}
          >
            S
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: 15,
                letterSpacing: "-0.01em",
              }}
            >
              Sudarshan Group
            </div>
            <div style={{ fontSize: 11, color: "var(--fg-subtle)" }}>
              Signed in as{" "}
              <strong style={{ color: "var(--fg-muted)" }}>
                {userEmail || "rajiv@sudarshan.co.in"}
              </strong>
            </div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <Btn variant="ghost" size="sm" onClick={onLogout}>
              <Icon name="logout" size={13} /> Sign out
            </Btn>
          </div>
        </div>

        {dataWarning ? (
          <div
            style={{
              marginBottom: 20,
              padding: "12px 14px",
              borderRadius: 8,
              border: "1px solid var(--info)",
              background: "var(--bg-sunken)",
              fontSize: 13,
              color: "var(--fg-muted)",
            }}
          >
            {dataWarning}
          </div>
        ) : null}

        <div style={{ marginBottom: 24 }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 32,
              fontWeight: 600,
              letterSpacing: "-0.025em",
              margin: "0 0 6px",
            }}
          >
            Choose a company
          </h1>
          <div style={{ fontSize: 14, color: "var(--fg-muted)" }}>
            You have access to both. Pick where you'd like to work today — you
            can switch any time.
          </div>
        </div>

        <div className="company-grid">
          {companies.length === 0 ? (
            <div
              style={{
                gridColumn: "1 / -1",
                padding: 24,
                border: "1px dashed var(--border-strong)",
                borderRadius: 10,
                fontSize: 14,
                color: "var(--fg-muted)",
              }}
            >
              No companies in the database. Set <code>MONGODB_URI</code> and run{" "}
              <code>npm run seed</code>.
            </div>
          ) : null}
          {companies.map((c) => (
            <button
              key={c.id}
              className={`company-card ${hover === c.id ? "selected" : ""}`}
              onMouseEnter={() => setHover(c.id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelect(c)}
            >
              <div
                style={{ display: "flex", gap: 14, alignItems: "flex-start" }}
              >
                <div className={`company-card-mark ${c.mark}`}>
                  {c.mark === "gold" ? "M" : "S"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="company-card-name">{c.name}</div>
                  <div className="company-card-desc">{c.desc}</div>
                </div>
                <div className="company-card-arrow">
                  <Icon name="arrowRight" size={16} />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 8,
                  paddingTop: 14,
                  borderTop: "1px solid var(--border)",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--fg-subtle)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      fontWeight: 500,
                    }}
                  >
                    Employees
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 15,
                      fontWeight: 600,
                      color: "var(--fg)",
                      marginTop: 2,
                    }}
                  >
                    {c.employees}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--fg-subtle)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      fontWeight: 500,
                    }}
                  >
                    Plants
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 15,
                      fontWeight: 600,
                      color: "var(--fg)",
                      marginTop: 2,
                    }}
                  >
                    {c.sites}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--fg-subtle)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      fontWeight: 500,
                    }}
                  >
                    Open Orders
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 15,
                      fontWeight: 600,
                      color: "var(--fg)",
                      marginTop: 2,
                    }}
                  >
                    {c.activeOrders}
                  </div>
                </div>
              </div>

              <div className="company-card-meta">
                {c.products.slice(0, 4).map((p) => (
                  <Badge key={p}>{p}</Badge>
                ))}
                {c.products.length > 4 && (
                  <Badge>+{c.products.length - 4}</Badge>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* <div
          style={{
            marginTop: 24,
            padding: 14,
            border: "1px dashed var(--border-strong)",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            className="sb-brand-mark"
            style={{ background: "var(--bg-sunken)", color: "var(--fg-muted)" }}
          >
            <Icon name="layers" size={15} />
          </div>
        </div> */}
      </div>
    </div>
  );
};

export { Login, Forgot, CompanySelect };
