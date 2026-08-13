"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { DeductionBasis } from "@/lib/deduction-utils";

export type Deduction = {
  _id: string;
  name: string;
  percentage: number;
  basis: DeductionBasis;
  maxAmount?: number;
  applicableUpToGross?: number;
  isDefault?: boolean;
  isActive?: boolean;
  description?: string;
};

/**
 * Loads deduction masters. `activeOnly` is what the employee form wants — a
 * retired deduction should stay readable on existing employees but not be
 * offered for new assignments.
 */
export function useDeductions(activeOnly = false) {
  const [deductions, setDeductions] = useState<Deduction[]>([]);
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
          `/api/hrms/deductions${activeOnly ? "?active=1" : ""}`,
          { cache: "no-store" },
        );
        const json = await res.json();
        if (!res.ok || json.error) {
          throw new Error(json.error ?? "Failed to load deductions");
        }
        setDeductions(Array.isArray(json.data) ? (json.data as Deduction[]) : []);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load deductions");
        setDeductions([]);
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

  return { deductions, loading, error, reload };
}
