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

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ data, meta, loading, error, refresh }),
    [data, meta, loading, error, refresh]
  );

  return (
    <ErpDataContext.Provider value={value}>{children}</ErpDataContext.Provider>
  );
}

export function useErpData() {
  const ctx = useContext(ErpDataContext);
  if (!ctx) {
    throw new Error("useErpData must be used within ErpDataProvider");
  }
  return ctx;
}

/** @deprecated Use useErpData().data — kept for gradual migration */
export function useData() {
  return useErpData().data;
}
