"use client";

import { useState } from "react";
import { Tabs, Table, Tag } from "antd";
import { CheckCircleFilled, CloseCircleFilled } from "@ant-design/icons";

import RepHeader from "@/components/hrms/RepHeader";
import ReportSection from "@/components/hrms/ReportSection";
import { getLeaveDummy, leaveTypeColor } from "@/lib/leave-dummy";

function Yes() {
  return <Tag color="success" icon={<CheckCircleFilled />}>Yes</Tag>;
}
function No() {
  return <Tag color="default" icon={<CloseCircleFilled />}>No</Tag>;
}
function Bool({ v }: { v: boolean }) {
  return v ? <Yes /> : <No />;
}
function ValueBadge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: 6,
      background: "var(--bg-sunken)",
      border: "1px solid var(--border)",
      fontSize: 13,
      fontWeight: 600,
      color: "var(--fg)",
    }}>
      {children}
    </span>
  );
}

function ViewRow({ label, sub, value }: { label: string; sub?: string; value: React.ReactNode }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      padding: "13px 0",
      borderBottom: "1px solid var(--border)",
    }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, color: "var(--fg)" }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{value}</div>
    </div>
  );
}

export default function LeaveAdminPage() {
  const demo = getLeaveDummy();
  const [tab, setTab] = useState("types");

  const typeColumns = [
    {
      title: "Code", dataIndex: "code", key: "code",
      render: (c: string) => <Tag color={leaveTypeColor(c)}>{c}</Tag>,
    },
    { title: "Name", dataIndex: "name", key: "name" },
    {
      title: "Yearly", dataIndex: "yearly", key: "yearly",
      render: (v: string) => <ValueBadge>{v}</ValueBadge>,
    },
    { title: "Accrual", dataIndex: "accrual", key: "accrual" },
    {
      title: "Carry fwd (max)", dataIndex: "carryFwd", key: "cf",
      render: (v: string) => <ValueBadge>{v}</ValueBadge>,
    },
    {
      title: "Encashable", dataIndex: "encashable", key: "enc",
      render: (v: boolean) => <Bool v={v} />,
    },
    {
      title: "Half-day", dataIndex: "halfDay", key: "hd",
      render: (v: boolean) => <Bool v={v} />,
    },
    {
      title: "Doc reqd", dataIndex: "docRequired", key: "doc",
      render: (v: boolean) => <Bool v={v} />,
    },
    { title: "Applies to", dataIndex: "appliesTo", key: "app" },
    {
      title: "Active", dataIndex: "active", key: "active",
      render: (v: boolean) => <Bool v={v} />,
    },
  ];

  const holidayColumns = [
    { title: "Date", dataIndex: "date", key: "date" },
    { title: "Holiday", dataIndex: "name", key: "name" },
    {
      title: "Type", dataIndex: "type", key: "type",
      render: (t: string) => (
        <Tag color={t === "public" ? "blue" : "orange"}>
          {t === "public" ? "Public" : "Optional"}
        </Tag>
      ),
    },
  ];

  const tp = { size: "middle" as const, className: "attendance-report-table", pagination: false as const };

  return (
    <div className="attendance-reports-page">
      <RepHeader
        title="Leave Admin"
        subtitle="Leave types, policy rules, holiday calendar and approval workflow"
        backHref="/hrms/leave"
        backLabel="Leave hub"
      />

      <div className="attendance-report-section">
        <Tabs
          activeKey={tab}
          onChange={setTab}
          style={{ padding: "0 20px" }}
          items={[
            {
              key: "types",
              label: "Leave types",
              children: (
                <div style={{ paddingBottom: 20 }}>
                  <Table
                    dataSource={demo.leaveTypes}
                    columns={typeColumns as never}
                    rowKey="code"
                    {...tp}
                    scroll={{ x: 1000 }}
                  />
                </div>
              ),
            },

            {
              key: "policy",
              label: "Policy & rules",
              children: (
                <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 20 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <ReportSection title="Policy & rules">
                      <div style={{ padding: "0 4px" }}>
                        <ViewRow
                          label="Leave year"
                          sub="Balances reset / carry-over basis"
                          value={<ValueBadge>Apr–Mar</ValueBadge>}
                        />
                        <ViewRow
                          label="Allow back-dated application"
                          sub="SL up to 7 days back"
                          value={<Yes />}
                        />
                        <ViewRow
                          label="Min advance notice (PL)"
                          value={<ValueBadge>3 days</ValueBadge>}
                        />
                        <ViewRow
                          label="Max consecutive days (PL)"
                          value={<ValueBadge>10 days</ValueBadge>}
                        />
                        <ViewRow
                          label="Auto-deduct LWP if no balance"
                          sub="When PL/CL/SL exhausted"
                          value={<Yes />}
                        />
                      </div>
                    </ReportSection>

                    <ReportSection title="Encashment & carry-forward">
                      <div style={{ padding: "0 4px" }}>
                        <ViewRow
                          label="PL encashment frequency"
                          value={<ValueBadge>Year-end (Mar)</ValueBadge>}
                        />
                        <ViewRow
                          label="Min PL balance to keep"
                          sub="Days employee must retain"
                          value={<ValueBadge>5 days</ValueBadge>}
                        />
                        <ViewRow
                          label="Max encashment per year"
                          sub="Max PL days encashable"
                          value={<ValueBadge>15 days</ValueBadge>}
                        />
                        <ViewRow
                          label="Encashment basis"
                          value={<ValueBadge>Basic salary</ValueBadge>}
                        />
                        <ViewRow
                          label="Carry-forward cap (PL)"
                          sub="Max PL days carried to next year"
                          value={<ValueBadge>30 days</ValueBadge>}
                        />
                        <ViewRow
                          label="Lapse CL/SL at year end?"
                          sub="Unused CL/SL forfeited 31-Mar"
                          value={<Yes />}
                        />
                        <ViewRow
                          label="Comp.Off expiry"
                          sub="Days within which Comp.Off must be availed"
                          value={<ValueBadge>90 days</ValueBadge>}
                        />
                      </div>
                    </ReportSection>
                  </div>
                </div>
              ),
            },

            {
              key: "holidays",
              label: "Holiday calendar",
              children: (
                <div style={{ paddingBottom: 20 }}>
                  <Table
                    dataSource={demo.holidays}
                    columns={holidayColumns as never}
                    rowKey="date"
                    {...tp}
                  />
                </div>
              ),
            },

            {
              key: "workflow",
              label: "Approval workflow",
              children: (
                <div style={{ paddingBottom: 20 }}>
                  <p style={{ fontSize: 13, color: "var(--fg-muted)", margin: "0 0 16px" }}>
                    Approvers and SLA per leave type. HR can action requests on the{" "}
                    <a href="/hrms/leave/approval" style={{ color: "var(--primary)" }}>Leave approval</a> screen.
                  </p>
                  <Table
                    dataSource={demo.approvalWorkflow}
                    rowKey="id"
                    {...tp}
                    scroll={{ x: 1000 }}
                    columns={[
                      {
                        title: "Leave type", dataIndex: "leaveType", key: "type",
                        render: (c: string) => <Tag color={leaveTypeColor(c)}>{c}</Tag>,
                      },
                      { title: "Days range", dataIndex: "daysRange", key: "range" },
                      { title: "L1 approver", dataIndex: "l1Approver", key: "l1" },
                      { title: "L2 approver", dataIndex: "l2Approver", key: "l2" },
                      { title: "L3 escalation", dataIndex: "l3Escalation", key: "l3" },
                      {
                        title: "SLA days", dataIndex: "slaDays", key: "sla", width: 90,
                        render: (v: number) => <ValueBadge>{v}d</ValueBadge>,
                      },
                      {
                        title: "Auto-approve after SLA", dataIndex: "autoApproveAfterSla", key: "auto", width: 190,
                        render: (v: boolean) => <Bool v={v} />,
                      },
                    ]}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
