"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Button, DatePicker, InputNumber, Select, Tag, Progress, message } from "antd";
import {
  DownloadOutlined,
  FilterOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  BankOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  UserOutlined,
  LineChartOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import RepHeader from "@/components/hrms/RepHeader";
import ReportChoiceChips, {
  type ReportChipOption,
} from "@/components/hrms/ReportChoiceChips";
import StatCard from "@/components/common/StatCard";
import CommonTable, {
  type CommonTableColumn,
} from "@/components/common/CommonTable";
import {
  type LateEarlyEmployeeRow,
  type LateEarlyDeptRow,
  type LateEarlyShiftRow,
  type LateEarlyKpi,
  type LateEarlyUnitRow,
} from "@/lib/hrms-late-early-report";
import FilterSearchField from "@/components/hrms/FilterSearchField";
import { filterBySearch } from "@/lib/filter-search";
import { downloadCsv } from "@/lib/download-csv";

const EMPTY_KPI: LateEarlyKpi = {
  latePunches: 0,
  lateAvgMins: 0,
  lateEmployeesAffected: 0,
  earlyIncidents: 0,
  earlyAvgMins: 0,
  earlyEmployees: 0,
  repeatOffenders: 0,
  criticalOffenders: 0,
  onTimeCount: 0,
  totalEmployees: 0,
};

type GroupBy = "employee" | "department" | "shift" | "unit" | "trend";

const GROUP_CHIPS: ReportChipOption<GroupBy>[] = [
  {
    value: "employee",
    tone: "indigo",
    label: (
      <span className="report-chip__label">
        <UserOutlined /> Employee-wise
      </span>
    ),
  },
  {
    value: "department",
    tone: "violet",
    label: (
      <span className="report-chip__label">
        <TeamOutlined /> Department-wise
      </span>
    ),
  },
  {
    value: "shift",
    tone: "cyan",
    label: (
      <span className="report-chip__label">
        <ClockCircleOutlined /> Shift-wise
      </span>
    ),
  },
  {
    value: "unit",
    tone: "teal",
    label: (
      <span className="report-chip__label">
        <BankOutlined /> Unit-wise
      </span>
    ),
  },
  {
    value: "trend",
    tone: "amber",
    label: (
      <span className="report-chip__label">
        <LineChartOutlined /> Daily trend
      </span>
    ),
  },
];

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

function complianceColor(pct: number) {
  if (pct >= 85) return "#059669";
  if (pct >= 75) return "#d97706";
  return "#dc2626";
}

export default function LateEarlyReportPage() {
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
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<LateEarlyKpi>(EMPTY_KPI);
  const [employees, setEmployees] = useState<LateEarlyEmployeeRow[]>([]);
  const [departments, setDepartments] = useState<LateEarlyDeptRow[]>([]);
  const [shifts, setShifts] = useState<LateEarlyShiftRow[]>([]);
  const [units, setUnits] = useState<LateEarlyUnitRow[]>([]);
  const [filterDepartments, setFilterDepartments] = useState<string[]>([]);
  const [applied, setApplied] = useState({
    dept: "all",
    shift: "all",
    company: "all",
    reportType: "both",
    minMinutes: 5,
    range: [dayjs().startOf("month"), dayjs().endOf("month")] as [
      dayjs.Dayjs,
      dayjs.Dayjs,
    ],
  });

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from: applied.range[0].format("YYYY-MM-DD"),
        to: applied.range[1].format("YYYY-MM-DD"),
        reportType: applied.reportType,
        minMinutes: String(applied.minMinutes),
      });
      if (applied.dept !== "all") params.set("department", applied.dept);
      if (applied.shift !== "all") params.set("shift", applied.shift);
      if (applied.company !== "all") params.set("unit", applied.company);

      const res = await fetch(
        `/api/hrms/attendance/report/late-early?${params}`,
      );
      const json = await res.json();
      if (!res.ok || json?.error) throw new Error(json?.error ?? "Failed");

      setKpi(json.data?.kpi ?? EMPTY_KPI);
      setEmployees(json.data?.employees ?? []);
      setDepartments(json.data?.departments ?? []);
      setShifts(json.data?.shifts ?? []);
      setUnits(json.data?.units ?? []);
      setFilterDepartments(json.data?.filterDepartments ?? []);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to load report");
      setKpi(EMPTY_KPI);
      setEmployees([]);
      setDepartments([]);
      setShifts([]);
      setUnits([]);
      setFilterDepartments([]);
    } finally {
      setLoading(false);
    }
  }, [applied]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handleApplyFilters = () => {
    setApplied({
      dept,
      shift,
      company,
      reportType,
      minMinutes,
      range: [...range] as [dayjs.Dayjs, dayjs.Dayjs],
    });
  };

  const handleClearFilters = () => {
    const defaultRange = [dayjs().startOf("month"), dayjs().endOf("month")] as [
      dayjs.Dayjs,
      dayjs.Dayjs,
    ];
    setSearch("");
    setCompany("all");
    setDept("all");
    setShift("all");
    setReportType("both");
    setMinMinutes(5);
    setRange(defaultRange);
    setApplied({
      dept: "all",
      shift: "all",
      company: "all",
      reportType: "both",
      minMinutes: 5,
      range: defaultRange,
    });
  };

  const unitOptions = useMemo(() => {
    const fromData = [
      ...new Set(units.map((u) => u.unit).filter((u) => u !== "—")),
    ];
    return [
      { value: "all", label: "All units" },
      ...fromData.map((u) => ({ value: u, label: u })),
    ];
  }, [units]);

  const shiftOptions = useMemo(() => {
    const fromData = shifts.map((s) => s.shift).filter(Boolean);
    return [
      { value: "all", label: "All shifts" },
      ...fromData.map((s) => ({ value: s, label: s })),
    ];
  }, [shifts]);

  const searchedEmployees = useMemo(
    () =>
      filterBySearch(employees, search, (r) => [
        r.employeeId,
        r.employeeName,
        r.department,
        r.shift,
        r.unit,
      ]),
    [employees, search],
  );

  const searchedDepartments = useMemo(
    () => filterBySearch(departments, search, (r) => [r.department]),
    [departments, search],
  );

  const searchedShifts = useMemo(
    () => filterBySearch(shifts, search, (r) => [r.shift]),
    [shifts, search],
  );

  const searchedUnits = useMemo(
    () => filterBySearch(units, search, (r) => [r.unit]),
    [units, search],
  );

  const tableProps = {
    bordered: true as const,
    size: "middle" as const,
    className: "attendance-report-table",
  };

  const employeeColumns: CommonTableColumn<LateEarlyEmployeeRow>[] = [
    {
      title: "Employee",
      width: 220,
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
    { title: "Unit", dataIndex: "unit", key: "unit", width: 240 },
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
    { title: "Unit", dataIndex: "unit", key: "unit", width: 320 },
    { title: "Headcount", dataIndex: "headcount", key: "hc" },
    { title: "Late", dataIndex: "late", key: "late" },
    { title: "Early", dataIndex: "early", key: "early" },
    {
      title: "Compliance",
      dataIndex: "compliancePct",
      key: "comp",
      render: (v: number) => (
        <span className="font-semibold" style={{ color: complianceColor(v) }}>
          {v}%
        </span>
      ),
    },
  ];

  const emptyLocale = {
    emptyText: (
      <div className="py-8 text-center text-zinc-400 font-medium">
        No late or early-going records in this period
      </div>
    ),
  };

  return (
    <div className="attendance-reports-page">
      <RepHeader
        title="Late Coming / Early Going"
        subtitle="Discipline view — late punches & early exits by employee, dept, shift & unit"
        actions={
          <Button
            icon={<DownloadOutlined />}
            disabled={!searchedEmployees.length}
            onClick={() => {
              downloadCsv(
                `late-early-${applied.range[0].format("YYYY-MM-DD")}.csv`,
                [
                  "employeeId",
                  "employeeName",
                  "department",
                  "shift",
                  "unit",
                  "latePunches",
                  "lateAvgMins",
                  "earlyIncidents",
                  "earlyAvgMins",
                ],
                searchedEmployees.map((r) => ({ ...r })),
              );
            }}
          >
            Export CSV
          </Button>
        }
      />

      <div className="attendance-kpi-grid attendance-kpi-grid--4">
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

      <div className="arf-panel ap-filters-panel">
        <div className="arf-head">
          <FilterOutlined style={{ color: "var(--primary)", fontSize: 12 }} />
          <span className="arf-head-title">Filters</span>
        </div>

        <div className="arf-body">
          <div className="arf-controls ap-filters-controls ap-filters-controls--split-apply">
            <FilterSearchField
              value={search}
              onChange={setSearch}
              placeholder="Search employee, ID, department, shift…"
            />

            <div className="arf-item">
              <span className="arf-label">Company / unit</span>
              <Select
                className="w-full"
                value={company}
                onChange={setCompany}
                options={unitOptions}
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
                  ...filterDepartments.map((d) => ({ value: d, label: d })),
                ]}
              />
            </div>
            <div className="arf-item">
              <span className="arf-label">Shift</span>
              <Select
                className="w-full"
                value={shift}
                onChange={setShift}
                options={shiftOptions}
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
            <div className="arf-item arf-item--compact">
              <span className="arf-label">From</span>
              <DatePicker
                className="w-full"
                value={range[0]}
                onChange={(d) => d && setRange([d, range[1]])}
                allowClear={false}
              />
            </div>
            <div className="arf-item arf-item--compact">
              <span className="arf-label">To</span>
              <DatePicker
                className="w-full"
                value={range[1]}
                onChange={(d) => d && setRange([range[0], d])}
                allowClear={false}
              />
            </div>
            <div className="arf-item arf-item--compact">
              <span className="arf-label">Min late minutes</span>
              <InputNumber
                className="w-full"
                min={0}
                value={minMinutes}
                onChange={(v) => setMinMinutes(v ?? 0)}
              />
            </div>
            <div className="ap-filters-row-break" aria-hidden="true" />
            <div className="ap-filters-spacer" aria-hidden="true" />
            <div className="arf-item ap-filters-actions ap-filters-actions--multi">
              <Button onClick={handleClearFilters}>Clear filters</Button>
              <Button
                type="primary"
                icon={<FilterOutlined />}
                onClick={handleApplyFilters}
              >
                Apply filters
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ReportSection title="Group by">
        <div className="attendance-report-config__block">
          <ReportChoiceChips
            aria-label="Group by"
            options={GROUP_CHIPS}
            value={groupBy}
            onChange={setGroupBy}
          />
        </div>
      </ReportSection>

      {(groupBy === "employee" || groupBy === "trend") && (
        <ReportSection
          title="Employee-wise"
          meta={`${applied.range[0].format("DD MMM")} – ${applied.range[1].format("DD MMM YYYY")} · ${searchedEmployees.length} rows`}
          flush
        >
          <CommonTable
            {...tableProps}
            loading={loading}
            columns={employeeColumns}
            dataSource={searchedEmployees}
            rowKey="employeeId"
            pagination={{ pageSize: 10, showSizeChanger: true }}
            locale={emptyLocale}
          />
        </ReportSection>
      )}

      {(groupBy === "department" || groupBy === "employee") && (
        <ReportSection title="Department-wise summary" flush>
          <CommonTable
            {...tableProps}
            loading={loading}
            columns={deptColumns}
            dataSource={searchedDepartments}
            rowKey="department"
            pagination={false}
            locale={emptyLocale}
          />
        </ReportSection>
      )}

      {(groupBy === "shift" || groupBy === "employee") && (
        <ReportSection title="Shift-wise pattern" flush>
          <CommonTable
            {...tableProps}
            loading={loading}
            columns={shiftColumns}
            dataSource={searchedShifts}
            rowKey="shift"
            pagination={false}
            locale={emptyLocale}
          />
        </ReportSection>
      )}
      {(groupBy === "unit" || groupBy === "employee") && (
        <ReportSection title="Unit-wise pattern" flush>
          <CommonTable
            {...tableProps}
            loading={loading}
            columns={unitColumns}
            dataSource={searchedUnits}
            rowKey="unit"
            pagination={false}
            locale={emptyLocale}
          />
        </ReportSection>
      )}
    </div>
  );
}
