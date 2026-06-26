"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { OwnerDashboardView } from "@/lib/owner-dashboard-data";

export function useOwnerDashboard() {
  const [data, setData] = useState<OwnerDashboardView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const reload = useCallback(async (silent = false) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/owner", { cache: "no-store" });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      if (!json.data) throw new Error("No dashboard data returned");
      setData(json.data as OwnerDashboardView);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load owner dashboard");
      setData(null);
    } finally {
      inFlightRef.current = false;
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload(false);
  }, [reload]);

  return { data, loading, error, reload };
}
