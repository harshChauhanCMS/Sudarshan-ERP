"use client";

import { useCallback, useEffect, useState } from "react";
import type { Dispatch as DispatchRecord } from "@/lib/entity-types";

export function useDispatches() {
  const [dispatches, setDispatches] = useState<DispatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/entities/dispatches", { cache: "no-store" });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      if (!res.ok) throw new Error(json.error ?? "Failed to load dispatches");
      setDispatches(Array.isArray(json.data) ? (json.data as DispatchRecord[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dispatches");
      setDispatches([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload(false);
  }, [reload]);

  return { dispatches, loading, error, reload };
}
