"use client";

import { useCallback, useEffect, useState } from "react";
import type { SparePart } from "@/lib/entity-types";

/** Loads spare parts directly from the dedicated inventory API — not the shared /api/bootstrap blob. */
export function useSpareParts() {
  const [items, setItems] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/inventory/spare-parts", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed to load spare parts");
      setItems(Array.isArray(json.data) ? (json.data as SparePart[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load spare parts");
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
