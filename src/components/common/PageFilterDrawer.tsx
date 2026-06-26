"use client";

import type { ReactNode } from "react";
import { Button, Drawer } from "antd";
import { FilterOutlined } from "@ant-design/icons";

export interface PageFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  onApply: () => void;
  onClear?: () => void;
  loading?: boolean;
  title?: string;
  width?: number;
  children: ReactNode;
}

export default function PageFilterDrawer({
  open,
  onClose,
  onApply,
  onClear,
  loading = false,
  title = "Filters",
  width = 360,
  children,
}: PageFilterDrawerProps) {
  const handleApply = () => {
    onApply();
    onClose();
  };

  const handleClear = () => {
    onClear?.();
  };

  return (
    <Drawer
      title={title}
      placement="right"
      onClose={onClose}
      open={open}
      width={width}
      className="page-filter-drawer"
      destroyOnClose={false}
      footer={
        <div className="page-filter-drawer__footer">
          {onClear ? (
            <Button onClick={handleClear}>Clear filters</Button>
          ) : (
            <span />
          )}
          <Button
            type="primary"
            icon={<FilterOutlined />}
            loading={loading}
            onClick={handleApply}
          >
            Apply filters
          </Button>
        </div>
      }
    >
      <div className="page-filter-drawer__body">{children}</div>
    </Drawer>
  );
}
