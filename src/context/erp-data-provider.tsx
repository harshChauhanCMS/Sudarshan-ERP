"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ErpData } from "@/lib/seed-data";
import { EMPTY_ERP_DATA } from "@/lib/empty-erp-data";
import type { BootstrapMeta } from "@/lib/bootstrap-meta";

type ErpDataContextValue = {
  data: ErpData;
  meta: BootstrapMeta | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Triggers the initial /api/bootstrap fetch on first real consumption. */
  ensureLoaded: () => void;
};

const ErpDataContext = createContext<ErpDataContextValue | null>(null);

const DEFAULT_META: BootstrapMeta = {
  source: "empty",
  dbConfigured: false,
  isEmpty: true,
};

export function ErpDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ErpData>(EMPTY_ERP_DATA);
  const [meta, setMeta] = useState<BootstrapMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const hasRequestedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!hasLoadedRef.current) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bootstrap");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      if (json.data) setData(json.data as ErpData);
      setMeta((json.meta as BootstrapMeta) ?? DEFAULT_META);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
      setData(EMPTY_ERP_DATA);
      setMeta(DEFAULT_META);
    } finally {
      setLoading(false);
      hasLoadedRef.current = true;
    }
  }, []);

  // Lazy: do NOT fetch on mount. Only fetch when a component actually consumes
  // the data via useErpData()/useDATA(). Pages fully migrated to dedicated APIs
  // (e.g. HRMS salary) therefore never trigger /api/bootstrap.
  const ensureLoaded = useCallback(() => {
    if (hasRequestedRef.current) return;
    hasRequestedRef.current = true;
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ data, meta, loading, error, refresh, ensureLoaded }),
    [data, meta, loading, error, refresh, ensureLoaded]
  );

  return (
    <ErpDataContext.Provider value={value}>{children}</ErpDataContext.Provider>
  );
}

export function useErpData() {
  const ctx = useContext(ErpDataContext);
  // Kick off the lazy bootstrap fetch the first time this data is consumed.
  useEffect(() => {
    ctx?.ensureLoaded();
  }, [ctx]);
  if (!ctx) {
    throw new Error("useErpData must be used within ErpDataProvider");
  }
  return ctx;
}

/** @deprecated Use useErpData().data — kept for gradual migration */
export function useData() {
  return useErpData().data;
}
