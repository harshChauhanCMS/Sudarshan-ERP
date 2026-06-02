"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  DatePicker,
  Select,
  Tag,
  Segmented,
  message,
  Typography,
} from "antd";
import {
  DownloadOutlined,
  FilterOutlined,
  ReloadOutlined,
  EnvironmentOutlined,
  UserOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  BankOutlined,
  IdcardOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import dayjs from "dayjs";

import StatCard from "@/components/common/StatCard";
import PageHeader from "@/components/common/PageHeader";
import CommonTable, {
  type CommonTableColumn,
} from "@/components/common/CommonTable";
import ReportSection from "@/components/hrms/ReportSection";
import {
  AttendanceTrendChart,
  DepartmentBreakdownChart,
} from "@/components/hrms/AttendanceReportCharts";
import {
  getAttendanceReportDummy,
  isAttendanceReportEmpty,
  type DeptBreakdownPoint,
  type WeeklyTrendPoint,
} from "@/lib/attendance-report-dummy";

type SummaryRow = {
  employeeId: string;
  employeeName: string;
  department: string;
  designation: string;
  locationUnit: string;
  primaryShift: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalWorkedHours: number;
  totalShortfall: number;
  totalOvertime: number;
};

type KPI = {
  totalEmployees: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalShortfall: number;
  totalOvertime: number;
};

type ReportType =
  | "daily"
  | "monthly"
  | "absent"
  | "punch"
  | "late"
  | "short"
  | "overtime";

type GroupBy =
  | "employee"
  | "department"
  | "shift"
  | "unit"
  | "empType";

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: "daily", label: "Daily attendance" },
  { value: "monthly", label: "Monthly attendance" },
  { value: "absent", label: "Absent report" },
  { value: "punch", label: "Punch report" },
  { value: "late", label: "Late coming / Early going" },
  { value: "short", label: "Short hours report" },
  { value: "overtime", label: "Overtime report" },
];

const GROUP_OPTIONS = [
  { value: "employee", label: "Employee-wise", icon: <UserOutlined /> },
  { value: "department", label: "Department-wise", icon: <TeamOutlined /> },
  { value: "shift", label: "Shift-wise", icon: <ClockCircleOutlined /> },
  { value: "unit", label: "Unit / Location-wise", icon: <BankOutlined /> },
  { value: "empType", label: "Employment type-wise", icon: <IdcardOutlined /> },
];

function complianceLabel(presentPct: number) {
  if (presentPct >= 95) return { text: "Good", color: "success" as const };
  if (presentPct >= 85) return { text: "Review", color: "warning" as const };
  return { text: "Poor", color: "error" as const };
}

type DailyRow = {
  employeeId: string;
  employeeName: string;
  department: string;
  day: string;
  inAt: string | null;
  outAt: string | null;
  present: boolean;
  absent: boolean;
  late: boolean;
  workedHours: number;
  shortfall: number;
  overtime: number;
};

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return dayjs(iso).format("HH:mm");
}

