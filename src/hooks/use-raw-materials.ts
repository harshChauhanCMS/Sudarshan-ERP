"use client";

import { useCallback, useEffect, useState } from "react";
import type { RawMaterial } from "@/lib/entity-types";

/** Loads raw materials directly from the dedicated inventory API — not the shared /api/bootstrap blob. */
export function useRawMaterials() {
  const [items, setItems] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/inventory/raw-materials", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed to load raw materials");
      setItems(Array.isArray(json.data) ? (json.data as RawMaterial[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load raw materials");
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
