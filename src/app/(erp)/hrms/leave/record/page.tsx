"use client";

import { useState } from "react";
import { Button, Select, Tag } from "antd";
import {
  PlusOutlined,
  DownloadOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import Link from "next/link";

import RepHeader from "@/components/hrms/RepHeader";
import { HRMS_BACK } from "@/lib/hrms-nav";
import CommonTable, { type CommonTableColumn } from "@/components/common/CommonTable";
import ReportSection from "@/components/hrms/ReportSection";
import { getLeaveDummy, type LeaveHistoryRow, type LeaveLedgerRow } from "@/lib/leave-dummy";

// Color palette per leave type
const TYPE_META: Record<string, { idle: string; idleBg: string; active: string }> = {
  All:        { idle: "#374d95", idleBg: "#eef1fa", active: "#374d95" },
  PL:         { idle: "#059669", idleBg: "#e3f4ea", active: "#059669" },
  CL:         { idle: "#2563eb", idleBg: "#dbeafe", active: "#2563eb" },
  SL:         { idle: "#dc2626", idleBg: "#fee2e2", active: "#dc2626" },
  "Comp.Off": { idle: "#d97706", idleBg: "#fef3c7", active: "#d97706" },
  OD:         { idle: "#7c3aed", idleBg: "#ede9fe", active: "#7c3aed" },
};

function LeaveTypeFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 6,
      flexWrap: "wrap",
      padding: "14px 20px 10px",
      borderBottom: "1px solid var(--border)",
    }}>
      {Object.entries(TYPE_META).map(([type, meta]) => {
        const active = value === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 30,
              padding: "0 14px",
              borderRadius: 20,
              border: `1.5px solid ${active ? meta.active : meta.idle}`,
              background: active ? meta.active : meta.idleBg,
              color: active ? "#fff" : meta.idle,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.12s",
              whiteSpace: "nowrap",
            }}
          >
            {type}
          </button>
        );
      })}
    </div>
  );
}

const STATUS_COLOR = {
  Approved: "success",
  Pending:  "processing",
  Cancelled: "error",
} as const;

