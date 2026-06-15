"use client";

import { Button, Tag, Select, DatePicker, message } from "antd";
import {
  DownloadOutlined,
  ReloadOutlined,
  FilterOutlined,
  TeamOutlined,
  DollarOutlined,
  MinusCircleOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";
import RepHeader from "@/components/hrms/RepHeader";
import CommonTable from "@/components/common/CommonTable";
import { TableActionIcon } from "@/components/common/TableActionIcons";
import { ERP_TABLE_PROPS } from "@/components/common/erpStatusBadges";
import { HRMS_BACK } from "@/lib/hrms-nav";
import ReportSection from "@/components/hrms/ReportSection";
import StatCard from "@/components/common/StatCard";
import {
  getPayrollSheetKpi,
  formatPayrollInr,
  type PayrollSheetRow,
} from "@/lib/payroll-sheet";
import FilterSearchField from "@/components/hrms/FilterSearchField";
import { filterBySearch } from "@/lib/filter-search";

const STATUS_COLOR: Record<string, string> = {
  pending: "default",
  draft: "orange",
  approved: "green",
  disbursed: "blue",
};

export default function PayrollBulkPage() {
  const router = useRouter();
  const [month, setMonth] = useState(dayjs());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<PayrollSheetRow[]>([]);
  const [loading, setLoading] = useState(true);

  const cycleKey = month.format("YYYY-MM");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ cycle: cycleKey });
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      const res = await fetch(`/api/hrms/salary/bulk?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load payroll sheet");
      setRows(json.data || []);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to load payroll sheet");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [cycleKey, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return filterBySearch(rows, search, (r) => [
      r.employeeId,
      r.name,
      r.department,
      r.designation,
      r.pfUan,
      r.esiIp,
      r.accountNo,
      r.ifsc,
    ]);
  }, [rows, search]);

  const kpi = getPayrollSheetKpi(filtered);

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setMonth(dayjs());
  };

  const money = (v: number) => (
    <span className="font-semibold whitespace-nowrap">{formatPayrollInr(v)}</span>
  );

  const columns = [
    {
      title: "Emp ID",
      dataIndex: "employeeId",
      key: "eid",
      width: 96,
      fixed: "left" as const,
      render: (v: string) => (
        <span className="font-mono text-[12px] font-semibold">{v}</span>
      ),
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: 140,
      fixed: "left" as const,
      render: (v: string) => <span className="font-semibold">{v}</span>,
    },
    { title: "Department", dataIndex: "department", key: "dept", width: 110 },
    { title: "Designation", dataIndex: "designation", key: "desig", width: 120 },
    { title: "DOJ", dataIndex: "doj", key: "doj", width: 100 },
    {
      title: "PF / UAN",
      dataIndex: "pfUan",
      key: "pf",
      width: 130,
      render: (v: string) => (
        <span className="text-[11px] font-mono">{v}</span>
      ),
    },
    { title: "ESI / IP", dataIndex: "esiIp", key: "esi", width: 100 },
    {
      title: "Account no.",
      dataIndex: "accountNo",
      key: "acc",
      width: 140,
      render: (v: string) => (
        <span className="text-[11px] font-mono">{v}</span>
      ),
    },
    { title: "IFSC", dataIndex: "ifsc", key: "ifsc", width: 110 },
    {
      title: "Month days",
      dataIndex: "monthDays",
      key: "md",
      width: 88,
      align: "center" as const,
    },
    {
      title: "Present",
      dataIndex: "present",
      key: "pres",
      width: 72,
      align: "center" as const,
      render: (v: number, r: PayrollSheetRow) =>
        r.status === "pending" ? "—" : v,
    },
    {
      title: "Leave",
      dataIndex: "leave",
      key: "leave",
      width: 64,
      align: "center" as const,
      render: (v: number, r: PayrollSheetRow) =>
        r.status === "pending" ? "—" : v,
    },
    {
      title: "LWP",
      dataIndex: "lwp",
      key: "lwp",
      width: 56,
      align: "center" as const,
      render: (v: number, r: PayrollSheetRow) =>
        r.status === "pending" ? "—" : v,
    },
    {
      title: "Pay days",
      dataIndex: "payDays",
      key: "pay",
      width: 80,
      align: "center" as const,
      render: (v: number, r: PayrollSheetRow) =>
        r.status === "pending" ? "—" : v,
    },
    { title: "CTC", dataIndex: "ctc", key: "ctc", width: 100, render: money },
    { title: "Gross", dataIndex: "gross", key: "gross", width: 100, render: money },
    {
      title: "Bonus",
      dataIndex: "bonus",
      key: "bonus",
      width: 90,
      render: (v: number) => (v ? money(v) : "—"),
    },
    {
      title: "Incentives",
      dataIndex: "incentives",
      key: "inc",
      width: 100,
      render: (v: number) => (v ? money(v) : "—"),
    },
    {
      title: "Deductions",
      dataIndex: "deductions",
      key: "ded",
      width: 110,
      render: (v: number, r: PayrollSheetRow) =>
        r.status === "pending" ? (
          "—"
        ) : (
          <span className="font-semibold text-rose-600">
            {formatPayrollInr(v)}
          </span>
        ),
    },
    {
      title: "Reimbursement",
      dataIndex: "reimbursement",
      key: "reim",
      width: 120,
      render: (v: number) => (v ? money(v) : "—"),
    },
    {
      title: "Net pay",
      dataIndex: "netPay",
      key: "net",
      width: 110,
      render: (v: number) => (
        <span className="font-extrabold">{formatPayrollInr(v)}</span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (v: string) => (
        <Tag
          color={STATUS_COLOR[v] || "default"}
          style={{ borderRadius: 20, border: 0, fontWeight: 600, textTransform: "capitalize" }}
        >
          {v}
        </Tag>
      ),
    },
    {
      title: "Remarks",
      dataIndex: "remarks",
      key: "rem",
      width: 140,
      ellipsis: true,
      render: (v: string) => v || "—",
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      fixed: "right" as const,
      render: (_: unknown, record: PayrollSheetRow) => (
        <TableActionIcon
          label="Edit salary"
          onClick={() => {
            router.push(
              `/hrms/salary/bulk/${encodeURIComponent(record.id)}?cycle=${encodeURIComponent(cycleKey)}`,
            );
          }}
        />
      ),
    },
  ];

  return (
    <div className="attendance-reports-page">
      <RepHeader
        {...HRMS_BACK.salary}
        title="Payroll Sheet — Bulk View"
        subtitle="Full salary register with bank details, statutory deductions and attendance columns"
        actions={
          <Button
            icon={<DownloadOutlined />}
            onClick={() => {
              window.location.href = `/api/hrms/salary/export.csv?cycle=${cycleKey}`;
            }}
          >
            Export
          </Button>
        }
      />

      <div className="attendance-kpi-grid attendance-kpi-grid--auto">
        <StatCard
          icon={TeamOutlined}
          label="Employees"
          value={String(kpi.employees)}
          hint={month.format("MMMM YYYY")}
        />
        <StatCard
          icon={DollarOutlined}
          label="Total gross"
          value={formatPayrollInr(kpi.gross)}
          hint="Before deductions"
          hintTone="positive"
        />
        <StatCard
          icon={MinusCircleOutlined}
          label="Total deductions"
          value={formatPayrollInr(kpi.deductions)}
          hint="PF, ESI, TDS, LWP"
          hintTone="warning"
        />
        <StatCard
          icon={WalletOutlined}
          label="Net pay"
          value={formatPayrollInr(kpi.netPay)}
          hint="Disbursal amount"
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
              placeholder="Search employee ID, name, department…"
            />
            <div className="arf-item">
              <span className="arf-label">Month</span>
              <DatePicker
                className="w-full"
                picker="month"
                value={month}
                onChange={(d) => d && setMonth(d)}
                allowClear={false}
              />
            </div>
            <div className="arf-item">
              <span className="arf-label">Status</span>
              <Select
                className="w-full"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "all", label: "All statuses" },
                  { value: "pending", label: "Not generated" },
                  { value: "draft", label: "Draft" },
                  { value: "approved", label: "Approved" },
                  { value: "disbursed", label: "Disbursed" },
                ]}
              />
            </div>
            <div className="ap-filters-row-break" aria-hidden="true" />
            <div className="ap-filters-spacer" aria-hidden="true" />
            <div className="arf-item ap-filters-actions ap-filters-actions--multi">
              <Button onClick={handleClearFilters}>Clear filters</Button>
              <Button type="primary" icon={<FilterOutlined />} onClick={() => void load()}>
                Apply filters
              </Button>
              <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ReportSection
        title={`Payroll register · ${month.format("MMMM YYYY")}`}
        meta={`${filtered.length} employees · scroll horizontally for all columns`}
        flush
      >
        <CommonTable<PayrollSheetRow>
          {...ERP_TABLE_PROPS}
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          size="middle"
          loading={loading}
          locale={{
            emptyText: loading
              ? "Loading…"
              : "No monthly CTC employees found for this period.",
          }}
          className="attendance-report-table"
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            showTotal: (n) => `${n} rows`,
          }}
          scroll={{ x: 3200 }}
        />
      </ReportSection>
    </div>
  );
}
