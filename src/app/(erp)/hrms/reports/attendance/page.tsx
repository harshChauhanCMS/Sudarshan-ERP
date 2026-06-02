"use client";

import { useEffect } from "react";
import { Button, Tag } from "antd";
import {
  DownloadOutlined,
  BankOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  FilterOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ExperimentOutlined,
} from "@ant-design/icons";

import RepHeader from "@/components/hrms/RepHeader";
import StatCard from "@/components/common/StatCard";
import CommonTable, { type CommonTableColumn } from "@/components/common/CommonTable";
import ReportSection from "@/components/hrms/ReportSection";
import AttendanceFilterPanel from "@/components/hrms/AttendanceFilterPanel";
import {
  AttendanceTrendChart,
  DepartmentBreakdownChart,
} from "@/components/hrms/AttendanceReportCharts";
import { useAttendanceReport } from "@/hooks/use-attendance-report";

export default function AttendanceOverviewPage() {
  const r = useAttendanceReport();

  useEffect(() => {
    void r.handleApply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const presentAvg =
    r.kpi && r.kpi.totalEmployees
      ? (r.kpi.presentDays / r.kpi.totalEmployees).toFixed(1)
      : "0";

  const unitColumns: CommonTableColumn<(typeof r.unitTable)[0]>[] = [
    { title: "Company / Unit", dataIndex: "unit", key: "unit" },
    { title: "Employees", dataIndex: "employees", key: "employees" },
    {
      title: "Present days",
      dataIndex: "present",
      key: "present",
      render: (v: number) => <span className="font-bold text-emerald-600">{v}</span>,
    },
    {
      title: "Absent",
      dataIndex: "absent",
      key: "absent",
      render: (v: number) => <span className="font-bold text-red-600">{v}</span>,
    },
    {
      title: "Late",
      dataIndex: "late",
      key: "late",
      render: (v: number) => <span className="font-bold text-amber-600">{v}</span>,
    },
    { title: "In office", dataIndex: "inOffice", key: "inOffice" },
    {
      title: "Field days",
      dataIndex: "fieldDays",
      key: "field",
      render: (v: number) => <span className="font-bold text-emerald-600">{v}</span>,
    },
    {
      title: "Compliance",
      dataIndex: "compliance",
      key: "compliance",
      render: (v: number) => `${v}%`,
    },
  ];

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
      title: "Late (count)",
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
        title="Attendance Overview"
        subtitle={`${r.rangeLabel} · KPIs, weekly trends & department compliance`}
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

      <div className="attendance-kpi-grid">
        <StatCard
          icon={CheckCircleOutlined}
          label="Present days (avg)"
          value={presentAvg}
          hint={`${r.rangeLabel} · ${r.workingDays} working days`}
          hintTone="positive"
        />
        <StatCard
          icon={TeamOutlined}
          label="Absent days (total)"
          value={String(r.kpi?.absentDays ?? 0)}
          hint={`Across ${r.kpi?.totalEmployees ?? 0} employees`}
        />
        <StatCard
          icon={ClockCircleOutlined}
          label="Late punches"
          value={String(r.kpi?.lateDays ?? 0)}
          hint="Across all shifts"
          hintTone="warning"
        />
        <StatCard
          icon={FilterOutlined}
          label="Short hours (total)"
          value={r.kpi?.totalShortfall.toFixed(1) ?? "0"}
          hint="Below required hrs"
        />
        <StatCard
          icon={ReloadOutlined}
          label="Overtime hours"
          value={r.kpi?.totalOvertime.toFixed(0) ?? "0"}
          hint="Approved OT"
          hintTone="positive"
        />
      </div>

      <div className="attendance-summary-grid">
        <StatCard
          icon={BankOutlined}
          label="In-office attendance"
          value={`${r.officeStats.inOfficePct}%`}
          hint={`${r.officeStats.totalEmployees - r.officeStats.fieldEmployees} employees · ${r.officeStats.inOfficeDays} present days`}
          hintTone="positive"
        />
        <StatCard
          icon={EnvironmentOutlined}
          label="Field attendance"
          value={`${r.officeStats.fieldPct}%`}
          hint={`${r.officeStats.fieldEmployees} field employees · ${r.officeStats.fieldDays} field days`}
          hintTone="positive"
        />
      </div>

      <ReportSection
        title="Attendance summary by unit"
        meta={`${r.rangeLabel} · company / unit breakdown`}
        flush
      >
        <CommonTable
          {...tableProps}
          columns={unitColumns}
          dataSource={r.unitTable}
          rowKey="unit"
          loading={r.loading}
          pagination={false}
        />
      </ReportSection>

      <div className="attendance-charts-grid">
        <ReportSection
          title="Weekly trend"
          meta={`${r.rangeLabel} · present vs absent by week`}
        >
          <AttendanceTrendChart data={r.weeklyTrend} />
        </ReportSection>
        <ReportSection title="Department breakdown" meta="Present % by department">
          <DepartmentBreakdownChart data={r.deptBreakdown} />
        </ReportSection>
      </div>

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

      {r.gpsSummary && (
        <div className="attendance-gps-banner">
          <p className="attendance-gps-banner__title">
            GPS punch summary ({r.rangeLabel})
          </p>
          <p className="attendance-gps-banner__text">
            {r.gpsSummary.gpsPunches.toLocaleString()} punches via GPS ·{" "}
            {r.gpsSummary.biometricPunches.toLocaleString()} via biometric —{" "}
            {r.gpsSummary.gpsPercent}% GPS
          </p>
        </div>
      )}
    </div>
  );
}
