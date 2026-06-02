import type { ReactNode } from "react";
import HrmsBackLink from "@/components/hrms/HrmsBackLink";
import { HRMS_BACK } from "@/lib/hrms-nav";

interface RepHeaderProps {
  title: string;
  subtitle?: string;
  backLabel?: string;
  backHref?: string;
  /** Hide back link (e.g. top-level hub only when needed) */
  hideBack?: boolean;
  actions?: ReactNode;
}

export default function RepHeader({
  title,
  subtitle,
  backLabel = HRMS_BACK.reports.backLabel,
  backHref = HRMS_BACK.reports.backHref,
  hideBack = false,
  actions,
}: RepHeaderProps) {
  return (
    <div className="rep-header">
      <div className="rep-header__left">
        {!hideBack && backHref && backLabel && (
          <HrmsBackLink href={backHref} label={backLabel} />
        )}
        <h2 className="rep-title">{title}</h2>
        {subtitle && <p className="rep-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="rep-actions">{actions}</div>}
    </div>
  );
}
