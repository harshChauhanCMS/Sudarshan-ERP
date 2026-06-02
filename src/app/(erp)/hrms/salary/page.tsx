"use client";

import Link from "next/link";
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
  getPayrollSheetDummy,
  getPayrollSheetKpi,
  formatPayrollInr,
} from "@/lib/payroll-sheet-dummy";

const FEATURE_CARDS = [
  // {
  //   href: "/hrms/salary/monthly",
  //   title: "Monthly Salary",
  //   description:
  //     "Generate, approve and export monthly salary sheets from attendance data.",
  //   icon: CalendarOutlined,
  // },
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
  const rows = getPayrollSheetDummy();
  const kpi = getPayrollSheetKpi(rows);

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
          value={String(kpi.employees)}
          hint="Mar 2026 payroll preview"
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

      <div className="salary-feature-grid">
        {FEATURE_CARDS.map((card) => (
          <Link key={card.href} href={card.href} className="salary-feature-card">
            <div className="salary-feature-card__icon">
              <card.icon />
            </div>
            <div className="salary-feature-card__title">{card.title}</div>
            <div className="salary-feature-card__desc">{card.description}</div>
            <div className="salary-feature-card__cta">
              Open <ArrowRightOutlined style={{ fontSize: 11 }} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
