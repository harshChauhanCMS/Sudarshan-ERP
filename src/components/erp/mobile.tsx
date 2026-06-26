// @ts-nocheck
"use client";

import React from "react";
import { Icon } from "./icons";
import { useDATA } from "./data";
import {
  Btn,
  Badge,
  StatusBadge,
  Avatar,
  Bar,
  Sparkline,
  Kpi,
  Modal,
  fmtINR,
  fmtINRFull,
  fmtNum,
} from "./ui";

/* ============================================================
   MOBILE APP SCREENS
   Driver · Field Sales · Employee · Production
   ============================================================ */

/* Reusable mobile chrome */
const Phone = ({ children, label, tint = "#374d95", time = "9:41" }) => (
  <div
    style={{
      width: 360,
      height: 760,
      background: "#000",
      borderRadius: 44,
      padding: 10,
      boxShadow: "0 24px 60px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.08)",
      position: "relative",
    }}
  >
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#fbfbfa",
        borderRadius: 34,
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Status bar */}
      <div
        style={{
          height: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 28px 0 28px",
          fontSize: 14,
          fontWeight: 600,
          fontFamily: "-apple-system, sans-serif",
          flexShrink: 0,
          background: tint === "transparent" ? "transparent" : "var(--bg-elev)",
          color: tint === "dark" ? "#fff" : "#000",
        }}
      >
        <span>{time}</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <svg width="16" height="10" viewBox="0 0 16 10">
            <path
              fill="currentColor"
              d="M1 7h2v3H1zM5 5h2v5H5zM9 3h2v7H9zM13 1h2v9h-2z"
            />
          </svg>
          <svg width="14" height="10" viewBox="0 0 14 10">
            <path
              fill="currentColor"
              d="M7 2.5a5.4 5.4 0 014 1.7l.9-.9A6.7 6.7 0 007 1a6.7 6.7 0 00-4.9 2.3l.9.9A5.4 5.4 0 017 2.5zm0 2.5a3 3 0 012.3 1l.9-.9A4.3 4.3 0 007 4.2a4.3 4.3 0 00-3.2 1.4l.9.9A3 3 0 017 5zm0 2a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"
            />
          </svg>
          <svg width="22" height="11" viewBox="0 0 22 11">
            <rect
              x="0.5"
              y="0.5"
              width="19"
              height="10"
              rx="3"
              fill="none"
              stroke="currentColor"
              opacity="0.4"
            />
            <rect
              x="2"
              y="2"
              width="14"
              height="7"
              rx="1.5"
              fill="currentColor"
            />
            <rect
              x="20"
              y="3.5"
              width="1.2"
              height="4"
              rx="0.5"
              fill="currentColor"
              opacity="0.4"
            />
          </svg>
        </div>
      </div>
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {children}
      </div>
      {/* Home indicator */}
      <div
        style={{
          position: "absolute",
          bottom: 6,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: 120,
            height: 4,
            borderRadius: 3,
            background: "rgba(0,0,0,0.4)",
          }}
        ></div>
      </div>
      {/* Notch */}
      <div
        style={{
          position: "absolute",
          top: 8,
          left: "50%",
          transform: "translateX(-50%)",
          width: 110,
          height: 30,
          background: "#000",
          borderRadius: 18,
          zIndex: 30,
        }}
      ></div>
    </div>
  </div>
);

/* ============================================================
   1. DRIVER APP — Active dispatch tracking + delivery confirm
   ============================================================ */
