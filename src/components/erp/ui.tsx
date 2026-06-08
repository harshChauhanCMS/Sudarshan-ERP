// @ts-nocheck
'use client';


import React, { useEffect } from "react";
import { Icon } from "./icons";

/* ============================================================
   SHARED UI PRIMITIVES
   ============================================================ */


const Btn = ({
  variant = "default",
  size,
  icon,
  iconRight,
  children,
  onClick,
  className = "",
  ...rest
}: {
  variant?: string;
  size?: string;
  icon?: string;
  iconRight?: string;
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  className?: string;
  [key: string]: unknown;
}) => {
  const classes = ["btn"];
  if (variant !== "default") classes.push(variant);
  if (size) classes.push(size);
  if (className) classes.push(className);
  return (
    <button className={classes.join(" ")} onClick={onClick} {...rest}>
      {icon && <Icon name={icon} size={size === "sm" ? 13 : 14} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === "sm" ? 13 : 14} />}
    </button>
  );
};

const Badge = ({ tone = "default", dot, children, sq, className = "" }) => {
  const classes = ["badge"];
  if (tone !== "default") classes.push(tone);
  if (dot) classes.push("dot");
  if (sq) classes.push("sq");
  if (className) classes.push(className);
  return (
    <span className={classes.join(" ")}>
      {dot ? <span className="badge-dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const map = {
    "ok":            { tone: "success", label: "In stock" },
    "low":           { tone: "warning", label: "Low" },
    "critical":      { tone: "danger",  label: "Critical" },
    "pending":       { tone: "warning", label: "Pending" },
    "approved":      { tone: "info",    label: "Approved" },
    "received":      { tone: "success", label: "Received" },
    "verified":      { tone: "success", label: "Verified" },
    "mismatch":      { tone: "danger",  label: "Mismatch" },
    "awaiting":      { tone: "warning", label: "Awaiting" },
    "in-production": { tone: "info",    label: "In production" },
    "scheduled":     { tone: "default", label: "Scheduled" },
    "dispatched":    { tone: "primary", label: "Dispatched" },
    "delivered":     { tone: "success", label: "Delivered" },
    "in-transit":    { tone: "info",    label: "In transit" },
    "near-delivery": { tone: "gold",    label: "Near delivery" },
    "loading":       { tone: "warning", label: "Loading" },
    "completed":     { tone: "success", label: "Completed" },
    "in-progress":   { tone: "info",    label: "In progress" },
    "active":        { tone: "success", label: "Active" },
  };
  const m = map[status] || { tone: "default", label: status };
  return <Badge tone={m.tone} dot>{m.label}</Badge>;
};

const Avatar = ({ name, color = 1, size }) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const classes = ["avatar", `c${color}`];
  if (size) classes.push(size);
  return <span className={classes.join(" ")}>{initials}</span>;
};

const Bar = ({ value, max = 100, tone = "primary" }) => (
  <div className={`bar ${tone}`}>
    <span style={{ width: `${Math.min(100, (value / max) * 100)}%` }}></span>
  </div>
);

/* ============================================================
   SPARKLINE (for KPIs)
   ============================================================ */
