"use client";

import { Badge, Button } from "antd";
import RepHeader from "@/components/hrms/RepHeader";
import CommonTable from "@/components/common/CommonTable";
import StatCard from "@/components/common/StatCard";
import ReportSection from "@/components/hrms/ReportSection";
import { TableActionIcon } from "@/components/common/TableActionIcons";
import { ERP_TABLE_PROPS } from "@/components/common/erpStatusBadges";
import { HRMS_BACK } from "@/lib/hrms-nav";
import {
  WalletOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  HistoryOutlined,
  EyeOutlined,
} from "@ant-design/icons";

export default function PayrollPage() {
  const payrollData = [
    { key: "1", cycle: "May 2026", cycleKey: "2026-05", employees: 306, amount: "₹42,84,200", status: "Processing (95%)", date: "May 31, 2026" },
    { key: "2", cycle: "April 2026", cycleKey: "2026-04", employees: 302, amount: "₹42,28,000", status: "Disbursed", date: "April 30, 2026" },
    { key: "3", cycle: "March 2026", cycleKey: "2026-03", employees: 298, amount: "₹41,72,500", status: "Disbursed", date: "March 31, 2026" },
  ];

  const columns = [
    { title: "Salary Cycle", dataIndex: "cycle", key: "cycle", render: (text: string) => <span className="font-bold">{text}</span> },
    { title: "Employees Paid", dataIndex: "employees", key: "employees" },
    { title: "Net Disbursement", dataIndex: "amount", key: "amount", render: (text: string) => <span className="font-bold text-zinc-950">{text}</span> },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Badge
          status={status === "Disbursed" ? "success" : "processing"}
          text={<span className={`font-semibold ${status === "Disbursed" ? "text-emerald-600" : "text-blue-600 animate-pulse"}`}>{status}</span>}
        />
      ),
    },
    { title: "Payment Date", dataIndex: "date", key: "date" },
    {
      title: "Actions",
      key: "action",
      width: 72,
      align: "center" as const,
      render: (_: unknown, row: { cycleKey?: string }) => (
        <TableActionIcon
          label="View details"
          icon={<EyeOutlined />}
          href={
            row.cycleKey
              ? `/hrms/salary/monthly?cycle=${row.cycleKey}`
              : "/hrms/salary/monthly"
          }
        />
      ),
    },
  ];

  return (
    <div className="attendance-reports-page">
      <RepHeader
        {...HRMS_BACK.reports}
        title="Payroll Management"
        subtitle="Employee compensation, benefits, and salary cycles"
        actions={
          <Button type="primary" icon={<WalletOutlined />}>
            Process Payroll
          </Button>
        }
      />

      <div className="attendance-kpi-grid attendance-kpi-grid--4">
        <StatCard
          icon={WalletOutlined}
          label="Total payout (MTD)"
          value="₹42,84,200"
          hint="Active cycle: May 2026"
        />
        <StatCard
          icon={DollarOutlined}
          label="Taxes & deductions"
          value="₹5,40,650"
          hint="PF + PT + TDS"
          hintTone="warning"
        />
        <StatCard
          icon={HistoryOutlined}
          label="Processing progress"
          value="95%"
          hint="May 2026 cycle in progress"
        />
        <StatCard
          icon={CheckCircleOutlined}
          label="Last cycle paid"
          value="₹42,28,000"
          hint="Paid April 30, 2026"
          hintTone="positive"
        />
      </div>

      <ReportSection title="Salary disbursements" flush>
        <CommonTable
          {...ERP_TABLE_PROPS}
          dataSource={payrollData}
          columns={columns}
          pagination={false}
          bordered
          size="middle"
          className="attendance-report-table"
        />
      </ReportSection>
    </div>
  );
}
