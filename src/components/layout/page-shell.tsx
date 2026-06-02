"use client";

import { Spin } from "antd";
import type { ReactNode } from "react";
import type { BootstrapMeta } from "@/lib/bootstrap-meta";

type PageShellProps = {
  children: ReactNode;
  loading?: boolean;
  error?: string | null;
  meta?: BootstrapMeta | null;
};

function DataBanner({ meta }: { meta: BootstrapMeta }) {
  if (!meta.warning) return null;
  const tone =
    meta.source === "mock"
      ? "var(--warning)"
      : meta.isEmpty
        ? "var(--info)"
        : "var(--danger)";

  return (
    <div
      role="status"
      style={{
        marginBottom: 16,
        padding: "12px 14px",
        borderRadius: 8,
        border: `1px solid ${tone}`,
        background: "var(--bg-sunken)",
        fontSize: 13,
        color: "var(--fg)",
        lineHeight: 1.5,
      }}
    >
      <strong style={{ color: tone }}>
        {meta.source === "mock"
          ? "Demo data mode"
          : meta.isEmpty
            ? "No data in database"
            : "Data notice"}
      </strong>
      <div style={{ marginTop: 4, color: "var(--fg-muted)" }}>{meta.warning}</div>
      {meta.isEmpty && meta.dbConfigured && (
        <div style={{ marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 12 }}>
          npm run seed
        </div>
      )}
    </div>
  );
}

export function PageShell({ children, loading, error, meta }: PageShellProps) {
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
      {meta?.warning ? <DataBanner meta={meta} /> : null}
      {children}
    </>
  );
}
