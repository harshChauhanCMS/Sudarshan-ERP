"use client";

import { Spin } from "antd";
import type { ReactNode } from "react";

type DataWarningTone = "mock" | "empty" | "danger";

type PageShellProps = {
  children: ReactNode;
  loading?: boolean;
  error?: string | null;
  warning?: string | null;
  warningTone?: DataWarningTone;
  showSeedHint?: boolean;
};

function DataBanner({
  warning,
  tone,
  showSeedHint,
}: {
  warning: string;
  tone: DataWarningTone;
  showSeedHint?: boolean;
}) {
  const color =
    tone === "mock" ? "var(--warning)" : tone === "empty" ? "var(--info)" : "var(--danger)";
  const title =
    tone === "mock" ? "Demo data mode" : tone === "empty" ? "No data in database" : "Data notice";

  return (
    <div
      role="status"
      style={{
        marginBottom: 16,
        padding: "12px 14px",
        borderRadius: 8,
        border: `1px solid ${color}`,
        background: "var(--bg-sunken)",
        fontSize: 13,
        color: "var(--fg)",
        lineHeight: 1.5,
      }}
    >
      <strong style={{ color }}>{title}</strong>
      <div style={{ marginTop: 4, color: "var(--fg-muted)" }}>{warning}</div>
      {showSeedHint && (
        <div style={{ marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 12 }}>
          npm run seed
        </div>
      )}
    </div>
  );
}

export function PageShell({
  children,
  loading,
  error,
  warning,
  warningTone = "danger",
  showSeedHint,
}: PageShellProps) {
  if (loading) {
    return (
      <div
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: 240,
        }}
      >
        <Spin size="large" description="Loading data..." />
      </div>
    );
  }
  if (error) {
    return (
      <div
        style={{
          padding: 24,
          color: "var(--danger)",
          fontSize: 13,
        }}
      >
        {error}
      </div>
    );
  }
  return (
    <>
      {warning ? (
        <DataBanner warning={warning} tone={warningTone} showSeedHint={showSeedHint} />
      ) : null}
      {children}
    </>
  );
}
