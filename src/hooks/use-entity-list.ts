"use client";

import { useCallback, useEffect, useState } from "react";
import type { EntityKey } from "@/lib/entity-types";

/**
 * Read-only fetch of a single generic entity-store list via /api/entities/[key] —
 * for auxiliary lookups (vendors, categories, …) that don't have a dedicated API yet.
 * Never touches /api/bootstrap.
 */
export function useEntityList<T = unknown>(key: EntityKey) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/entities/${key}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error ?? `Failed to load ${key}`);
        setItems(Array.isArray(json.data) ? (json.data as T[]) : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : `Failed to load ${key}`);
        setItems([]);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [key],
  );

  useEffect(() => {
    void reload(false);
  }, [reload]);

  return { items, loading, error, reload };
}
