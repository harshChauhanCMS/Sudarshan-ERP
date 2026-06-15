"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "antd";
import dayjs from "dayjs";
import {
  DownloadOutlined,
  EyeOutlined,
  UserOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  BankOutlined,
  IdcardOutlined,
} from "@ant-design/icons";

import RepHeader from "@/components/hrms/RepHeader";
import CommonTable, {
  type CommonTableColumn,
} from "@/components/common/CommonTable";
import { TableActionIcon } from "@/components/common/TableActionIcons";
import ReportSection from "@/components/hrms/ReportSection";
import ReportChoiceChips, {
  type ReportChipOption,
} from "@/components/hrms/ReportChoiceChips";
import AttendanceFilterPanel from "@/components/hrms/AttendanceFilterPanel";
import {
  useAttendanceReport,
  type AttendanceSummaryRow,
} from "@/hooks/use-attendance-report";

type ReportType = "monthly" | "absent" | "late" | "short" | "overtime";
type GroupBy = "employee" | "department" | "shift" | "unit" | "empType";

const REPORT_TYPE_CHIPS: ReportChipOption<ReportType>[] = [
  { value: "monthly", label: "Monthly summary", tone: "blue" },
  { value: "absent", label: "Absent", tone: "red" },
  { value: "late", label: "Late coming", tone: "amber" },
  { value: "short", label: "Short hours", tone: "orange" },
  { value: "overtime", label: "Overtime", tone: "emerald" },
];

function formatJoiningDate(value?: string) {
  if (!value) return "—";
  const parsed = dayjs(value, ["DD/MM/YYYY", "YYYY-MM-DD"], true);
  return parsed.isValid() ? parsed.format("DD MMM YYYY") : value;
}

const GROUP_CHIPS: ReportChipOption<GroupBy>[] = [
  {
    value: "employee",
    tone: "indigo",
    label: (
      <span className="report-chip__label">
        <UserOutlined /> Employee
      </span>
    ),
  },
  {
    value: "department",
    tone: "violet",
    label: (
      <span className="report-chip__label">
        <TeamOutlined /> Department
      </span>
    ),
  },
  {
    value: "shift",
    tone: "cyan",
    label: (
      <span className="report-chip__label">
        <ClockCircleOutlined /> Shift
      </span>
    ),
  },
  {
    value: "unit",
    tone: "teal",
    label: (
      <span className="report-chip__label">
        <BankOutlined /> Unit
      </span>
    ),
  },
  {
    value: "empType",
    tone: "rose",
    label: (
      <span className="report-chip__label">
        <IdcardOutlined /> Emp type
      </span>
    ),
  },
];

export default function EmployeeReportPage() {
  const r = useAttendanceReport();
  const [reportType, setReportType] = useState<ReportType>("monthly");
  const [groupBy, setGroupBy] = useState<GroupBy>("employee");

  const buildReportHref = (row: AttendanceSummaryRow) => {
    const params = new URLSearchParams({
      from: r.range[0].format("YYYY-MM-DD"),
      to: r.range[1].format("YYYY-MM-DD"),
    });
    return `/hrms/reports/employee/${encodeURIComponent(row.employeeId)}?${params}`;
  };

  useEffect(() => {
    void r.handleApply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo<AttendanceSummaryRow[]>(() => {
    switch (reportType) {
      case "absent":
        return r.summary.filter((s) => s.absentDays > 0);
      case "late":
        return r.summary.filter((s) => s.lateDays > 0);
      case "short":
        return r.summary.filter((s) => s.totalShortfall > 0);
      case "overtime":
        return r.summary.filter((s) => s.totalOvertime > 0);
      default:
        return r.summary;
    }
  }, [r.summary, reportType]);

  const empColumns: CommonTableColumn<AttendanceSummaryRow>[] = [
    {
      title: "Employee",
      key: "emp",
      render: (_: unknown, row: AttendanceSummaryRow) => (
        <span>
          <span className="font-semibold text-zinc-900">
            {row.employeeName}
          </span>
          <span className="ml-2 text-[12px] text-zinc-500">
            {row.employeeId}
          </span>
        </span>
      ),
    },
    { title: "Dept", dataIndex: "department", key: "dept" },
    {
      title: "Joining date",
      dataIndex: "dateJoining",
      key: "joining",
      render: (v: string | undefined) => (
        <span className="text-zinc-600">{formatJoiningDate(v)}</span>
      ),
    },
    { title: "Shift", dataIndex: "primaryShift", key: "shift" },
    {
      title: "Present",
      dataIndex: "presentDays",
      key: "present",
      render: (v: number) => (
        <span className="font-bold text-emerald-600">{v}</span>
      ),
    },
    {
      title: "Absent",
      dataIndex: "absentDays",
      key: "absent",
      render: (v: number) => (
        <span className="font-bold text-red-600">{v}</span>
      ),
    },
    {
      title: "Late",
      dataIndex: "lateDays",
      key: "late",
      render: (v: number) => (
        <span className="font-bold text-amber-600">{v}</span>
      ),
    },
    {
      title: "Overtime (h)",
      dataIndex: "totalOvertime",
      key: "ot",
      render: (v: number) => (
        <span className="font-semibold text-emerald-600">{v.toFixed(1)}</span>
      ),
    },
    {
      title: "Short (h)",
      dataIndex: "totalShortfall",
      key: "short",
      render: (v: number) => (
        <span className="text-zinc-500">{v.toFixed(1)}</span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 72,
      fixed: "right" as const,
      render: (_: unknown, row: AttendanceSummaryRow) => (
        <TableActionIcon
          label="View report"
          icon={<EyeOutlined />}
          href={buildReportHref(row)}
        />
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
        title="Employee Report"
        subtitle={`${r.rangeLabel} · monthly summary, absent, late, short hours & overtime`}
        actions={
          <Button
            icon={<DownloadOutlined />}
            onClick={() =>
              window.open(
                `/api/hrms/attendance/report.csv?${r.buildCsvUrl()}`,
                "_blank",
              )
            }
          >
            Export
          </Button>
        }
      />

      <AttendanceFilterPanel
        range={r.range}
        setRange={r.setRange}
        dept={r.dept}
        setDept={r.setDept}
        shift={r.shift}
        setShift={r.setShift}
        unit={r.unit}
        setUnit={r.setUnit}
        period={r.period}
        setPeriod={r.setPeriod}
        departments={r.departments}
        units={r.units}
        loading={r.loading}
        onApply={r.handleApply}
        onClear={r.handleClearFilters}
        search={r.search}
        setSearch={r.setSearch}
        splitApplyRow
      />

      <ReportSection title="Report type & grouping">
        <div className="attendance-report-config attendance-report-config--split">
          <div className="attendance-report-config__block">
            <span className="attendance-report-config__label">Report type</span>
            <ReportChoiceChips
              aria-label="Report type"
              options={REPORT_TYPE_CHIPS}
              value={reportType}
              onChange={setReportType}
            />
          </div>
          <div className="attendance-report-config__block">
            <span className="attendance-report-config__label">Group by</span>
            <ReportChoiceChips
              aria-label="Group by"
              options={GROUP_CHIPS}
              value={groupBy}
              onChange={setGroupBy}
            />
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
          scroll={{ x: 1200 }}
        />
      </ReportSection>
    </div>
  );
}
