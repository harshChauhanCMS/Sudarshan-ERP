"use client";

import { useCallback, useEffect, useState } from "react";
import type { FieldVisitView } from "@/lib/field-visit-types";

export function useFieldVisits() {
  const [visits, setVisits] = useState<FieldVisitView[]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/field-sales/visits", { cache: "no-store" });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setVisits(json.data?.visits ?? []);
      setCanCreate(Boolean(json.data?.canCreate));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load visits");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void reload(true);
    }, 15_000);
    return () => clearInterval(timer);
  }, [reload]);

  const updateVisit = useCallback(
    async (
      id: string,
      action: "accept" | "complete" | "cancel",
      extra?: { reason?: string; notes?: string; location?: { lat: number; lng: number; accuracy?: number } }
    ) => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch(`/api/field-sales/visits/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...extra }),
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        await reload();
        return json.data as FieldVisitView;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to update visit";
        setError(message);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [reload]
  );

  return { visits, canCreate, loading, error, saving, reload, updateVisit };
}
