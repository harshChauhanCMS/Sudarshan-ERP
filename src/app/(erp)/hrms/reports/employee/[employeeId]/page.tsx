"use client";

import { use, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import dayjs from "dayjs";

import RepHeader from "@/components/hrms/RepHeader";
import EmployeeAttendanceReportView from "@/components/hrms/EmployeeAttendanceReportView";

function formatRangeLabel(range: [dayjs.Dayjs, dayjs.Dayjs]) {
  const [start, end] = range;
  if (start.isSame(end, "day")) return start.format("DD MMM YYYY");
  if (
    start.isSame(end, "month") &&
    start.date() === 1 &&
    end.date() === end.daysInMonth()
  ) {
    return start.format("MMM YYYY");
  }
  return `${start.format("DD MMM YYYY")} – ${end.format("DD MMM YYYY")}`;
}

export default function EmployeeReportDetailPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = use(params);
  const searchParams = useSearchParams();
  const from =
    searchParams.get("from") ?? dayjs().startOf("month").format("YYYY-MM-DD");
  const to =
    searchParams.get("to") ?? dayjs().endOf("month").format("YYYY-MM-DD");

  const range = useMemo(
    (): [dayjs.Dayjs, dayjs.Dayjs] => [dayjs(from), dayjs(to)],
    [from, to],
  );

  const rangeLabel = useMemo(() => formatRangeLabel(range), [range]);
  const decodedId = decodeURIComponent(employeeId);

  return (
    <div className="attendance-reports-page">
      <RepHeader
        title="Employee attendance report"
        subtitle={`${decodedId} · ${rangeLabel}`}
        backLabel="Employee report"
        backHref="/hrms/reports/employee"
      />

      <EmployeeAttendanceReportView
        employeeId={decodedId}
        from={from}
        to={to}
        rangeLabel={rangeLabel}
      />
    </div>
  );
}
