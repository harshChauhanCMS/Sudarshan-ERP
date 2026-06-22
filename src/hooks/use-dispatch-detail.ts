"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchDispatchDetail, type DispatchDetailView } from "@/lib/dispatch-planning-api";

const POLL_MS = 12_000;

export function useDispatchDetail(id: string | undefined) {
  const [data, setData] = useState<DispatchDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const reload = useCallback(async (silent = false) => {
    if (!id || inFlightRef.current) return;
    inFlightRef.current = true;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const detail = await fetchDispatchDetail(id);
      setData(detail);
      setLastRefreshedAt(new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dispatch");
    } finally {
      inFlightRef.current = false;
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void reload(false);
  }, [reload]);

  useEffect(() => {
    if (!id || !data?.trackingLive) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void reload(true);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [id, data?.trackingLive, reload]);

  return { data, loading, error, reload, lastRefreshedAt };
}
