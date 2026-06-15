"use client";

import { useEffect } from "react";
import { Button, Tag } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import RepHeader from "@/components/hrms/RepHeader";
import CommonTable, { type CommonTableColumn } from "@/components/common/CommonTable";
import ReportSection from "@/components/hrms/ReportSection";
import AttendanceFilterPanel, {
  type PeriodOption,
} from "@/components/hrms/AttendanceFilterPanel";
import { useAttendanceReport, type AttendanceDailyRow } from "@/hooks/use-attendance-report";

const DAILY_PERIOD_OPTIONS: PeriodOption[] = [
  { value: "today", label: "Today" },
  { value: "date", label: "Pick a date" },
  { value: "month", label: "This month" },
  { value: "last", label: "Last month" },
  { value: "custom", label: "Pick month…" },
];

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return dayjs(iso).format("HH:mm");
}

export default function DailyAttendancePage() {
  const r = useAttendanceReport({ variant: "daily" });

  useEffect(() => {
    void r.handleApply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns: CommonTableColumn<AttendanceDailyRow>[] = [
    {
      title: "Date",
      dataIndex: "day",
      key: "day",
      width: 120,
      render: (v: string) => (
        <span className="font-medium">
          {v ? dayjs(v).format("DD MMM YYYY") : "—"}
        </span>
      ),
    },
    {
      title: "Emp ID",
      dataIndex: "employeeId",
      key: "eid",
      width: 100,
      render: (v: string) => (
        <span className="font-mono text-[12px] font-semibold">{v}</span>
      ),
    },
    {
      title: "Name",
      dataIndex: "employeeName",
      key: "name",
      render: (v: string) => <span className="font-semibold">{v}</span>,
    },
    { title: "Dept", dataIndex: "department", key: "dept", width: 130 },
    {
      title: "In",
      dataIndex: "inAt",
      key: "in",
      width: 80,
      render: (v: string | null) => (
        <span className="font-semibold text-emerald-600">{fmtTime(v)}</span>
      ),
    },
    {
      title: "Out",
      dataIndex: "outAt",
      key: "out",
      width: 80,
      render: (v: string | null) => (
        <span className="font-semibold text-red-600">{fmtTime(v)}</span>
      ),
    },
    {
      title: "Worked (h)",
      dataIndex: "workedHours",
      key: "worked",
      width: 100,
      render: (v: number) => v.toFixed(2),
    },
    {
      title: "Status",
      key: "status",
      width: 170,
      render: (_: unknown, row: AttendanceDailyRow) => (
        <div className="flex gap-1 flex-wrap">
          {row.absent && <Tag color="red">Absent</Tag>}
          {row.present && <Tag color="green">Present</Tag>}
          {row.late && <Tag color="orange">Late</Tag>}
        </div>
      ),
    },
    {
      title: "Shortfall",
      dataIndex: "shortfall",
      key: "sf",
      width: 90,
      render: (v: number) => (
        <span className="text-amber-600">{v > 0 ? `${v.toFixed(2)}h` : "—"}</span>
      ),
    },
    {
      title: "OT",
      dataIndex: "overtime",
      key: "ot",
      width: 70,
      render: (v: number) => (
        <span className="text-blue-600">{v > 0 ? `${v.toFixed(2)}h` : "—"}</span>
      ),
    },
  ];

  const tableProps = {
    bordered: true as const,
    size: "middle" as const,
    className: "attendance-report-table",
  };

  return (
    <div className="attendance-reports-page">
      <RepHeader
        title="Daily Attendance"
        subtitle={`${r.rangeLabel} · in/out times, worked hours & status per day`}
        actions={
          <Button
            icon={<DownloadOutlined />}
            onClick={() =>
              window.open(`/api/hrms/attendance/report.csv?${r.buildCsvUrl()}`, "_blank")
            }
          >
            Export
          </Button>
        }
      />

      <AttendanceFilterPanel
        range={r.range} setRange={r.setRange}
        dept={r.dept} setDept={r.setDept}
        employeeId={r.employeeId}
        setEmployeeId={r.setEmployeeId}
        unit={r.unit} setUnit={r.setUnit}
        period={r.period} setPeriod={r.setPeriod}
        departments={r.departments} units={r.units}
        loading={r.loading} onApply={r.handleApply} onClear={r.handleClearFilters}
        search={r.search} setSearch={r.setSearch}
        periodOptions={DAILY_PERIOD_OPTIONS}
        showShift={false}
        showEmployee
        splitApplyRow
      />

      <ReportSection
        title="Daily records"
        meta={
          r.employeeId
            ? `${r.rangeLabel} · ${r.daily.length} records · ${r.employeeId}`
            : `${r.rangeLabel} · ${r.daily.length} records`
        }
        flush
      >
        <CommonTable
          {...tableProps}
          columns={columns}
          dataSource={r.daily}
          rowKey={(row: AttendanceDailyRow) => `${row.employeeId}|${row.day}`}
          loading={r.loading}
          pagination={{ pageSize: 20, showSizeChanger: true }}
        />
      </ReportSection>
    </div>
  );
}
