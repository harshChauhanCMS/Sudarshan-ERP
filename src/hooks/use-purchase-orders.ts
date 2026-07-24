"use client";

import { useCallback, useEffect, useState } from "react";
import type { PurchaseOrder } from "@/lib/entity-types";

export function usePurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/entities/purchaseOrders", { cache: "no-store" });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      if (!res.ok) throw new Error(json.error ?? "Failed to load purchase orders");
      setPurchaseOrders(Array.isArray(json.data) ? (json.data as PurchaseOrder[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load purchase orders");
      setPurchaseOrders([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload(false);
  }, [reload]);

  return { purchaseOrders, loading, error, reload };
}
