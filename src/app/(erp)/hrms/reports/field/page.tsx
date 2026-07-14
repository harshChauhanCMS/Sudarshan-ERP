"use client";

import { useEffect } from "react";
import { Button } from "antd";
import { DownloadOutlined, BankOutlined, EnvironmentOutlined } from "@ant-design/icons";

import RepHeader from "@/components/hrms/RepHeader";
import StatCard from "@/components/common/StatCard";
import CommonTable, { type CommonTableColumn } from "@/components/common/CommonTable";
import ReportSection from "@/components/hrms/ReportSection";
import AttendanceFilterPanel, {
  type PeriodOption,
} from "@/components/hrms/AttendanceFilterPanel";
import { useAttendanceReport, isFieldRow, type AttendanceSummaryRow } from "@/hooks/use-attendance-report";

const FIELD_PERIOD_OPTIONS: PeriodOption[] = [
  { value: "today", label: "Today" },
  { value: "date", label: "Pick a date" },
  { value: "month", label: "This month" },
  { value: "last", label: "Last month" },
  { value: "custom", label: "Pick month…" },
];

export default function FieldAttendancePage() {
  const r = useAttendanceReport({ variant: "daily" });
  const fieldRows = r.fieldRows;
  const officeStats = r.officeStats;

  useEffect(() => {
    void r.handleApply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns: CommonTableColumn<AttendanceSummaryRow>[] = [
    {
      title: "Employee",
      key: "emp",
      render: (_: unknown, row: AttendanceSummaryRow) => (
        <span>
          <span className="font-semibold">{row.employeeName}</span>
          <span className="ml-2 text-zinc-500 text-[12px]">{row.employeeId}</span>
        </span>
      ),
    },
    { title: "Department", dataIndex: "department", key: "dept" },
    { title: "Unit", dataIndex: "locationUnit", key: "unit" },
    {
      title: "In-office days",
      key: "inOffice",
      render: (_: unknown, row: AttendanceSummaryRow) =>
        isFieldRow(row) ? 0 : row.presentDays,
    },
    {
      title: "Field days",
      key: "field",
      render: (_: unknown, row: AttendanceSummaryRow) =>
        isFieldRow(row) ? (
          <span className="font-bold text-emerald-600">{row.presentDays}</span>
        ) : (
          0
        ),
    },
    {
      title: "Present",
      dataIndex: "presentDays",
      key: "present",
      render: (v: number) => <span className="font-bold text-emerald-600">{v}</span>,
    },
    {
      title: "Absent",
      dataIndex: "absentDays",
      key: "absent",
      render: (v: number) => <span className="font-bold text-red-600">{v}</span>,
    },
    {
      title: "Late",
      dataIndex: "lateDays",
      key: "late",
      render: (v: number) => <span className="font-bold text-amber-600">{v}</span>,
    },
  ];

  const tableProps = {
    bordered: false as const,
    size: "middle" as const,
    className: "attendance-report-table",
  };

  return (
    <div className="attendance-reports-page">
      <RepHeader
        title="Field Attendance"
        subtitle={`${r.rangeLabel} · GPS-verified field vs in-office breakdown`}
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

      <div className="attendance-summary-grid">
        <StatCard
          icon={BankOutlined}
          label="In-office attendance"
          value={`${officeStats.inOfficePct}%`}
          hint={`${officeStats.totalEmployees - officeStats.fieldEmployees} employees · ${officeStats.inOfficeDays} days`}
          hintTone="positive"
        />
        <StatCard
          icon={EnvironmentOutlined}
          label="Field attendance"
          value={`${officeStats.fieldPct}%`}
          hint={`${officeStats.fieldEmployees} field employees · ${officeStats.fieldDays} days`}
          hintTone="positive"
        />
      </div>

      <AttendanceFilterPanel
        range={r.range} setRange={r.setRange}
        dept={r.dept} setDept={r.setDept}
        unit={r.unit} setUnit={r.setUnit}
        period={r.period} setPeriod={r.setPeriod} defaultPeriod={r.defaultPeriod}
        departments={r.departments} units={r.units}
        loading={r.loading} onApply={r.handleApply} onClear={r.handleClearFilters}
        search={r.search} setSearch={r.setSearch}
        periodOptions={FIELD_PERIOD_OPTIONS}
        showShift={false}
      />

      <ReportSection
        title="Field employee breakdown"
        meta={`${r.rangeLabel} · field staff only · ${fieldRows.length} employees`}
        footer="Field days = punches marked as Field (outside office). In-office = at plant/office."
        flush
      >
        <CommonTable
          {...tableProps}
          columns={columns}
          dataSource={fieldRows}
          rowKey="employeeId"
          loading={r.loading}
          pagination={{ pageSize: 15, showSizeChanger: true }}
        />
      </ReportSection>
    </div>
  );
}
