"use client";

import { useCallback, useEffect, useState } from "react";
import type { Packaging } from "@/lib/entity-types";

/** Loads packaging directly from the dedicated inventory API — not the shared /api/bootstrap blob. */
export function usePackaging() {
  const [items, setItems] = useState<Packaging[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/inventory/packaging", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed to load packaging");
      setItems(Array.isArray(json.data) ? (json.data as Packaging[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load packaging");
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
