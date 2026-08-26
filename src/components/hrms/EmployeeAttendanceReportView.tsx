"use client";

import { useMemo, useState } from "react";
import { Button, Segmented, Tag, message, Select } from "antd";
import AttendanceCalendarView from "@/components/hrms/AttendanceCalendarView";
import PageFilterPanel from "@/components/common/PageFilterPanel";
import { FilePdfOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import CommonTable, {
  type CommonTableColumn,
} from "@/components/common/CommonTable";
import ReportSection from "@/components/hrms/ReportSection";
import { useEmployeeAttendanceReport } from "@/hooks/use-employee-attendance-report";
import { downloadEmployeeAttendanceReportPdf } from "@/lib/employee-attendance-report-pdf";
import { formatWorkedDuration } from "@/lib/format-duration";
import type { EmployeeDailyReportRow } from "@/lib/employee-attendance-report";

type Props = {
  employeeId: string;
  from: string;
  to: string;
  rangeLabel: string;
};

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return dayjs(iso).format("HH:mm");
}

function LateChart({ data }: { data: { label: string; late: number }[] }) {
  return (
    <div className="chart-frame">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} domain={[0, 1]} />
          <Tooltip formatter={(v) => [Number(v) ? "Late" : "On time", "Status"]} />
          <Legend />
          <Bar dataKey="late" name="Late" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function LeaveChart({ data }: { data: { label: string; leave: number }[] }) {
  return (
    <div className="chart-frame">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} domain={[0, 1]} />
          <Tooltip formatter={(v) => [Number(v) ? "On leave" : "—", "Leave"]} />
          <Legend />
          <Bar dataKey="leave" name="Leave" fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function EmployeeAttendanceReportView({
  employeeId,
  from,
  to,
  rangeLabel,
}: Props) {
  const { loading, rows, holidays, chartData, summary, employee } =
    useEmployeeAttendanceReport(employeeId, from, to);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState<"table" | "calendar">("table");

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all") {
        if (statusFilter === "Present" && !r.present) return false;
        if (statusFilter === "Absent" && !r.absent) return false;
        if (statusFilter === "Late" && !r.late) return false;
        if (statusFilter === "On leave" && !r.onLeave) return false;
      }
      if (search) {
        const term = search.toLowerCase();
        const dateStr = dayjs(r.day).format("YYYY-MM-DD");
        
        let statusStr = "";
        if (r.present) statusStr += " present";
        if (r.absent) statusStr += " absent";
        if (r.late) statusStr += " late";
        if (r.onLeave) statusStr += " on leave";

        if (!dateStr.includes(term) && !statusStr.includes(term)) {
          return false;
        }
      }
      return true;
    });
  }, [rows, search, statusFilter]);

  const columns: CommonTableColumn<EmployeeDailyReportRow>[] = useMemo(
    () => [
      {
        title: "Date",
        dataIndex: "day",
        key: "day",
        width: 120,
        render: (v: string) => (
          <span className="font-medium">{dayjs(v).format("DD MMM YYYY")}</span>
        ),
      },
      {
        title: "Day",
        key: "weekday",
        width: 90,
        render: (_: unknown, row: EmployeeDailyReportRow) =>
          dayjs(row.day).format("ddd"),
      },
      {
        title: "In",
        dataIndex: "inAt",
        key: "in",
        width: 72,
        render: (v: string | null) => (
          <span className="font-semibold text-emerald-600">{fmtTime(v)}</span>
        ),
      },
      {
        title: "Out",
        dataIndex: "outAt",
        key: "out",
        width: 72,
        render: (v: string | null) => (
          <span className="font-semibold text-red-600">{fmtTime(v)}</span>
        ),
      },
      {
        title: "Worked",
        dataIndex: "workedHours",
        key: "worked",
        width: 96,
        render: (v: number) => formatWorkedDuration(v),
      },
      {
        title: "Attendance",
        key: "attendance",
        width: 180,
        render: (_: unknown, row: EmployeeDailyReportRow) => (
          <div className="flex gap-1 flex-wrap">
            {row.onLeave && <Tag color="purple">Leave</Tag>}
            {row.absent && !row.onLeave && <Tag color="red">Absent</Tag>}
            {row.present && <Tag color="green">Present</Tag>}
            {row.late && <Tag color="orange">Late</Tag>}
          </div>
        ),
      },
      {
        title: "Leave type",
        key: "leaveType",
        width: 140,
        render: (_: unknown, row: EmployeeDailyReportRow) =>
          row.leaveLabel ? (
            <span className="text-indigo-700 font-medium">{row.leaveLabel}</span>
          ) : (
            "—"
          ),
      },
    ],
    [],
  );

  const exportPdf = async () => {
    if (!employee) return;
    setExportingPdf(true);
    try {
      downloadEmployeeAttendanceReportPdf(employee, rangeLabel, rows);
      message.success("Report PDF downloaded");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to export PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="employee-attendance-report">
      {employee && (
        <p className="text-[13px] text-zinc-500 mb-4">
          {rangeLabel}
          {employee.department ? ` · ${employee.department}` : ""}
          {employee.primaryShift ? ` · ${employee.primaryShift}` : ""}
          {" · "}
          {summary.present} present · {summary.absent} absent · {summary.late}{" "}
          late · {summary.leave} leave days
        </p>
      )}

      <div className="attendance-charts-grid employee-attendance-report-modal__charts">
        <div>
          <h3 className="employee-attendance-report-modal__chart-title">
            Late by day
          </h3>
          <LateChart data={chartData} />
        </div>
        <div>
          <h3 className="employee-attendance-report-modal__chart-title">
            Leave by day
          </h3>
          <LeaveChart data={chartData} />
        </div>
      </div>

      <ReportSection
        title="Daily attendance"
        meta={`${rangeLabel} · ${rows.length} day records`}
        flush
      >
        <div className="att-cal__viewswitch">
          <Segmented
            value={view}
            onChange={(v) => setView(v as "table" | "calendar")}
            options={[
              { label: "Table view", value: "table" },
              { label: "Calendar view", value: "calendar" },
            ]}
          />
        </div>
        {view === "calendar" ? (
          <div style={{ padding: 16 }}>
            <AttendanceCalendarView
              rows={rows}
              holidays={holidays}
              from={from}
              to={to}
              loading={loading}
              weeklyOff={employee?.weeklyOff}
            />
          </div>
        ) : (
        <>
        <PageFilterPanel
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search date or status…"
          activeFilterCount={statusFilter !== "all" ? 1 : 0}
          onApply={() => {}}
          onClear={() => {
            setSearch("");
            setStatusFilter("all");
          }}
          drawerWidth={320}
          trailing={
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              loading={exportingPdf}
              disabled={!employee || rows.length === 0}
              onClick={() => void exportPdf()}
            >
              Export PDF
            </Button>
          }
        >
          <div className="arf-item">
            <span className="arf-label">Status</span>
            <Select
              className="w-full"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All statuses" },
                { value: "Present", label: "Present" },
                { value: "Absent", label: "Absent" },
                { value: "Late", label: "Late" },
                { value: "On leave", label: "On leave" },
              ]}
            />
          </div>
        </PageFilterPanel>
        <CommonTable
          bordered
          size="middle"
          className="attendance-report-table"
          loading={loading}
          columns={columns}
          dataSource={filteredRows}
          rowKey="day"
          pagination={{ pageSize: 15, showSizeChanger: true }}
          scroll={{ x: 820 }}
          locale={{
            emptyText: loading ? "Loading…" : "No daily records for this period",
          }}
        />
        </>
        )}
      </ReportSection>
    </div>
  );
}
