"use client";

import { useCallback, useEffect, useState } from "react";

export type Employee = {
  employeeId: string;
  fullName: string;
  department: string;
  designation: string;
  dateOfJoining: string;
  [key: string]: unknown;
};

/** Loads employees directly from the dedicated HRMS API — not the shared /api/bootstrap blob. */
export function useEmployees() {
  const [items, setItems] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/hrms/employees", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed to load employees");
      setItems(Array.isArray(json.data) ? (json.data as Employee[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load employees");
      setItems([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload(false);
  }, [reload]);

  return { items, loading, error, reload };
}
