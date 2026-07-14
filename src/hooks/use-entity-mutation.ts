"use client";

import { useCallback, useState } from "react";
import { useErpData } from "@/context/erp-data-provider";
import type { EntityKey } from "@/lib/entity-types";

async function parseResponse(res: Response) {
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

export function useEntityMutation() {
  const { refresh } = useErpData();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const append = useCallback(
    async (key: EntityKey, item: Record<string, unknown>) => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch(`/api/entities/${key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ item }),
        });
        const data = await parseResponse(res);
        await refresh();
        return data;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Save failed";
        setError(msg);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [refresh]
  );

  const update = useCallback(
    async (
      key: EntityKey,
      id: string,
      patch: Record<string, unknown>,
      idField?: string
    ) => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch(`/api/entities/${key}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, patch, idField }),
        });
        const data = await parseResponse(res);
        await refresh();
        return data;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Update failed";
        setError(msg);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [refresh]
  );

  const replaceAll = useCallback(
    async (key: EntityKey, items: unknown[]) => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch(`/api/entities/${key}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        await parseResponse(res);
        await refresh();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Update failed";
        setError(msg);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [refresh]
  );

  const createUser = useCallback(
    async (payload: {
      email: string;
      name: string;
      role: string;
      employeeId?: string;
      password?: string;
    }) => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch("/api/auth/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await parseResponse(res);
        await refresh();
        return data;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Create user failed";
        setError(msg);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [refresh]
  );

  const createVendor = useCallback(
    async (payload: Record<string, unknown>) => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch("/api/procurement/vendors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await parseResponse(res);
        await refresh();
        return data;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Create vendor failed";
        setError(msg);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [refresh]
  );

  const clearError = useCallback(() => setError(null), []);

  return { append, update, replaceAll, createUser, createVendor, saving, error, clearError };
}
