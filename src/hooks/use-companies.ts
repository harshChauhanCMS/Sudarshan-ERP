"use client";

import { useCallback, useEffect, useState } from "react";
import type { ErpData } from "@/lib/seed-data";

export type Company = ErpData["COMPANIES"][number];

export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/entities/companies", { cache: "no-store" });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      if (!res.ok) throw new Error(json.error ?? "Failed to load companies");
      setCompanies(Array.isArray(json.data) ? (json.data as Company[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load companies");
      setCompanies([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload(false);
  }, [reload]);

  return { companies, loading, error, reload };
}
