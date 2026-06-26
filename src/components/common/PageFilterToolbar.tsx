"use client";

import type { ReactNode } from "react";
import { Badge, Button, Input } from "antd";
import { FilterOutlined, SearchOutlined } from "@ant-design/icons";

export interface PageFilterToolbarProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  onFilterClick?: () => void;
  activeFilterCount?: number;
  showFilterButton?: boolean;
  trailing?: ReactNode;
  className?: string;
}

export default function PageFilterToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  onFilterClick,
  activeFilterCount = 0,
  showFilterButton = true,
  trailing,
  className = "",
}: PageFilterToolbarProps) {
  return (
    <div className={`page-filter-toolbar ${className}`.trim()}>
      {onSearchChange ? (
        <Input
          allowClear
          className="page-filter-toolbar__search"
          placeholder={searchPlaceholder}
          prefix={<SearchOutlined style={{ color: "var(--fg-muted)" }} />}
          value={search ?? ""}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      ) : null}
      {showFilterButton && onFilterClick ? (
        <Badge count={activeFilterCount || 0} size="small" offset={[-4, 4]}>
          <Button icon={<FilterOutlined />} onClick={onFilterClick}>
            Filters
          </Button>
        </Badge>
      ) : null}
      {trailing ? (
        <div className="page-filter-toolbar__trailing">{trailing}</div>
      ) : null}
    </div>
  );
}
