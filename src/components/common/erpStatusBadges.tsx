"use client";

import { Badge as AntBadge } from "antd";
import type { BadgeProps } from "antd";

type AntStatus = NonNullable<BadgeProps["status"]>;

const ERP_STATUS_MAP: Record<string, { status: AntStatus; text: string }> = {
  ok: { status: "success", text: "In stock" },
  low: { status: "warning", text: "Low" },
  critical: { status: "error", text: "Critical" },
  pending: { status: "warning", text: "Pending" },
  draft: { status: "default", text: "Draft" },
  pending_verification: { status: "warning", text: "Awaiting verification" },
  approved: { status: "processing", text: "Approved" },
  rejected: { status: "error", text: "Rejected" },
  received: { status: "success", text: "Received" },
  verified: { status: "success", text: "Verified" },
  matched: { status: "success", text: "Verified" },
  mismatch: { status: "error", text: "Mismatch" },
  awaiting: { status: "warning", text: "Awaiting" },
  "in-production": { status: "processing", text: "In production" },
  scheduled: { status: "default", text: "Scheduled" },
  dispatched: { status: "processing", text: "Dispatched" },
  delivered: { status: "success", text: "Delivered" },
  "in-transit": { status: "processing", text: "In transit" },
  "near-delivery": { status: "warning", text: "Near delivery" },
  loading: { status: "warning", text: "Loading" },
  completed: { status: "success", text: "Completed" },
  "in-progress": { status: "processing", text: "In progress" },
  active: { status: "success", text: "Active" },
  "on-beat": { status: "success", text: "On beat" },
  late: { status: "warning", text: "Late" },
  none: { status: "default", text: "No check-in" },
  progress: { status: "warning", text: "In progress" },
  behind: { status: "error", text: "Behind target" },
};

export function erpStatusBadge(status: string) {
  const m = ERP_STATUS_MAP[status];
  if (!m) return <AntBadge status="default" text={status} />;
  return <AntBadge status={m.status} text={m.text} />;
}

export function inventoryStatusBadge(status: string) {
  return erpStatusBadge(status);
}

export function invoiceStatusBadge(status: string) {
  if (status === "matched") return erpStatusBadge("matched");
  if (status === "mismatch") return erpStatusBadge("mismatch");
  return erpStatusBadge(status);
}

export function customerStatusBadge(status?: string) {
  if (status === "hold") return <AntBadge status="warning" text="Hold" />;
  if (status === "prospect") return <AntBadge status="processing" text="Prospect" />;
  return <AntBadge status="success" text="Active" />;
}

export const ERP_TABLE_PROPS = {
  bordered: false as const,
  size: "middle" as const,
  className: "attendance-report-table",
  pagination: false as const,
};
