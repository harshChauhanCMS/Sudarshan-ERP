"use client";

import { CalendarOutlined } from "@ant-design/icons";
import { Typography } from "antd";
import type { ReactNode } from "react";
import HrmsBackLink from "@/components/hrms/HrmsBackLink";

export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  date?: ReactNode;
  actions?: ReactNode;
  /** Smaller title in brand blue; actions stay right-aligned */
  compact?: boolean;
  backLabel?: string;
  backHref?: string;
}

export default function PageHeader({
  title,
  subtitle,
  date,
  actions,
  compact = false,
  backLabel,
  backHref,
}: PageHeaderProps) {
  const showBack = Boolean(backLabel && backHref);

  if (showBack) {
    return (
      <div className="rep-header mb-6">
        <div className="rep-header__left">
          <HrmsBackLink href={backHref!} label={backLabel!} />
          {compact ? (
            <h2 className="rep-title rep-title--compact">{title}</h2>
          ) : (
            <h2 className="rep-title">{title}</h2>
          )}
          {subtitle && (
            <p className="rep-subtitle">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="rep-actions">{actions}</div>}
      </div>
    );
  }

  return (
    <div className="page-header mb-6 flex w-full items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <Typography.Title
            level={compact ? 5 : 3}
            className={
              compact
                ? "page-header__title page-header__title--compact mb-0!"
                : "page-header__title mb-0!"
            }
          >
            {title}
          </Typography.Title>
          {date && (
            <span className="inline-flex items-center gap-1 text-sm text-zinc-500">
              <CalendarOutlined />
              {date}
            </span>
          )}
        </div>
        {subtitle && (
          <Typography.Text type="secondary" className="page-header__subtitle text-sm">
            {subtitle}
          </Typography.Text>
        )}
      </div>
      {actions && (
        <div className="page-header__actions flex shrink-0 flex-wrap items-center justify-end gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
