import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeftOutlined } from "@ant-design/icons";

interface RepHeaderProps {
  title: string;
  subtitle?: string;
  backLabel?: string;
  backHref?: string;
  actions?: ReactNode;
}

export default function RepHeader({
  title,
  subtitle,
  backLabel = "All reports",
  backHref = "/hrms/reports",
  actions,
}: RepHeaderProps) {
  return (
    <div className="rep-header">
      <div className="rep-header__left">
        <Link href={backHref} className="rep-breadcrumb">
          <ArrowLeftOutlined className="rep-breadcrumb__icon" />
          {backLabel}
        </Link>
        <h2 className="rep-title">{title}</h2>
        {subtitle && <p className="rep-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="rep-actions">{actions}</div>}
    </div>
  );
}