const DriverApp = () => {
  const DATA = useDATA();
  const dsp = DATA.DISPATCHES[0]; // DSP-1042
  return (
    <Phone tint="dark" time="11:48">
      <div style={{ flex: 1, overflow: "auto", paddingBottom: 100 }}>
        {/* Header — dark */}
        <div
          style={{
            background:
              "linear-gradient(160deg, #2c3e7c 0%, #374d95 60%, #4862b3 100%)",
            color: "white",
            padding: "16px 20px 28px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(300px 200px at 100% 0%, rgba(232,169,1,0.2), transparent 60%)",
              pointerEvents: "none",
            }}
          ></div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
              position: "relative",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.16)",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: 14,
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                R
              </div>
              <div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>Driver</div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Ramesh Kumar
                </div>
              </div>
            </div>
            <button
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: "none",
                background: "rgba(255,255,255,0.12)",
                color: "white",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Icon name="bell" size={15} />
              <span
                style={{
                  position: "absolute",
                  marginLeft: 16,
                  marginTop: -12,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: "#e8a901",
                }}
              ></span>
            </button>
          </div>

          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 4 }}>
              ACTIVE DISPATCH
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                marginBottom: 4,
              }}
            >
              {dsp.id}
            </div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>
              {dsp.vehicle} · {dsp.loaded}
            </div>
          </div>
        </div>

        {/* Status card (overlapping) */}
        <div style={{ padding: "0 16px", marginTop: -16 }}>
          <div
            style={{
              background: "white",
              borderRadius: 14,
              padding: 16,
              boxShadow:
                "0 8px 24px rgba(14,17,22,0.10), 0 1px 2px rgba(14,17,22,0.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "var(--info-soft)",
                  color: "var(--info)",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                <span
                  className="dot pulse"
                  style={{ background: "var(--info)" }}
                ></span>
                IN TRANSIT
              </span>
              <span style={{ fontSize: 11, color: "var(--fg-subtle)" }}>
                {dsp.lastUpdate}
              </span>
            </div>

            {/* Route */}
            <div style={{ display: "flex", gap: 12 }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  paddingTop: 4,
                }}
              >
                <span
                  className="dot success"
                  style={{ width: 10, height: 10 }}
                ></span>
                <div
                  style={{
                    width: 2,
                    flex: 1,
                    background: "var(--border-strong)",
                    margin: "4px 0",
                    borderImage:
                      "repeating-linear-gradient(0deg, transparent, transparent 4px, var(--border-strong) 4px, var(--border-strong) 8px) 1",
                  }}
                ></div>
                <span
                  className="dot primary"
                  style={{ width: 10, height: 10 }}
                ></span>
              </div>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
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
                    FROM
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    Plant A · Udaipur
                  </div>
                  <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>
                    Departed May 21, 06:42
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
                    TO
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {dsp.customer}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>
                    ETA {dsp.eta}
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                height: 1,
                background: "var(--border)",
                margin: "16px 0 12px",
              }}
            ></div>

            {/* Progress */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "var(--fg-muted)",
                marginBottom: 6,
              }}
            >
              <span>Journey progress</span>
              <span
                className="mono"
                style={{ fontWeight: 600, color: "var(--primary)" }}
              >
                {dsp.progress}%
              </span>
            </div>
            <div className="bar">
              <span style={{ width: `${dsp.progress}%` }}></span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 10,
                color: "var(--fg-subtle)",
                marginTop: 6,
              }}
            >
              <span>168 km in</span>
              <span>79 km left</span>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div
          style={{
            padding: "16px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          {[
            { i: "pin", l: "Update location", c: "primary" },
            { i: "phone", l: "Call dispatcher", c: "success" },
            { i: "alert", l: "Report issue", c: "danger" },
            { i: "check", l: "Confirm delivery", c: "secondary" },
          ].map((b) => (
            <button
              key={b.l}
              style={{
                padding: 14,
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "white",
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 13,
                fontWeight: 500,
                color: "var(--fg)",
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: `var(--${b.c}-soft)`,
                  color: `var(--${b.c})`,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Icon name={b.i} size={14} />
              </span>
              {b.l}
            </button>
          ))}
        </div>

        {/* Today */}
        <div style={{ padding: "0 16px 16px" }}>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--fg-subtle)",
              fontWeight: 600,
              margin: "8px 0",
            }}
          >
            TODAY · MAY 21
          </div>
          {[
            {
              id: "DSP-1042",
              time: "06:42",
              route: "Udaipur → Mumbai",
              status: "in-transit",
            },
            {
              id: "DSP-1031",
              time: "Yesterday",
              route: "Udaipur → Surat",
              status: "completed",
            },
          ].map((t) => (
            <div
              key={t.id}
              style={{
                background: "white",
                borderRadius: 10,
                padding: 12,
                marginBottom: 8,
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  flexShrink: 0,
                  background:
                    t.status === "completed"
                      ? "var(--success-soft)"
                      : "var(--info-soft)",
                  color:
                    t.status === "completed" ? "var(--success)" : "var(--info)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Icon
                  name={t.status === "completed" ? "check" : "truck"}
                  size={16}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="mono" style={{ fontSize: 12, fontWeight: 600 }}>
                  {t.id}
                </div>
                <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>
                  {t.route}
                </div>
              </div>
              <div style={{ fontSize: 11, color: "var(--fg-subtle)" }}>
                {t.time}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom tab bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: "rgba(255,255,255,0.94)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid var(--border)",
          padding: "8px 16px 28px",
          display: "flex",
          justifyContent: "space-around",
        }}
      >
        {[
          { i: "truck", l: "Trips", active: true },
          { i: "map", l: "Map" },
          { i: "calendar", l: "Schedule" },
          { i: "user", l: "Profile" },
        ].map((t) => (
          <div
            key={t.l}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              color: t.active ? "var(--primary)" : "var(--fg-subtle)",
              fontSize: 10,
              fontWeight: 500,
            }}
          >
            <Icon name={t.i} size={20} />
            {t.l}
          </div>
        ))}
      </div>
    </Phone>
  );
};

