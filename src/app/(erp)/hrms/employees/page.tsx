"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Avatar, Button, Space, Tag } from "antd";
import {
  CheckCircleOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  PlusOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import Link from "next/link";

import CommonTable, {
  type CommonTableColumn,
} from "@/components/common/CommonTable";
import { ViewEditActions } from "@/components/common/TableActionIcons";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import ReportSection from "@/components/hrms/ReportSection";
import EmployeeFilterPanel, {
  type EmployeeFilterValues,
} from "@/components/hrms/EmployeeFilterPanel";
import { HRMS_BACK } from "@/lib/hrms-nav";

type EmploymentStatus = "Active" | "Inactive";
type AttendanceStatus = "Present" | "Late" | "On leave" | "Absent";

interface Employee {
  id: string;
  name: string;
  initials: string;
  bg: string;
  fg: string;
  department: string;
  role: string;
  shift: string;
  locationUnit: string;
  empType: string;
  phone: string;
  attendanceStatus: AttendanceStatus;
  employmentStatus: EmploymentStatus;
  primaryShiftRaw: string;
}

const DEFAULT_FILTERS: EmployeeFilterValues = {
  department: "all",
  role: "all",
  shift: "all",
  location: "all",
  empType: "all",
  status: "all",
};

const ATTENDANCE_TAG_COLORS: Record<AttendanceStatus, string> = {
  Present: "success",
  Late: "warning",
  "On leave": "processing",
  Absent: "default",
};

const EMPLOYMENT_TAG_COLORS: Record<EmploymentStatus, string> = {
  Active: "success",
  Inactive: "default",
};

const GRACE_MINUTES = 15;

function shiftStartHour(primaryShift: string): number | null {
  const m = primaryShift?.match(/(\d{2}):(\d{2})\s*to/i);
  if (!m) return null;
  return parseInt(m[1], 10) + parseInt(m[2], 10) / 60;
}

function formatShiftLabel(primaryShift?: string): string {
  if (!primaryShift?.trim()) return "—";
  const part = primaryShift.split("—")[0]?.trim();
  return part || primaryShift;
}

function isLatePunch(punchedAt: Date, primaryShift: string): boolean {
  const start = shiftStartHour(primaryShift);
  if (start === null) return false;
  const punchHour = punchedAt.getHours() + punchedAt.getMinutes() / 60;
  return punchHour > start + GRACE_MINUTES / 60;
}

function getFirstInTime(
  punchLog?: { type: string; isoTime: string }[]
): Date | null {
  const ins =
    punchLog?.filter((p) => p.type === "in" && p.isoTime) ?? [];
  if (!ins.length) return null;
  const sorted = [...ins].sort(
    (a, b) => new Date(a.isoTime).getTime() - new Date(b.isoTime).getTime()
  );
  return new Date(sorted[0].isoTime);
}

function isDateInRange(date: Date, from: Date, to: Date) {
  const d = date.getTime();
  return d >= from.getTime() && d <= to.getTime();
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<EmployeeFilterValues>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<EmployeeFilterValues>(DEFAULT_FILTERS);
  const [stats, setStats] = useState({
    presentToday: 0,
    onLeave: 0,
    latePunches: 0,
  });

  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);

      const today = new Date();

      const [empRes, attRes, leaveRes] = await Promise.all([
        fetch("/api/hrms/employees"),
        fetch("/api/hrms/attendance/today", { cache: "no-store" }),
        fetch("/api/hrms/leave?status=approved", { cache: "no-store" }),
      ]);

      const onLeaveIds = new Set<string>();
      if (leaveRes.ok) {
        const leaveJson = await leaveRes.json();
        const leaves = leaveJson?.data ?? leaveJson ?? [];
        if (Array.isArray(leaves)) {
          for (const leave of leaves) {
            const from = new Date(leave.fromDate);
            const to = new Date(leave.toDate);
            if (isDateInRange(today, from, to) && leave.employeeId) {
              onLeaveIds.add(String(leave.employeeId));
            }
          }
        }
      }

      const punchByEmpId = new Map<string, Date>();
      if (attRes.ok) {
        const attJson = await attRes.json();
        const rows = attJson?.data?.rows ?? [];
        for (const row of rows) {
          const empId = String(row.id ?? "");
          if (!empId || empId === "-") continue;
          const firstIn = getFirstInTime(row.punchLog);
          if (firstIn) punchByEmpId.set(empId, firstIn);
        }
      }

      if (!empRes.ok) return;

      const data = await empRes.json();
      if (!data.success || !data.data) return;

      let presentToday = 0;
      let latePunches = 0;

      const mapped: Employee[] = data.data.map(
        (emp: Record<string, string>) => {
          const names = emp.fullName.trim().split(" ");
          const initials =
            names.length > 1
              ? (names[0][0] + names[names.length - 1][0]).toUpperCase()
              : names[0].substring(0, 2).toUpperCase();

          const bgColors = [
            "#fef3c7",
            "#dbeafe",
            "#ffedd5",
            "#dcfce7",
            "#f3e8ff",
            "#e0e7ff",
            "#fee2e2",
          ];
          const fgColors = [
            "#b45309",
            "#1d4ed8",
            "#c2410c",
            "#15803d",
            "#7e22ce",
            "#4338ca",
            "#b91c1c",
          ];
          const index = emp.fullName.charCodeAt(0) % bgColors.length;

          const primaryShiftRaw = emp.primaryShift || "";
          const empId = emp.employeeId;
          const firstIn = punchByEmpId.get(empId);

          let attendanceStatus: AttendanceStatus = "Absent";
          if (onLeaveIds.has(empId)) {
            attendanceStatus = "On leave";
          } else if (firstIn) {
            const late =
              primaryShiftRaw && isLatePunch(firstIn, primaryShiftRaw);
            attendanceStatus = late ? "Late" : "Present";
            presentToday += 1;
            if (late) latePunches += 1;
          }

          const employmentStatus: EmploymentStatus =
            emp.employmentType?.toLowerCase() === "inactive"
              ? "Inactive"
              : "Active";

          return {
            id: empId,
            name: emp.fullName,
            initials,
            bg: bgColors[index],
            fg: fgColors[index],
            department: emp.department,
            role: emp.designation,
            shift: formatShiftLabel(primaryShiftRaw),
            locationUnit: emp.locationUnit,
            empType: emp.employmentType,
            phone: emp.primaryContact,
            attendanceStatus,
            employmentStatus,
            primaryShiftRaw,
          };
        }
      );

      setStats({
        presentToday,
        onLeave: onLeaveIds.size,
        latePunches,
      });
      setEmployees(mapped);
    } catch (e) {
      console.error("Failed to fetch employees:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  const filterOptions = useMemo(() => {
    const uniq = (values: string[]) =>
      [...new Set(values.filter(Boolean))].sort().map((v) => ({
        value: v,
        label: v,
      }));

    return {
      departments: uniq(employees.map((e) => e.department)),
      roles: uniq(employees.map((e) => e.role)),
      shifts: uniq(employees.map((e) => e.shift).filter((s) => s !== "—")),
      locations: uniq(employees.map((e) => e.locationUnit)),
      empTypes: uniq(employees.map((e) => e.empType)),
      statuses: [
        { value: "Active", label: "Active" },
        { value: "Inactive", label: "Inactive" },
      ],
    };
  }, [employees]);

  const dataSource = useMemo(() => {
    return employees.filter((emp) => {
      if (
        appliedFilters.department !== "all" &&
        emp.department !== appliedFilters.department
      ) {
        return false;
      }
      if (appliedFilters.role !== "all" && emp.role !== appliedFilters.role) {
        return false;
      }
      if (
        appliedFilters.shift !== "all" &&
        emp.shift !== appliedFilters.shift
      ) {
        return false;
      }
      if (
        appliedFilters.location !== "all" &&
        emp.locationUnit !== appliedFilters.location
      ) {
        return false;
      }
      if (
        appliedFilters.empType !== "all" &&
        emp.empType !== appliedFilters.empType
      ) {
        return false;
      }
      if (
        appliedFilters.status !== "all" &&
        emp.employmentStatus !== appliedFilters.status
      ) {
        return false;
      }
      return true;
    });
  }, [employees, appliedFilters]);

  const handleExport = () => {
    const headers = [
      "Employee ID",
      "Name",
      "Department",
      "Role",
      "Shift",
      "Location / Unit",
      "Emp. Type",
      "Phone",
      "Attendance Status",
      "Employment Status",
    ];
    const rows = dataSource.map((e) =>
      [
        e.id,
        e.name,
        e.department,
        e.role,
        e.shift,
        e.locationUnit,
        e.empType,
        e.phone,
        e.attendanceStatus,
        e.employmentStatus,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employees-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: CommonTableColumn<Employee>[] = [
    {
      title: "Employee ID",
      dataIndex: "id",
      key: "id",
      render: (id: string) => (
        <span className="font-semibold text-zinc-800">{id}</span>
      ),
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: 260,
      ellipsis: true,
      render: (_, record: Employee) => (
        <div className="flex items-center gap-3">
          <Avatar
            style={{
              backgroundColor: record.bg,
              color: record.fg,
              fontWeight: 600,
              fontSize: 13,
            }}
            size={32}
          >
            {record.initials}
          </Avatar>
          <span className="font-semibold text-zinc-900">{record.name}</span>
        </div>
      ),
    },
    {
      title: "Department",
      dataIndex: "department",
      key: "department",
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
    },
    {
      title: "Shift",
      dataIndex: "shift",
      key: "shift",
    },
    {
      title: "Location / Unit",
      dataIndex: "locationUnit",
      key: "locationUnit",
      width: 220,
      ellipsis: true,
    },
    {
      title: "Emp. Type",
      dataIndex: "empType",
      key: "empType",
    },
    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
    },
    {
      title: "Attendance",
      dataIndex: "attendanceStatus",
      key: "attendanceStatus",
      render: (status: AttendanceStatus) => (
        <Tag color={ATTENDANCE_TAG_COLORS[status]}>{status}</Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "employmentStatus",
      key: "employmentStatus",
      render: (status: EmploymentStatus) => (
        <Tag color={EMPLOYMENT_TAG_COLORS[status]}>{status}</Tag>
      ),
    },
    {
      title: "Actions",
      key: "action",
      fixed: "right",
      width: 88,
      render: (_, record: Employee) => (
        <ViewEditActions
          viewHref={`/hrms/employees/${record.id}`}
          editHref={`/hrms/employees/${record.id}`}
        />
      ),
      align: "right" as const,
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
        compact
        {...HRMS_BACK.dashboard}
        title="Employees"
        subtitle="HR master across both companies"
        actions={
          <Space>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              Export
            </Button>
            <Link href="/hrms/employees/add">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                style={{ background: "#374d95", border: "none" }}
              >
                Add employee
              </Button>
            </Link>
          </Space>
        }
      />

      <div className="attendance-kpi-grid attendance-kpi-grid--4">
        <StatCard
          icon={TeamOutlined}
          label="Total employees"
          value={employees.length.toString()}
        />
        <StatCard
          icon={CheckCircleOutlined}
          label="Present today"
          value={stats.presentToday.toString()}
          hintTone="positive"
        />
        <StatCard
          icon={ClockCircleOutlined}
          label="On leave"
          value={stats.onLeave.toString()}
        />
        <StatCard
          icon={WarningOutlined}
          label="Late punches"
          value={stats.latePunches.toString()}
          hintTone="warning"
        />
      </div>

      <EmployeeFilterPanel
        filters={filters}
        setFilters={setFilters}
        options={filterOptions}
        loading={loading}
        onApply={() => setAppliedFilters({ ...filters })}
      />

      <ReportSection
        title="Employee directory"
        meta={`${dataSource.length} of ${employees.length} employees`}
        flush
      >
        <CommonTable<Employee>
          {...tableProps}
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1520 }}
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            showTotal: (total) => `${total} employees`,
          }}
          locale={{
            emptyText: (
              <div className="py-8 text-center text-zinc-400 font-medium">
                No employees match the selected filters
              </div>
            ),
          }}
        />
      </ReportSection>
    </div>
  );
}
