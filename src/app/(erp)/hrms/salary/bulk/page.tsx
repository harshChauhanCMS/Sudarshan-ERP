"use client";

import { Table, Button, Tag, Select, DatePicker } from "antd";
import {
  DownloadOutlined,
  ReloadOutlined,
  TeamOutlined,
  DollarOutlined,
  MinusCircleOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useMemo, useState } from "react";

import RepHeader from "@/components/hrms/RepHeader";
import ReportSection from "@/components/hrms/ReportSection";
import StatCard from "@/components/common/StatCard";
import {
  getPayrollSheetDummy,
  getPayrollSheetKpi,
  formatPayrollInr,
  type PayrollSheetRow,
} from "@/lib/payroll-sheet-dummy";

const STATUS_COLOR: Record<string, string> = {
  draft: "orange",
  approved: "green",
  disbursed: "blue",
};

export default function PayrollBulkPage() {
  const [month, setMonth] = useState(dayjs());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const allRows = useMemo(() => getPayrollSheetDummy(), []);

  const filtered = useMemo(
    () =>
      statusFilter === "all"
        ? allRows
        : allRows.filter((r) => r.status === statusFilter),
    [allRows, statusFilter]
  );

  const kpi = getPayrollSheetKpi(filtered);

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
    },
    {
      title: "Leave",
      dataIndex: "leave",
      key: "leave",
      width: 64,
      align: "center" as const,
    },
    {
      title: "LWP",
      dataIndex: "lwp",
      key: "lwp",
      width: 56,
      align: "center" as const,
    },
    {
      title: "Pay days",
      dataIndex: "payDays",
      key: "pay",
      width: 80,
      align: "center" as const,
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
      render: (v: number) => (
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
      render: () => <Button size="small">Edit</Button>,
    },
  ];

  return (
    <div className="attendance-reports-page">
      <RepHeader
        title="Payroll Sheet — Bulk View"
        subtitle="Full salary register with bank details, statutory deductions and attendance columns"
        backHref="/hrms/salary"
        backLabel="Salary hub"
        actions={<Button icon={<DownloadOutlined />}>Export</Button>}
      />

      {/* Toolbar */}
      <div className="sl-toolbar">
        <div className="sl-toolbar__controls">
          <div className="sl-toolbar__field">
            <span className="sl-toolbar__label">Month</span>
            <DatePicker
              picker="month"
              value={month}
              onChange={(d) => d && setMonth(d)}
              allowClear={false}
            />
          </div>
          <div className="sl-toolbar__field">
            <span className="sl-toolbar__label">Status</span>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 160 }}
              options={[
                { value: "all", label: "All statuses" },
                { value: "draft", label: "Draft" },
                { value: "approved", label: "Approved" },
                { value: "disbursed", label: "Disbursed" },
              ]}
            />
          </div>
        </div>
        <div className="sl-toolbar__actions">
          <Button icon={<ReloadOutlined />}>Refresh</Button>
        </div>
      </div>

      {/* KPI cards */}
      <div
        className="attendance-kpi-grid"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}
      >
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

      {/* Payroll table */}
      <ReportSection
        title={`Payroll register · ${month.format("MMMM YYYY")}`}
        meta={`${filtered.length} employees · scroll horizontally for all columns`}
        flush
      >
        <Table<PayrollSheetRow>
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          size="middle"
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
