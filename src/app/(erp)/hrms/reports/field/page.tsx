"use client";

import { useEffect } from "react";
import { Button } from "antd";
import { DownloadOutlined, BankOutlined, EnvironmentOutlined, ExperimentOutlined } from "@ant-design/icons";

import RepHeader from "@/components/hrms/RepHeader";
import StatCard from "@/components/common/StatCard";
import CommonTable, { type CommonTableColumn } from "@/components/common/CommonTable";
import ReportSection from "@/components/hrms/ReportSection";
import AttendanceFilterPanel from "@/components/hrms/AttendanceFilterPanel";
import { useAttendanceReport, type AttendanceSummaryRow } from "@/hooks/use-attendance-report";

export default function FieldAttendancePage() {
  const r = useAttendanceReport();

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
        /sales|field/i.test(row.department) ? 0 : row.presentDays,
    },
    {
      title: "Field days",
      key: "field",
      render: (_: unknown, row: AttendanceSummaryRow) =>
        /sales|field/i.test(row.department) ? (
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

      <AttendanceFilterPanel
        range={r.range} setRange={r.setRange}
        dept={r.dept} setDept={r.setDept}
        unit={r.unit} setUnit={r.setUnit}
        period={r.period} setPeriod={r.setPeriod}
        departments={r.departments} units={r.units}
        loading={r.loading} onApply={r.handleApply}
        showShift={false}
      />

      <div className="attendance-summary-grid">
        <StatCard
          icon={BankOutlined}
          label="In-office attendance"
          value={`${r.officeStats.inOfficePct}%`}
          hint={`${r.officeStats.totalEmployees - r.officeStats.fieldEmployees} employees · ${r.officeStats.inOfficeDays} days`}
          hintTone="positive"
        />
        <StatCard
          icon={EnvironmentOutlined}
          label="Field attendance"
          value={`${r.officeStats.fieldPct}%`}
          hint={`${r.officeStats.fieldEmployees} field employees · ${r.officeStats.fieldDays} days`}
          hintTone="positive"
        />
      </div>

      <ReportSection
        title="Field employee breakdown"
        meta={`${r.rangeLabel} · field staff only · ${r.fieldRows.length} employees`}
        footer="Field days = punches marked as Field (outside office). In-office = at plant/office."
        flush
      >
        <CommonTable
          {...tableProps}
          columns={columns}
          dataSource={r.fieldRows}
          rowKey="employeeId"
          loading={r.loading}
          pagination={{ pageSize: 15, showSizeChanger: true }}
        />
      </ReportSection>
    </div>
  );
}
