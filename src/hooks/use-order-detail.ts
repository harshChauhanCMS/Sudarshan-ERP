"use client";

import { useCallback, useEffect, useState } from "react";
import type { Order } from "@/lib/entity-types";

export function useOrderDetail(id: string) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/entities/orders", { cache: "no-store" });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      if (!res.ok) throw new Error(json.error ?? "Failed to load order");

      const orders = Array.isArray(json.data) ? (json.data as Order[]) : [];
      const found = orders.find((o) => o.id === id);
      if (!found) throw new Error("Order not found");
      setOrder(found);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load order");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { order, loading, error, reload };
}
