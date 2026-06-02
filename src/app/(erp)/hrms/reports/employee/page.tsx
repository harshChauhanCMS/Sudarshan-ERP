"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Segmented, Tag } from "antd";
import {
  DownloadOutlined,
  UserOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  BankOutlined,
  IdcardOutlined,
  ExperimentOutlined,
} from "@ant-design/icons";

import RepHeader from "@/components/hrms/RepHeader";
import CommonTable, { type CommonTableColumn } from "@/components/common/CommonTable";
import ReportSection from "@/components/hrms/ReportSection";
import AttendanceFilterPanel from "@/components/hrms/AttendanceFilterPanel";
import { useAttendanceReport, type AttendanceSummaryRow } from "@/hooks/use-attendance-report";

type ReportType = "monthly" | "absent" | "late" | "short" | "overtime";
type GroupBy = "employee" | "department" | "shift" | "unit" | "empType";

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: "monthly", label: "Monthly summary" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late coming" },
  { value: "short", label: "Short hours" },
  { value: "overtime", label: "Overtime" },
];

const GROUP_OPTIONS = [
  { label: <span className="inline-flex items-center gap-1.5"><UserOutlined /> Employee</span>, value: "employee" },
  { label: <span className="inline-flex items-center gap-1.5"><TeamOutlined /> Department</span>, value: "department" },
  { label: <span className="inline-flex items-center gap-1.5"><ClockCircleOutlined /> Shift</span>, value: "shift" },
  { label: <span className="inline-flex items-center gap-1.5"><BankOutlined /> Unit</span>, value: "unit" },
  { label: <span className="inline-flex items-center gap-1.5"><IdcardOutlined /> Emp type</span>, value: "empType" },
];

export default function EmployeeReportPage() {
  const r = useAttendanceReport();
  const [reportType, setReportType] = useState<ReportType>("monthly");
  const [groupBy, setGroupBy] = useState<GroupBy>("employee");

  useEffect(() => {
    void r.handleApply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo<AttendanceSummaryRow[]>(() => {
    switch (reportType) {
      case "absent":   return r.summary.filter((s) => s.absentDays > 0);
      case "late":     return r.summary.filter((s) => s.lateDays > 0);
      case "short":    return r.summary.filter((s) => s.totalShortfall > 0);
      case "overtime": return r.summary.filter((s) => s.totalOvertime > 0);
      default:         return r.summary;
    }
  }, [r.summary, reportType]);

  const deptColumns: CommonTableColumn<(typeof r.deptCompliance)[0]>[] = [
    { title: "Department", dataIndex: "department", key: "dept" },
    {
      title: "Present %",
      dataIndex: "presentPct",
      key: "presentPct",
      render: (v: number) => <span className="font-bold text-emerald-600">{v}%</span>,
    },
    {
      title: "Absent %",
      dataIndex: "absentPct",
      key: "absentPct",
      render: (v: number) => <span className="font-bold text-red-600">{v}%</span>,
    },
    {
      title: "Late",
      dataIndex: "late",
      key: "late",
      render: (v: number) => <span className="font-bold text-amber-600">{v}</span>,
    },
    {
      title: "Compliance",
      key: "compliance",
      render: (_: unknown, row: (typeof r.deptCompliance)[0]) => (
        <Tag color={row.color}>{row.text}</Tag>
      ),
    },
  ];

  const empColumns: CommonTableColumn<AttendanceSummaryRow>[] = [
    {
      title: "Employee",
      key: "emp",
      render: (_: unknown, row: AttendanceSummaryRow) => (
        <span>
          <span className="font-semibold text-zinc-900">{row.employeeName}</span>
          <span className="ml-2 text-[12px] text-zinc-500">{row.employeeId}</span>
        </span>
      ),
    },
    { title: "Dept", dataIndex: "department", key: "dept" },
    { title: "Shift", dataIndex: "primaryShift", key: "shift" },
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
    {
      title: "Overtime (h)",
      dataIndex: "totalOvertime",
      key: "ot",
      render: (v: number) => <span className="font-semibold text-emerald-600">{v.toFixed(1)}</span>,
    },
    {
      title: "Short (h)",
      dataIndex: "totalShortfall",
      key: "short",
      render: (v: number) => <span className="text-zinc-500">{v.toFixed(1)}</span>,
    },
  ];

  const tableProps = {
    bordered: true as const,
    size: "middle" as const,
    className: "attendance-report-table",
  };

  return (
    <div className="attendance-reports-page">
      {r.usingDummy && (
        <div className="rep-demo-banner">
          <ExperimentOutlined />
          Sample data — connect live punch records to replace these figures.
        </div>
      )}

      <RepHeader
        title="Employee Report"
        subtitle={`${r.rangeLabel} · monthly summary, absent, late, short hours & overtime`}
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
        shift={r.shift} setShift={r.setShift}
        unit={r.unit} setUnit={r.setUnit}
        period={r.period} setPeriod={r.setPeriod}
        departments={r.departments} units={r.units}
        loading={r.loading} onApply={r.handleApply}
      />

      <ReportSection title="Report type & grouping">
        <div className="attendance-report-config">
          <div>
            <span className="text-[11px] font-bold uppercase text-zinc-500 block mb-2">
              Report type
            </span>
            <div className="attendance-report-segmented-wrap">
              <Segmented
                options={REPORT_TYPES.map((t) => ({ label: t.label, value: t.value }))}
                value={reportType}
                onChange={(v) => setReportType(v as ReportType)}
                className="attendance-report-segmented"
              />
            </div>
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase text-zinc-500 block mb-2">
              Group by
            </span>
            <div className="attendance-report-segmented-wrap">
              <Segmented
                options={GROUP_OPTIONS}
                value={groupBy}
                onChange={(v) => setGroupBy(v as GroupBy)}
              />
            </div>
          </div>
        </div>
      </ReportSection>

      <ReportSection
        title="Employee summary"
        meta={`${r.rangeLabel} · ${r.workingDays} working days · ${filtered.length} employees`}
        flush
      >
        <CommonTable
          {...tableProps}
          columns={empColumns}
          dataSource={filtered}
          rowKey="employeeId"
          loading={r.loading}
          pagination={{ pageSize: 15, showSizeChanger: true }}
        />
      </ReportSection>

      <ReportSection
        title="Department compliance"
        meta={r.rangeLabel}
        footer="Good = 95%+ present · Review = 85–95% · Poor = below 85%"
        flush
      >
        <CommonTable
          {...tableProps}
          columns={deptColumns}
          dataSource={r.deptCompliance}
          rowKey="department"
          loading={r.loading}
          pagination={false}
        />
      </ReportSection>
    </div>
  );
}
