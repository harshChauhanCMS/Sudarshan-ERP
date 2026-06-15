"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Select, DatePicker, Input, Tag, message } from "antd";
import {
  SendOutlined,
  WalletOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import RepHeader from "@/components/hrms/RepHeader";
import { HRMS_BACK } from "@/lib/hrms-nav";
import dayjs, { type Dayjs } from "dayjs";
import {
  APPLY_LEAVE_TYPES,
  API_LEAVE_TO_UI,
  API_LEAVE_LABELS,
  calcLeaveDays,
  uiTypeToApi,
} from "@/lib/leave-apply";

type SelfEmployee = {
  employeeId: string;
  fullName: string;
  department?: string;
  designation?: string;
};

type BalanceRow = {
  leaveType: string;
  label: string;
  annualQuota: number;
  used: number;
  remaining: number;
};

type RecentLeave = {
  _id: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason?: string;
  status: string;
};

const STATUS_COLOR: Record<string, string> = {
  approved: "success",
  pending: "warning",
  hod_approved: "processing",
  rejected: "error",
  cancelled: "error",
  rolled_back: "default",
  completed: "cyan",
};

const STATUS_LABEL: Record<string, string> = {
  approved: "Approved",
  pending: "Pending",
  hod_approved: "Pending",
  rejected: "Rejected",
  cancelled: "Cancelled",
  rolled_back: "Rolled back",
  completed: "Completed",
};

export default function LeaveApplyPage() {
  const [employee, setEmployee] = useState<SelfEmployee | null>(null);
  const [profileError, setProfileError] = useState("");
  const [balance, setBalance] = useState<BalanceRow[]>([]);
  const [recent, setRecent] = useState<RecentLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [leaveType, setLeaveType] = useState<string>("PL");
  const [duration, setDuration] = useState("full");
  const [fromDate, setFromDate] = useState<Dayjs | null>(dayjs());
  const [toDate, setToDate] = useState<Dayjs | null>(dayjs());
  const [reason, setReason] = useState("");
  const [contact, setContact] = useState("");

  const employeeId = employee?.employeeId ?? "";

  const loadData = useCallback(async () => {
    setLoading(true);
    setProfileError("");
    try {
      const res = await fetch("/api/hrms/leave/self");
      const json = await res.json();

      if (!res.ok) {
        setEmployee(null);
        setBalance([]);
        setRecent([]);
        setProfileError(
          json?.error ||
            "No employee profile is linked to your login. Contact HR to link your account.",
        );
        return;
      }

      const profile = json.data?.employee as SelfEmployee | undefined;
      if (!profile?.employeeId) {
        setEmployee(null);
        setBalance([]);
        setRecent([]);
        setProfileError("No employee profile is linked to your login.");
        return;
      }

      setEmployee(profile);
      setBalance(Array.isArray(json.data?.balance) ? json.data.balance : []);
      const leaves = Array.isArray(json.data?.recent) ? json.data.recent : [];
      setRecent(
        leaves.map((l: Record<string, unknown>) => ({
          _id: String(l._id ?? ""),
          leaveType: String(l.leaveType ?? ""),
          fromDate: String(l.fromDate ?? ""),
          toDate: String(l.toDate ?? ""),
          days: Number(l.days ?? 0),
          reason: typeof l.reason === "string" ? l.reason : "",
          status: String(l.status ?? "pending"),
        })),
      );
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to load leave data");
      setEmployee(null);
      setBalance([]);
      setRecent([]);
      setProfileError("Failed to load your employee profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const totalDays = useMemo(() => {
    if (!fromDate || !toDate) return 0;
    return calcLeaveDays(fromDate, toDate, duration);
  }, [fromDate, toDate, duration]);

  const apiLeaveType = uiTypeToApi(leaveType);

  const selectedBalance = useMemo(() => {
    if (!apiLeaveType) return null;
    return balance.find((b) => b.leaveType === apiLeaveType) ?? null;
  }, [balance, apiLeaveType]);

  const balanceAfter = useMemo(() => {
    if (!selectedBalance || selectedBalance.annualQuota <= 0) return null;
    return Math.max(0, selectedBalance.remaining - totalDays);
  }, [selectedBalance, totalDays]);

  const balancePreview = useMemo(() => {
    return balance.map((b) => {
      const ui = API_LEAVE_TO_UI[b.leaveType] ?? b.leaveType;
      const label = API_LEAVE_LABELS[b.leaveType] ?? b.label;
      const isSelected = b.leaveType === apiLeaveType;
      const value =
        isSelected && balanceAfter != null && b.annualQuota > 0
          ? String(balanceAfter)
          : b.annualQuota > 0
            ? String(b.remaining)
            : "—";
      return {
        type: label,
        ui,
        value,
        warn: isSelected && balanceAfter != null && balanceAfter <= 2 && b.annualQuota > 0,
      };
    });
  }, [balance, apiLeaveType, balanceAfter]);

  const handleSubmit = async () => {
    if (!employeeId) {
      message.error(
        profileError ||
          "Your account is not linked to an employee profile. Contact HR.",
      );
      return;
    }
    if (!fromDate || !toDate) {
      message.error("Select from and to dates.");
      return;
    }
    if (toDate.isBefore(fromDate, "day")) {
      message.error("To date cannot be before from date.");
      return;
    }
    if (!apiLeaveType) {
      message.error("Select a valid leave type.");
      return;
    }
    if (totalDays < 0.5) {
      message.error("Leave duration must be at least half a day.");
      return;
    }
    if (!reason.trim()) {
      message.error("Please enter a reason for leave.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        selfApply: true,
        leaveType: apiLeaveType,
        fromDate: fromDate.format("YYYY-MM-DD"),
        toDate: toDate.format("YYYY-MM-DD"),
        days: totalDays,
        reason: contact.trim()
          ? `${reason.trim()} (Contact: ${contact.trim()})`
          : reason.trim(),
      };

      const res = await fetch("/api/hrms/leave", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to submit leave");

      message.success("Leave application submitted successfully.");
      setReason("");
      setContact("");
      setDuration("full");
      setFromDate(dayjs());
      setToDate(dayjs());
      void loadData();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to submit leave");
    } finally {
      setSubmitting(false);
    }
  };

  const dateRangeLabel =
    fromDate && toDate
      ? `${fromDate.format("DD MMM YYYY")} – ${toDate.format("DD MMM YYYY")}`
      : "—";

  return (
    <div className="attendance-reports-page leave-apply-page">
      <RepHeader
        backLabel={HRMS_BACK.leave.backLabel}
        backHref={HRMS_BACK.leave.backHref}
        title="Apply Leave"
        subtitle="Submit a new leave request with balance preview"
        actions={
          <Button
            type="primary"
            icon={<SendOutlined />}
            style={{ background: "#374d95", borderColor: "#374d95" }}
            loading={submitting}
            disabled={loading || !employeeId}
            onClick={() => void handleSubmit()}
          >
            Submit
          </Button>
        }
      />

      <div className="lv-apply-emp">
        {employeeId ? (
          <>
            {employeeId} — {employee?.fullName ?? "Employee"}
            {employee?.department ? ` · ${employee.department}` : ""}
          </>
        ) : (
          profileError ||
          "No employee profile linked to your login — contact HR to apply leave."
        )}
      </div>

      <div className="lv-apply-layout">
        <div className="lv-apply-main">
          <div className="lv-apply-card">
            <p className="lv-apply-section-title">Leave type</p>
            <div className="lv-apply-chips">
              {APPLY_LEAVE_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`lv-apply-chip${leaveType === t ? " lv-apply-chip--active" : ""}`}
                  onClick={() => setLeaveType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="lv-apply-card">
            <p className="lv-apply-section-title">Dates &amp; duration</p>
            <div className="lv-apply-date-row">
              <div className="lv-apply-field">
                <label className="lv-apply-label">From</label>
                <DatePicker
                  className="w-full"
                  value={fromDate}
                  onChange={setFromDate}
                  allowClear={false}
                />
              </div>
              <div className="lv-apply-field">
                <label className="lv-apply-label">To</label>
                <DatePicker
                  className="w-full"
                  value={toDate}
                  onChange={setToDate}
                  allowClear={false}
                  disabledDate={(d) =>
                    fromDate ? !!d && d.isBefore(fromDate, "day") : false
                  }
                />
              </div>
            </div>
            <div className="lv-apply-field">
              <label className="lv-apply-label">Duration</label>
              <Select
                className="w-full"
                value={duration}
                onChange={setDuration}
                options={[
                  { value: "full", label: "Full day" },
                  { value: "first-half-first", label: "First half (1st day)" },
                  {
                    value: "second-half-first",
                    label: "Second half (1st day)",
                  },
                  { value: "first-half-last", label: "First half (last day)" },
                  {
                    value: "second-half-last",
                    label: "Second half (last day)",
                  },
                ]}
              />
            </div>
          </div>

          <div className="lv-apply-card">
            <p className="lv-apply-section-title">Details</p>
            <div className="lv-apply-field">
              <label className="lv-apply-label">Reason</label>
              <Input.TextArea
                rows={3}
                placeholder="Reason for leave…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div className="lv-apply-field">
              <label className="lv-apply-label">Contact while away</label>
              <Input
                placeholder="+91 98765 43210"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </div>
          </div>

        </div>

        <aside className="lv-apply-aside">
          <div className="lv-apply-preview-card">
            <div className="lv-apply-preview-head">
              <WalletOutlined />
              Leave preview
            </div>
            <div className="lv-apply-preview-body">
              <p className="lv-apply-preview-summary">
                Applying{" "}
                <strong>
                  {totalDays || "—"} {leaveType}
                </strong>{" "}
                · {dateRangeLabel}
                {balanceAfter != null ? (
                  <>
                    . Balance after: <strong>{balanceAfter} {leaveType}</strong>
                  </>
                ) : null}
              </p>
              <ul className="leave-balance-list">
                {loading ? (
                  <li>
                    <span>Loading balance…</span>
                  </li>
                ) : balancePreview.length === 0 ? (
                  <li>
                    <span>No balance data</span>
                  </li>
                ) : (
                  balancePreview.map((b) => (
                    <li key={b.ui}>
                      <span>{b.type}</span>
                      <span className={b.warn ? "leave-balance-warn" : undefined}>
                        {b.value}
                      </span>
                    </li>
                  ))
                )}
              </ul>
              {selectedBalance &&
              selectedBalance.leaveType === "sick" &&
              selectedBalance.remaining <= 5 ? (
                <div className="leave-balance-note">
                  SL balance below 5 days — keep medical certificate ready.
                </div>
              ) : null}
            </div>
          </div>

          <div className="lv-apply-card">
            <p className="lv-apply-section-title">My recent applications</p>
            <ul className="leave-recent-list">
              {loading ? (
                <li>
                  <span className="leave-recent-meta">Loading…</span>
                </li>
              ) : recent.length === 0 ? (
                <li>
                  <span className="leave-recent-meta">No applications yet</span>
                </li>
              ) : (
                recent.map((app) => {
                  const uiType = API_LEAVE_TO_UI[app.leaveType] ?? app.leaveType;
                  const from = dayjs(app.fromDate);
                  const to = dayjs(app.toDate);
                  const range = from.isValid() && to.isValid()
                    ? `${from.format("DD MMM")} – ${to.format("DD MMM YYYY")}`
                    : "—";
                  return (
                    <li key={app._id}>
                      <div className="leave-recent-main">
                        <Tag>{uiType}</Tag>
                        <span className="leave-recent-range">{range}</span>
                        <span className="leave-recent-meta">{app.days}d</span>
                      </div>
                      {app.reason ? (
                        <p className="leave-recent-reason">{app.reason}</p>
                      ) : null}
                      <Tag color={STATUS_COLOR[app.status] || "default"}>
                        {STATUS_LABEL[app.status] || app.status}
                      </Tag>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
