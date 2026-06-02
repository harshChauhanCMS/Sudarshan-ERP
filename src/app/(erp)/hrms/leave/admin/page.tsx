"use client";

import RepHeader from "@/components/hrms/RepHeader";
import { HolidaysEditor } from "@/components/hrms/HolidaysEditor";
import { HRMS_BACK } from "@/lib/hrms-nav";
import { useErpData } from "@/context/erp-data-provider";

export default function LeaveAdminPage() {
  const { data } = useErpData();
  const companyName = data.COMPANIES[0]?.name ?? "Sudarshan Group";

  return (
    <div className="attendance-reports-page">
      <RepHeader
        {...HRMS_BACK.leave}
        title="Leave Admin"
        subtitle="Manage the company holiday calendar"
      />

      <HolidaysEditor companyName={companyName} />
    </div>
  );
}
