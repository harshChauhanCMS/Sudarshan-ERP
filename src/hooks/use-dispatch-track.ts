"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchDispatchTrack,
  type DispatchTrackView,
} from "@/lib/dispatch-planning-api";

const POLL_MS = 12_000;

export function useDispatchTrack(token: string | undefined) {
  const [data, setData] = useState<DispatchTrackView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const reload = useCallback(async (silent = false) => {
    if (!token || inFlightRef.current) return;
    inFlightRef.current = true;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const track = await fetchDispatchTrack(token);
      setData(track);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tracking");
    } finally {
      inFlightRef.current = false;
      if (!silent) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void reload(false);
  }, [reload]);

  useEffect(() => {
    if (!token || !data?.active) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void reload(true);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [token, data?.active, reload]);

  return { data, loading, error, reload };
}