/* ============================================================
   2. FIELD SALES APP — Beat tracking, check-in
   ============================================================ */
const FieldSalesApp = () => (
  <Phone tint="light" time="11:48">
    <div style={{ flex: 1, overflow: "auto", paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ padding: "12px 20px 8px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
              Good morning,
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: "-0.02em",
              }}
            >
              Karan Singh
            </div>
          </div>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "linear-gradient(135deg, #efe3c8, #c8a04f)",
              color: "#7a5500",
              display: "grid",
              placeItems: "center",
              fontWeight: 700,
            }}
          >
            KS
          </div>
        </div>

        {/* Today's stats card */}
        <div
          style={{
            background: "linear-gradient(135deg, #374d95 0%, #4862b3 100%)",
            color: "white",
            padding: 16,
            borderRadius: 16,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(200px 140px at 100% 0%, rgba(232,169,1,0.22), transparent 60%)",
              pointerEvents: "none",
            }}
          ></div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
              position: "relative",
            }}
          >
            <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 500 }}>
              TODAY · MUMBAI BEAT
            </div>
            <Icon name="map" size={14} />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
              position: "relative",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 24,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                }}
              >
                3
                <span style={{ fontSize: 12, opacity: 0.6, fontWeight: 400 }}>
                  /8
                </span>
              </div>
              <div style={{ fontSize: 11, opacity: 0.75 }}>Visits done</div>
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 24,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                }}
              >
                ₹4.2L
              </div>
              <div style={{ fontSize: 11, opacity: 0.75 }}>Quoted</div>
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 24,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  color: "#f5c249",
                }}
              >
                2
              </div>
              <div style={{ fontSize: 11, opacity: 0.75 }}>Orders won</div>
            </div>
          </div>
        </div>
      </div>

      {/* Current check-in */}
      <div style={{ padding: "12px 16px 0" }}>
        <div
          style={{
            background: "white",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 14,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: "var(--secondary)",
            }}
          ></div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 9px",
                borderRadius: 999,
                background: "var(--secondary-soft)",
                color: "var(--warning)",
                fontSize: 10,
                fontWeight: 600,
              }}
            >
              <span
                className="dot pulse"
                style={{ background: "var(--secondary)" }}
              ></span>
              CHECKED IN · 23 MIN
            </span>
            <Icon name="more" size={14} className="subtle" />
          </div>
          <div
            style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}
          >
            Pidilite Industries Andheri
          </div>
          <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>
            Andheri East, Mumbai · Mr. Kulkarni (Procurement)
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Btn variant="default" size="sm" icon="fileText" className="grow">
              Log meeting
            </Btn>
            <Btn variant="primary" size="sm" icon="check" className="grow">
              Check out
            </Btn>
          </div>
        </div>
      </div>

      {/* Beat plan */}
      <div style={{ padding: "16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--fg-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            BEAT PLAN · TODAY
          </div>
          <span style={{ fontSize: 11, color: "var(--fg-subtle)" }}>
            5 left
          </span>
        </div>
        {[
          { name: "Asian Paints HO", loc: "Worli", t: "10:45", status: "done" },
          {
            name: "Pidilite Andheri",
            loc: "Andheri E",
            t: "Now",
            status: "active",
          },
          {
            name: "Berger Paints West",
            loc: "BKC",
            t: "13:30",
            status: "next",
          },
          { name: "Akzo Nobel Lab", loc: "Powai", t: "15:00", status: "next" },
          {
            name: "Kansai Nerolac",
            loc: "Lower Parel",
            t: "16:30",
            status: "next",
          },
        ].map((v) => (
          <div
            key={v.name}
            style={{
              background: "white",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 10,
              marginBottom: 6,
              display: "flex",
              alignItems: "center",
              gap: 12,
              ...(v.status === "active" && {
                borderColor: "var(--secondary)",
                background: "var(--secondary-soft)",
              }),
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                flexShrink: 0,
                display: "grid",
                placeItems: "center",
                background:
                  v.status === "done"
                    ? "var(--success-soft)"
                    : v.status === "active"
                      ? "white"
                      : "var(--bg-sunken)",
                color:
                  v.status === "done"
                    ? "var(--success)"
                    : v.status === "active"
                      ? "var(--secondary)"
                      : "var(--fg-muted)",
                border:
                  v.status === "active" ? "1px solid var(--secondary)" : "none",
              }}
            >
              {v.status === "done" ? (
                <Icon name="check" size={14} />
              ) : v.status === "active" ? (
                <Icon name="pin" size={14} />
              ) : (
                <Icon name="clock" size={14} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{v.name}</div>
              <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>
                {v.loc}
              </div>
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "var(--font-mono)",
                color:
                  v.status === "done"
                    ? "var(--fg-subtle)"
                    : v.status === "active"
                      ? "var(--warning)"
                      : "var(--fg-muted)",
              }}
            >
              {v.t}
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Bottom tab bar */}
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        background: "rgba(255,255,255,0.94)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid var(--border)",
        padding: "8px 12px 28px",
        display: "flex",
        justifyContent: "space-around",
      }}
    >
      {[
        { i: "home", l: "Today", active: true },
        { i: "map", l: "Map" },
        { i: "users", l: "Customers" },
        { i: "chart", l: "Stats" },
      ].map((t) => (
        <div
          key={t.l}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            color: t.active ? "var(--primary)" : "var(--fg-subtle)",
            fontSize: 10,
            fontWeight: 500,
          }}
        >
          <Icon name={t.i} size={20} />
          {t.l}
        </div>
      ))}
    </div>
  </Phone>
);

