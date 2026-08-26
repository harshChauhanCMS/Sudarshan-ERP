"use client";

import { useCallback, useEffect, useState } from "react";
import type { Invoice } from "@/lib/entity-types";

/**
 * Reads the procurement endpoint rather than the raw entity store so statuses
 * arrive normalised — legacy rows saved as "matched"/"awaiting" come back as
 * the workflow's own vocabulary.
 */
export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/procurement/invoices", { cache: "no-store" });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      if (!res.ok) throw new Error(json.error ?? "Failed to load invoices");
      setInvoices(Array.isArray(json.data) ? (json.data as Invoice[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load invoices");
      setInvoices([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch on mount; `reload` is stable so this runs once.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload(false);
  }, [reload]);

  return { invoices, loading, error, reload };
}
