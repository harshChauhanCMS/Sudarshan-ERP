"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Button,
  DatePicker,
  InputNumber,
  Select,
  Segmented,
  Tag,
  Progress,
} from "antd";
import {
  DownloadOutlined,
  FilterOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  BankOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import dayjs from "dayjs";

import RepHeader from "@/components/hrms/RepHeader";
import StatCard from "@/components/common/StatCard";
import CommonTable, {
  type CommonTableColumn,
} from "@/components/common/CommonTable";
import {
  getLateEarlyReportDummy,
  type LateEarlyEmployeeRow,
  type LateEarlyDeptRow,
  type LateEarlyShiftRow,
  type LateEarlyUnitRow,
} from "@/lib/late-early-report-dummy";

type GroupBy = "employee" | "department" | "shift" | "unit" | "trend";

function ReportSection({
  title,
  meta,
  flush,
  children,
}: {
  title: string;
  meta?: string;
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="attendance-report-section">
      <div className="attendance-report-section__head">
        <h2 className="attendance-report-section__head-title">{title}</h2>
        {meta && (
          <span className="attendance-report-section__head-meta">{meta}</span>
        )}
      </div>
      <div
        className={
          flush
            ? "attendance-report-section__body attendance-report-section__body--flush"
            : "attendance-report-section__body"
        }
      >
        {children}
      </div>
    </section>
  );
}

function PatternBars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-0.5 h-5" title="Weekly late pattern">
      {values.map((v, i) => (
        <div
          key={i}
          className="w-1.5 rounded-sm"
          style={{
            height: `${Math.max(20, (v / max) * 100)}%`,
            background: v >= 3 ? "#dc2626" : v >= 1 ? "#d97706" : "#e4e4e7",
          }}
        />
      ))}
    </div>
  );
}

function complianceColor(pct: number) {
  if (pct >= 85) return "#059669";
  if (pct >= 75) return "#d97706";
  return "#dc2626";
}

