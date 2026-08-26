"use client";

import { useCallback, useEffect, useState } from "react";
import type { Customer } from "@/lib/entity-types";

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/entities/customers", { cache: "no-store" });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      if (!res.ok) throw new Error(json.error ?? "Failed to load customers");
      setCustomers(Array.isArray(json.data) ? (json.data as Customer[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load customers");
      setCustomers([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload(false);
  }, [reload]);

  return { customers, loading, error, reload };
}
