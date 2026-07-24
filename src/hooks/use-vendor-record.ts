"use client";

import { useEffect, useState } from "react";

export type VendorRecord = {
  id: string;
  name: string;
  city: string;
  category: string;
  poCount: number;
  ytd: number;
  rating: number;
  contactPerson?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  address?: string;
  materialsSupplied?: string;
  paymentTerms?: string;
  leadTime?: number;
  status?: string;
};

/** Fetches a single vendor by id — shared by the view and edit pages. */
export function useVendorRecord(id: string) {
  const [vendor, setVendor] = useState<VendorRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/procurement/vendors/${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.error) {
          setError(j.error);
        } else {
          setVendor(j.data);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load vendor");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { vendor, loading, error };
}
