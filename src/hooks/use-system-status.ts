"use client";

import { useEffect, useState } from "react";

export type SystemStatus = {
  dbConfigured: boolean;
  mockDataEnabled: boolean;
};

/** Lightweight replacement for the old bootstrap `meta` banner — no business data. */
export function useSystemStatus() {
  const [status, setStatus] = useState<SystemStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/system/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j.data) setStatus(j.data as SystemStatus);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}
