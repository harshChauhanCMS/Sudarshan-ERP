"use client";

import type { ComponentType } from "react";

export interface StatCardProps {
  icon: ComponentType;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  hintTone?: "default" | "positive" | "negative" | "warning";
  accent?: string;
}

const HINT_COLORS: Record<NonNullable<StatCardProps["hintTone"]>, string> = {
  default:  "var(--fg-subtle)",
  positive: "var(--success)",
  negative: "var(--danger)",
  warning:  "var(--warning)",
};

const ICON_COLORS: Record<NonNullable<StatCardProps["hintTone"]>, { bg: string; color: string }> = {
  default:  { bg: "var(--primary-soft)",  color: "var(--primary)" },
  positive: { bg: "var(--success-soft)",  color: "var(--success)" },
  negative: { bg: "var(--danger-soft)",   color: "var(--danger)"  },
  warning:  { bg: "var(--warning-soft)",  color: "var(--warning)" },
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  hintTone = "default",
}: StatCardProps) {
  const ic = ICON_COLORS[hintTone];

  return (
    <div className="sc-card">
      <div className="sc-top">
        <span className="sc-icon" style={{ background: ic.bg, color: ic.color }}>
          <Icon />
        </span>
        <span className="sc-label">{label}</span>
      </div>
      <div className="sc-value">{value}</div>
      {hint !== undefined && (
        <div className="sc-hint" style={{ color: HINT_COLORS[hintTone] }}>
          {hint}
        </div>
      )}
    </div>
  );
}