/* ============================================================
   3. EMPLOYEE APP — Attendance, leave, payslip
   ============================================================ */
const EmployeeApp = () => (
  <Phone tint="light" time="9:14">
    <div style={{ flex: 1, overflow: "auto", paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ padding: "12px 20px 16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "var(--primary)",
                color: "white",
                display: "grid",
                placeItems: "center",
                fontWeight: 700,
                fontFamily: "var(--font-display)",
                letterSpacing: "-0.02em",
              }}
            >
              NI
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>
                E-2018 · HR Department
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                }}
              >
                Neha Iyer
              </div>
            </div>
          </div>
          <Icon name="bell" size={18} className="subtle" />
        </div>

        {/* Check-in card */}
        <div
          style={{
            background: "white",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--fg-subtle)",
                fontWeight: 600,
              }}
            >
              TODAY · THU, 21 MAY
            </div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "2px 7px",
                borderRadius: 999,
                background: "var(--success-soft)",
                color: "var(--success)",
                fontSize: 10,
                fontWeight: 600,
              }}
            >
              <span
                className="dot"
                style={{ background: "var(--success)", width: 5, height: 5 }}
              ></span>
              ON-TIME
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <div>
              <div style={{ fontSize: 10, color: "var(--fg-subtle)" }}>
                CHECK-IN
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 20,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                }}
              >
                09:02
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "var(--fg-subtle)" }}>
                CHECK-OUT
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 20,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  color: "var(--fg-faint)",
                }}
              >
                —:—
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "var(--fg-subtle)" }}>
                WORKED
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 20,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  color: "var(--primary)",
                }}
              >
                2h 12m
              </div>
            </div>
          </div>
          <button
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
              background: "var(--fg)",
              color: "white",
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Icon name="check" size={15} /> Check out
          </button>
        </div>
      </div>

      {/* Quick links */}
      <div
        style={{
          padding: "0 16px 12px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 8,
        }}
      >
        {[
          { i: "calendar", l: "Leave", c: "primary" },
          { i: "money", l: "Payslip", c: "success" },
          { i: "clock", l: "Timesheet", c: "info" },
          { i: "fileText", l: "Documents", c: "default" },
        ].map((q) => (
          <button
            key={q.l}
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "white",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: "var(--fg)",
              fontWeight: 500,
            }}
          >
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background:
                  q.c === "default" ? "var(--bg-sunken)" : `var(--${q.c}-soft)`,
                color: q.c === "default" ? "var(--fg-muted)" : `var(--${q.c})`,
                display: "grid",
                placeItems: "center",
              }}
            >
              <Icon name={q.i} size={15} />
            </span>
            {q.l}
          </button>
        ))}
      </div>

      {/* This month */}
      <div style={{ padding: "0 16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--fg-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            THIS MONTH
          </div>
          <span
            style={{ fontSize: 11, color: "var(--primary)", fontWeight: 500 }}
          >
            View all
          </span>
        </div>
        <div
          style={{
            background: "white",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
          >
            <div>
              <div style={{ fontSize: 11, color: "var(--fg-subtle)" }}>
                Days present
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  fontFamily: "var(--font-display)",
                  letterSpacing: "-0.02em",
                }}
              >
                18
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--fg-subtle)",
                    fontWeight: 400,
                  }}
                >
                  /21
                </span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--fg-subtle)" }}>
                Late check-ins
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  fontFamily: "var(--font-display)",
                  letterSpacing: "-0.02em",
                  color: "var(--warning)",
                }}
              >
                2
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--fg-subtle)" }}>
                Leave used
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  fontFamily: "var(--font-display)",
                  letterSpacing: "-0.02em",
                }}
              >
                1.5
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--fg-subtle)",
                    fontWeight: 400,
                  }}
                >
                  /8 d
                </span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--fg-subtle)" }}>
                Overtime
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  fontFamily: "var(--font-display)",
                  letterSpacing: "-0.02em",
                  color: "var(--success)",
                }}
              >
                4.2 h
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--fg-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            marginBottom: 8,
          }}
        >
          LATEST PAYSLIP
        </div>
        <div
          style={{
            background: "var(--fg)",
            color: "white",
            borderRadius: 14,
            padding: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 11, opacity: 0.7 }}>APRIL 2026</div>
            <Icon name="download" size={14} style={{ opacity: 0.7 }} />
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: "-0.025em",
              marginBottom: 4,
            }}
          >
            ₹68,450
          </div>
          <div style={{ fontSize: 11, opacity: 0.65 }}>
            Net pay · Credited Apr 30 · HDFC ••3382
          </div>
        </div>
      </div>
    </div>

    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        background: "rgba(255,255,255,0.94)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid var(--border)",
        padding: "8px 12px 28px",
        display: "flex",
        justifyContent: "space-around",
      }}
    >
      {[
        { i: "home", l: "Home", active: true },
        { i: "calendar", l: "Leave" },
        { i: "money", l: "Pay" },
        { i: "user", l: "Profile" },
      ].map((t) => (
        <div
          key={t.l}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            color: t.active ? "var(--primary)" : "var(--fg-subtle)",
            fontSize: 10,
            fontWeight: 500,
          }}
        >
          <Icon name={t.i} size={20} />
          {t.l}
        </div>
      ))}
    </div>
  </Phone>
);

