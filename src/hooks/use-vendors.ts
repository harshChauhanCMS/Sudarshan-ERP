"use client";

import { useCallback, useEffect, useState } from "react";
import type { Vendor } from "@/lib/entity-types";

/** Loads vendors directly from the dedicated procurement API — not the shared /api/bootstrap blob. */
export function useVendors() {
  const [items, setItems] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/procurement/vendors", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed to load vendors");
      setItems(Array.isArray(json.data) ? (json.data as Vendor[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load vendors");
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
