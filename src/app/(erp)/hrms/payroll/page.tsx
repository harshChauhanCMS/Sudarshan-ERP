"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Select } from "antd";
import PageFilterPanel from "@/components/common/PageFilterPanel";
import dayjs from "dayjs";
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
import {
  getPayrollSheetKpi,
  formatPayrollInr,
  type PayrollSheetRow,
} from "@/lib/payroll-sheet";

type PayrollCycleRow = {
  key: string;
  cycle: string;
  cycleKey: string;
  employees: number;
  amount: string;
  status: string;
  date: string;
};

function cycleStatus(rows: PayrollSheetRow[]) {
  const generated = rows.filter((r) => r.status !== "pending");
  if (generated.length === 0) return "Not started";
  const disbursed = generated.filter((r) => r.status === "disbursed").length;
  if (disbursed === generated.length) return "Disbursed";
  const approved = generated.filter((r) => r.status === "approved").length;
  if (approved === generated.length) return "Approved";
  const pct = Math.round((generated.length / Math.max(rows.length, 1)) * 100);
  return `Processing (${pct}%)`;
}

export default function PayrollPage() {
  const [cycles, setCycles] = useState<PayrollCycleRow[]>([]);
  const [currentRows, setCurrentRows] = useState<PayrollSheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const monthKeys = Array.from({ length: 6 }, (_, i) =>
        dayjs().subtract(i, "month").format("YYYY-MM"),
      );
      const results = await Promise.all(
        monthKeys.map(async (cycleKey) => {
          const res = await fetch(`/api/hrms/salary/bulk?cycle=${cycleKey}`);
          const json = await res.json();
          if (!res.ok) return { cycleKey, rows: [] as PayrollSheetRow[] };
          return { cycleKey, rows: (json.data || []) as PayrollSheetRow[] };
        }),
      );

      const tableRows: PayrollCycleRow[] = results
        .filter((r) => r.rows.length > 0)
        .map(({ cycleKey, rows }) => {
          const kpi = getPayrollSheetKpi(rows);
          const d = dayjs(`${cycleKey}-01`);
          return {
            key: cycleKey,
            cycle: d.format("MMMM YYYY"),
            cycleKey,
            employees: kpi.employees,
            amount: formatPayrollInr(kpi.netPay),
            status: cycleStatus(rows),
            date: d.endOf("month").format("MMMM D, YYYY"),
          };
        });

      setCycles(tableRows);
      setCurrentRows(results[0]?.rows ?? []);
    } catch {
      setCycles([]);
      setCurrentRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const currentKpi = useMemo(
    () => getPayrollSheetKpi(currentRows),
    [currentRows],
  );
  const currentLabel = dayjs().format("MMMM YYYY");

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

  const filteredCycles = useMemo(() => {
    return cycles.filter((c) => {
      if (statusFilter !== "all") {
        if (statusFilter === "pending" && c.status !== "Not started") return false;
        if (statusFilter === "approved" && c.status !== "Approved") return false;
        if (statusFilter === "disbursed" && c.status !== "Disbursed") return false;
        if (statusFilter === "processing" && !c.status.startsWith("Processing")) return false;
      }
      if (search) {
        const term = search.toLowerCase();
        if (!c.cycle.toLowerCase().includes(term) && !c.status.toLowerCase().includes(term)) {
          return false;
        }
      }
      return true;
    });
  }, [cycles, search, statusFilter]);

  return (
    <div className="attendance-reports-page">
      <RepHeader
        {...HRMS_BACK.reports}
        title="Payroll Management"
        subtitle="Employee compensation, benefits, and salary cycles"
        actions={
          <Button type="primary" icon={<WalletOutlined />} href="/hrms/salary/bulk">
            Open payroll sheet
          </Button>
        }
      />

      <div className="attendance-kpi-grid attendance-kpi-grid--4">
        <StatCard
          icon={WalletOutlined}
          label="Total payout (MTD)"
          value={loading ? "…" : formatPayrollInr(currentKpi.netPay)}
          hint={`Active cycle: ${currentLabel}`}
        />
        <StatCard
          icon={DollarOutlined}
          label="Taxes & deductions"
          value={loading ? "…" : formatPayrollInr(currentKpi.deductions)}
          hint="PF + ESI + TDS"
          hintTone="warning"
        />
        <StatCard
          icon={HistoryOutlined}
          label="Employees on sheet"
          value={loading ? "…" : String(currentKpi.employees)}
          hint={`${currentLabel} cycle`}
        />
        <StatCard
          icon={CheckCircleOutlined}
          label="Gross payroll"
          value={loading ? "…" : formatPayrollInr(currentKpi.gross)}
          hint="Before deductions"
          hintTone="positive"
        />
      </div>

      <PageFilterPanel
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search cycle name or status…"
        activeFilterCount={statusFilter !== "all" ? 1 : 0}
        onApply={() => {}}
        onClear={() => {
          setSearch("");
          setStatusFilter("all");
        }}
        drawerWidth={320}
      >
        <div className="arf-item">
          <span className="arf-label">Status</span>
          <Select
            className="w-full"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "All statuses" },
              { value: "pending", label: "Not started" },
              { value: "processing", label: "Processing" },
              { value: "approved", label: "Approved" },
              { value: "disbursed", label: "Disbursed" },
            ]}
          />
        </div>
      </PageFilterPanel>

      <ReportSection title="Salary disbursements" flush>
        <CommonTable
          {...ERP_TABLE_PROPS}
          loading={loading}
          dataSource={filteredCycles}
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