export default function AttendanceReportsContent() {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<string[]>(
    () => getAttendanceReportDummy().departments
  );
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [company, setCompany] = useState("all");
  const [dept, setDept] = useState("all");
  const [shift, setShift] = useState("all");
  const [unit, setUnit] = useState("all");
  const [period, setPeriod] = useState("month");
  const [applied, setApplied] = useState({
    company: "all",
    dept: "all",
    shift: "all",
    unit: "all",
  });
  const [reportType, setReportType] = useState<ReportType>("monthly");
  const [groupBy, setGroupBy] = useState<GroupBy>("employee");
  const [kpi, setKpi] = useState<KPI | null>(
    () => getAttendanceReportDummy().kpi
  );
  const [workingDays, setWorkingDays] = useState(
    () => getAttendanceReportDummy().workingDays
  );
  const [gpsSummary, setGpsSummary] = useState<{
    gpsPunches: number;
    biometricPunches: number;
    gpsPercent: number;
  } | null>(() => getAttendanceReportDummy().gpsSummary);
  const [summary, setSummary] = useState<SummaryRow[]>(() =>
    getAttendanceReportDummy().summary
  );
  const [daily, setDaily] = useState<DailyRow[]>(() =>
    getAttendanceReportDummy().daily
  );
  const [usingDummy, setUsingDummy] = useState(true);
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrendPoint[]>(
    () => getAttendanceReportDummy().weeklyTrend
  );
  const [deptBreakdown, setDeptBreakdown] = useState<DeptBreakdownPoint[]>(
    () => getAttendanceReportDummy().deptBreakdown
  );

  const applyDummy = (month?: string) => {
    const demo = getAttendanceReportDummy(month);
    setKpi(demo.kpi);
    setWorkingDays(demo.workingDays);
    setGpsSummary(demo.gpsSummary);
    setSummary(demo.summary);
    setDaily(demo.daily);
    setDepartments(demo.departments);
    setWeeklyTrend(demo.weeklyTrend);
    setDeptBreakdown(demo.deptBreakdown);
    setUsingDummy(true);
  };

  useEffect(() => {
    fetch("/api/hrms/departments")
      .then((r) => r.json())
      .then((j) => {
        const fromApi = j?.data || [];
        if (fromApi.length) {
          setDepartments([
            ...new Set([
              ...getAttendanceReportDummy().departments,
              ...fromApi,
            ]),
          ]);
        }
      });
  }, []);

  const buildUrl = () => {
    const params = new URLSearchParams({
      from: range[0].format("YYYY-MM-DD"),
      to: range[1].format("YYYY-MM-DD"),
    });
    if (applied.dept !== "all") params.set("department", applied.dept);
    if (applied.shift !== "all") params.set("shift", applied.shift);
    return params;
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/hrms/attendance/report/extended?${buildUrl()}`
      );
      const json = await res.json();
      if (!res.ok || json?.error) throw new Error(json?.error || "Failed");
      let rows: SummaryRow[] = json.data.summary ?? [];
      if (applied.unit !== "all") {
        rows = rows.filter((r) => r.locationUnit === applied.unit);
      }

      if (isAttendanceReportEmpty(rows) || rows.length < 3) {
        applyDummy(range[0].format("YYYY-MM"));
        return;
      }

      setKpi(json.data.kpi);
      setWorkingDays(json.data.workingDays ?? 20);
      setGpsSummary(json.data.gpsSummary ?? null);
      setSummary(rows);
      setDaily(json.data.daily ?? []);
      setUsingDummy(false);
    } catch (e) {
      applyDummy(range[0].format("YYYY-MM"));
      message.warning("Showing demo data — live report could not be loaded");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const units = useMemo(
    () => [...new Set(summary.map((s) => s.locationUnit).filter(Boolean))].sort(),
    [summary]
  );

  const filteredSummary = useMemo(() => {
    let rows = summary;
    if (reportType === "absent") {
      rows = rows.filter((r) => r.absentDays > 0);
    } else if (reportType === "late") {
      rows = rows.filter((r) => r.lateDays > 0);
    } else if (reportType === "short") {
      rows = rows.filter((r) => r.totalShortfall > 0);
    } else if (reportType === "overtime") {
      rows = rows.filter((r) => r.totalOvertime > 0);
    }
    return rows;
  }, [summary, reportType]);

  const unitTable = useMemo(() => {
    const map = new Map<
      string,
      {
        unit: string;
        employees: number;
        present: number;
        absent: number;
        late: number;
        inOffice: number;
        fieldDays: number;
      }
    >();
    for (const s of filteredSummary) {
      const key = s.locationUnit || "—";
      const cur = map.get(key) ?? {
        unit: key,
        employees: 0,
        present: 0,
        absent: 0,
        late: 0,
        inOffice: 0,
        fieldDays: 0,
      };
      const isField = /sales|field/i.test(s.department);
      cur.employees += 1;
      cur.present += s.presentDays;
      cur.absent += s.absentDays;
      cur.late += s.lateDays;
      if (isField) cur.fieldDays += s.presentDays;
      else cur.inOffice += s.presentDays;
      map.set(key, cur);
    }
    return Array.from(map.values()).map((u) => {
      const total = u.present + u.absent || 1;
      return {
        ...u,
        compliance: Math.round((u.present / total) * 100),
      };
    });
  }, [filteredSummary]);

  const deptCompliance = useMemo(() => {
    const map = new Map<
      string,
      { department: string; present: number; absent: number; late: number }
    >();
    for (const s of filteredSummary) {
      const cur = map.get(s.department) ?? {
        department: s.department,
        present: 0,
        absent: 0,
        late: 0,
      };
      cur.present += s.presentDays;
      cur.absent += s.absentDays;
      cur.late += s.lateDays;
      map.set(s.department, cur);
    }
    return Array.from(map.values()).map((d) => {
      const total = d.present + d.absent || 1;
      const presentPct = Math.round((d.present / total) * 100);
      const absentPct = 100 - presentPct;
      return { ...d, presentPct, absentPct, ...complianceLabel(presentPct) };
    });
  }, [filteredSummary]);

  const fieldRows = useMemo(
    () => filteredSummary.filter((s) => /sales|field/i.test(s.department)),
    [filteredSummary]
  );

  const officeStats = useMemo(() => {
    const field = fieldRows.reduce((a, s) => a + s.presentDays, 0);
    const totalPresent = filteredSummary.reduce((a, s) => a + s.presentDays, 0);
    const inOffice = totalPresent - field;
    const totalExpected = filteredSummary.length * workingDays || 1;
    return {
      inOfficePct: Math.round((inOffice / totalExpected) * 100),
      fieldPct: Math.round((field / totalExpected) * 100),
      inOfficeDays: inOffice,
      fieldDays: field,
      fieldEmployees: fieldRows.length,
      totalEmployees: filteredSummary.length,
      totalExpected,
    };
  }, [filteredSummary, fieldRows, workingDays]);

  const presentAvg =
    kpi && kpi.totalEmployees
      ? (kpi.presentDays / kpi.totalEmployees).toFixed(1)
      : "0";

  const employeeColumns: CommonTableColumn<SummaryRow>[] = [
    {
      title: "Employee",
      key: "emp",
      render: (_, r) => (
        <span>
          <span className="font-semibold text-zinc-900">{r.employeeName}</span>
          <span className="ml-2 text-[12px] text-zinc-500">{r.employeeId}</span>
        </span>
      ),
    },
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
      title: "Overtime (hrs)",
      dataIndex: "totalOvertime",
      key: "ot",
      render: (v: number) => (
        <span className="font-semibold text-emerald-600">{v.toFixed(1)}</span>
      ),
    },
    {
      title: "Short (hrs)",
      dataIndex: "totalShortfall",
      key: "short",
      render: (v: number) => (
        <span className="text-zinc-500">{v.toFixed(1)}</span>
      ),
    },
  ];

  const unitColumns: CommonTableColumn<(typeof unitTable)[0]>[] = [
    { title: "Company / Unit", dataIndex: "unit", key: "unit" },
    { title: "Employees", dataIndex: "employees", key: "employees" },
    {
      title: "Present days",
      dataIndex: "present",
      key: "present",
      render: (v: number) => (
        <span className="font-bold text-emerald-600">{v}</span>
      ),
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
      render: (v: number) => (
        <span className="font-bold text-amber-600">{v}</span>
      ),
    },
    { title: "In office", dataIndex: "inOffice", key: "inOffice" },
    {
      title: "Field days",
      dataIndex: "fieldDays",
      key: "field",
      render: (v: number) => (
        <span className="font-bold text-emerald-600">{v}</span>
      ),
    },
    {
      title: "Compliance",
      dataIndex: "compliance",
      key: "compliance",
      render: (v: number) => `${v}%`,
    },
  ];

  const deptColumns: CommonTableColumn<(typeof deptCompliance)[0]>[] = [
    { title: "Department", dataIndex: "department", key: "dept" },
    {
      title: "Present %",
      dataIndex: "presentPct",
      key: "presentPct",
      render: (v: number) => (
        <span className="font-bold text-emerald-600">{v}%</span>
      ),
    },
    {
      title: "Absent %",
      dataIndex: "absentPct",
      key: "absentPct",
      render: (v: number) => (
        <span className="font-bold text-red-600">{v}%</span>
      ),
    },
    {
      title: "Late (count)",
      dataIndex: "late",
      key: "late",
      render: (v: number) => (
        <span className="font-bold text-amber-600">{v}</span>
      ),
    },
    {
      title: "Compliance",
      key: "compliance",
      render: (_, r) => <Tag color={r.color}>{r.text}</Tag>,
    },
  ];

  const dailyColumns: CommonTableColumn<DailyRow>[] = [
    { title: "Date", dataIndex: "day", key: "day", width: 110 },
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
    { title: "Dept", dataIndex: "department", key: "dept", width: 120 },
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
      title: "Worked (h)",
      dataIndex: "workedHours",
      key: "worked",
      width: 90,
      render: (v: number) => v.toFixed(2),
    },
    {
      title: "Status",
      key: "status",
      width: 160,
      render: (_, row) => (
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
  ];

  const fieldColumns: CommonTableColumn<SummaryRow>[] = [
    {
      title: "Employee",
      key: "emp",
      render: (_, r) => (
        <span>
          {r.employeeName}{" "}
          <span className="text-zinc-500 text-[12px]">{r.employeeId}</span>
        </span>
      ),
    },
    { title: "Dept", dataIndex: "department", key: "dept" },
    {
      title: "In-office days",
      key: "inOffice",
      render: (_, r) =>
        /sales|field/i.test(r.department) ? 0 : r.presentDays,
    },
    {
      title: "Field days",
      key: "field",
      render: (_, r) =>
        /sales|field/i.test(r.department) ? (
          <span className="font-bold text-emerald-600">{r.presentDays}</span>
        ) : (
          0
        ),
    },
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
  ];

  const tableProps = {
    bordered: true as const,
    size: "middle" as const,
    className: "attendance-report-table",
  };

  return (
    <div className="attendance-reports-page">


      <PageHeader
        title="Reports"
        subtitle="Attendance — company-wise, in-office vs field, trends, compliance"
        actions={
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <Link href="/hrms/reports">
              <Button>All reports</Button>
            </Link>
            <Link href="/hrms/reports/late-early">
              <Button icon={<ClockCircleOutlined />}>Late / Early</Button>
            </Link>
            <Button
              icon={<DownloadOutlined />}
              onClick={() =>
                window.open(
                  `/api/hrms/attendance/report.csv?${buildUrl()}`,
                  "_blank"
                )
              }
            >
              Export
            </Button>
          </div>
        }
      />

      <div className="attendance-summary-grid" style={{ marginBottom: "24px" }}>
        <StatCard
          icon={BankOutlined}
          label="In-office attendance"
          value={`${officeStats.inOfficePct}%`}
          hint={`${officeStats.totalEmployees - officeStats.fieldEmployees} employees · ${officeStats.inOfficeDays} present days`}
          hintTone="positive"
        />
        <StatCard
          icon={EnvironmentOutlined}
          label="Field attendance"
          value={`${officeStats.fieldPct}%`}
          hint={`${officeStats.fieldEmployees} field employees · ${officeStats.fieldDays} field days`}
          hintTone="positive"
        />
      </div>

      <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: "8px", padding: "16px", marginBottom: "24px", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "12px" }}>
          <div>
            <Typography.Text className="text-[11px] font-bold uppercase text-zinc-500 block mb-2">
              Unit
            </Typography.Text>
            <Select
              className="w-full"
              value={unit}
              onChange={setUnit}
              options={[
                { value: "all", label: "All units" },
                ...units.map((u) => ({ value: u, label: u })),
              ]}
            />
          </div>
          <div>
            <Typography.Text className="text-[11px] font-bold uppercase text-zinc-500 block mb-2">
              Department
            </Typography.Text>
            <Select
              className="w-full"
              value={dept}
              onChange={setDept}
              options={[
                { value: "all", label: "All departments" },
                ...departments.map((d) => ({ value: d, label: d })),
              ]}
            />
          </div>
          <div>
            <Typography.Text className="text-[11px] font-bold uppercase text-zinc-500 block mb-2">
              Shift
            </Typography.Text>
            <Select
              className="w-full"
              value={shift}
              onChange={setShift}
              options={[
                { value: "all", label: "All shifts" },
                { value: "Shift A", label: "Shift A" },
                { value: "Shift B", label: "Shift B" },
                { value: "Shift C", label: "Shift C" },
              ]}
            />
          </div>
          <div>
            <Typography.Text className="text-[11px] font-bold uppercase text-zinc-500 block mb-2">
              Time period
            </Typography.Text>
            <Select
              className="w-full"
              value={period}
              onChange={setPeriod}
              options={[
                { value: "month", label: "This month" },
                { value: "last", label: "Last month" },
                { value: "custom", label: "Pick month…" },
              ]}
            />
          </div>
          {period === "custom" && (
            <div>
              <Typography.Text className="text-[11px] font-bold uppercase text-zinc-500 block mb-2">
                Month
              </Typography.Text>
              <DatePicker
                className="w-full"
                picker="month"
                value={range[0]}
                onChange={(d) => {
                  if (d) setRange([d.startOf("month"), d.endOf("month")]);
                }}
                allowClear={false}
              />
            </div>
          )}
          <div style={{ flex: "none" }}>
            <Button
              type="primary"
              block
              icon={<FilterOutlined />}
              loading={loading}
              onClick={() => {
                if (period === "last") {
                  const last = dayjs().subtract(1, "month");
                  setRange([last.startOf("month"), last.endOf("month")]);
                } else if (period === "month") {
                  setRange([
                    dayjs().startOf("month"),
                    dayjs().endOf("month"),
                  ]);
                }
                setApplied({ company, dept, shift, unit });
                void load();
              }}
            >
              Apply
            </Button>
          </div>
        </div>
      </div>



      <ReportSection
        title="Attendance summary"
        meta={`${range[0].format("MMM YYYY")} · by company / unit`}
        flush
      >
        <CommonTable
          {...tableProps}
          columns={unitColumns}
          dataSource={unitTable}
          rowKey="unit"
          loading={loading}
          pagination={false}
        />
      </ReportSection>

      <div className="attendance-charts-grid">
        <ReportSection
          title="Attendance trend (month)"
          meta={`${range[0].format("MMM YYYY")} · Present vs Absent by week`}
        >
          <AttendanceTrendChart data={weeklyTrend} />
        </ReportSection>
        <ReportSection
          title="Department breakdown"
          meta="Present % by department"
        >
          <DepartmentBreakdownChart data={deptBreakdown} />
        </ReportSection>
      </div>

      <ReportSection
        title="Attendance compliance (summary)"
        meta={`${range[0].format("MMM YYYY")}`}
        footer="Good = 95%+ present · Review = 85–95% · Poor = below 85%"
        flush
      >
        <CommonTable
          {...tableProps}
          columns={deptColumns}
          dataSource={deptCompliance}
          rowKey="department"
          loading={loading}
          pagination={false}
        />
      </ReportSection>

      <div className="attendance-kpi-grid">
        <StatCard
          icon={CheckCircleOutlined}
          label="Present days (avg)"
          value={presentAvg}
          hint={`${range[0].format("MMM YYYY")} · ${workingDays} working days`}
          hintTone="positive"
        />
        <StatCard
          icon={TeamOutlined}
          label="Absent days (total)"
          value={String(kpi?.absentDays ?? 0)}
          hint={`Across ${kpi?.totalEmployees ?? 0} employees`}
        />
        <StatCard
          icon={ClockCircleOutlined}
          label="Late punches (month)"
          value={String(kpi?.lateDays ?? 0)}
          hint="Across all shifts"
          hintTone="warning"
        />
        <StatCard
          icon={FilterOutlined}
          label="Short hours (total)"
          value={kpi?.totalShortfall.toFixed(1) ?? "0"}
          hint="Below required hrs · review"
        />
        <StatCard
          icon={ReloadOutlined}
          label="Overtime hours (total)"
          value={kpi?.totalOvertime.toFixed(0) ?? "0"}
          hint="Approved OT"
          hintTone="positive"
        />
      </div>

      {gpsSummary && (
        <div className="attendance-gps-banner">
          <p className="attendance-gps-banner__title">
            GPS punch summary ({range[0].format("MMM YYYY")})
          </p>
          <p className="attendance-gps-banner__text">
            {gpsSummary.gpsPunches.toLocaleString()} punches via GPS/location ·{" "}
            {gpsSummary.biometricPunches.toLocaleString()} via biometric (gate)
            — {gpsSummary.gpsPercent}% GPS — most attendance recorded on phone
            at site
          </p>
        </div>
      )}

      <ReportSection title="Report type & grouping">
        <div className="attendance-report-config">
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              icon={<DownloadOutlined />}
              onClick={() =>
                window.open(
                  `/api/hrms/attendance/report.csv?${buildUrl()}`,
                  "_blank"
                )
              }
            >
              Export Excel
            </Button>
          </div>

          <div>
            <Typography.Text className="text-[11px] font-bold uppercase text-zinc-500 block mb-2">
              Report type
            </Typography.Text>
            <div className="attendance-report-segmented-wrap">
              <Segmented
                options={REPORT_TYPES.map((r) => ({
                  label: r.label,
                  value: r.value,
                }))}
                value={reportType}
                onChange={(v) => setReportType(v as ReportType)}
                className="attendance-report-segmented"
              />
            </div>
          </div>

          <div>
            <Typography.Text className="text-[11px] font-bold uppercase text-zinc-500 block mb-2">
              Group by
            </Typography.Text>
            <div className="attendance-report-segmented-wrap">
              <Segmented
                options={GROUP_OPTIONS.map((g) => ({
                  label: (
                    <span className="inline-flex items-center gap-1.5 px-0.5">
                      {g.icon}
                      {g.label}
                    </span>
                  ),
                  value: g.value,
                }))}
                value={groupBy}
                onChange={(v) => setGroupBy(v as GroupBy)}
              />
            </div>
          </div>

        </div>
      </ReportSection>

      <ReportSection
        title="Monthly summary by employee"
        meta={`${range[0].format("MMM YYYY")} · ${workingDays} working days`}
        flush
      >
        <CommonTable
          {...tableProps}
          columns={employeeColumns}
          dataSource={filteredSummary}
          rowKey="employeeId"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </ReportSection>

      <ReportSection
        title="Daily attendance detail"
        meta={`${range[0].format("MMM YYYY")} · ${daily.length} records`}
        flush
      >
        <CommonTable
          {...tableProps}
          columns={dailyColumns}
          dataSource={daily}
          rowKey={(r) => `${r.employeeId}|${r.day}`}
          loading={loading}
          pagination={{ pageSize: 15, showSizeChanger: true }}
        />
      </ReportSection>

      <ReportSection
        title="Field employee attendance breakdown"
        meta={`${range[0].format("MMM YYYY")} · Field staff only`}
        footer="Field days = punches marked as Field (outside office). In-office days = at plant/office."
        flush
      >
        <CommonTable
          {...tableProps}
          columns={fieldColumns}
          dataSource={fieldRows}
          rowKey="employeeId"
          loading={loading}
          pagination={false}
        />
      </ReportSection>
    </div>
  );
}
