"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Tag, message, Tooltip, DatePicker, Select } from "antd";
import {
  DownloadOutlined,
  ThunderboltOutlined,
  CheckOutlined,
  ReloadOutlined,
  FilterOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  WalletOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import RepHeader from "@/components/hrms/RepHeader";
import { HRMS_BACK } from "@/lib/hrms-nav";
import CommonTable from "@/components/common/CommonTable";
import StatCard from "@/components/common/StatCard";
import ReportSection from "@/components/hrms/ReportSection";
import { ERP_TABLE_PROPS } from "@/components/common/erpStatusBadges";
import FilterSearchField from "@/components/hrms/FilterSearchField";
import PayslipModal from "@/components/hrms/PayslipModal";

type SalaryRow = {
  _id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  grossSalary: number;
  netPayable: number;
  status: string;
  workingDays: number;
  daysPresent: number;
  leaveDays?: number;
  unpaidLeaveDays?: number;
  leaveDeduction: number;
  pfEmployee: number;
  pfEmployer: number;
  esi: number;
  tds: number;
  otherDeductions?: number;
  overtimeHours: number;
  overtimeAmount: number;
};

const STATUS_COLOR: Record<string, string> = {
  draft: "orange",
  approved: "green",
  disbursed: "blue",
  pending: "default",
};

const STATUS_OPTIONS = [
  { value: "all", label: "All monthly employees" },
  { value: "paid", label: "Paid (disbursed)" },
  { value: "approved", label: "Approved" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
];

const fmt = (n: number) =>
  `₹${(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

function parseCycleParam(value: string | null): dayjs.Dayjs {
  if (value && dayjs(value, "YYYY-MM", true).isValid()) {
    return dayjs(value, "YYYY-MM");
  }
  return dayjs();
}

function MonthlySalaryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sheets, setSheets] = useState<SalaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [payslipRow, setPayslipRow] = useState<SalaryRow | null>(null);
  const [month, setMonth] = useState(() =>
    parseCycleParam(searchParams.get("cycle"))
  );

  const cycleLabel = month.format("MMMM YYYY");
  const cycleKey = month.format("YYYY-MM");
  const range: [dayjs.Dayjs, dayjs.Dayjs] = [
    month.startOf("month"),
    month.endOf("month"),
  ];

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        cycle: cycleKey,
        monthly: "1",
      });
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const res = await fetch(`/api/hrms/salary?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");
      setSheets(json.data || []);
      setSelectedRowKeys([]);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleKey, statusFilter]);

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setMonth(dayjs());
  };

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
      router.push(`/hrms/salary/bulk?cycle=${cycleKey}`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setApproving(false);
    }
  };

  const exportPdf = () => {
    const doc = new jsPDF("landscape");
    doc.setFontSize(16);
    doc.text(`Monthly Salary - ${cycleLabel}`, 14, 20);
    
    autoTable(doc, {
      startY: 30,
      head: [["Emp ID", "Name", "Department", "Gross", "Present/Total", "Deduction", "Net Payable", "Status"]],
      body: filteredSheets.map(r => [
        r.employeeId,
        r.employeeName,
        r.department,
        fmt(r.grossSalary),
        `${r.daysPresent} / ${r.workingDays}`,
        fmt(
          (r.pfEmployee || 0) +
          (r.esi || 0) +
          (r.tds || 0) +
          (r.leaveDeduction || 0) +
          (r.otherDeductions || 0)
        ),
        fmt(r.netPayable),
        r.status
      ]),
    });
    
    doc.save(`Monthly_Salary_${cycleKey}.pdf`);
  };

  const filteredSheets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sheets;
    return sheets.filter((row) => {
      const haystack = [row.employeeId, row.employeeName, row.department]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [sheets, search]);

  const summary = useMemo(
    () => ({
      total: filteredSheets.length,
      paid: filteredSheets.filter((s) => s.status === "disbursed").length,
      approved: filteredSheets.filter((s) => s.status === "approved").length,
      pending: filteredSheets.filter((s) => s.status === "pending").length,
      totalNet: filteredSheets.reduce((a, s) => a + (s.netPayable || 0), 0),
      totalGross: filteredSheets.reduce((a, s) => a + (s.grossSalary || 0), 0),
      paidNet: filteredSheets
        .filter((s) => s.status === "disbursed")
        .reduce((a, s) => a + (s.netPayable || 0), 0),
    }),
    [filteredSheets]
  );

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
      width: 160,
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
      render: (_: unknown, r: SalaryRow) =>
        r.status === "pending" ? (
          <span className="text-zinc-400">—</span>
        ) : (
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
      render: (_: unknown, r: SalaryRow) => {
        if (r.status === "pending") {
          return <span className="text-zinc-400">—</span>;
        }
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
      render: (_: unknown, r: SalaryRow) =>
        r.status === "pending" ? (
          <span className="text-zinc-400">—</span>
        ) : (
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
      render: (v: number, r: SalaryRow) =>
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
      width: 110,
      render: (v: string) => (
        <Tag
          color={STATUS_COLOR[v] || "default"}
          style={{
            borderRadius: 20,
            border: 0,
            fontWeight: 600,
            textTransform: "capitalize",
          }}
        >
          {v === "disbursed" ? "Paid" : v === "pending" ? "Pending" : v}
        </Tag>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 70,
      fixed: "right" as const,
      render: (_: unknown, row: SalaryRow) => (
        row.status !== "pending" ? (
          <Tooltip title="View Payslip">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => setPayslipRow(row)}
            />
          </Tooltip>
        ) : null
      ),
    },
  ];

  return (
    <div className="attendance-reports-page">
      <RepHeader
        {...HRMS_BACK.salary}
        title="Monthly Salary"
        subtitle={`${cycleLabel} · Monthly CTC employees from HR records`}
      />

      <div className="attendance-kpi-grid attendance-kpi-grid--auto">
        <StatCard
          icon={TeamOutlined}
          label="Monthly employees"
          value={String(summary.total)}
          hint={cycleLabel}
        />
        <StatCard
          icon={CheckCircleOutlined}
          label="Paid (disbursed)"
          value={String(summary.paid)}
          hint={`${summary.approved} approved · ${summary.pending} not generated`}
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
          label="Net paid out"
          value={fmt(summary.paidNet || summary.totalNet)}
          hint={
            summary.paid > 0
              ? `${summary.paid} employees disbursed`
              : "Disbursal amount"
          }
          hintTone="positive"
        />
      </div>

      <div className="arf-panel ap-filters-panel">
        <div className="arf-head">
          <FilterOutlined style={{ color: "var(--primary)", fontSize: 12 }} />
          <span className="arf-head-title">Filters</span>
        </div>
        <div className="arf-body">
          <div className="arf-controls ap-filters-controls ap-filters-controls--toolbar-inline">
            <FilterSearchField
              value={search}
              onChange={setSearch}
              placeholder="Employee ID, name, department…"
            />
            <div className="arf-item ap-filters-toolbar-field">
              <span className="arf-label">Pay month</span>
              <DatePicker
                className="w-full"
                picker="month"
                value={month}
                onChange={(v) => {
                  if (v) setMonth(v);
                }}
                allowClear={false}
                format="MMMM YYYY"
              />
            </div>
            <div className="arf-item ap-filters-toolbar-field">
              <span className="arf-label">Payment status</span>
              <Select
                className="w-full"
                value={statusFilter}
                options={STATUS_OPTIONS}
                onChange={setStatusFilter}
              />
            </div>
            <div className="ap-filters-toolbar-actions">
              <Button
                type="primary"
                icon={<FilterOutlined />}
                onClick={() => void load()}
                loading={loading}
              >
                Apply filters
              </Button>
              <Button onClick={handleClearFilters}>Clear filters</Button>
              <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
                Refresh
              </Button>
              <Button
                icon={<ThunderboltOutlined />}
                onClick={generate}
                loading={generating}
                style={{
                  background: "#7c3aed",
                  borderColor: "#7c3aed",
                  color: "#fff",
                }}
              >
                Generate
              </Button>
              <Button
                icon={<CheckOutlined />}
                onClick={bulkApprove}
                loading={approving}
                style={{
                  background: "#059669",
                  borderColor: "#059669",
                  color: "#fff",
                }}
              >
                {selectedRowKeys.length > 0
                  ? `Approve (${selectedRowKeys.length})`
                  : "Approve All"}
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={exportPdf}
              >
                Export PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ReportSection
        title={`Monthly paid employees — ${cycleLabel}`}
        meta={
          search.trim()
            ? `${filteredSheets.length} of ${sheets.length} employees · ${summary.paid} paid`
            : `${sheets.length} monthly CTC employees · ${summary.paid} paid`
        }
        flush
      >
        <CommonTable
          {...ERP_TABLE_PROPS}
          loading={loading}
          dataSource={filteredSheets}
          columns={columns}
          rowKey="_id"
          size="middle"
          className="attendance-report-table"
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys as string[]),
            getCheckboxProps: (record: SalaryRow) => ({
              disabled:
                record.status === "pending" ||
                String(record._id).startsWith("pending-"),
            }),
          }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (n) => `${n} employees`,
          }}
          scroll={{ x: 1250 }}
          locale={{
            emptyText: (
              <div className="py-12 text-center">
                <p className="font-semibold text-zinc-500 m-0">
                  {search.trim()
                    ? "No employees match your search"
                    : "No monthly CTC employees found"}
                </p>
                <p className="text-zinc-400 text-[12px] mt-1">
                  {search.trim()
                    ? "Try a different employee ID, name, or department"
                    : "Add employees with Monthly CTC compensation in HRMS"}
                </p>
              </div>
            ),
          }}
        />
      </ReportSection>
      <PayslipModal
        open={!!payslipRow}
        onClose={() => setPayslipRow(null)}
        salarySheet={payslipRow}
      />
    </div>
  );
}

export default function MonthlySalaryPage() {
  return (
    <Suspense
      fallback={
        <div className="attendance-reports-page" style={{ padding: 24 }}>
          Loading monthly salary…
        </div>
      }
    >
      <MonthlySalaryContent />
    </Suspense>
  );
}