export default function LeaveRecordPage() {
  const demo = getLeaveDummy();
  const [company, setCompany]   = useState("smi");
  const [employee, setEmployee] = useState("EMP-2048");
  const [year, setYear]         = useState("2025");
  const [typeFilter, setTypeFilter] = useState("All");

  const filteredHistory =
    typeFilter === "All"
      ? demo.history
      : demo.history.filter((h) => h.type === typeFilter);

  const tp = { bordered: true as const, size: "middle" as const, className: "attendance-report-table" };

  const historyColumns: CommonTableColumn<LeaveHistoryRow>[] = [
    { title: "Type",       dataIndex: "type",      key: "type",    render: (t: string, r) => <Tag color={r.typeColor}>{t}</Tag> },
    { title: "From",       dataIndex: "from",      key: "from" },
    { title: "To",         dataIndex: "to",        key: "to" },
    { title: "Days",       dataIndex: "days",      key: "days",   width: 60 },
    { title: "Reason",     dataIndex: "reason",    key: "reason", ellipsis: true },
    { title: "Approver",   dataIndex: "approver",  key: "approver" },
    { title: "Applied on", dataIndex: "appliedOn", key: "applied" },
    {
      title: "Status", dataIndex: "status", key: "status",
      render: (s: LeaveHistoryRow["status"]) => <Tag color={STATUS_COLOR[s]}>{s}</Tag>,
    },
  ];

  const ledgerColumns: CommonTableColumn<LeaveLedgerRow>[] = [
    { title: "Type",            dataIndex: "type",     key: "type",    render: (t: string, r) => <Tag color={r.typeColor}>{t}</Tag> },
    { title: "Opening (1-Apr)", dataIndex: "opening",  key: "open" },
    { title: "Earned",          dataIndex: "earned",   key: "earned" },
    { title: "Used",            dataIndex: "used",     key: "used" },
    { title: "Encashed",        dataIndex: "encashed", key: "enc" },
    { title: "Lapsed",          dataIndex: "lapsed",   key: "lap" },
    { title: "Carry-fwd",       dataIndex: "carryFwd", key: "cf" },
    { title: "Closing",         dataIndex: "closing",  key: "close", render: (v) => <span className="font-bold">{v}</span> },
  ];

  const { employee: emp } = demo;

  return (
    <div className="attendance-reports-page">
      <div className="rep-demo-banner">
        <FilterOutlined />
        Sample leave record — connect live data to replace these figures.
      </div>

      <RepHeader
        {...HRMS_BACK.dashboard}
        title="Leave Record"
        subtitle="Leave balance, history and year-on-year ledger"
        actions={
          <>
            <Button icon={<DownloadOutlined />}>Export</Button>
            <Link href="/hrms/leave/apply">
              <Button type="primary" icon={<PlusOutlined />}>Apply leave</Button>
            </Link>
          </>
        }
      />

      {/* Filters */}
      <div className="arf-panel">
        <div className="arf-head">
          <FilterOutlined style={{ color: "var(--primary)", fontSize: 12 }} />
          <span className="arf-head-title">Filters</span>
        </div>
        <div className="arf-body">
          <div className="arf-controls">
            <div className="arf-item">
              <span className="arf-label">Company / unit</span>
              <Select className="w-full" value={company} onChange={setCompany} options={demo.companies} />
            </div>
            <div className="arf-item">
              <span className="arf-label">Employee</span>
              <Select className="w-full" value={employee} onChange={setEmployee} options={demo.employees} />
            </div>
            <div className="arf-item">
              <span className="arf-label">Leave year</span>
              <Select className="w-full" value={year} onChange={setYear} options={demo.leaveYears} />
            </div>
          </div>
        </div>
        <div className="arf-footer">
          <Button type="primary" icon={<FilterOutlined />}>Apply filters</Button>
        </div>
      </div>

      {/* Employee profile */}
      <div className="lv-emp-card">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
            <h2 className="lv-emp-card__name">{emp.name}</h2>
            <Tag color="green">{emp.badge}</Tag>
          </div>
          <p className="lv-emp-card__meta">
            {emp.id} · {emp.department} · {emp.shift} · DOJ {emp.doj} · Confirmed {emp.confirmed}
          </p>
        </div>
        <div className="lv-emp-card__actions">
          <Link href="/hrms/leave/apply">
            <Button type="primary" icon={<PlusOutlined />}>Apply leave</Button>
          </Link>
          <Button icon={<DownloadOutlined />}>Export</Button>
        </div>
      </div>

      {/* Balance cards */}
      <div className="lv-balance-grid">
        {demo.balances.map((b) => (
          <div key={b.code} className="lv-balance-card">
            <p className="lv-balance-card__name">{b.name}</p>
            <p className="lv-balance-card__value" style={{ color: b.color }}>{b.balance}</p>
            <p className="lv-balance-card__detail">{b.detail}</p>
            <div className="lv-balance-bar">
              <div className="lv-balance-bar__fill" style={{ width: `${b.progress}%`, background: b.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* Leave history */}
      <ReportSection title="Leave history" meta={`FY ${year}`} flush>
        <LeaveTypeFilter value={typeFilter} onChange={setTypeFilter} />
        <CommonTable {...tp} columns={historyColumns} dataSource={filteredHistory} rowKey="id" pagination={false} />
      </ReportSection>

      {/* Year ledger */}
      <ReportSection title="Year-on-year ledger" meta="Carry-forward, encashment and lapsing" flush>
        <CommonTable {...tp} columns={ledgerColumns} dataSource={demo.ledger} rowKey="type" pagination={false} />
      </ReportSection>
    </div>
  );
}
