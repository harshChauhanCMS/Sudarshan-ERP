"use client";

import type { ComponentType, CSSProperties, ReactNode } from "react";

export type StatCardTone = "default" | "positive" | "negative" | "warning" | "accent";

export interface StatCardProps {
  icon: ComponentType;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  hintTone?: StatCardTone;
  className?: string;
  style?: CSSProperties;
}

const HINT_COLORS: Record<StatCardTone, string> = {
  default: "var(--fg-subtle)",
  positive: "var(--success)",
  negative: "var(--danger)",
  warning: "var(--warning)",
  accent: "var(--primary)",
};

const ICON_COLORS: Record<StatCardTone, { bg: string; color: string }> = {
  default: { bg: "var(--primary)", color: "#ffffff" },
  positive: { bg: "var(--success)", color: "#ffffff" },
  negative: { bg: "var(--danger)", color: "#ffffff" },
  warning: { bg: "var(--warning)", color: "#ffffff" },
  accent: { bg: "var(--info)", color: "#ffffff" },
};

const VALUE_COLORS: Record<StatCardTone, string | undefined> = {
  default: undefined,
  positive: "var(--success)",
  negative: "var(--danger)",
  warning: "var(--warning)",
  accent: "var(--primary)",
};

export function mapDashStatTone(
  tone?: string,
): StatCardTone {
  switch (tone) {
    case "success":
    case "green":
      return "positive";
    case "danger":
      return "negative";
    case "warning":
    case "amber":
      return "warning";
    case "accent":
    case "teal":
      return "accent";
    default:
      return "default";
  }
}

export function ErpStatGrid({
  children,
  cols = 4,
}: {
  children: React.ReactNode;
  cols?: 4 | 5 | "auto";
}) {
  const className =
    cols === "auto"
      ? "attendance-kpi-grid attendance-kpi-grid--auto"
      : cols === 4
        ? "attendance-kpi-grid attendance-kpi-grid--4"
        : "attendance-kpi-grid";

  return <div className={className} style={{ marginBottom: 20 }}>{children}</div>;
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  hintTone = "default",
  className = "",
  style,
}: StatCardProps) {
  const ic = ICON_COLORS[hintTone];
  const valueColor = VALUE_COLORS[hintTone];

  return (
    <div
      className={`sc-card sc-card--${hintTone} ${className}`.trim()}
      style={style}
    >
      <div className="sc-top">
        <span className="sc-icon" style={{ background: ic.bg, color: ic.color }}>
          <Icon />
        </span>
        <span className="sc-label">{label}</span>
      </div>
      <div
        className="sc-value"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </div>
      {hint !== undefined && (
        <div className="sc-hint" style={{ color: HINT_COLORS[hintTone] }}>
          {hint}
        </div>
      )}
    </div>
  );
}
