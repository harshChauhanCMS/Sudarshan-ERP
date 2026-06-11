"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  TeamOutlined,
  DollarOutlined,
  MinusCircleOutlined,
  WalletOutlined,
  TableOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";

import StatCard from "@/components/common/StatCard";
import RepHeader from "@/components/hrms/RepHeader";
import { HRMS_BACK } from "@/lib/hrms-nav";
import {
  getPayrollSheetKpi,
  formatPayrollInr,
  type PayrollSheetRow,
} from "@/lib/payroll-sheet";

const FEATURE_CARDS = [
  {
    href: "/hrms/salary/bulk",
    title: "Payroll Sheet — Bulk View",
    description:
      "Wide register with bank details, statutory deductions, attendance and all pay components.",
    icon: TableOutlined,
  },
  {
    href: "/hrms/salary/daily-wage",
    title: "Daily Wage Payroll",
    description:
      "Daily-wage workers register — rate × days + overtime with cash and bank disbursement.",
    icon: WalletOutlined,
  },
];

export default function SalaryIndexPage() {
  const [rows, setRows] = useState<PayrollSheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const cycleKey = dayjs().format("YYYY-MM");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hrms/salary/bulk?cycle=${cycleKey}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load payroll");
      setRows(json.data || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [cycleKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const kpi = getPayrollSheetKpi(rows);
  const monthLabel = dayjs().format("MMM YYYY");

  return (
    <div className="attendance-reports-page">
      <RepHeader
        {...HRMS_BACK.dashboard}
        title="Salary & Payroll"
        subtitle="Salary sheets, statutory deductions, bank disbursement and payroll runs"
      />

      <div className="attendance-kpi-grid attendance-kpi-grid--auto">
        <StatCard
          icon={TeamOutlined}
          label="Employees on sheet"
          value={loading ? "…" : String(kpi.employees)}
          hint={`${monthLabel} payroll`}
        />
        <StatCard
          icon={DollarOutlined}
          label="Total gross"
          value={loading ? "…" : formatPayrollInr(kpi.gross)}
          hint="Before deductions"
          hintTone="positive"
        />
        <StatCard
          icon={MinusCircleOutlined}
          label="Total deductions"
          value={loading ? "…" : formatPayrollInr(kpi.deductions)}
          hint="PF, ESI, TDS, LWP"
          hintTone="warning"
        />
        <StatCard
          icon={WalletOutlined}
          label="Net payable"
          value={loading ? "…" : formatPayrollInr(kpi.netPay)}
          hint="After deductions"
          hintTone="positive"
        />
      </div>

      <div className="salary-feature-grid">
        {FEATURE_CARDS.map((card) => (
          <Link key={card.href} href={card.href} className="salary-feature-card">
            <div className="salary-feature-card__icon">
              <card.icon />
            </div>
            <div className="salary-feature-card__title">{card.title}</div>
            <div className="salary-feature-card__desc">{card.description}</div>
            <div className="salary-feature-card__cta">
              Open <ArrowRightOutlined />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
