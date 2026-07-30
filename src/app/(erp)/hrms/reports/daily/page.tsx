"use client";

import { useEffect, useState } from "react";
import { Button, Space, Tag } from "antd";
import { DownloadOutlined, EyeOutlined, FileExcelOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import RepHeader from "@/components/hrms/RepHeader";
import CommonTable, { type CommonTableColumn } from "@/components/common/CommonTable";
import ReportSection from "@/components/hrms/ReportSection";
import AttendanceFilterPanel, {
  type PeriodOption,
} from "@/components/hrms/AttendanceFilterPanel";
import { TableActionIcon } from "@/components/common/TableActionIcons";
import { useAttendanceReport, type AttendanceDailyRow } from "@/hooks/use-attendance-report";
import { downloadDailyAttendanceReportPdf } from "@/lib/daily-attendance-report-pdf";
import { formatWorkedDuration } from "@/lib/format-duration";

function buildEmployeeReportHref(employeeId: string) {
  const params = new URLSearchParams({
    from: dayjs().startOf("month").format("YYYY-MM-DD"),
    to: dayjs().endOf("month").format("YYYY-MM-DD"),
  });
  return `/hrms/reports/employee/${encodeURIComponent(employeeId)}?${params}`;
}

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

// "H:MM" (e.g. 8.25 -> "8:15") to match the attendance register template.
function fmtHoursColon(decimalHours: number | null | undefined) {
  const hours = typeof decimalHours === "number" && Number.isFinite(decimalHours) ? decimalHours : 0;
  const totalMinutes = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

function attendanceStatusLabel(row: AttendanceDailyRow) {
  if (row.absent) return "Absent";
  if (!row.inAt || !row.outAt) return "Single Punch";
  return "Present";
}

function PunchLocationCell({
  address,
  lat,
  lng,
}: {
  address?: string;
  lat?: number | null;
  lng?: number | null;
}) {
  if (!address && (lat == null || lng == null)) return <span>—</span>;
  const label =
    address?.trim() ||
    (lat != null && lng != null ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : "—");
  if (lat != null && lng != null) {
    return (
      <a
        href={`https://www.google.com/maps?q=${lat},${lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[12px] text-[#374d95] hover:underline"
      >
        {label}
      </a>
    );
  }
  return <span className="text-[12px]">{label}</span>;
}

export default function DailyAttendancePage() {
  const r = useAttendanceReport({ variant: "daily" });
  const [exportingExcel, setExportingExcel] = useState(false);

  useEffect(() => {
    void r.handleApply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExportExcel = async () => {
    if (exportingExcel || r.daily.length === 0) return;
    try {
      setExportingExcel(true);
      const designationByEmployee = new Map(
        r.summary.map((s) => [s.employeeId, s.designation]),
      );

      const headers = [
        "Employee Id",
        "Employee Name",
        "Department",
        "Designation",
        "Location Unit",
        "Shift",
        "In Date",
        "In time",
        "Out Date",
        "Out time",
        "Working Hours",
        "Over Time",
        "Attendance Status",
        "Approval Status",
      ];
      const rows = r.daily.map((row) => [
        row.employeeId,
        row.employeeName,
        row.department,
        designationByEmployee.get(row.employeeId) ?? "",
        row.locationUnit ?? "",
        row.primaryShift ?? "",
        row.inAt ? dayjs(row.inAt).format("DD-MM-YYYY") : "",
        row.inAt ? dayjs(row.inAt).format("H:mm") : "0:00",
        row.outAt ? dayjs(row.outAt).format("DD-MM-YYYY") : "",
        row.outAt ? dayjs(row.outAt).format("H:mm") : "0:00",
        fmtHoursColon(row.workedHours),
        fmtHoursColon(row.overtime),
        attendanceStatusLabel(row),
        "",
      ]);

      const XLSX = await import("xlsx");
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws["!cols"] = headers.map((h, i) => {
        let maxLen = h.length;
        for (const row of rows) {
          const len = String(row[i] ?? "").length;
          if (len > maxLen) maxLen = len;
        }
        return { wch: Math.min(Math.max(maxLen + 2, 10), 42) };
      });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Attendance");
      XLSX.writeFile(wb, `daily-attendance-${dayjs().format("YYYY-MM-DD")}.xlsx`);
    } finally {
      setExportingExcel(false);
    }
  };

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
      title: "Punch in GPS",
      key: "inLoc",
      width: 180,
      render: (_: unknown, row: AttendanceDailyRow) => (
        <PunchLocationCell
          address={row.inAddress}
          lat={row.inLat}
          lng={row.inLng}
        />
      ),
    },
    {
      title: "Punch out GPS",
      key: "outLoc",
      width: 180,
      render: (_: unknown, row: AttendanceDailyRow) => (
        <PunchLocationCell
          address={row.outAddress}
          lat={row.outLat}
          lng={row.outLng}
        />
      ),
    },
    {
      title: "Worked",
      dataIndex: "workedHours",
      key: "worked",
      width: 100,
      render: (v: number) => formatWorkedDuration(v),
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
    {
      title: "Actions",
      key: "actions",
      width: 72,
      fixed: "right" as const,
      render: (_: unknown, row: AttendanceDailyRow) => {
        if (row.workLocationType === "Field" || row.workLocationType === "Onsite") {
          return (
            <TableActionIcon
              label="View monthly record"
              icon={<EyeOutlined />}
              href={buildEmployeeReportHref(row.employeeId)}
            />
          );
        }
        return null;
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
        title="Daily Attendance"
        subtitle={`${r.rangeLabel} · in/out times, GPS locations, worked hours & status per day`}
        actions={
          <Space>
            <Button
              icon={<FileExcelOutlined />}
              onClick={() => void handleExportExcel()}
              loading={exportingExcel}
              disabled={r.daily.length === 0}
            >
              Export Excel
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => downloadDailyAttendanceReportPdf(r.rangeLabel, r.daily)}
            >
              Export PDF
            </Button>
          </Space>
        }
      />

      <AttendanceFilterPanel
        range={r.range} setRange={r.setRange}
        dept={r.dept} setDept={r.setDept}
        employeeId={r.employeeId}
        setEmployeeId={r.setEmployeeId}
        unit={r.unit} setUnit={r.setUnit}
        period={r.period} setPeriod={r.setPeriod} defaultPeriod={r.defaultPeriod}
        departments={r.departments} units={r.units}
        loading={r.loading} onApply={r.handleApply} onClear={r.handleClearFilters}
        search={r.search} setSearch={r.setSearch}
        periodOptions={DAILY_PERIOD_OPTIONS}
        showShift={false}
        showEmployee
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
