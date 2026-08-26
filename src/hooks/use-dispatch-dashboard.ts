"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DispatchDashboardOverview } from "@/lib/dispatch-dashboard-types";

export type DispatchDashboardRange = { from: string; to: string };

/**
 * Loads the Dispatch Dashboard aggregate from /api/dashboard/dispatch.
 *
 * `range` scopes the "Overdue & due orders" section only — the KPI row and the
 * calendar are always today-anchored. The window is applied server-side rather
 * than on the returned rows because the API caps the list, so filtering the
 * response would silently miss rows beyond the cap.
 */
export function useDispatchDashboard(range?: DispatchDashboardRange) {
  const [data, setData] = useState<DispatchDashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const from = range?.from ?? "";
  const to = range?.to ?? "";

  const reload = useCallback(
    async (silent = false) => {
      if (inFlightRef.current) return false;
      inFlightRef.current = true;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams();
        if (from) qs.set("from", from);
        if (to) qs.set("to", to);
        const query = qs.toString();
        const res = await fetch(
          `/api/dashboard/dispatch${query ? `?${query}` : ""}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        if (!json.data) throw new Error("No dashboard data returned");
        setData(json.data as DispatchDashboardOverview);
        return true;
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Failed to load dispatch dashboard"
        );
        setData(null);
        return false;
      } finally {
        inFlightRef.current = false;
        if (!silent) setLoading(false);
      }
    },
    [from, to]
  );

  useEffect(() => {
    // Fetches on mount and whenever the from/to filter changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload(false);
  }, [reload]);

  return { data, loading, error, reload };
}
