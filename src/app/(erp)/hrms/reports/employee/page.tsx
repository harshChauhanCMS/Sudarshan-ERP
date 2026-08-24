"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, message } from "antd";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import {
  DownloadOutlined,
  EyeOutlined,
  UserOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  BankOutlined,
  IdcardOutlined,
  FileExcelOutlined,
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

type MusterRow = {
  employeeId: string;
  employeeName: string;
  department: string;
  designation: string;
  locationUnit: string;
  cells: string[];
  present: number;
  halfDay: number;
  weekoff: number;
  pl: number;
  cl: number;
  sl: number;
  compOff: number;
  absent: number;
  otHours: string;
  paydays: number;
};

export default function EmployeeReportPage() {
  const r = useAttendanceReport();
  const [reportType, setReportType] = useState<ReportType>("monthly");
  const [groupBy, setGroupBy] = useState<GroupBy>("employee");
  const [musterLoading, setMusterLoading] = useState(false);

  const buildReportHref = (row: AttendanceSummaryRow) => {
    const params = new URLSearchParams({
      from: r.range[0].format("YYYY-MM-DD"),
      to: r.range[1].format("YYYY-MM-DD"),
    });
    return `/hrms/reports/employee/${encodeURIComponent(row.employeeId)}?${params}`;
  };

  const exportMuster = async () => {
    setMusterLoading(true);
    try {
      const res = await fetch(`/api/hrms/attendance/muster?${r.buildCsvUrl()}`);
      const json = await res.json();
      if (!res.ok || json?.error) {
        throw new Error(json?.error || "Failed to build muster");
      }

      const dateColumns: string[] = json.data.dateColumns ?? [];
      const rows: MusterRow[] = json.data.rows ?? [];

      const header = [
        "Employee Id",
        "Employee Name",
        "Department",
        "Designation",
        "Location Unit",
        ...dateColumns,
        "Present",
        "Half Day",
        "Weekoff",
        "PL",
        "CL",
        "SL",
        "Comp Off",
        "Absent",
        "OT Hours",
        "Paydays",
      ];

      const body = rows.map((row) => [
        row.employeeId,
        row.employeeName,
        row.department,
        row.designation,
        row.locationUnit,
        ...row.cells,
        row.present,
        row.halfDay,
        row.weekoff,
        row.pl,
        row.cl,
        row.sl,
        row.compOff,
        row.absent,
        row.otHours,
        row.paydays,
      ]);

      const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Muster");
      XLSX.writeFile(
        wb,
        `muster_${json.data.from}_to_${json.data.to}.xlsx`,
      );
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to export muster");
    } finally {
      setMusterLoading(false);
    }
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

  const groupedData = useMemo(() => {
    if (groupBy === "employee") return filtered;

    const map = new Map<
      string,
      AttendanceSummaryRow & { children?: AttendanceSummaryRow[] }
    >();
    filtered.forEach((row) => {
      let key = "Unknown";
      if (groupBy === "department") key = row.department || "Unknown";
      else if (groupBy === "shift") key = row.primaryShift || "Unknown";
      else if (groupBy === "unit") key = row.locationUnit || "Unknown";
      else if (groupBy === "empType") key = "Regular";

      if (!map.has(key)) {
        map.set(key, {
          employeeId: `group-${key}`,
          employeeName: key,
          department: groupBy === "department" ? key : "",
          designation: "",
          locationUnit: groupBy === "unit" ? key : "",
          primaryShift: groupBy === "shift" ? key : "",
          dateJoining: "",
          totalDays: 0,
          presentDays: 0,
          absentDays: 0,
          lateDays: 0,
          totalWorkedHours: 0,
          totalShortfall: 0,
          totalOvertime: 0,
          children: [],
        });
      }
      const group = map.get(key)!;
      group.totalDays = Math.max(group.totalDays, row.totalDays);
      group.presentDays += row.presentDays;
      group.absentDays += row.absentDays;
      group.lateDays += row.lateDays;
      group.totalWorkedHours += row.totalWorkedHours;
      group.totalShortfall += row.totalShortfall;
      group.totalOvertime += row.totalOvertime;
      group.children!.push(row);
    });
    return Array.from(map.values());
  }, [filtered, groupBy]);

  const empColumns: CommonTableColumn<
    AttendanceSummaryRow & { children?: any }
  >[] = [
    {
      title: "Employee ID",
      dataIndex: "employeeId",
      key: "empId",
      width: 120,
      render: (v: string) => {
        if (v.startsWith("group-"))
          return (
            <span className="font-bold text-zinc-400 uppercase text-xs tracking-wider">
              GROUP
            </span>
          );
        return <span className="font-medium text-zinc-800">{v}</span>;
      },
    },
    {
      title: "Employee",
      width: 150,
      key: "emp",
      render: (_: unknown, row: AttendanceSummaryRow & { children?: any }) => {
        if (row.children) {
          return (
            <span className="font-bold text-zinc-900">
              {row.employeeName} ({row.children.length})
            </span>
          );
        }
        return (
          <span className="font-semibold text-zinc-900">
            {row.employeeName}
          </span>
        );
      },
    },
    {
      title: "Dept",
      width: 150,
      dataIndex: "department",
      key: "dept",
    },
    {
      title: "Joining date",
      width: 170,
      dataIndex: "dateJoining",
      key: "joining",
      render: (v: string | undefined) => (
        <span className="text-zinc-600">{formatJoiningDate(v)}</span>
      ),
    },
    {
      title: "Shift",
      width: 200,
      dataIndex: "primaryShift",
      key: "shift",
    },
    {
      title: "Present",
      width: 120,
      dataIndex: "presentDays",
      key: "present",
      render: (v: number) => (
        <span className="font-bold text-emerald-600">{v}</span>
      ),
    },
    {
      title: "Absent",
      width: 120,
      dataIndex: "absentDays",
      key: "absent",
      render: (v: number) => (
        <span className="font-bold text-red-600">{v}</span>
      ),
    },
    {
      title: "Late",
      width: 120,
      dataIndex: "lateDays",
      key: "late",
      render: (v: number) => (
        <span className="font-bold text-amber-600">{v}</span>
      ),
    },
    {
      title: "Overtime (h)",
      width: 120,
      dataIndex: "totalOvertime",
      key: "ot",
      render: (v: number) => (
        <span className="font-semibold text-emerald-600">{v.toFixed(1)}</span>
      ),
    },
    {
      title: "Short (h)",
      width: 120,
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
      render: (_: unknown, row: AttendanceSummaryRow & { children?: any }) => {
        if (row.children) return null;
        return (
          <TableActionIcon
            label="View report"
            icon={<EyeOutlined />}
            href={buildReportHref(row)}
          />
        );
      },
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
        title="Employee Report"
        subtitle={`${r.rangeLabel} · monthly summary, absent, late, short hours & overtime`}
        actions={
          <>
            <Button
              icon={<FileExcelOutlined />}
              loading={musterLoading}
              onClick={exportMuster}
            >
              Muster Export
            </Button>
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
          </>
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
          dataSource={groupedData}
          rowKey="employeeId"
          loading={r.loading}
          pagination={{ pageSize: 15, showSizeChanger: true }}
          scroll={{ x: 1200 }}
        />
      </ReportSection>
    </div>
  );
}
