"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProductionDashboardView } from "@/lib/production-dashboard-data";

export function useProductionDashboard() {
  const [data, setData] = useState<ProductionDashboardView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const reload = useCallback(async (silent = false) => {
    if (inFlightRef.current) return false;
    inFlightRef.current = true;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/production", { cache: "no-store" });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      if (!json.data) throw new Error("No dashboard data returned");
      setData(json.data as ProductionDashboardView);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load production dashboard");
      setData(null);
      return false;
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
