"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FieldActivityDashboard } from "@/lib/field-visit-types";

const POLL_MS = 15_000;

export function useFieldActivityDashboard() {
  const [data, setData] = useState<FieldActivityDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const reload = useCallback(async (silent = false) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/field-sales/dashboard", { cache: "no-store" });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json.data as FieldActivityDashboard);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      inFlightRef.current = false;
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload(false);
  }, [reload]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void reload(true);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [reload]);

  return { data, loading, error, reload };
}
