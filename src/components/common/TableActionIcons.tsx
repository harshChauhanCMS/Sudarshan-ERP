"use client";

import Link from "next/link";
import { Button, Popconfirm, Space, Tooltip } from "antd";
import type { ReactNode } from "react";
import { DeleteOutlined, EditOutlined, EyeOutlined } from "@ant-design/icons";

function ActionIconButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="text"
      size="small"
      icon={icon}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="hrms-table-actions__btn"
    />
  );
}

type ViewEditActionsProps = {
  viewHref?: string;
  editHref?: string;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  viewLabel?: string;
  editLabel?: string;
  deleteLabel?: string;
  deleteConfirmTitle?: string;
  showView?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
};

/** Icon-only View + Edit (+ optional Delete) actions for HRMS / ERP tables */
export function ViewEditActions({
  viewHref,
  editHref,
  onView,
  onEdit,
  onDelete,
  viewLabel = "View",
  editLabel = "Edit",
  deleteLabel = "Delete",
  deleteConfirmTitle = "Delete this record?",
  showView = true,
  showEdit = true,
  showDelete = false,
}: ViewEditActionsProps) {
  const wrap = (href: string | undefined, node: ReactNode) =>
    href ? <Link href={href}>{node}</Link> : node;

  return (
    <Space size={2} className="hrms-table-actions">
      {showView && (viewHref || onView) && (
        <Tooltip title={viewLabel}>
          {wrap(
            viewHref,
            <ActionIconButton
              icon={<EyeOutlined />}
              label={viewLabel}
              onClick={viewHref ? undefined : onView}
            />
          )}
        </Tooltip>
      )}
      {showEdit && (editHref || onEdit) && (
        <Tooltip title={editLabel}>
          {wrap(
            editHref,
            <ActionIconButton
              icon={<EditOutlined />}
              label={editLabel}
              onClick={editHref ? undefined : onEdit}
            />
          )}
        </Tooltip>
      )}
      {showDelete && onDelete && (
        <Popconfirm
          title={deleteConfirmTitle}
          okText="Delete"
          okButtonProps={{ danger: true }}
          onConfirm={onDelete}
        >
          <Tooltip title={deleteLabel}>
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              aria-label={deleteLabel}
              className="hrms-table-actions__btn"
            />
          </Tooltip>
        </Popconfirm>
      )}
    </Space>
  );
}

type SingleActionProps = {
  href?: string;
  onClick?: () => void;
  label?: string;
  icon?: ReactNode;
  disabled?: boolean;
};

export function TableActionIcon({
  href,
  onClick,
  label = "Edit",
  icon = <EditOutlined />,
  disabled,
}: SingleActionProps) {
  const btn = (
    <ActionIconButton
      icon={icon}
      label={label}
      onClick={href ? undefined : onClick}
      disabled={disabled}
    />
  );

  return (
    <Space size={2} className="hrms-table-actions">
      <Tooltip title={label}>{href ? <Link href={href}>{btn}</Link> : btn}</Tooltip>
    </Space>
  );
}

/** Icon-only view action for ERP / HRMS data tables */
export function ErpViewAction({
  onClick,
  href,
  label = "View",
}: {
  onClick?: () => void;
  href?: string;
  label?: string;
}) {
  return (
    <ViewEditActions
      showEdit={false}
      showView
      onView={onClick ?? (href ? undefined : () => {})}
      viewHref={href}
      viewLabel={label}
    />
  );
}
