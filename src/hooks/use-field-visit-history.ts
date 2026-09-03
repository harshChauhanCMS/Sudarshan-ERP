"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FieldVisitView } from "@/lib/field-visit-types";

export type FieldVisitHistoryFilters = {
  from?: string;
  to?: string;
  employeeId?: string;
  company?: string;
  visitType?: string;
  status?: string;
};

/** Read-only history feed of field visits, filtered server-side. */
export function useFieldVisitHistory(filters: FieldVisitHistoryFilters = {}) {
  const [visits, setVisits] = useState<FieldVisitView[]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { from, to, employeeId, company, visitType, status } = filters;

  const query = useMemo(() => {
    const params = new URLSearchParams({ limit: "500" });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (employeeId && employeeId !== "all") params.set("employeeId", employeeId);
    if (company && company !== "all") params.set("company", company);
    if (visitType && visitType !== "all") params.set("visitType", visitType);
    if (status && status !== "all") params.set("status", status);
    return params.toString();
  }, [from, to, employeeId, company, visitType, status]);

  const reload = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/field-sales/visits?${query}`, { cache: "no-store" });
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setVisits(json.data?.visits ?? []);
        setCanCreate(Boolean(json.data?.canCreate));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load visit history");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [query]
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  return { visits, canCreate, loading, error, reload };
}
