"use client";

import { Table, Button, Tag, message, Tooltip, DatePicker } from "antd";
import {
  DownloadOutlined,
  ThunderboltOutlined,
  CheckOutlined,
  ReloadOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

import RepHeader from "@/components/hrms/RepHeader";
import { HRMS_BACK } from "@/lib/hrms-nav";
import StatCard from "@/components/common/StatCard";
import ReportSection from "@/components/hrms/ReportSection";

const STATUS_COLOR: Record<string, string> = {
  draft: "orange",
  approved: "green",
  disbursed: "blue",
};
const fmt = (n: number) =>
  `₹${(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

export default function MonthlySalaryPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sheets, setSheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);

  const cycleLabel =
    range[0].format("MMM YYYY") === range[1].format("MMM YYYY")
      ? range[0].format("MMMM YYYY")
      : `${range[0].format("DD MMM")} – ${range[1].format("DD MMM YYYY")}`;
  const cycleKey = range[0].format("YYYY-MM");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hrms/salary?cycle=${cycleKey}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");
      setSheets(json.data || []);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleKey]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/hrms/salary/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          from: range[0].format("YYYY-MM-DD"),
          to: range[1].format("YYYY-MM-DD"),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");
      message.success(
        `Generated ${json.data.generated} sheets for ${cycleLabel}`
      );
      void load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setGenerating(false);
    }
  };

  const bulkApprove = async () => {
    setApproving(true);
    try {
      const body =
        selectedRowKeys.length > 0
          ? { ids: selectedRowKeys }
          : { cycle: cycleKey };
      const res = await fetch("/api/hrms/salary/bulk-approve", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");
      message.success(`Approved ${json.data.approved} salary sheets`);
      setSelectedRowKeys([]);
      void load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setApproving(false);
    }
  };

  const summary = {
    total: sheets.length,
    approved: sheets.filter((s) => s.status === "approved").length,
    totalNet: sheets.reduce((a, s) => a + ((s.netPayable as number) || 0), 0),
    totalGross: sheets.reduce(
      (a, s) => a + ((s.grossSalary as number) || 0),
      0
    ),
  };

  const columns = [
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
    { title: "Department", dataIndex: "department", key: "dept", width: 130 },
    {
      title: "Gross",
      dataIndex: "grossSalary",
      key: "gross",
      width: 120,
      render: (v: number) => (
        <span className="font-bold text-emerald-600">{fmt(v)}</span>
      ),
    },
    {
      title: "Attendance",
      key: "att",
      width: 110,
      render: (_: unknown, r: Record<string, number>) => (
        <Tooltip
          title={`Present: ${r.daysPresent} | Leave: ${r.leaveDays || 0} | Absent: ${Math.max(0, (r.workingDays || 0) - (r.daysPresent || 0) - (r.leaveDays || 0))} | Unpaid: ${r.unpaidLeaveDays || 0}`}
        >
          <span className="cursor-help">
            <span className="font-bold text-emerald-600">{r.daysPresent}</span>
            <span className="text-zinc-400"> / {r.workingDays}</span>
          </span>
        </Tooltip>
      ),
    },
    {
      title: "Deduction",
      key: "leaveded",
      width: 120,
      render: (_: unknown, r: Record<string, number>) => {
        const absent = Math.max(
          0,
          (r.workingDays || 0) - (r.daysPresent || 0) - (r.leaveDays || 0)
        );
        const total = absent + (r.unpaidLeaveDays || 0);
        return (
          <Tooltip
            title={`Absent: ${absent} | Unpaid leave: ${r.unpaidLeaveDays || 0} | Total deduct days: ${total}`}
          >
            <span
              className={`font-semibold cursor-help ${r.leaveDeduction > 0 ? "text-rose-600" : "text-zinc-400"}`}
            >
              {r.leaveDeduction > 0 ? `– ${fmt(r.leaveDeduction)}` : "—"}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: "PF + ESI",
      key: "pf",
      width: 110,
      render: (_: unknown, r: Record<string, number>) => (
        <Tooltip
          title={`PF (Emp): ${fmt(r.pfEmployee)} | PF (Empr): ${fmt(r.pfEmployer)} | ESI: ${fmt(r.esi)} | TDS: ${fmt(r.tds)}`}
        >
          <span className="font-semibold text-amber-600 cursor-help">
            – {fmt((r.pfEmployee || 0) + (r.esi || 0))}
          </span>
        </Tooltip>
      ),
    },
    {
      title: "Overtime",
      dataIndex: "overtimeAmount",
      key: "ot",
      width: 100,
      render: (v: number, r: Record<string, number>) =>
        v > 0 ? (
          <Tooltip title={`${r.overtimeHours}h OT`}>
            <span className="font-semibold text-blue-600 cursor-help">
              + {fmt(v)}
            </span>
          </Tooltip>
        ) : (
          <span className="text-zinc-400">—</span>
        ),
    },
    {
      title: "Net Payable",
      dataIndex: "netPayable",
      key: "net",
      width: 130,
      render: (v: number) => (
        <span className="font-extrabold text-[14px]">{fmt(v)}</span>
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
  ];

  return (
    <div className="attendance-reports-page">
      <RepHeader
        {...HRMS_BACK.salary}
        title="Monthly Salary"
        subtitle={`${cycleLabel} · CTC breakdown, leave deductions & net payable`}
      />

      {/* Toolbar */}
      <div className="sl-toolbar">
        <div className="sl-toolbar__controls">
          <div className="sl-toolbar__field">
            <span className="sl-toolbar__label">Pay cycle</span>
            <DatePicker.RangePicker
              value={range}
              onChange={(v) => {
                if (v && v[0] && v[1]) setRange([v[0], v[1]]);
              }}
              allowClear={false}
              format="DD MMM YYYY"
            />
          </div>
        </div>
        <div className="sl-toolbar__actions">
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
            Refresh
          </Button>
          <Button
            icon={<ThunderboltOutlined />}
            onClick={generate}
            loading={generating}
            style={{ background: "#7c3aed", borderColor: "#7c3aed", color: "#fff" }}
          >
            Generate
          </Button>
          <Button
            icon={<CheckOutlined />}
            onClick={bulkApprove}
            loading={approving}
            type="primary"
            style={{ background: "#059669", borderColor: "#059669" }}
          >
            {selectedRowKeys.length > 0
              ? `Approve (${selectedRowKeys.length})`
              : "Approve All"}
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={() =>
              window.open(`/api/hrms/salary/export.csv?cycle=${cycleKey}`, "_blank")
            }
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="attendance-kpi-grid attendance-kpi-grid--auto">
        <StatCard
          icon={TeamOutlined}
          label="Total employees"
          value={String(summary.total)}
          hint={cycleLabel}
        />
        <StatCard
          icon={CheckCircleOutlined}
          label="Approved"
          value={String(summary.approved)}
          hint={`${summary.total - summary.approved} pending`}
          hintTone="positive"
        />
        <StatCard
          icon={DollarOutlined}
          label="Total gross"
          value={fmt(summary.totalGross)}
          hint="Before deductions"
        />
        <StatCard
          icon={WalletOutlined}
          label="Net payable"
          value={fmt(summary.totalNet)}
          hint="Disbursal amount"
          hintTone="positive"
        />
      </div>

      {/* Salary sheets table */}
      <ReportSection
        title={`Salary sheets — ${cycleLabel}`}
        meta={`${sheets.length} employees · hover cells for breakdown`}
        flush
      >
        <Table
          loading={loading}
          dataSource={sheets}
          columns={columns}
          rowKey="_id"
          size="middle"
          className="attendance-report-table"
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys as string[]),
          }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (n) => `${n} employees`,
          }}
          scroll={{ x: 1100 }}
          locale={{
            emptyText: (
              <div className="py-12 text-center">
                <p className="font-semibold text-zinc-500 m-0">
                  No salary sheets for this period
                </p>
                <p className="text-zinc-400 text-[12px] mt-1">
                  Select a date range and click Generate
                </p>
              </div>
            ),
          }}
        />
      </ReportSection>
    </div>
  );
}
