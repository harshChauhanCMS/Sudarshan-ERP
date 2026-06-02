"use client";

import { Card, Typography, Table, Badge, Button, Progress } from "antd";
import RepHeader from "@/components/hrms/RepHeader";
import { TableActionIcon } from "@/components/common/TableActionIcons";
import { HRMS_BACK } from "@/lib/hrms-nav";
import {
  WalletOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  HistoryOutlined,
  EyeOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

export default function PayrollPage() {
  const payrollData = [
    { key: "1", cycle: "May 2026", employees: 306, amount: "₹42,84,200", status: "Processing (95%)", date: "May 31, 2026" },
    { key: "2", cycle: "April 2026", employees: 302, amount: "₹42,28,000", status: "Disbursed", date: "April 30, 2026" },
    { key: "3", cycle: "March 2026", employees: 298, amount: "₹41,72,500", status: "Disbursed", date: "March 31, 2026" },
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
      title: "",
      key: "action",
      width: 56,
      align: "right" as const,
      render: () => (
        <TableActionIcon label="View details" icon={<EyeOutlined />} onClick={() => {}} />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <RepHeader
        {...HRMS_BACK.dashboard}
        title="Payroll Management"
        subtitle="Employee compensation, benefits, and salary cycles"
        actions={
          <Button
            type="primary"
            style={{
              height: 38,
              borderRadius: 6,
              background: "#374d95",
              border: "none",
              fontWeight: 600,
              fontSize: 13,
            }}
            className="hover:bg-[#2a3c74] active:bg-[#1e2a54]"
          >
            Process Payroll
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="rounded-xl border-zinc-200/30 shadow-sm" bodyStyle={{ padding: "20px 24px" }}>
          <div className="flex justify-between items-start">
            <div>
              <div className="text-zinc-400 font-semibold text-[11px] uppercase tracking-wider">Total Payout (MTD)</div>
              <div className="text-[28px] font-extrabold text-zinc-900 mt-2 tracking-tight">₹42,84,200</div>
              <div className="text-zinc-400 text-xs font-normal mt-2">Active cycle: May 2026</div>
            </div>
            <div className="bg-[#374d95]/5 text-[#374d95] h-9 w-9 rounded-lg flex items-center justify-center">
              <WalletOutlined className="text-lg" />
            </div>
          </div>
        </Card>

        <Card className="rounded-xl border-zinc-200/30 shadow-sm" bodyStyle={{ padding: "20px 24px" }}>
          <div className="flex justify-between items-start">
            <div>
              <div className="text-zinc-400 font-semibold text-[11px] uppercase tracking-wider">Taxes & Deductions</div>
              <div className="text-[28px] font-extrabold text-zinc-900 mt-2 tracking-tight">₹5,40,650</div>
              <div className="text-amber-500 text-xs font-semibold mt-2">PF + PT + TDS</div>
            </div>
            <div className="bg-zinc-50 text-zinc-400 h-9 w-9 rounded-lg flex items-center justify-center">
              <DollarOutlined className="text-lg" />
            </div>
          </div>
        </Card>

        <Card className="rounded-xl border-zinc-200/30 shadow-sm" bodyStyle={{ padding: "20px 24px" }}>
          <div className="flex justify-between items-start">
            <div>
              <div className="text-zinc-400 font-semibold text-[11px] uppercase tracking-wider">Processing Progress</div>
              <div className="text-[28px] font-extrabold text-zinc-900 mt-2 tracking-tight">95%</div>
              <Progress percent={95} size="small" showInfo={false} strokeColor="#374d95" className="mt-2.5 block" />
            </div>
            <div className="bg-blue-50 text-blue-500 h-9 w-9 rounded-lg flex items-center justify-center">
              <HistoryOutlined className="text-lg" />
            </div>
          </div>
        </Card>

        <Card className="rounded-xl border-zinc-200/30 shadow-sm" bodyStyle={{ padding: "20px 24px" }}>
          <div className="flex justify-between items-start">
            <div>
              <div className="text-zinc-400 font-semibold text-[11px] uppercase tracking-wider">Last Cycle Paid</div>
              <div className="text-[28px] font-extrabold text-zinc-900 mt-2 tracking-tight">₹42,28,000</div>
              <div className="text-emerald-500 text-xs font-semibold mt-2">Paid April 30, 2026</div>
            </div>
            <div className="bg-emerald-50 text-emerald-500 h-9 w-9 rounded-lg flex items-center justify-center">
              <CheckCircleOutlined className="text-lg" />
            </div>
          </div>
        </Card>
      </div>

      {/* Salary Cycles Table */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden p-6 flex flex-col gap-6">
        <div className="font-bold text-zinc-900 text-base">Salary Disbursements</div>
        <Table dataSource={payrollData} columns={columns} pagination={false} />
      </div>
    </div>
  );
}
