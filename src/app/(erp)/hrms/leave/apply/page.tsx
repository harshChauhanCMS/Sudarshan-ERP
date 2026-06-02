"use client";

import { useEffect, useState } from "react";
import {
  Button, Select, DatePicker, Input, InputNumber, Upload, Tag,
} from "antd";
import {
  SendOutlined,
  SaveOutlined,
  UploadOutlined,
  WalletOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import HrmsBackLink from "@/components/hrms/HrmsBackLink";
import { HRMS_BACK } from "@/lib/hrms-nav";
import dayjs from "dayjs";

import { getLeaveDummy } from "@/lib/leave-dummy";

const LEAVE_TYPES = ["PL", "CL", "SL", "Comp.Off", "OD", "LWP"];

export default function LeaveApplyPage() {
  const demo = getLeaveDummy();
  const [leaveType, setLeaveType] = useState("PL");
  const [duration, setDuration]   = useState("full");
  const [totalDays, setTotalDays] = useState(3);

  // Hide the ERP shell so the form takes the full viewport
  useEffect(() => {
    document.documentElement.classList.add("leave-apply-mobile-route");
    return () => document.documentElement.classList.remove("leave-apply-mobile-route");
  }, []);

  return (
    <div className="leave-apply-mobile">
      {/* ── Sticky header ── */}
      <header className="lv-mob-header">
        <HrmsBackLink
          href={HRMS_BACK.leave.backHref}
          label={HRMS_BACK.leave.backLabel}
        />
        <h1 className="lv-mob-title">Apply Leave</h1>
        <Button
          type="primary"
          size="small"
          icon={<SendOutlined />}
          style={{ background: "#374d95", borderColor: "#374d95" }}
        >
          Submit
        </Button>
      </header>

      {/* ── Scrollable body ── */}
      <div className="lv-mob-body">
        {/* Employee strip */}
        <div className="lv-mob-emp">
          {demo.employee.id} — {demo.employee.name}
        </div>

        {/* Leave type */}
        <div className="lv-mob-section">
          <p className="lv-mob-section-title">Leave type</p>
          <div className="lv-mob-chips">
            {LEAVE_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className={`lv-mob-chip${leaveType === t ? " lv-mob-chip--active" : ""}`}
                onClick={() => setLeaveType(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className="lv-mob-section">
          <p className="lv-mob-section-title">Dates &amp; duration</p>
          <div className="lv-mob-date-row">
            <div className="lv-mob-field" style={{ marginBottom: 0 }}>
              <label className="lv-mob-label">From</label>
              <DatePicker className="w-full" defaultValue={dayjs("2025-03-12")} />
            </div>
            <div className="lv-mob-field" style={{ marginBottom: 0 }}>
              <label className="lv-mob-label">To</label>
              <DatePicker className="w-full" defaultValue={dayjs("2025-03-14")} />
            </div>
          </div>
          <div className="lv-mob-field">
            <label className="lv-mob-label">Duration</label>
            <Select
              className="w-full"
              value={duration}
              onChange={setDuration}
              options={[
                { value: "full",              label: "Full day" },
                { value: "first-half-first",  label: "First half (1st day)" },
                { value: "second-half-first", label: "Second half (1st day)" },
                { value: "first-half-last",   label: "First half (last day)" },
                { value: "second-half-last",  label: "Second half (last day)" },
              ]}
            />
          </div>
          <div className="lv-mob-field">
            <label className="lv-mob-label">Total days</label>
            <InputNumber
              className="w-full"
              min={0.5}
              step={0.5}
              value={totalDays}
              onChange={(v) => setTotalDays(v ?? 1)}
            />
          </div>
        </div>

        {/* Details */}
        <div className="lv-mob-section">
          <p className="lv-mob-section-title">Details</p>
          <div className="lv-mob-field">
            <label className="lv-mob-label">Approver</label>
            <Select
              className="w-full"
              defaultValue="anita"
              options={[{ value: "anita", label: "Anita Desai (HR Manager)" }]}
            />
          </div>
          <div className="lv-mob-field">
            <label className="lv-mob-label">Backup / coverage by</label>
            <Select
              className="w-full"
              defaultValue="EMP-2046"
              options={[{ value: "EMP-2046", label: "EMP-2046 — Vikram Singh" }]}
            />
          </div>
          <div className="lv-mob-field">
            <label className="lv-mob-label">Reason</label>
            <Input.TextArea
              rows={3}
              placeholder="Reason for leave…"
              defaultValue="Family wedding — sister's marriage in home town"
            />
          </div>
          <div className="lv-mob-field">
            <label className="lv-mob-label">Contact while away</label>
            <Input
              placeholder="+91 98765 43210"
              defaultValue="+91 98765 43210"
            />
          </div>
        </div>

        {/* Document */}
        <div className="lv-mob-section">
          <p className="lv-mob-section-title">Supporting document (optional)</p>
          <Upload.Dragger multiple={false} beforeUpload={() => false}>
            <p className="ant-upload-drag-icon"><UploadOutlined /></p>
            <p style={{ margin: 0, fontSize: 12, color: "var(--fg-muted)" }}>
              PDF, JPG, PNG · max 5 MB
            </p>
          </Upload.Dragger>
        </div>

        {/* Balance preview */}
        <div className="lv-mob-preview-card">
          <div className="lv-mob-preview-head">
            <WalletOutlined />
            Leave preview
          </div>
          <div className="lv-mob-preview-body">
            <p className="lv-mob-preview-summary">
              Applying <strong>{totalDays} {leaveType}</strong> · 12–14 Mar 2025.
              Balance after: <strong>11.5 PL</strong>
            </p>
            <ul className="leave-balance-list">
              {demo.balancePreview.map((b) => (
                <li key={b.type}>
                  <span>{b.type}</span>
                  <span className={"warn" in b && b.warn ? "leave-balance-warn" : undefined}>
                    {b.value}
                  </span>
                </li>
              ))}
            </ul>
            <div className="leave-balance-note">
              SL balance below 5 days — keep medical certificate ready.
            </div>
          </div>
        </div>

        {/* Holidays */}
        <div className="lv-mob-section" style={{ borderBottom: "none" }}>
          <p className="lv-mob-section-title">
            <CalendarOutlined style={{ marginRight: 5 }} />
            Holidays (next 30 days)
          </p>
          <ul className="leave-holiday-list">
            {demo.holidays.slice(0, 4).map((h) => (
              <li key={h.date}>
                <span className="leave-holiday-date">{h.date}</span>
                {h.name}
              </li>
            ))}
          </ul>
        </div>

        {/* Recent applications */}
        <div className="lv-mob-section" style={{ borderTop: "1px solid var(--border)", borderBottom: "none" }}>
          <p className="lv-mob-section-title">My recent applications</p>
          <ul className="leave-recent-list">
            {demo.recentApplications.map((app, i) => (
              <li key={i}>
                <div className="leave-recent-main">
                  <Tag>{app.type}</Tag>
                  <span className="leave-recent-range">{app.range}</span>
                  <span className="leave-recent-meta">{app.days}</span>
                </div>
                <p className="leave-recent-reason">{app.reason}</p>
                <Tag
                  color={
                    app.status === "Approved" ? "success"
                      : app.status === "Pending"  ? "warning"
                        : "error"
                  }
                >
                  {app.status}
                </Tag>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Sticky footer ── */}
      <footer className="lv-mob-footer">
        <Button block size="large" icon={<SaveOutlined />}>
          Save draft
        </Button>
        <Button
          block
          size="large"
          type="primary"
          icon={<SendOutlined />}
          style={{ background: "#374d95", borderColor: "#374d95" }}
        >
          Submit request
        </Button>
      </footer>
    </div>
  );
}
