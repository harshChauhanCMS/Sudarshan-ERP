"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchDispatchPlanning,
  type DispatchPlanningOverview,
} from "@/lib/dispatch-planning-api";

export function useDispatchPlanning() {
  const [data, setData] = useState<DispatchPlanningOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const overview = await fetchDispatchPlanning();
      setData(overview);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dispatch planning");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  return { data, loading, error, reload };
}