const Sparkline = ({ values, w = 100, h = 30, color = "var(--primary)", fill = false }) => {
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  const points = values.map((v, i) => `${i * step},${h - ((v - min) / range) * (h - 4) - 2}`).join(" ");
  const area = `0,${h} ${points} ${w},${h}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {fill && <polygon points={area} fill={color} opacity="0.10" />}
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

/* ============================================================
   KPI CARD
   ============================================================ */
const Kpi = ({ icon, label, value, unit, delta, deltaLabel, spark, sparkColor, tone }) => {
  const isUp = delta >= 0;
  return (
    <div className="kpi">
      <div className="kpi-label">
        {icon && <Icon name={icon} size={13} className="ico" />}
        {label}
      </div>
      <div className="kpi-value">
        <span className="tabular">{value}</span>
        {unit && <span className="unit">{unit}</span>}
      </div>
      {delta != null && (
        <div className={`kpi-delta ${isUp ? "up" : "down"}`}>
          <span className="pill">
            <Icon name={isUp ? "arrowUp" : "arrowDown"} size={10} stroke={2} />
            {Math.abs(delta)}%
          </span>
          <span className="vs">{deltaLabel || "vs last week"}</span>
        </div>
      )}
      {spark && (
        <div className="kpi-spark">
          <Sparkline values={spark} w={80} h={26} color={sparkColor || (isUp ? "var(--success)" : "var(--danger)")} fill />
        </div>
      )}
    </div>
  );
};

/* ============================================================
   MODAL
   ============================================================ */
const Modal = ({ open, onClose, title, sub, footer, children, wide }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  if (!open) return null;
  return (
    <div className="modal-mask" onClick={onClose}>
      <div className={`modal ${wide ? "wide" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3 className="modal-title">{title}</h3>
            {sub && <div className="modal-sub">{sub}</div>}
          </div>
          <button className="tb-iconbtn" onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
};

/* ============================================================
   FORMATTERS
   ============================================================ */
const fmtINR = (n) => {
  if (n == null) return "—";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(2)} L`;
  if (n >= 1000)     return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
};
const fmtINRFull = (n) =>
  n == null ? "—" : "₹" + new Intl.NumberFormat("en-IN").format(n);

const fmtNum = (n) => new Intl.NumberFormat("en-IN").format(n);

/* ============================================================
   AREA CHART (simple, no deps)
   ============================================================ */
const AreaChart = ({ data, keys, colors, h = 200, labelKey = "month", showGrid = true, currency = false, stacked = false }) => {
  const w = 600;
  const padL = 36, padR = 12, padT = 16, padB = 24;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const max = stacked
    ? Math.max(...data.map((d) => keys.reduce((s, k) => s + d[k], 0))) * 1.15
    : Math.max(...data.flatMap((d) => keys.map((k) => d[k]))) * 1.15;

  const x = (i) => padL + (i / (data.length - 1)) * innerW;
  const y = (v) => padT + innerH - (v / max) * innerH;

  const ticks = 4;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block" }}>
      {showGrid && [...Array(ticks + 1)].map((_, i) => {
        const yy = padT + (i / ticks) * innerH;
        const v = max * (1 - i / ticks);
        return (
          <g key={i}>
            <line x1={padL} y1={yy} x2={w - padR} y2={yy} stroke="var(--border)" strokeDasharray="2 3" />
            <text x={padL - 6} y={yy + 3} fill="var(--fg-subtle)" fontSize="10" textAnchor="end" fontFamily="var(--font-mono)">
              {currency ? `${Math.round(v)}L` : Math.round(v)}
            </text>
          </g>
        );
      })}
      {keys.map((k, ki) => {
        const c = colors[ki];
        const points = data.map((d, i) => `${x(i)},${y(d[k])}`).join(" ");
        const area = `${padL},${padT + innerH} ${points} ${w - padR},${padT + innerH}`;
        return (
          <g key={k}>
            <polygon points={area} fill={c} opacity="0.10" />
            <polyline points={points} fill="none" stroke={c} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {data.map((d, i) => (
              <circle key={i} cx={x(i)} cy={y(d[k])} r="3" fill="var(--bg-elev)" stroke={c} strokeWidth="1.6" />
            ))}
          </g>
        );
      })}
      {data.map((d, i) => (
        <text
          key={i}
          x={x(i)}
          y={h - 6}
          fill="var(--fg-subtle)"
          fontSize="10"
          textAnchor="middle"
          fontFamily="var(--font-sans)"
        >
          {d[labelKey]}
        </text>
      ))}
    </svg>
  );
};

/* ============================================================
   BAR CHART
   ============================================================ */
const BarChart = ({ data, keys, colors, labelKey = "day", h = 200 }) => {
  const w = 600;
  const padL = 32, padR = 8, padT = 12, padB = 22;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const groups = data.length;
  const barGroupW = innerW / groups;
  const barW = (barGroupW - 14) / keys.length;

  const max = Math.max(...data.flatMap((d) => keys.map((k) => d[k]))) * 1.15;
  const y = (v) => padT + innerH - (v / max) * innerH;
  const ticks = 4;

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      {[...Array(ticks + 1)].map((_, i) => {
        const yy = padT + (i / ticks) * innerH;
        const v = max * (1 - i / ticks);
        return (
          <g key={i}>
            <line x1={padL} y1={yy} x2={w - padR} y2={yy} stroke="var(--border)" strokeDasharray="2 3" />
            <text x={padL - 6} y={yy + 3} fill="var(--fg-subtle)" fontSize="10" textAnchor="end" fontFamily="var(--font-mono)">
              {Math.round(v)}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const gx = padL + i * barGroupW + 7;
        return (
          <g key={i}>
            {keys.map((k, ki) => {
              const yy = y(d[k]);
              const hh = padT + innerH - yy;
              return (
                <rect key={k} x={gx + ki * barW} y={yy} width={barW - 3} height={hh} fill={colors[ki]} rx="2" />
              );
            })}
            <text x={gx + (barGroupW - 14) / 2} y={h - 6} fill="var(--fg-subtle)" fontSize="10" textAnchor="middle">
              {d[labelKey]}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

/* ============================================================
   DONUT
   ============================================================ */
const Donut = ({ value, max = 100, size = 100, stroke = 10, color = "var(--primary)", track = "var(--bg-sunken)", label, sub }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size/2}
          cy={size/2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${c * pct} ${c}`}
          strokeLinecap="round"
        />
      </svg>
      {label != null && (
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          flexDirection: "column", alignItems: "center", justifyContent: "center",
          textAlign: "center", pointerEvents: "none",
        }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--fg)", lineHeight: 1 }}>
            {label}
          </div>
          {sub && <div style={{ fontSize: 10, color: "var(--fg-subtle)", marginTop: 4 }}>{sub}</div>}
        </div>
      )}
    </div>
  );
};

export { Btn, Badge, StatusBadge, Avatar, Bar, Sparkline, Kpi, Modal, fmtINR, fmtINRFull, fmtNum, AreaChart, BarChart, Donut };
