"use client";

import { useState } from "react";
import { Button, Select, DatePicker, Input, Upload, Tag } from "antd";
import {
  SendOutlined,
  SaveOutlined,
  UploadOutlined,
  WalletOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import RepHeader from "@/components/hrms/RepHeader";
import { HRMS_BACK } from "@/lib/hrms-nav";
import dayjs from "dayjs";

import { getLeaveDummy } from "@/lib/leave-dummy";

const LEAVE_TYPES = ["PL", "CL", "SL", "Comp.Off", "OD", "LWP"];

export default function LeaveApplyPage() {
  const demo = getLeaveDummy();
  const [leaveType, setLeaveType] = useState("PL");
  const [duration, setDuration] = useState("full");
  const totalDays = 3;

  return (
    <div className="attendance-reports-page leave-apply-page">
      <RepHeader
        backLabel={HRMS_BACK.leave.backLabel}
        backHref={HRMS_BACK.leave.backHref}
        title="Apply Leave"
        subtitle="Submit a new leave request with balance preview"
        actions={
          <>
            <Button
              type="primary"
              icon={<SendOutlined />}
              style={{ background: "#374d95", borderColor: "#374d95" }}
            >
              Submit
            </Button>
          </>
        }
      />

      <div className="lv-apply-emp">
        {demo.employee.id} — {demo.employee.name}
      </div>

      <div className="lv-apply-layout">
        <div className="lv-apply-main">
          <div className="lv-apply-card">
            <p className="lv-apply-section-title">Leave type</p>
            <div className="lv-apply-chips">
              {LEAVE_TYPES.map((t) => (
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
                  defaultValue={dayjs("2025-03-12")}
                />
              </div>
              <div className="lv-apply-field">
                <label className="lv-apply-label">To</label>
                <DatePicker
                  className="w-full"
                  defaultValue={dayjs("2025-03-14")}
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
                defaultValue="Family wedding — sister's marriage in home town"
              />
            </div>
            <div className="lv-apply-field">
              <label className="lv-apply-label">Contact while away</label>
              <Input
                placeholder="+91 98765 43210"
                defaultValue="+91 98765 43210"
              />
            </div>
          </div>

          <div className="lv-apply-card">
            <p className="lv-apply-section-title">
              Supporting document (optional)
            </p>
            <Upload.Dragger multiple={false} beforeUpload={() => false}>
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p style={{ margin: 0, fontSize: 12, color: "var(--fg-muted)" }}>
                PDF, JPG, PNG · max 5 MB
              </p>
            </Upload.Dragger>
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
                  {totalDays} {leaveType}
                </strong>{" "}
                · 12–14 Mar 2025. Balance after: <strong>11.5 PL</strong>
              </p>
              <ul className="leave-balance-list">
                {demo.balancePreview.map((b) => (
                  <li key={b.type}>
                    <span>{b.type}</span>
                    <span
                      className={
                        "warn" in b && b.warn ? "leave-balance-warn" : undefined
                      }
                    >
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

          <div className="lv-apply-card">
            <p className="lv-apply-section-title">
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

          <div className="lv-apply-card">
            <p className="lv-apply-section-title">My recent applications</p>
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
                      app.status === "Approved"
                        ? "success"
                        : app.status === "Pending"
                          ? "warning"
                          : "error"
                    }
                  >
                    {app.status}
                  </Tag>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
