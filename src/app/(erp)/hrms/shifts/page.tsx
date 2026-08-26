"use client";

import RepHeader from "@/components/hrms/RepHeader";
import { ShiftsEditor } from "@/components/hrms/ShiftsEditor";
import { HRMS_BACK } from "@/lib/hrms-nav";

export default function ShiftManagementPage() {
  return (
    <div className="attendance-reports-page">
      <RepHeader
        {...HRMS_BACK.employees}
        title="Shift Management"
        subtitle="Define working shifts, timings and breaks used across HRMS"
      />

      <ShiftsEditor />
    </div>
  );
}
