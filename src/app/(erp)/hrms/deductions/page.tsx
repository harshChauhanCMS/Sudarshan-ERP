"use client";

import RepHeader from "@/components/hrms/RepHeader";
import { DeductionsEditor } from "@/components/hrms/DeductionsEditor";
import { HRMS_BACK } from "@/lib/hrms-nav";

export default function DeductionManagementPage() {
  return (
    <div className="attendance-reports-page">
      <RepHeader
        {...HRMS_BACK.employees}
        title="Deduction Management"
        subtitle="Define percentage-based salary deductions applied to employees in payroll"
      />

      <DeductionsEditor />
    </div>
  );
}