/* ============================================================
   4. PRODUCTION FLOOR APP — Order status, batch logging
   ============================================================ */
const ProductionApp = () => (
  <Phone tint="light" time="14:22">
    <div style={{ flex: 1, overflow: "auto", paddingBottom: 90 }}>
      <div style={{ padding: "12px 20px 12px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>
              Plant A · Shift B
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 20,
                fontWeight: 600,
                letterSpacing: "-0.02em",
              }}
            >
              Line L1 · Talc Mill A
            </div>
          </div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              borderRadius: 999,
              background: "var(--success-soft)",
              color: "var(--success)",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            <span
              className="dot pulse"
              style={{ background: "var(--success)" }}
            ></span>
            RUNNING
          </span>
        </div>

        {/* Active batch */}
        <div
          style={{
            background: "linear-gradient(135deg, var(--primary-soft), white)",
            border: "1px solid var(--primary-soft-2)",
            borderRadius: 16,
            padding: 16,
          }}
        >
          <div
            style={{ fontSize: 11, color: "var(--fg-muted)", marginBottom: 4 }}
          >
            ACTIVE BATCH
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              marginBottom: 10,
              color: "var(--primary)",
            }}
          >
            B-4471
          </div>
          <div style={{ fontSize: 13, marginBottom: 12 }}>
            <strong>Talcum Powder · 600 mesh</strong>
            <span style={{ color: "var(--fg-muted)" }}>
              {" "}
              · for Asian Paints SO-2026-0421
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "var(--fg-muted)",
              marginBottom: 6,
            }}
          >
            <span>Progress</span>
            <span>
              <span
                className="mono"
                style={{ fontWeight: 600, color: "var(--primary)" }}
              >
                15.6 / 24 MT
              </span>{" "}
              · <span style={{ fontWeight: 600 }}>65%</span>
            </span>
          </div>
          <div className="bar">
            <span style={{ width: "65%" }}></span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
              marginTop: 14,
            }}
          >
            <div>
              <div style={{ fontSize: 10, color: "var(--fg-subtle)" }}>
                STARTED
              </div>
              <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>
                08:14
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "var(--fg-subtle)" }}>ETA</div>
              <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>
                16:30
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "var(--fg-subtle)" }}>
                OPERATOR
              </div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>S. Patel</div>
            </div>
          </div>
        </div>
      </div>

      {/* Live metrics */}
      <div style={{ padding: "0 16px" }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--fg-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            margin: "12px 0 8px",
          }}
        >
          LIVE METRICS
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
        >
          {[
            { l: "Throughput", v: "2.4", u: "MT/hr", trend: "+4%", up: true },
            { l: "Energy", v: "184", u: "kWh", trend: "−2%", up: true },
            { l: "Moisture", v: "0.42", u: "%", trend: "OK", up: true },
            { l: "Mesh QC", v: "98.6", u: "%", trend: "Pass", up: true },
          ].map((m) => (
            <div
              key={m.l}
              style={{
                background: "white",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: "var(--fg-subtle)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  fontWeight: 500,
                }}
              >
                {m.l}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 4,
                  marginTop: 2,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 22,
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {m.v}
                </span>
                <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>
                  {m.u}
                </span>
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--success)",
                  fontWeight: 500,
                  marginTop: 2,
                }}
              >
                {m.trend}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: "16px" }}>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
        >
          <button
            style={{
              padding: "14px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "white",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13,
              fontWeight: 500,
              color: "var(--fg)",
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "var(--info-soft)",
                color: "var(--info)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Icon name="fileText" size={14} />
            </span>
            Log entry
          </button>
          <button
            style={{
              padding: "14px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "white",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13,
              fontWeight: 500,
              color: "var(--fg)",
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "var(--warning-soft)",
                color: "var(--warning)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Icon name="pause" size={13} />
            </span>
            Pause
          </button>
          <button
            style={{
              padding: "14px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "white",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13,
              fontWeight: 500,
              color: "var(--fg)",
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "var(--danger-soft)",
                color: "var(--danger)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Icon name="alert" size={14} />
            </span>
            Report issue
          </button>
          <button
            style={{
              padding: "14px",
              borderRadius: 12,
              background: "var(--fg)",
              color: "white",
              border: "none",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <Icon name="check" size={14} />
            Complete batch
          </button>
        </div>
      </div>

      {/* Queue */}
      <div style={{ padding: "0 16px 8px" }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--fg-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            marginBottom: 8,
          }}
        >
          QUEUE · NEXT BATCHES
        </div>
        {[
          {
            id: "B-4477",
            prod: "Talc · 800 mesh",
            qty: "18 MT",
            eta: "Tomorrow 06:00",
          },
          {
            id: "B-4478",
            prod: "Talc · 600 mesh",
            qty: "32 MT",
            eta: "Tomorrow 12:00",
          },
        ].map((b) => (
          <div
            key={b.id}
            style={{
              background: "white",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 10,
              marginBottom: 6,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Icon name="clock" size={14} className="subtle" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }} className="mono">
                {b.id}
              </div>
              <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>
                {b.prod} · {b.qty}
              </div>
            </div>
            <div style={{ fontSize: 10, color: "var(--fg-subtle)" }}>
              {b.eta}
            </div>
          </div>
        ))}
      </div>
    </div>

    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        background: "rgba(255,255,255,0.94)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid var(--border)",
        padding: "8px 12px 28px",
        display: "flex",
        justifyContent: "space-around",
      }}
    >
      {[
        { i: "factory", l: "Line", active: true },
        { i: "layers", l: "Queue" },
        { i: "chart", l: "Reports" },
        { i: "user", l: "Profile" },
      ].map((t) => (
        <div
          key={t.l}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            color: t.active ? "var(--primary)" : "var(--fg-subtle)",
            fontSize: 10,
            fontWeight: 500,
          }}
        >
          <Icon name={t.i} size={20} />
          {t.l}
        </div>
      ))}
    </div>
  </Phone>
);

export { DriverApp, FieldSalesApp, EmployeeApp, ProductionApp, Phone };
