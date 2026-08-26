"use client";

import { useCallback, useEffect, useState } from "react";
import type { ErpData } from "@/lib/seed-data";

export type AttendanceToday = ErpData["ATTENDANCE_TODAY"];

const EMPTY_ATTENDANCE: AttendanceToday = {
  present: 0,
  total: 0,
  late: 0,
  leave: 0,
  absent: 0,
  onField: 0,
};

export function useAttendanceToday() {
  const [attendance, setAttendance] = useState<AttendanceToday>(EMPTY_ATTENDANCE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/entities/attendanceToday", { cache: "no-store" });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      if (!res.ok) throw new Error(json.error ?? "Failed to load attendance");
      setAttendance((json.data as AttendanceToday) ?? EMPTY_ATTENDANCE);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load attendance");
      setAttendance(EMPTY_ATTENDANCE);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload(false);
  }, [reload]);

  return { attendance, loading, error, reload };
}
