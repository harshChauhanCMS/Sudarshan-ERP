"use client";

import Link from "next/link";
import RepHeader from "@/components/hrms/RepHeader";
import { HRMS_BACK } from "@/lib/hrms-nav";
import {
  BarChartOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  ArrowRightOutlined,
  UserOutlined,
} from "@ant-design/icons";

type ReportCard = {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  accent: string;
  iconColor: string;
  iconBg: string;
};

const CARDS: ReportCard[] = [
  {
    icon: <BarChartOutlined />,
    title: "Attendance Overview",
    description: "Company-wide KPIs, weekly attendance trends, unit summary, and department compliance.",
    href: "/hrms/reports/attendance",
    accent: "#374d95",
    iconColor: "#374d95",
    iconBg: "#eef1fa",
  },
  {
    icon: <UserOutlined />,
    title: "Employee Report",
    description: "Monthly summary by employee — filter by absent, late coming, short hours, or overtime.",
    href: "/hrms/reports/employee",
    accent: "#168a52",
    iconColor: "#168a52",
    iconBg: "#e3f4ea",
  },
  {
    icon: <CalendarOutlined />,
    title: "Daily Attendance",
    description: "Day-by-day punch records with in/out times, worked hours, shortfall and OT per employee.",
    href: "/hrms/reports/daily",
    accent: "#1965c0",
    iconColor: "#1965c0",
    iconBg: "#e4eef9",
  },
  {
    icon: <EnvironmentOutlined />,
    title: "Field Attendance",
    description: "GPS-verified field staff breakdown — in-office vs field days, by employee and unit.",
    href: "/hrms/reports/field",
    accent: "#0f766e",
    iconColor: "#0f766e",
    iconBg: "#f0fdfa",
  },
  {
    icon: <ClockCircleOutlined />,
    title: "Late Coming / Early Going",
    description: "Discipline report — late punches and early exits with patterns by employee, dept, shift & unit.",
    href: "/hrms/reports/late-early",
    accent: "#b86a00",
    iconColor: "#b86a00",
    iconBg: "#fbecd3",
  },
];

export default function ReportsGatewayPage() {
  return (
    <div className="rg-page">
      <RepHeader
        {...HRMS_BACK.dashboard}
        title="Reports"
        subtitle="Select a report to view detailed data, apply filters, and export"
      />

      <div className="rg-grid">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rg-card"
            style={{ ["--rg-accent" as string]: card.accent }}
          >
            <div className="rg-card__top">
              <div
                className="rg-card__icon"
                style={{ color: card.iconColor, background: card.iconBg }}
              >
                {card.icon}
              </div>
              <h3 className="rg-card__title">{card.title}</h3>
            </div>
            <p className="rg-card__desc">{card.description}</p>
            <div className="rg-card__cta" style={{ color: card.accent }}>
              Open report
              <ArrowRightOutlined className="rg-card__arrow" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
