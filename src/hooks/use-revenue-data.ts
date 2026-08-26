"use client";

import { useCallback, useEffect, useState } from "react";
import type { ErpData } from "@/lib/seed-data";

export type RevenuePoint = ErpData["REVENUE_DATA"][number];

export function useRevenueData() {
  const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/entities/revenueData", { cache: "no-store" });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      if (!res.ok) throw new Error(json.error ?? "Failed to load revenue data");
      setRevenueData(Array.isArray(json.data) ? (json.data as RevenuePoint[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load revenue data");
      setRevenueData([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload(false);
  }, [reload]);

  return { revenueData, loading, error, reload };
}
