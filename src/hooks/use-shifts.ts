"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Shift = {
  _id: string;
  code: string;
  name: string;
  startMinutes: number;
  endMinutes: number;
  breakMinutes?: number;
  weeklyOff?: string;
  isNightShift?: boolean;
  isActive?: boolean;
  description?: string;
};

/**
 * Loads shift masters. `activeOnly` is what assignment dropdowns want — a
 * retired shift should stay readable on existing records but not be offered
 * for new assignments.
 */
export function useShifts(activeOnly = false) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const reload = useCallback(
    async (silent = false) => {
      if (inFlightRef.current) return false;
      inFlightRef.current = true;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/hrms/shifts${activeOnly ? "?active=1" : ""}`,
          { cache: "no-store" },
        );
        const json = await res.json();
        if (!res.ok || json.error) {
          throw new Error(json.error ?? "Failed to load shifts");
        }
        setShifts(Array.isArray(json.data) ? (json.data as Shift[]) : []);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load shifts");
        setShifts([]);
        return false;
      } finally {
        inFlightRef.current = false;
        if (!silent) setLoading(false);
      }
    },
    [activeOnly],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload(false);
  }, [reload]);

  return { shifts, loading, error, reload };
}