export default function LateEarlyReportPage() {
  const demo = getLateEarlyReportDummy();
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [company, setCompany] = useState("all");
  const [dept, setDept] = useState("all");
  const [shift, setShift] = useState("all");
  const [reportType, setReportType] = useState("both");
  const [minMinutes, setMinMinutes] = useState(5);
  const [groupBy, setGroupBy] = useState<GroupBy>("employee");
  const [applied, setApplied] = useState({
    dept: "all",
    shift: "all",
    minMinutes: 5,
  });

  const employees = useMemo(() => {
    return demo.employees.filter((e) => {
      if (applied.dept !== "all" && e.department !== applied.dept) return false;
      if (applied.shift !== "all" && !e.shift.includes(applied.shift)) {
        return false;
      }
      if (
        e.avgLateMins < applied.minMinutes &&
        e.totalEarlyMins < applied.minMinutes
      ) {
        return false;
      }
      if (reportType === "late" && e.latePunches === 0) return false;
      if (reportType === "early" && e.earlyGoing === 0) return false;
      if (reportType === "both" && e.latePunches === 0 && e.earlyGoing === 0) {
        return false;
      }
      return true;
    });
  }, [demo.employees, applied, reportType]);

  const tableProps = {
    bordered: true as const,
    size: "middle" as const,
    className: "attendance-report-table",
  };

  const employeeColumns: CommonTableColumn<LateEarlyEmployeeRow>[] = [
    {
      title: "Employee",
      key: "emp",
      render: (_, r) => (
        <div>
          <div className="font-semibold text-zinc-900">
            {r.employeeName}
            {r.repeatOffender && (
              <Tag color="orange" className="ml-2 text-[10px]">
                Repeat
              </Tag>
            )}
            {r.critical && (
              <Tag color="red" className="ml-1 text-[10px]">
                Critical
              </Tag>
            )}
          </div>
          <span className="text-[12px] text-zinc-500">{r.employeeId}</span>
        </div>
      ),
    },
    { title: "Department", dataIndex: "department", key: "dept" },
    { title: "Shift", dataIndex: "shift", key: "shift", width: 100 },
    { title: "Unit", dataIndex: "unit", key: "unit", width: 90 },
    {
      title: "Late punches",
      dataIndex: "latePunches",
      key: "late",
      render: (v: number) => (
        <span className="font-bold text-zinc-800">{v}</span>
      ),
    },
    {
      title: "Total late mins",
      dataIndex: "totalLateMins",
      key: "lateMins",
      render: (v: number) => (
        <span className="font-bold text-red-600">{v}</span>
      ),
    },
    {
      title: "Avg late",
      dataIndex: "avgLateMins",
      key: "avgLate",
      render: (v: number) => (
        <span className="font-semibold text-amber-600">{v} min</span>
      ),
    },
    {
      title: "Early going",
      dataIndex: "earlyGoing",
      key: "early",
      render: (v: number) => v || "—",
    },
    {
      title: "Total early mins",
      dataIndex: "totalEarlyMins",
      key: "earlyMins",
      render: (v: number) =>
        v > 0 ? (
          <span className="font-bold text-red-600">{v}</span>
        ) : (
          <span className="text-zinc-400">—</span>
        ),
    },
    {
      title: "Pattern",
      key: "pattern",
      width: 90,
      render: (_, r) => <PatternBars values={r.pattern} />,
    },
  ];

  const deptColumns: CommonTableColumn<LateEarlyDeptRow>[] = [
    { title: "Department", dataIndex: "department", key: "dept" },
    { title: "Headcount", dataIndex: "headcount", key: "hc" },
    {
      title: "Late incidents",
      dataIndex: "lateIncidents",
      key: "li",
      render: (v: number) => (
        <span className="font-bold text-zinc-800">{v}</span>
      ),
    },
    {
      title: "Late mins (total)",
      dataIndex: "lateMinsTotal",
      key: "lm",
      render: (v: number) => (
        <span
          className="font-bold"
          style={{ color: v > 300 ? "#dc2626" : "#d97706" }}
        >
          {v}
        </span>
      ),
    },
    {
      title: "Avg late / emp",
      dataIndex: "avgLatePerEmp",
      key: "ale",
      render: (v: number) => <span className="text-amber-600">{v} min</span>,
    },
    {
      title: "Early-going incidents",
      dataIndex: "earlyGoingIncidents",
      key: "eg",
    },
    {
      title: "Compliance %",
      key: "comp",
      render: (_, r) => (
        <div className="flex items-center gap-2 min-w-[120px]">
          <Progress
            percent={r.compliancePct}
            size="small"
            showInfo={false}
            strokeColor={complianceColor(r.compliancePct)}
          />
          <span
            className="font-semibold text-[13px]"
            style={{ color: complianceColor(r.compliancePct) }}
          >
            {r.compliancePct}%
          </span>
        </div>
      ),
    },
  ];

  const shiftColumns: CommonTableColumn<LateEarlyShiftRow>[] = [
    { title: "Shift", dataIndex: "shift", key: "shift" },
    { title: "Late incidents", dataIndex: "lateIncidents", key: "li" },
    {
      title: "Avg late mins",
      dataIndex: "avgLateMins",
      key: "alm",
      render: (v: number) => (
        <span className="font-bold text-amber-600">{v}</span>
      ),
    },
    { title: "Early-going", dataIndex: "earlyGoing", key: "eg" },
  ];

  const unitColumns: CommonTableColumn<LateEarlyUnitRow>[] = [
    { title: "Unit", dataIndex: "unit", key: "unit" },
    { title: "Headcount", dataIndex: "headcount", key: "hc" },
    { title: "Late", dataIndex: "late", key: "late" },
    { title: "Early", dataIndex: "early", key: "early" },
    {
      title: "Compliance",
      dataIndex: "compliancePct",
      key: "comp",
      render: (v: number) => (
        <span
          className="font-semibold"
          style={{ color: complianceColor(v) }}
        >
          {v}%
        </span>
      ),
    },
  ];

  const { kpi } = demo;

  return (
    <div className="attendance-reports-page">
      <div className="rep-demo-banner">
        <UnorderedListOutlined />
        Sample data — connect live punch records to replace these figures.
      </div>

      <RepHeader
        title="Late Coming / Early Going"
        subtitle="Discipline view — late punches & early exits by employee, dept, shift & unit"
        actions={<Button icon={<DownloadOutlined />}>Export Excel</Button>}
      />

      <div className="arf-panel">
        <div className="arf-head">
          <FilterOutlined style={{ color: "var(--primary)", fontSize: 12 }} />
          <span className="arf-head-title">Filters</span>
        </div>

        <div className="arf-body">
        <div className="arf-controls">
          <div className="arf-item">
            <span className="arf-label">Company / unit</span>
            <Select
              className="w-full"
              value={company}
              onChange={setCompany}
              options={[
                { value: "all", label: "All units" },
                { value: "udaipur", label: "Udaipur" },
                { value: "makrana", label: "Makrana" },
              ]}
            />
          </div>
          <div className="arf-item">
            <span className="arf-label">Department</span>
            <Select
              className="w-full"
              value={dept}
              onChange={setDept}
              options={[
                { value: "all", label: "All departments" },
                ...demo.filterDepartments.map((d) => ({ value: d, label: d })),
              ]}
            />
          </div>
          <div className="arf-item">
            <span className="arf-label">Shift</span>
            <Select
              className="w-full"
              value={shift}
              onChange={setShift}
              options={[
                { value: "all", label: "All shifts" },
                { value: "Shift A", label: "Shift A" },
                { value: "Shift B", label: "Shift B" },
                { value: "Shift C", label: "Shift C" },
                { value: "General", label: "General" },
              ]}
            />
          </div>
          <div className="arf-item">
            <span className="arf-label">Report type</span>
            <Select
              className="w-full"
              value={reportType}
              onChange={setReportType}
              options={[
                { value: "both", label: "Late + Early going" },
                { value: "late", label: "Late coming only" },
                { value: "early", label: "Early going only" },
              ]}
            />
          </div>
          <div className="arf-item">
            <span className="arf-label">From</span>
            <DatePicker
              className="w-full"
              value={range[0]}
              onChange={(d) => d && setRange([d, range[1]])}
              allowClear={false}
            />
          </div>
          <div className="arf-item">
            <span className="arf-label">To</span>
            <DatePicker
              className="w-full"
              value={range[1]}
              onChange={(d) => d && setRange([range[0], d])}
              allowClear={false}
            />
          </div>
          <div className="arf-item">
            <span className="arf-label">Min late minutes</span>
            <InputNumber
              className="w-full"
              min={0}
              value={minMinutes}
              onChange={(v) => setMinMinutes(v ?? 0)}
            />
          </div>
        </div>
        </div>

        <div className="arf-footer">
          <Button
            type="primary"
            icon={<FilterOutlined />}
            onClick={() => setApplied({ dept, shift, minMinutes })}
          >
            Apply filters
          </Button>
        </div>
      </div>

      <ReportSection title="Group by">
        <div className="attendance-report-segmented-wrap">
          <Segmented
            value={groupBy}
            onChange={(v) => setGroupBy(v as GroupBy)}
            options={[
              { label: "Employee-wise", value: "employee" },
              { label: "Department-wise", value: "department" },
              { label: "Shift-wise", value: "shift" },
              { label: "Unit-wise", value: "unit" },
              { label: "Daily trend", value: "trend" },
            ]}
          />
        </div>
      </ReportSection>

      <div className="attendance-kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <StatCard
          icon={ClockCircleOutlined}
          label="Late punches"
          value={String(kpi.latePunches)}
          hint={`Avg ${kpi.lateAvgMins} min · ${kpi.lateEmployeesAffected} employees affected`}
          hintTone="warning"
        />
        <StatCard
          icon={WarningOutlined}
          label="Early going incidents"
          value={String(kpi.earlyIncidents)}
          hint={`Avg ${kpi.earlyAvgMins} min · ${kpi.earlyEmployees} employees`}
        />
        <StatCard
          icon={TeamOutlined}
          label="Repeat offenders"
          value={String(kpi.repeatOffenders)}
          hint={`Includes ${kpi.criticalOffenders} critical (≥10 events)`}
          hintTone="warning"
        />
        <StatCard
          icon={CheckCircleOutlined}
          label="100% on-time"
          value={String(kpi.onTimeCount)}
          hint={`Out of ${kpi.totalEmployees} total employees`}
          hintTone="positive"
        />
      </div>

      {(groupBy === "employee" || groupBy === "trend") && (
        <ReportSection
          title="Employee-wise"
          meta={`${range[0].format("DD MMM")} – ${range[1].format("DD MMM YYYY")} · ${employees.length} rows`}
          flush
        >
          <CommonTable
            {...tableProps}
            columns={employeeColumns}
            dataSource={employees}
            rowKey="employeeId"
            pagination={{ pageSize: 10, showSizeChanger: true }}
          />
        </ReportSection>
      )}

      {(groupBy === "department" || groupBy === "employee") && (
        <ReportSection title="Department-wise summary" flush>
          <CommonTable
            {...tableProps}
            columns={deptColumns}
            dataSource={demo.departments}
            rowKey="department"
            pagination={false}
          />
        </ReportSection>
      )}

      <div className="attendance-summary-grid">
        {(groupBy === "shift" || groupBy === "employee") && (
          <ReportSection title="Shift-wise pattern" flush>
            <CommonTable
              {...tableProps}
              columns={shiftColumns}
              dataSource={demo.shifts}
              rowKey="shift"
              pagination={false}
            />
          </ReportSection>
        )}
        {(groupBy === "unit" || groupBy === "employee") && (
          <ReportSection title="Unit-wise pattern" flush>
            <CommonTable
              {...tableProps}
              columns={unitColumns}
              dataSource={demo.units}
              rowKey="unit"
              pagination={false}
            />
          </ReportSection>
        )}
      </div>
    </div>
  );
}
