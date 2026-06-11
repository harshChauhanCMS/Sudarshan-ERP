"use client";

import { useEffect, useState } from "react";

type SessionUser = {
  role?: string;
  employeeId?: string;
  email?: string;
  name?: string;
};

export function useSessionUser() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setUser(json?.data?.user ?? null);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, loading, isManager: user?.role === "manager" };
}
