// @ts-nocheck
'use client';


import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { Icon } from "./icons";
import { useRawMaterials } from "@/hooks/use-raw-materials";
import { useVendors } from "@/hooks/use-vendors";
import { useEntityList } from "@/hooks/use-entity-list";
import { useEmployees } from "@/hooks/use-employees";
import { useAttendanceToday } from "@/hooks/use-attendance-today";
import { useAttendanceReport } from "@/hooks/use-attendance-report";
import {
  buildVendorReport,
  buildProfitReport,
  buildProductionReport,
  buildDispatchReport,
  buildInventoryReport,
} from "@/lib/reports-data";
import { Btn, Badge, StatusBadge, Avatar, Bar, Sparkline, Kpi, Modal, fmtINR, fmtINRFull, fmtNum, AreaChart, BarChart, Donut } from "./ui";
import PageFilterPanel from "@/components/common/PageFilterPanel";
import { Select, DatePicker, Input, message, Dropdown } from "antd";
import { downloadGenericTablePdf } from "@/lib/generic-table-pdf";
import { downloadGenericTableExcel } from "@/lib/generic-table-excel";
import { filterBySearch } from "@/lib/filter-search";
import { EntityFormModal, FormField, FormGrid, FormInput, FormSelect, useFormState, requireFields } from "@/components/forms";
import { useEntityMutation } from "@/hooks/use-entity-mutation";
import { formatDisplayDate } from "@/lib/id-generators";
import { DashHead, SectionH } from "./dashboards";

/* ============================================================
   MODULES PART 3 — HR/Attendance, Payroll, Reports, Packaging
   ============================================================ */


/* ============================================================
   EMPLOYEES (HR master)
   ============================================================ */
import { Button as AntButton, Badge as AntBadge, Avatar as AntAvatar } from "antd";
import { TeamOutlined, UserAddOutlined, ExportOutlined, WarningOutlined, RightOutlined, CalendarOutlined, DownloadOutlined, PlusOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, EnvironmentOutlined, ThunderboltOutlined, MailOutlined, FilterOutlined, AlertOutlined, MoneyCollectOutlined, FileTextOutlined, CheckOutlined, CloseOutlined, MoreOutlined, AppstoreOutlined, ShoppingOutlined } from "@ant-design/icons";
import CommonTable from "@/components/common/CommonTable";
import { ERP_TABLE_PROPS, inventoryStatusBadge } from "@/components/common/erpStatusBadges";
import { ErpViewAction, ViewEditActions } from "@/components/common/TableActionIcons";
import StatCard, { ErpStatGrid } from "@/components/common/StatCard";
import { buildPackagingView } from "@/lib/inventory-mobile";
import { usePackaging } from "@/hooks/use-packaging";


const Employees = () => {
  const router = useRouter();
  const { items: employees } = useEmployees();

  const columns = [
    { title: "Emp ID", dataIndex: "employeeId", key: "employeeId", render: (text) => <span className="mono strong">{text}</span> },
    { title: "Name", dataIndex: "fullName", key: "fullName", render: (text, record, i) => (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <AntAvatar style={{ backgroundColor: ["#f56a00", "#7265e6", "#ffbf00", "#00a2ae"][i % 4] }}>{text.charAt(0)}</AntAvatar>
        <div className="strong">{text}</div>
      </div>
    )},
    { title: "Role", dataIndex: "designation", key: "designation" },
    { title: "Department", dataIndex: "department", key: "department", render: (text) => <span className="muted">{text}</span> },
    { title: "Joined", dataIndex: "dateOfJoining", key: "dateOfJoining", render: (text) => <span className="muted">{text}</span> },
    { title: "Reporting to", key: "reporting", render: (_, __, i) => <span className="muted">{i === 0 ? "—" : i < 3 ? "Rajiv Mehta" : "Priya Sharma"}</span> },
    { title: "Status", key: "status", render: () => <AntBadge status="success" text="Active" /> },
    { title: "Actions", key: "action", width: 72, align: "center", render: () => <ErpViewAction /> },
  ];

  return (
    <>
      <DashHead title="Employees" sub="HR master across both companies">
        <AntButton size="small" icon={<ExportOutlined />}>Import</AntButton>
        <AntButton type="primary" size="small" icon={<UserAddOutlined />} onClick={() => router.push("/hrms/employees/add")}>Add employee</AntButton>
      </DashHead>

      <ErpStatGrid cols={4}>
        <StatCard
          icon={TeamOutlined}
          label="Total headcount"
          value={employees.length}
          hint="From database"
        />
        <StatCard
          icon={UserAddOutlined}
          label="New hires (MTD)"
          value={4}
          hint="2 onboarding"
          hintTone="positive"
        />
        <StatCard
          icon={ExportOutlined}
          label="Exits (MTD)"
          value={1}
          hint="0.3% attrition"
        />
        <StatCard
          icon={WarningOutlined}
          label="Pending actions"
          value={6}
          hint="3 approvals + 3 docs"
          hintTone="warning"
        />
      </ErpStatGrid>

      <div className="card">
        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex" }}>
          <div className="tabs" style={{ border: "none", marginBottom: -1 }}>
            <span className="tab active">All <span className="tab-count">{employees.length}</span></span>
            <span className="tab">Active <span className="tab-count">{employees.length}</span></span>
            <span className="tab">Onboarding <span className="tab-count">2</span></span>
            <span className="tab">On leave <span className="tab-count">3</span></span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <select className="input" style={{ height: 30, width: 140 }}><option>All depts</option><option>Operations</option><option>Procurement</option><option>Production</option><option>Sales</option><option>HR</option></select>
            <input className="input" placeholder="Search employee…" style={{ height: 30, width: 200 }} />
          </div>
        </div>
        <div style={{ padding: 16 }}>
          <CommonTable {...ERP_TABLE_PROPS} dataSource={employees} columns={columns} rowKey="employeeId" />
        </div>
      </div>
    </>
  );
};

/* ============================================================
   ATTENDANCE
   ============================================================ */
const Attendance = () => {
  const { items: employees } = useEmployees();
  const { attendance, reload: reloadAttendance } = useAttendanceToday();
  const { update, saving, error, clearError } = useEntityMutation();
  const [applyLeave, setApplyLeave] = useState(false);
  const [leaveReason, setLeaveReason] = useState("");

  const submitLeave = async () => {
    await update("attendanceToday", "today", {
      leave: (attendance.leave ?? 0) + 1,
      present: Math.max(0, (attendance.present ?? 0) - 1),
      lastLeaveNote: leaveReason || "Leave application",
      lastLeaveAt: formatDisplayDate(),
    });
    await reloadAttendance();
    setApplyLeave(false);
    setLeaveReason("");
  };

  const columns = [
    { title: "Emp ID", dataIndex: "employeeId", key: "employeeId", render: (text) => <span className="mono strong">{text}</span> },
    { title: "Name", dataIndex: "fullName", key: "fullName", render: (text, record, i) => (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <AntAvatar style={{ backgroundColor: ["#f56a00", "#7265e6", "#ffbf00", "#00a2ae"][i % 4] }}>{text.charAt(0)}</AntAvatar>
        {text}
      </div>
    )},
    { title: "Department", dataIndex: "department", key: "department", render: (text) => <span className="muted">{text}</span> },
    { title: "Check-in", dataIndex: "in_", key: "in_", render: (text) => <span className="mono">{text}</span> },
    { title: "Check-out", dataIndex: "out", key: "out", render: (text) => <span className="mono subtle">{text}</span> },
    { title: "Worked", dataIndex: "w", key: "w", render: (text) => <span className="mono">{text}</span> },
    { title: "Late by", dataIndex: "late", key: "late", render: (text, record) => (
      <span className={record.late_ ? "mono" : "mono subtle"} style={{ color: record.late_ ? "var(--warning)" : undefined, fontWeight: record.late_ ? 600 : 400 }}>{text}</span>
    )},
    { title: "Status", dataIndex: "st", key: "st", render: (st) => (
      st === "active" ? <AntBadge status="success" text="Present" /> :
      st === "leave"  ? <AntBadge status="processing" text="On leave" /> :
      st === "field"  ? <AntBadge status="default" text="Field" /> :
      <AntBadge status="error" text="Absent" />
    )},
  ];

  const dataSource = employees.map((e, i) => {
    const states = [
      { in_: "08:54", out: "—",     w: "ongoing", late: "—",  st: "active",  late_: false },
      { in_: "09:02", out: "—",     w: "ongoing", late: "—",  st: "active",  late_: false },
      { in_: "09:18", out: "—",     w: "ongoing", late: "18 m", st: "active", late_: true },
      { in_: "—",     out: "—",     w: "—",      late: "—",   st: "leave",   late_: false },
      { in_: "09:00", out: "—",     w: "ongoing", late: "—",  st: "active",  late_: false },
      { in_: "09:32", out: "—",     w: "ongoing", late: "32 m", st: "active", late_: true },
      { in_: "08:48", out: "—",     w: "ongoing", late: "—",  st: "active",  late_: false },
      { in_: "09:04", out: "—",     w: "ongoing", late: "—",  st: "active",  late_: false },
      { in_: "09:10", out: "—",     w: "ongoing", late: "10 m", st: "field",  late_: false },
      { in_: "—",     out: "—",     w: "—",      late: "—",   st: "absent",  late_: false },
    ];
    return { ...e, ...states[i % states.length] };
  });

  return (
    <>
      <DashHead title="Attendance" sub="Daily attendance, late-coming, early-going">
        <AntButton size="small" icon={<CalendarOutlined />}>May 2026</AntButton>
        <AntButton size="small" icon={<DownloadOutlined />}>Export sheet</AntButton>
        <AntButton type="primary" size="small" icon={<PlusOutlined />} onClick={() => setApplyLeave(true)}>Apply leave</AntButton>
      </DashHead>

      <ErpStatGrid cols={5}>
        <StatCard
          icon={CheckCircleOutlined}
          label="Present today"
          value={attendance.present}
          hint={`${Math.round(attendance.present / attendance.total * 100)}% attendance`}
          hintTone="positive"
        />
        <StatCard
          icon={ClockCircleOutlined}
          label="Late comers"
          value={attendance.late}
          hint="3.9%"
          hintTone="warning"
        />
        <StatCard
          icon={CalendarOutlined}
          label="On leave"
          value={attendance.leave}
          hint="11 sick · 7 planned"
        />
        <StatCard
          icon={CloseCircleOutlined}
          label="Absent"
          value={attendance.absent}
          hint="Unscheduled"
          hintTone="negative"
        />
        <StatCard
          icon={EnvironmentOutlined}
          label="On field"
          value={attendance.onField}
          hint="Sales reps"
          hintTone="accent"
        />
      </ErpStatGrid>

      <div className="grid" style={{ gridTemplateColumns: "2fr 1fr", marginBottom: 20 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title"><CalendarOutlined style={{ marginRight: 6 }} /> Attendance · last 14 days</div>
          </div>
          <div className="card-body">
            <BarChart
              data={[
                { day: "8",  present: 278, late: 18 }, { day: "9",  present: 272, late: 14 },
                { day: "10", present: 281, late: 10 }, { day: "11", present: 286, late: 12 },
                { day: "12", present: 270, late: 22 }, { day: "13", present: 274, late: 16 },
                { day: "14", present: 268, late: 12 }, { day: "15", present: 280, late: 14 },
                { day: "16", present: 282, late: 11 }, { day: "17", present: 269, late: 18 },
                { day: "18", present: 275, late: 13 }, { day: "19", present: 271, late: 15 },
                { day: "20", present: 277, late: 11 }, { day: "21", present: 268, late: 12 },
              ]}
              keys={["present", "late"]}
              colors={["var(--primary)", "var(--secondary)"]}
              h={220}
            />
            <div className="chart-legend" style={{ marginTop: 8, justifyContent: "center" }}>
              <span className="chart-legend-item"><span className="chart-legend-swatch" style={{ background: "var(--primary)" }}></span> Present</span>
              <span className="chart-legend-item"><span className="chart-legend-swatch" style={{ background: "var(--secondary)" }}></span> Late</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><div className="card-title"><CalendarOutlined style={{ marginRight: 6 }} /> Leave approval queue</div><AntBadge count="5 pending" style={{ backgroundColor: "#faad14" }} /></div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { who: "Vinod Sharma",  type: "Sick",    days: "3 d", from: "May 22", color: 3 },
              { who: "Karan Singh",   type: "Personal",days: "1 d", from: "May 24", color: 2 },
              { who: "Anil Kapoor",   type: "Casual",  days: "2 d", from: "May 27", color: 4 },
              { who: "Pooja Aggarwal",type: "Earned",  days: "5 d", from: "Jun 02", color: 5 },
              { who: "Suresh Patel",  type: "Sick",    days: "1 d", from: "May 23", color: 1 },
            ].map((l, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: "var(--bg-sunken)", borderRadius: 8 }}>
                <AntAvatar style={{ backgroundColor: ["#f56a00", "#7265e6", "#ffbf00", "#00a2ae"][i % 4] }}>{l.who.charAt(0)}</AntAvatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{l.who}</div>
                  <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>{l.type} · {l.days} · from {l.from}</div>
                </div>
                <AntButton type="text" size="small" icon={<CloseOutlined />} />
                <AntButton type="primary" size="small" icon={<CheckOutlined />} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title"><ClockCircleOutlined style={{ marginRight: 6 }} /> Today's attendance · May 21</div>
          <div style={{ display: "flex", gap: 8 }}>
            <select className="input" style={{ height: 30, width: 140 }}><option>All depts</option><option>Production</option><option>Sales</option></select>
            <input className="input" placeholder="Search…" style={{ height: 30, width: 180 }} />
          </div>
        </div>
        <div className="card-body flush" style={{ overflowX: "auto", padding: 16 }}>
          <CommonTable
            {...ERP_TABLE_PROPS}
            columns={columns}
            dataSource={dataSource}
            rowKey="employeeId"
          />
        </div>
      </div>

      <EntityFormModal open={applyLeave} onClose={() => setApplyLeave(false)} title="Apply for leave" submitLabel="Submit application" saving={saving} error={error} onSubmit={submitLeave}>
        <FormField label="Reason">
          <textarea className="input" rows={3} placeholder="Brief reason for leave…" value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} />
        </FormField>
      </EntityFormModal>
    </>
  );
};

/* ============================================================
   PAYROLL
   ============================================================ */
const Payroll = () => {
  const { items: employees } = useEmployees();
  const { update, saving, error, clearError } = useEntityMutation();
  const [openSlip, setOpenSlip] = useState(null);
  const [runOpen, setRunOpen] = useState(false);

  const runPayroll = async () => {
    await update("attendanceToday", "today", {
      payrollStatus: "processed",
      payrollRunAt: formatDisplayDate(),
      payrollMonth: "May 2026",
    });
    setRunOpen(false);
  };

  const PAYROLL = employees.map((e, i) => {
    const ctcAnnual = [1800000, 1400000, 920000, 880000, 920000, 1280000, 1100000, 1080000, 680000, 540000][i];
    const monthly = Math.round(ctcAnnual / 12);
    const basic = Math.round(monthly * 0.5);
    const hra = Math.round(monthly * 0.2);
    const allowances = monthly - basic - hra;
    const pf = Math.round(basic * 0.12);
    const tds = Math.round(monthly * 0.07);
    const net = monthly - pf - tds;
    return { ...e, ctcAnnual, monthly, basic, hra, allowances, pf, tds, net };
  });

  const total = PAYROLL.reduce((s, p) => s + p.net, 0);

  const columns = [
    { title: "Emp ID", dataIndex: "employeeId", key: "employeeId", render: (text) => <span className="mono strong">{text}</span> },
    { title: "Name", dataIndex: "fullName", key: "fullName", render: (text, record, i) => (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <AntAvatar style={{ backgroundColor: ["#f56a00", "#7265e6", "#ffbf00", "#00a2ae"][i % 4] }}>{text.charAt(0)}</AntAvatar>
        {text}
      </div>
    )},
    { title: "Basic", dataIndex: "basic", key: "basic", align: "right", render: (v) => <span className="num">{fmtINRFull(v)}</span> },
    { title: "HRA", dataIndex: "hra", key: "hra", align: "right", render: (v) => <span className="num">{fmtINRFull(v)}</span> },
    { title: "Allow", dataIndex: "allowances", key: "allowances", align: "right", render: (v) => <span className="num">{fmtINRFull(v)}</span> },
    { title: "PF", dataIndex: "pf", key: "pf", align: "right", render: (v) => <span className="num" style={{ color: "var(--fg-muted)" }}>−{fmtINRFull(v)}</span> },
    { title: "TDS", dataIndex: "tds", key: "tds", align: "right", render: (v) => <span className="num" style={{ color: "var(--fg-muted)" }}>−{fmtINRFull(v)}</span> },
    { title: "Net pay", dataIndex: "net", key: "net", align: "right", render: (v) => <span className="num strong" style={{ fontWeight: 600 }}>{fmtINRFull(v)}</span> },
    { title: "Actions", key: "action", width: 72, align: "center", render: () => <ErpViewAction label="View payslip" /> },
  ];

  return (
    <>
      <DashHead title="Payroll & Payslips" sub="Salary sheets, payroll runs, daily-wage register">
        <AntButton size="small" icon={<CalendarOutlined />}>May 2026</AntButton>
        <AntButton size="small" icon={<DownloadOutlined />}>Salary sheet · CSV</AntButton>
        <AntButton type="primary" size="small" icon={<ThunderboltOutlined />} onClick={() => { clearError(); setRunOpen(true); }}>Run payroll</AntButton>
      </DashHead>

      <ErpStatGrid cols={4}>
        <StatCard
          icon={TeamOutlined}
          label="Headcount on payroll"
          value={306}
          hint="+ 48 daily wage"
        />
        <StatCard
          icon={MoneyCollectOutlined}
          label="Gross payout"
          value={fmtINR(total * 1.25)}
          hint="May estimate"
        />
        <StatCard
          icon={FileTextOutlined}
          label="Statutory dues"
          value={fmtINR(total * 0.2)}
          hint="PF + ESI + TDS"
        />
        <StatCard
          icon={CheckCircleOutlined}
          label="Status"
          value="Draft"
          hint="Run by May 28"
          hintTone="warning"
        />
      </ErpStatGrid>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-head">
          <div className="card-title"><ThunderboltOutlined style={{ marginRight: 6 }} /> Payroll workflow · May 2026</div>
          <AntBadge status="warning" text="In progress · Step 2/5" />
        </div>
        <div className="card-body">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 0, position: "relative" }}>
            {[
              { l: "Attendance lock",      d: "Locked May 20",       done: true },
              { l: "Pre-payroll review",    d: "12 exceptions",       active: true },
              { l: "Statutory calc",        d: "PF · ESI · TDS",      done: false },
              { l: "Approval & sign-off",   d: "Owner + Admin",       done: false },
              { l: "Disbursal",             d: "HDFC + ICICI",        done: false },
            ].map((s, i, arr) => (
              <div key={s.l} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}>
                {i < arr.length - 1 && (
                  <div style={{
                    position: "absolute", left: "calc(50% + 22px)", right: "calc(-50% + 22px)", top: 16, height: 2,
                    background: s.done ? "var(--success)" : "var(--border)",
                  }}></div>
                )}
                <div style={{
                  width: 34, height: 34, borderRadius: 17, display: "grid", placeItems: "center",
                  fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)",
                  background: s.done ? "var(--success)" : s.active ? "var(--primary)" : "var(--bg-sunken)",
                  color: s.done || s.active ? "white" : "var(--fg-muted)",
                  border: s.active ? "3px solid var(--primary-soft)" : "none",
                  position: "relative", zIndex: 1, flexShrink: 0,
                }}>{s.done ? <CheckOutlined style={{ fontSize: 14 }} strokeWidth={2.5} /> : i + 1}</div>
                <div style={{ marginTop: 12, textAlign: "center", padding: "0 6px", minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.l}</div>
                  <div style={{ fontSize: 11, color: "var(--fg-subtle)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex" }}>
          <div className="tabs" style={{ border: "none", marginBottom: -1 }}>
            <span className="tab active">Salary sheet · May <span className="tab-count">{PAYROLL.length}</span></span>
            <span className="tab">Daily wage register <span className="tab-count">48</span></span>
            <span className="tab">Statutory <span className="tab-count">4</span></span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <input className="input" placeholder="Search…" style={{ height: 30, width: 180 }} />
            <AntButton size="small" icon={<FilterOutlined />}>Filter</AntButton>
          </div>
        </div>
        <div style={{ padding: 16, overflowX: "auto" }}>
          <CommonTable
            {...ERP_TABLE_PROPS}
            dataSource={PAYROLL}
            columns={columns}
            rowKey="employeeId"
            onRow={(record) => ({ onClick: () => setOpenSlip(record), style: { cursor: "pointer" } })}
          />
        </div>
      </div>

      <Modal open={!!openSlip} onClose={() => setOpenSlip(null)} title="Payslip" sub={openSlip ? `${openSlip.fullName} · May 2026` : ""} wide
        footer={<>
          <AntButton icon={<DownloadOutlined />} onClick={() => setOpenSlip(null)}>Download PDF</AntButton>
          <AntButton icon={<MailOutlined />}>Email</AntButton>
          <AntButton type="primary" onClick={() => setOpenSlip(null)}>Close</AntButton>
        </>}>
        {openSlip && (
          <div style={{ background: "white", padding: 24, borderRadius: 8, border: "1px solid var(--border)" }}>
            {/* Letterhead */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", paddingBottom: 16, borderBottom: "2px solid var(--primary)" }}>
              <div>
                <div className="sb-brand-mark" style={{ width: 36, height: 36, fontSize: 15, marginBottom: 8 }}>S</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em" }}>Sudarshan Minerals & Industries</div>
                <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>Plant A, Industrial Area · Udaipur, Rajasthan · GSTIN 08AABCS1234A1Z2</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>Payslip</div>
                <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>Pay period: May 2026</div>
                <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>Generated: May 21, 2026</div>
              </div>
            </div>

            {/* Employee details */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: "16px 0", borderBottom: "1px solid var(--border)" }}>
              <div>
                <div style={{ fontSize: 10, color: "var(--fg-subtle)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Employee</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{openSlip.fullName}</div>
                <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>{openSlip.employeeId} · {openSlip.designation}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--fg-subtle)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Banking</div>
                <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }} className="mono">HDFC ••3382</div>
                <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>PAN AAAPM1234B · UAN 100534221</div>
              </div>
            </div>

            {/* Pay breakdown */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, padding: "16px 0" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--success)", marginBottom: 10 }}>EARNINGS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Basic</span><span className="mono">{fmtINRFull(openSlip.basic)}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">HRA</span><span className="mono">{fmtINRFull(openSlip.hra)}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Conveyance</span><span className="mono">{fmtINRFull(Math.round(openSlip.allowances * 0.3))}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Special allowance</span><span className="mono">{fmtINRFull(Math.round(openSlip.allowances * 0.7))}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid var(--border)", fontWeight: 600 }}>
                    <span>Gross earnings</span>
                    <span className="mono">{fmtINRFull(openSlip.monthly)}</span>
                  </div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--danger)", marginBottom: 10 }}>DEDUCTIONS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">PF (employee)</span><span className="mono">{fmtINRFull(openSlip.pf)}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">ESI</span><span className="mono">{fmtINRFull(Math.round(openSlip.monthly * 0.0075))}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">TDS</span><span className="mono">{fmtINRFull(openSlip.tds)}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Professional tax</span><span className="mono">₹200</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid var(--border)", fontWeight: 600 }}>
                    <span>Total deductions</span>
                    <span className="mono">{fmtINRFull(openSlip.monthly - openSlip.net)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net pay */}
            <div style={{
              background: "var(--primary-soft)", borderRadius: 8, padding: 16,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--primary)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Net pay</div>
                <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 2 }}>Credited to HDFC ••3382</div>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 600, letterSpacing: "-0.025em", color: "var(--primary)" }}>
                {fmtINRFull(openSlip.net)}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={runOpen} onClose={() => setRunOpen(false)} title="Run payroll · May 2026" sub="Generate salary sheets, statutory dues, disbursal batch" wide
        footer={<>
          <AntButton onClick={() => setRunOpen(false)} disabled={saving}>Cancel</AntButton>
          <AntButton type="primary" onClick={runPayroll} icon={<ThunderboltOutlined />} disabled={saving}>{saving ? "Processing…" : "Lock & process"}</AntButton>
        </>}>
        {error ? <p style={{ color: "var(--danger)", fontSize: 12, padding: "0 16px 8px" }}>{error}</p> : null}
        <div style={{ padding: 14, background: "var(--warning-soft)", border: "1px solid var(--warning)", borderRadius: 8, display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 16 }}>
          <AlertOutlined style={{ color: "var(--warning)", flexShrink: 0, marginTop: 2, fontSize: 16 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Locking payroll is irreversible</div>
            <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>Attendance, allowances, and exceptions will be frozen for May 2026. You will not be able to edit time entries after this step.</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          <div className="field"><label className="field-label">Pay period</label>
            <select className="input"><option>May 1 – May 31, 2026</option><option>Custom range</option></select>
          </div>
          <div className="field"><label className="field-label">Payout date</label><input className="input" type="date" defaultValue="2026-05-31" /></div>
          <div className="field"><label className="field-label">Approver 1</label>
            <select className="input"><option>Priya Sharma · Admin</option></select>
          </div>
          <div className="field"><label className="field-label">Approver 2</label>
            <select className="input"><option>Rajiv Mehta · Owner</option></select>
          </div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>SUMMARY</div>
        <div className="card" style={{ borderRadius: 8, padding: 14, marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--fg-subtle)" }}>Headcount</div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 600 }}>306</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--fg-subtle)" }}>Gross payout</div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 600 }}>₹9.61 L</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--fg-subtle)" }}>Statutory</div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 600 }}>₹1.54 L</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--fg-subtle)" }}>Net disbursal</div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: "var(--primary)" }}>₹8.07 L</div>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>EXCEPTIONS (12)</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto" }}>
          {[
            { who: "Vinod Sharma", issue: "5 days LOP – pending leave approval", sev: "warning" },
            { who: "Suresh Patel", issue: "Overtime 12.4 hrs needs OT-rate confirm", sev: "info" },
            { who: "Karan Singh", issue: "Travel claim ₹4,800 not approved", sev: "warning" },
            { who: "Hardik Joshi", issue: "Bank account not updated", sev: "danger" },
          ].map((e, i) => (
            <div key={i} style={{ padding: 10, background: "var(--bg-sunken)", borderRadius: 6, display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
              <span className={`dot ${e.sev}`} style={{ flexShrink: 0 }}></span>
              <div style={{ flex: 1 }}><strong>{e.who}</strong> <span className="muted">— {e.issue}</span></div>
              <AntButton type="link" size="small">Resolve</AntButton>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
};
// downloadGenericTableExcel is async (dynamic-imports xlsx); surface failures
// as a toast instead of an unhandled rejection.
function runReportExport(fn) {
  try {
    const result = fn?.();
    if (result && typeof result.catch === "function") {
      result.catch((e) => message.error(e instanceof Error ? e.message : "Export failed"));
    }
  } catch (e) {
    message.error(e instanceof Error ? e.message : "Export failed");
  }
}

const REPORTS_META = [
  { id: "profit",    title: "Profit Analysis",     icon: "chart",    sub: "Revenue, COGS, gross margin by product line" },
  { id: "inventory", title: "Inventory Report",    icon: "box",      sub: "Stock movement, valuation, ABC analysis" },
  { id: "production",title: "Production Report",   icon: "factory",  sub: "Throughput, yield, downtime, defect rate" },
  { id: "dispatch",  title: "Dispatch Report",     icon: "truck",    sub: "On-time delivery, lead time, route P&L" },
  { id: "vendor",    title: "Vendor Purchase",     icon: "users",    sub: "PO volume, spend, rating, payment history" },
  { id: "hr",        title: "HR Report",           icon: "user",     sub: "Headcount, attendance, tenure, payroll" },
];

const Reports = () => {
  const [active, setActive] = useState("profit");
  const [period, setPeriod] = useState(() => dayjs());
  const [customOpen, setCustomOpen] = useState(false);
  const [customReportId, setCustomReportId] = useState("profit");
  // Each report registers its own { pdf, excel } export functions here (it
  // owns its rows/columns), so the header-level Export/Custom-report buttons
  // can trigger whichever report is currently active without lifting all six
  // dummy datasets up to this component.
  const exportHandlers = useRef({});
  const registerExport = useCallback((id, handlers) => {
    exportHandlers.current[id] = handlers;
  }, []);

  const periodLabel = period.format("MMMM YYYY");

  return (
    <>
      <DashHead title="Reports" sub="Inventory · Production · Dispatch · Vendor · Profit · HR">
        <DatePicker
          picker="month"
          value={period}
          onChange={(d) => d && setPeriod(d)}
          format="MMM YYYY"
          allowClear={false}
          suffixIcon={<CalendarOutlined />}
          style={{ width: 130 }}
        />
        <Dropdown
          trigger={["click"]}
          menu={{
            items: [
              { key: "pdf", label: "Export as PDF", icon: <Icon name="fileText" size={13} /> },
              { key: "excel", label: "Export as Excel", icon: <Icon name="layout" size={13} /> },
            ],
            onClick: ({ key }) =>
              runReportExport(
                key === "excel"
                  ? exportHandlers.current[active]?.excel
                  : exportHandlers.current[active]?.pdf,
              ),
          }}
        >
          <Btn size="sm" icon="download">Export</Btn>
        </Dropdown>
        <Btn variant="primary" size="sm" icon="plus" onClick={() => setCustomOpen(true)}>
          Custom report
        </Btn>
      </DashHead>

      <div className="grid" style={{ gridTemplateColumns: "260px minmax(0, 1fr)", gap: 20 }}>
        <div className="card">
          <div className="card-head"><div className="card-title">All reports</div></div>
          <div style={{ padding: 8 }}>
            {REPORTS_META.map((r) => (
              <button
                key={r.id}
                onClick={() => setActive(r.id)}
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 6,
                  background: active === r.id ? "var(--primary-soft)" : "transparent",
                  color: active === r.id ? "var(--primary)" : "var(--fg)",
                  border: "none", cursor: "pointer", textAlign: "left",
                  display: "flex", alignItems: "flex-start", gap: 10,
                  marginBottom: 2,
                }}
              >
                <Icon name={r.icon} size={15} style={{ marginTop: 1, color: active === r.id ? "var(--primary)" : "var(--fg-muted)" }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{r.title}</div>
                  <div style={{ fontSize: 11, color: "var(--fg-subtle)", marginTop: 2 }}>{r.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          {active === "profit" && <ProfitReport period={period} periodLabel={periodLabel} registerExport={(fn) => registerExport("profit", fn)} />}
          {active === "inventory" && <InventoryReport period={period} periodLabel={periodLabel} registerExport={(fn) => registerExport("inventory", fn)} />}
          {active === "production" && <ProductionReport period={period} periodLabel={periodLabel} registerExport={(fn) => registerExport("production", fn)} />}
          {active === "dispatch" && <DispatchReport period={period} periodLabel={periodLabel} registerExport={(fn) => registerExport("dispatch", fn)} />}
          {active === "vendor" && <VendorReport period={period} periodLabel={periodLabel} registerExport={(fn) => registerExport("vendor", fn)} />}
          {active === "hr" && <HRReport period={period} periodLabel={periodLabel} registerExport={(fn) => registerExport("hr", fn)} />}
        </div>
      </div>

      <Modal
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        title="Custom report"
        sub="Pick a report and period to export"
        footer={
          <>
            <Btn size="sm" onClick={() => setCustomOpen(false)}>Cancel</Btn>
            <Btn
              variant="primary"
              size="sm"
              icon="download"
              onClick={() => {
                const handler = exportHandlers.current[customReportId]?.pdf;
                if (!handler) {
                  message.info("Open that report once so it can build its rows, then export.");
                  return;
                }
                runReportExport(handler);
                setCustomOpen(false);
              }}
            >
              Generate PDF
            </Btn>
          </>
        }
      >
        <div className="arf-item" style={{ marginBottom: 14 }}>
          <label className="arf-label">Report</label>
          <Select
            className="w-full"
            value={customReportId}
            onChange={setCustomReportId}
            options={REPORTS_META.map((r) => ({ value: r.id, label: r.title }))}
          />
        </div>
        <div className="arf-item">
          <label className="arf-label">Period</label>
          <DatePicker
            picker="month"
            className="w-full"
            value={period}
            onChange={(d) => d && setPeriod(d)}
            format="MMM YYYY"
            allowClear={false}
          />
        </div>
      </Modal>
    </>
  );
};

const ReportShell = ({ title, sub, onExportPdf, onExportExcel, search, onSearchChange, children }) => {
  const [showSearch, setShowSearch] = useState(false);
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">{title}</div>
          <div style={{ fontSize: 11, color: "var(--fg-subtle)", marginTop: 2 }}>{sub}</div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {onSearchChange ? (
            showSearch ? (
              <Input
                size="small"
                autoFocus
                allowClear
                placeholder="Filter rows…"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                onBlur={() => { if (!search) setShowSearch(false); }}
                style={{ width: 160 }}
              />
            ) : (
              <Btn size="sm" icon="filter" onClick={() => setShowSearch(true)}>Filter</Btn>
            )
          ) : null}
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                { key: "pdf", label: "Export as PDF", icon: <Icon name="fileText" size={13} /> },
                { key: "excel", label: "Export as Excel", icon: <Icon name="layout" size={13} /> },
              ],
              onClick: ({ key }) => runReportExport(key === "excel" ? onExportExcel : onExportPdf),
            }}
          >
            <Btn size="sm" icon="download">Export</Btn>
          </Dropdown>
        </div>
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
};

/** Shown wherever a metric has no source record, so an empty cell is never
 *  mistaken for a zero. */
const NoData = ({ note }) => (
  <span className="subtle" title={note} style={{ fontSize: 12 }}>—</span>
);

/** Explains, in the report itself, which columns the schema cannot yet support. */
const UnavailableNote = ({ items }) =>
  items?.length ? (
    <div
      style={{
        marginTop: 14, padding: "8px 12px", borderRadius: 6,
        background: "var(--warning-soft, rgba(245,158,11,.08))",
        border: "1px solid var(--border)", fontSize: 11.5, color: "var(--fg-muted)",
      }}
    >
      <strong style={{ color: "var(--fg)" }}>Not available from stored data: </strong>
      {items.join(" ")}
    </div>
  ) : null;

const ProfitReport = ({ period, periodLabel, registerExport }) => {
  const { items: orders, loading } = useEntityList("orders");
  const [search, setSearch] = useState("");

  const report = useMemo(() => buildProfitReport(orders, period), [orders, period]);
  const profitRows = report.rows;

  const profitColumns = [
    {
      title: "Product line",
      dataIndex: "line",
      key: "line",
      render: (line) => <span className="strong">{line}</span>,
    },
    {
      title: "Orders",
      dataIndex: "orders",
      key: "orders",
      align: "right",
      sorter: (a, b) => a.orders - b.orders,
      render: (n) => <span className="num">{n}</span>,
    },
    {
      title: "Qty (MT)",
      dataIndex: "qty",
      key: "qty",
      align: "right",
      sorter: (a, b) => a.qty - b.qty,
      render: (q) => <span className="num">{fmtNum(q)}</span>,
    },
    {
      title: "Revenue booked",
      dataIndex: "revenue",
      key: "revenue",
      align: "right",
      sorter: (a, b) => a.revenue - b.revenue,
      render: (r) => <span className="num strong">{fmtINR(r)}</span>,
    },
    {
      title: "Revenue shipped",
      dataIndex: "dispatchedRevenue",
      key: "dispatchedRevenue",
      align: "right",
      render: (r, row) => (
        <span className="num">
          {fmtINR(r)}
          {row.revenue > 0 ? (
            <span className="subtle" style={{ fontSize: 11, marginLeft: 6 }}>
              {Math.round((r / row.revenue) * 100)}%
            </span>
          ) : null}
        </span>
      ),
    },
    {
      title: "Avg realisation / MT",
      dataIndex: "avgRealisation",
      key: "avgRealisation",
      align: "right",
      render: (v) => (v == null ? <NoData note="No quantity recorded on these orders" /> : <span className="num">{fmtINR(v)}</span>),
    },
    {
      title: "COGS",
      key: "cogs",
      align: "right",
      render: () => <NoData note="No bill of materials or standard cost is stored" />,
    },
    {
      title: "GM%",
      key: "gm",
      align: "right",
      render: () => <NoData note="Requires COGS" />,
    },
  ];

  const filteredRows = filterBySearch(profitRows, search, (r) => [r.line]);

  const profitExportArgs = () => [
    "Profit Analysis",
    `${periodLabel ?? ""} · Revenue by product line, from sales orders`,
    ["Product line", "Orders", "Qty (MT)", "Revenue booked", "Revenue shipped", "Avg realisation / MT", "COGS", "GM%"],
    profitRows.map((r) => [
      r.line, r.orders, r.qty, r.revenue, r.dispatchedRevenue,
      r.avgRealisation == null ? "—" : r.avgRealisation,
      "Not available", "Not available",
    ]),
  ] as const;
  const handleExportPdf = () => downloadGenericTablePdf(...profitExportArgs());
  const handleExportExcel = () => downloadGenericTableExcel(...profitExportArgs());
  useEffect(() => {
    registerExport?.({ pdf: handleExportPdf, excel: handleExportExcel });
  });

  return (
    <ReportShell
      title={`Profit Analysis · ${periodLabel ?? ""}`}
      sub="Revenue by product line — from sales orders in the selected month"
      search={search}
      onSearchChange={setSearch}
      onExportPdf={handleExportPdf}
      onExportExcel={handleExportExcel}
    >
      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <Kpi icon="money" label="Revenue booked" value={report.kpis.revenue > 0 ? fmtINR(report.kpis.revenue) : "—"} />
        <Kpi icon="truck" label="Revenue shipped" value={report.kpis.dispatchedRevenue > 0 ? fmtINR(report.kpis.dispatchedRevenue) : "—"} />
        <Kpi icon="layers" label="Volume" value={report.kpis.qty > 0 ? fmtNum(report.kpis.qty) : "—"} unit={report.kpis.qty > 0 ? "MT" : undefined} />
        <Kpi icon="chart" label="Avg realisation / MT" value={report.kpis.avgRealisation != null ? fmtINR(report.kpis.avgRealisation) : "—"} />
      </div>
      <CommonTable
        {...ERP_TABLE_PROPS}
        columns={profitColumns}
        dataSource={filteredRows}
        rowKey="line"
        loading={loading}
        scroll={{ x: "max-content" }}
        locale={{ emptyText: <span className="muted">No sales orders dated in {periodLabel}.</span> }}
      />
      <UnavailableNote items={report.unavailable} />
    </ReportShell>
  );
};

const FREQUENCY_LABEL = { high: "High", medium: "Medium", low: "Low" };

const InventoryReport = ({ period, periodLabel, registerExport }) => {
  const { items: rawMaterials, loading: rmLoading } = useRawMaterials();
  const { items: purchaseOrders, loading: poLoading } = useEntityList("purchaseOrders");
  const [search, setSearch] = useState("");

  const report = useMemo(
    () => buildInventoryReport(rawMaterials, purchaseOrders, period),
    [rawMaterials, purchaseOrders, period]
  );
  const inventoryRows = report.rows;

  const inventoryColumns = [
    {
      title: "SKU",
      dataIndex: "code",
      key: "sku",
      render: (code) => <span className="mono strong">{code}</span>,
    },
    {
      title: "Material",
      dataIndex: "name",
      key: "material",
    },
    {
      title: "Stock",
      key: "stock",
      align: "right",
      sorter: (a, b) => a.stock - b.stock,
      render: (_, r) => <span className="num">{fmtNum(r.stock)} {r.unit}</span>,
    },
    {
      title: "Stock value",
      dataIndex: "stockValue",
      key: "stockValue",
      align: "right",
      sorter: (a, b) => a.stockValue - b.stockValue,
      render: (v) => <span className="num">{v > 0 ? fmtINR(v) : <NoData note="No value recorded on this material" />}</span>,
    },
    {
      title: "Purchased (12m)",
      dataIndex: "purchaseValue",
      key: "purchaseValue",
      align: "right",
      sorter: (a, b) => a.purchaseValue - b.purchaseValue,
      render: (v, r) =>
        r.poCount === 0 ? (
          <NoData note="No purchase orders for this material in the last 12 months" />
        ) : v > 0 ? (
          <span className="num">
            {fmtINR(v)}
            <span className="subtle" style={{ fontSize: 11, marginLeft: 6 }}>{r.poCount} PO{r.poCount === 1 ? "" : "s"}</span>
          </span>
        ) : (
          <NoData note={`${r.poCount} multi-line PO(s) — value not attributable to this material alone`} />
        ),
    },
    {
      title: "ABC · purchase value",
      dataIndex: "abcClass",
      key: "abcClass",
      render: (abcClass, r) =>
        abcClass == null ? (
          <NoData note={r.poCount === 0 ? "Never purchased in the last 12 months" : "Purchase value not attributable to this material"} />
        ) : (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Badge tone={abcClass === "A" ? "primary" : abcClass === "B" ? "info" : "default"}>{abcClass}</Badge>
            <span className="subtle" style={{ fontSize: 11 }}>{r.purchaseSharePct}%</span>
          </span>
        ),
    },
    {
      title: "Purchase frequency",
      dataIndex: "frequency",
      key: "frequency",
      render: (frequency, r) =>
        frequency == null ? (
          <NoData note="No purchase orders in the last 12 months" />
        ) : (
          <Badge tone={frequency === "high" ? "success" : frequency === "medium" ? "warning" : "default"} dot>
            {FREQUENCY_LABEL[frequency]}
          </Badge>
        ),
    },
    {
      title: "Purchases (12m)",
      key: "monthlyQty",
      width: 90,
      render: (_, r) =>
        r.poCount === 0 ? (
          <NoData note="Nothing purchased in the window" />
        ) : (
          <Sparkline values={r.monthlyQty} w={70} h={20} color="var(--primary)" />
        ),
    },
    {
      title: "Last purchased",
      dataIndex: "lastPurchasedAt",
      key: "lastPurchasedAt",
      render: (v) =>
        v ? <span className="mono" style={{ fontSize: 12 }}>{dayjs(v).format("DD MMM YYYY")}</span>
          : <NoData note="No purchase order on record" />,
    },
  ];

  const filteredRows = filterBySearch(inventoryRows, search, (r) => [r.code, r.name, r.abcClass ?? ""]);

  const inventoryExportArgs = () => [
    "Inventory Report",
    `${periodLabel ?? ""} · Stock value, ABC and purchase frequency over the 12 months to period end`,
    ["SKU", "Material", "Stock", "Unit", "Stock value", "POs (12m)", "Qty purchased (12m)", "Purchase value (12m)", "ABC class", "Share %", "Purchase frequency", "Last purchased"],
    inventoryRows.map((r) => [
      r.code, r.name, r.stock, r.unit, r.stockValue, r.poCount, r.purchaseQty,
      r.purchaseValue > 0 ? r.purchaseValue : "—",
      r.abcClass ?? "—",
      r.purchaseSharePct == null ? "—" : `${r.purchaseSharePct}%`,
      r.frequency ? FREQUENCY_LABEL[r.frequency] : "—",
      r.lastPurchasedAt ? dayjs(r.lastPurchasedAt).format("YYYY-MM-DD") : "—",
    ]),
  ] as const;
  const handleExportPdf = () => downloadGenericTablePdf(...inventoryExportArgs());
  const handleExportExcel = () => downloadGenericTableExcel(...inventoryExportArgs());
  useEffect(() => {
    registerExport?.({ pdf: handleExportPdf, excel: handleExportExcel });
  });

  return (
  <ReportShell
    title={`Inventory Report · ${periodLabel ?? ""}`}
    sub="Stock value, ABC and purchase frequency — 12 months to period end"
    search={search}
    onSearchChange={setSearch}
    onExportPdf={handleExportPdf}
    onExportExcel={handleExportExcel}
  >
    <div className="grid grid-4" style={{ marginBottom: 20 }}>
      <Kpi icon="money" label="Stock value" value={report.kpis.stockValue > 0 ? fmtINR(report.kpis.stockValue) : "—"} />
      <Kpi icon="box" label="Purchased (12m)" value={report.kpis.purchaseValue12m > 0 ? fmtINR(report.kpis.purchaseValue12m) : "—"} />
      <Kpi icon="loader" label="Purchase : stock ratio" value={report.kpis.purchaseToStockRatio != null ? `${report.kpis.purchaseToStockRatio}x` : "—"} />
      <Kpi icon="alert" label="Not purchased (12m)" value={String(report.kpis.neverPurchased)} unit={`of ${report.kpis.materials}`} />
    </div>
    <CommonTable
      {...ERP_TABLE_PROPS}
      columns={inventoryColumns}
      dataSource={filteredRows}
      rowKey="code"
      loading={rmLoading || poLoading}
      scroll={{ x: "max-content" }}
      locale={{ emptyText: <span className="muted">No raw materials in the database.</span> }}
    />
    <UnavailableNote items={report.unavailable} />
  </ReportShell>
  );
};

const ProductionReport = ({ period, periodLabel, registerExport }) => {
  const { items: productionData, loading: prodLoading } = useEntityList("productionData");
  const { items: orders, loading: ordersLoading } = useEntityList("orders");
  const [search, setSearch] = useState("");

  const report = useMemo(
    () => buildProductionReport(productionData, orders, period),
    [productionData, orders, period]
  );

  const productionColumns = [
    {
      title: "Product line",
      dataIndex: "line",
      key: "line",
      render: (line) => <span className="strong">{line}</span>,
    },
    {
      title: "Orders",
      dataIndex: "orders",
      key: "orders",
      align: "right",
      render: (n) => <span className="num">{n}</span>,
    },
    {
      title: "Ordered (MT)",
      dataIndex: "qty",
      key: "qty",
      align: "right",
      sorter: (a, b) => a.qty - b.qty,
      render: (q) => <span className="num">{fmtNum(q)}</span>,
    },
    {
      title: "Completed (MT)",
      dataIndex: "completedQty",
      key: "completedQty",
      align: "right",
      render: (q) => <span className="num">{fmtNum(q)}</span>,
    },
    {
      title: "Completion",
      key: "completionPct",
      width: 160,
      render: (_, r) =>
        r.completionPct == null ? (
          <NoData note="No quantity recorded on these orders" />
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Bar value={r.completionPct} tone={r.completionPct >= 80 ? "success" : r.completionPct >= 40 ? "warning" : "danger"} />
            <span className="mono" style={{ fontSize: 11, width: 42, textAlign: "right" }}>{r.completionPct}%</span>
          </div>
        ),
    },
  ];

  const filteredRows = filterBySearch(report.rows, search, (r) => [r.line]);

  const productionExportArgs = () => [
    "Production Report",
    `${periodLabel ?? ""} · Plan attainment and order completion by product line`,
    ["Product line", "Orders", "Ordered (MT)", "Completed (MT)", "Completion %"],
    report.rows.map((r) => [
      r.line, r.orders, r.qty, r.completedQty,
      r.completionPct == null ? "—" : `${r.completionPct}%`,
    ]),
  ] as const;
  const handleExportPdf = () => downloadGenericTablePdf(...productionExportArgs());
  const handleExportExcel = () => downloadGenericTableExcel(...productionExportArgs());
  useEffect(() => {
    registerExport?.({ pdf: handleExportPdf, excel: handleExportExcel });
  });

  return (
  <ReportShell
    title={`Production Report · ${periodLabel ?? ""}`}
    sub="Plan attainment and order completion"
    search={search}
    onSearchChange={setSearch}
    onExportPdf={handleExportPdf}
    onExportExcel={handleExportExcel}
  >
    <div className="grid grid-4" style={{ marginBottom: 20 }}>
      <Kpi icon="factory" label="Planned output" value={report.kpis.planned > 0 ? fmtNum(report.kpis.planned) : "—"} unit={report.kpis.planned > 0 ? "MT" : undefined} />
      <Kpi icon="bolt" label="Actual output" value={report.kpis.actual > 0 ? fmtNum(report.kpis.actual) : "—"} unit={report.kpis.actual > 0 ? "MT" : undefined} />
      <Kpi icon="chart" label="Plan attainment" value={report.kpis.attainmentPct != null ? String(report.kpis.attainmentPct) : "—"} unit={report.kpis.attainmentPct != null ? "%" : undefined} />
      <Kpi icon="layers" label="Ordered volume" value={report.kpis.orderedQty > 0 ? fmtNum(report.kpis.orderedQty) : "—"} unit={report.kpis.orderedQty > 0 ? "MT" : undefined} />
    </div>
    {report.series.length ? (
      <div className="card" style={{ padding: 14, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Planned vs actual output (MT)</div>
        <BarChart
          data={report.series}
          keys={["planned", "actual"]}
          colors={["var(--border-strong)", "var(--primary)"]}
          h={180}
        />
      </div>
    ) : null}
    <CommonTable
      {...ERP_TABLE_PROPS}
      columns={productionColumns}
      dataSource={filteredRows}
      rowKey="line"
      loading={prodLoading || ordersLoading}
      scroll={{ x: "max-content" }}
      locale={{ emptyText: <span className="muted">No sales orders dated in {periodLabel}.</span> }}
    />
    <UnavailableNote items={report.unavailable} />
  </ReportShell>
  );
};

const DispatchReport = ({ period, periodLabel, registerExport }) => {
  const { items: dispatches, loading } = useEntityList("dispatches");
  const [search, setSearch] = useState("");

  const report = useMemo(() => buildDispatchReport(dispatches, period), [dispatches, period]);

  const dispatchColumns = [
    {
      title: "Route",
      dataIndex: "route",
      key: "route",
      render: (route) => <span className="strong">{route}</span>,
    },
    {
      title: "Trips",
      dataIndex: "trips",
      key: "trips",
      align: "right",
      sorter: (a, b) => a.trips - b.trips,
      render: (trips) => <span className="num">{trips}</span>,
    },
    {
      title: "Vol (MT)",
      dataIndex: "volume",
      key: "volume",
      align: "right",
      sorter: (a, b) => a.volume - b.volume,
      render: (volume) => <span className="num">{fmtNum(volume)}</span>,
    },
    {
      title: "Delivered",
      key: "delivered",
      align: "right",
      render: (_, r) => <span className="num">{r.delivered} / {r.trips}</span>,
    },
    {
      title: "In transit",
      dataIndex: "inTransit",
      key: "inTransit",
      align: "right",
      render: (n) => <span className="num">{n}</span>,
    },
    {
      title: "Delivered %",
      dataIndex: "deliveredPct",
      key: "deliveredPct",
      align: "right",
      render: (pct) =>
        pct == null ? (
          <NoData note="No trips on this route in the period" />
        ) : (
          <span className="num" style={{ color: pct >= 95 ? "var(--success)" : pct >= 50 ? "var(--fg-muted)" : "var(--warning)", fontWeight: 500 }}>{pct}%</span>
        ),
    },
    {
      title: "Avg progress",
      dataIndex: "avgProgress",
      key: "avgProgress",
      width: 150,
      render: (pct) =>
        pct == null ? <NoData note="No progress recorded" /> : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Bar value={pct} tone={pct >= 80 ? "success" : "warning"} />
            <span className="mono" style={{ fontSize: 11, width: 36, textAlign: "right" }}>{pct}%</span>
          </div>
        ),
    },
  ];

  const filteredRows = filterBySearch(report.rows, search, (r) => [r.route]);

  const dispatchExportArgs = () => [
    "Dispatch Report",
    `${periodLabel ?? ""} · Trips, tonnage and delivery status by route`,
    ["Route", "Trips", "Vol (MT)", "Delivered", "In transit", "Delivered %", "Avg progress %"],
    report.rows.map((r) => [
      r.route, r.trips, r.volume, r.delivered, r.inTransit,
      r.deliveredPct == null ? "—" : `${r.deliveredPct}%`,
      r.avgProgress == null ? "—" : `${r.avgProgress}%`,
    ]),
  ] as const;
  const handleExportPdf = () => downloadGenericTablePdf(...dispatchExportArgs());
  const handleExportExcel = () => downloadGenericTableExcel(...dispatchExportArgs());
  useEffect(() => {
    registerExport?.({ pdf: handleExportPdf, excel: handleExportExcel });
  });

  return (
    <ReportShell
      title={`Dispatch Report · ${periodLabel ?? ""}`}
      sub="Trips, tonnage and delivery status by route"
      search={search}
      onSearchChange={setSearch}
      onExportPdf={handleExportPdf}
      onExportExcel={handleExportExcel}
    >
      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <Kpi icon="truck" label="Trips dispatched" value={String(report.kpis.trips)} />
        <Kpi icon="layers" label="Tonnage moved" value={report.kpis.volume > 0 ? fmtNum(report.kpis.volume) : "—"} unit={report.kpis.volume > 0 ? "MT" : undefined} />
        <Kpi icon="check" label="Delivered" value={report.kpis.deliveredPct != null ? String(report.kpis.deliveredPct) : "—"} unit={report.kpis.deliveredPct != null ? "%" : undefined} />
        <Kpi icon="clock" label="Active routes" value={String(report.kpis.routes)} />
      </div>
      <CommonTable
        {...ERP_TABLE_PROPS}
        columns={dispatchColumns}
        dataSource={filteredRows}
        rowKey="route"
        loading={loading}
        scroll={{ x: "max-content" }}
        locale={{ emptyText: <span className="muted">No dispatches dated in {periodLabel}.</span> }}
      />
      <UnavailableNote items={report.unavailable} />
    </ReportShell>
  );
};

const VendorReport = ({ period, periodLabel, registerExport }) => {
  const { items: vendors, loading: vendorsLoading } = useVendors();
  const { items: purchaseOrders, loading: poLoading } = useEntityList("purchaseOrders");
  const { items: invoices, loading: invLoading } = useEntityList("invoices");
  const [search, setSearch] = useState("");

  const report = useMemo(
    () => buildVendorReport(vendors, purchaseOrders, invoices, period),
    [vendors, purchaseOrders, invoices, period]
  );
  const vendorRows = report.rows;

  const vendorColumns = [
    {
      title: "Vendor",
      dataIndex: "name",
      key: "vendor",
      render: (_, v) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar name={v.name} color={(vendorRows.indexOf(v) % 5) + 1} />
          <div><div className="strong">{v.name}</div><div className="subtle" style={{ fontSize: 11 }}>{v.city}</div></div>
        </div>
      ),
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      render: (category) => <Badge tone={category === "Raw Material" ? "primary" : category === "Chemical" ? "info" : category === "Packaging" ? "gold" : "default"}>{category}</Badge>,
    },
    {
      title: "POs MTD",
      dataIndex: "poMtd",
      key: "poMtd",
      align: "right",
      sorter: (a, b) => a.poMtd - b.poMtd,
      render: (poMtd) => <span className="num">{poMtd}</span>,
    },
    {
      title: "Spend MTD",
      dataIndex: "spendMtd",
      key: "spendMtd",
      align: "right",
      sorter: (a, b) => a.spendMtd - b.spendMtd,
      render: (spendMtd) => <span className="num">{spendMtd > 0 ? fmtINR(spendMtd) : <NoData note="No purchase orders in this month" />}</span>,
    },
    {
      title: "POs YTD",
      dataIndex: "poYtd",
      key: "poYtd",
      align: "right",
      render: (poYtd) => <span className="num">{poYtd}</span>,
    },
    {
      title: "Spend YTD",
      dataIndex: "spendYtd",
      key: "spendYtd",
      align: "right",
      sorter: (a, b) => a.spendYtd - b.spendYtd,
      render: (spendYtd) => <span className="num">{spendYtd > 0 ? fmtINR(spendYtd) : <NoData note="No purchase orders this year" />}</span>,
    },
    {
      title: "Rating",
      dataIndex: "rating",
      key: "rating",
      render: (rating) => <><span style={{ color: "var(--secondary)" }}>★</span> <span className="mono strong">{rating}</span></>,
    },
    {
      title: "Invoice match",
      key: "invoiceMatch",
      render: (_, v) =>
        v.invoiceMatchPct == null ? (
          <NoData note="No invoices raised in this month" />
        ) : (
          <Badge tone={v.invoiceMatchPct === 100 ? "success" : v.invoiceMatchPct >= 50 ? "warning" : "danger"} dot>
            {v.invoiceMatchPct}% of {v.invoicesMtd}
          </Badge>
        ),
    },
  ];

  const filteredRows = filterBySearch(vendorRows, search, (v) => [v.name, v.city, v.category]);

  const vendorExportArgs = () => [
    "Vendor Purchase Report",
    `${periodLabel ?? ""} · PO volume and spend from purchase orders; match rate from invoices`,
    ["Vendor", "City", "Category", "POs MTD", "Spend MTD", "POs YTD", "Spend YTD", "Rating", "Invoices MTD", "Invoice match %"],
    vendorRows.map((v) => [
      v.name, v.city, v.category, v.poMtd, v.spendMtd, v.poYtd, v.spendYtd, v.rating,
      v.invoicesMtd, v.invoiceMatchPct == null ? "—" : `${v.invoiceMatchPct}%`,
    ]),
  ] as const;
  const handleExportPdf = () => downloadGenericTablePdf(...vendorExportArgs());
  const handleExportExcel = () => downloadGenericTableExcel(...vendorExportArgs());
  useEffect(() => {
    registerExport?.({ pdf: handleExportPdf, excel: handleExportExcel });
  });

  return (
  <ReportShell
    title={`Vendor Purchase Report · ${periodLabel ?? ""}`}
    sub="PO volume, spend, rating, invoice match rate"
    search={search}
    onSearchChange={setSearch}
    onExportPdf={handleExportPdf}
    onExportExcel={handleExportExcel}
  >
    <div className="grid grid-4" style={{ marginBottom: 20 }}>
      <Kpi icon="users" label="Vendors transacting" value={String(report.kpis.vendorsTransacting)} />
      <Kpi icon="fileText" label="POs raised" value={String(report.kpis.poMtd)} />
      <Kpi icon="money" label="Spend (month)" value={report.kpis.spendMtd > 0 ? fmtINR(report.kpis.spendMtd) : "—"} />
      <Kpi icon="check" label="Invoice match" value={report.kpis.invoiceMatchPct != null ? String(report.kpis.invoiceMatchPct) : "—"} unit={report.kpis.invoiceMatchPct != null ? "%" : undefined} />
    </div>
    <CommonTable
      {...ERP_TABLE_PROPS}
      columns={vendorColumns}
      dataSource={filteredRows}
      rowKey="id"
      loading={vendorsLoading || poLoading || invLoading}
      scroll={{ x: "max-content" }}
    />
    <UnavailableNote items={["Payment SLA / days-late needs a payment-date field on the invoice — not recorded."]} />
  </ReportShell>
  );
};

const HR_TENURE_FORMATS = ["YYYY-MM-DD", "DD/MM/YYYY", "DD-MM-YYYY"];

// dateJoining is a free-text field — most rows are "DD/MM/YYYY" but some
// older/edited records were saved as full ISO strings, so fall back to a
// loose parse rather than dropping those employees from the tenure average.
function parseJoiningDate(value) {
  if (!value) return null;
  const strict = dayjs(value, HR_TENURE_FORMATS, true);
  if (strict.isValid()) return strict;
  const loose = dayjs(value);
  return loose.isValid() ? loose : null;
}

const HRReport = ({ period, periodLabel, registerExport }) => {
  const [search, setSearch] = useState("");
  const { items: employees } = useEmployees();
  const attendanceReport = useAttendanceReport();
  const [payrollByDept, setPayrollByDept] = useState({});
  const [payrollLoading, setPayrollLoading] = useState(true);
  // Salary cycle and attendance window both follow the page's month picker.
  const cycle = (period ?? dayjs()).format("YYYY-MM");

  // Re-pull attendance whenever the picked month changes. `cycle` is the dep
  // rather than `period` so a new dayjs object for the same month is a no-op.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    attendanceReport.applyMonth(dayjs(cycle, "YYYY-MM"));
  }, [cycle]);

  useEffect(() => {
    let cancelled = false;
    setPayrollLoading(true);
    fetch(`/api/hrms/salary/bulk?cycle=${cycle}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const rows = Array.isArray(json?.data) ? json.data : [];
        const byDept = {};
        for (const row of rows) {
          const dept = row.department || "Unassigned";
          byDept[dept] = (byDept[dept] || 0) + (Number(row.netPay) || 0);
        }
        setPayrollByDept(byDept);
      })
      .catch(() => setPayrollByDept({}))
      .finally(() => { if (!cancelled) setPayrollLoading(false); });
    return () => { cancelled = true; };
  }, [cycle]);

  // Real roster + attendance + payroll, rolled up by department — mirrors the
  // Vendor Purchase report's pattern of driving the table off live hooks
  // instead of dummy rows. Attrition isn't tracked anywhere in the Employee
  // model (no exit/resignation field), so that KPI was dropped rather than
  // faked.
  const attendancePctByDept = useMemo(() => {
    const map = new Map();
    for (const d of attendanceReport.deptCompliance) {
      map.set(d.department || "Unassigned", d.presentPct);
    }
    return map;
  }, [attendanceReport.deptCompliance]);

  const hrRows = useMemo(() => {
    // Tenure is measured to the end of the selected month, so a past period
    // reports tenure as it stood then rather than as it stands today.
    const monthEnd = dayjs(cycle, "YYYY-MM").endOf("month");
    const now = monthEnd.isAfter(dayjs()) ? dayjs() : monthEnd;
    const byDept = new Map();
    for (const emp of employees) {
      const dept = emp.department || "Unassigned";
      if (!byDept.has(dept)) byDept.set(dept, { headcount: 0, tenureSum: 0, tenureCount: 0 });
      const bucket = byDept.get(dept);
      bucket.headcount += 1;
      const doj = parseJoiningDate(emp.dateJoining);
      if (doj) {
        bucket.tenureSum += now.diff(doj, "month") / 12;
        bucket.tenureCount += 1;
      }
    }
    return Array.from(byDept.entries())
      .map(([dept, b]) => ({
        d: dept,
        h: b.headcount,
        a: attendancePctByDept.get(dept) ?? null,
        t: b.tenureCount ? Math.round((b.tenureSum / b.tenureCount) * 10) / 10 : null,
        tSum: b.tenureSum,
        tCount: b.tenureCount,
        p: payrollByDept[dept] ?? 0,
      }))
      .sort((x, y) => y.h - x.h);
  }, [employees, attendancePctByDept, payrollByDept, cycle]);

  const kpiTotals = useMemo(() => {
    const headcount = employees.length;
    const kpi = attendanceReport.kpi;
    const attendancePct = kpi && kpi.presentDays + kpi.absentDays > 0
      ? Math.round((kpi.presentDays / (kpi.presentDays + kpi.absentDays)) * 1000) / 10
      : null;
    const tenureSum = hrRows.reduce((s, r) => s + r.tSum, 0);
    const tenureCount = hrRows.reduce((s, r) => s + r.tCount, 0);
    const avgTenure = tenureCount ? Math.round((tenureSum / tenureCount) * 10) / 10 : null;
    const payrollTotal = Object.values(payrollByDept).reduce((s, v) => s + v, 0);
    return { headcount, attendancePct, avgTenure, payrollTotal };
  }, [employees, attendanceReport.kpi, hrRows, payrollByDept]);

  const hrColumns = [
    {
      title: "Department",
      dataIndex: "d",
      key: "department",
      render: (d) => <span className="strong">{d}</span>,
    },
    {
      title: "Headcount",
      dataIndex: "h",
      key: "headcount",
      align: "right",
      render: (h) => <span className="num">{h}</span>,
    },
    {
      title: "Attendance %",
      dataIndex: "a",
      key: "attendance",
      align: "right",
      render: (a) =>
        a == null ? (
          <span className="subtle">—</span>
        ) : (
          <span className="num" style={{ color: a >= 95 ? "var(--success)" : a >= 90 ? "var(--fg-muted)" : "var(--warning)" }}>{a}%</span>
        ),
    },
    {
      title: "Avg tenure",
      dataIndex: "t",
      key: "avgTenure",
      align: "right",
      render: (t) => (t == null ? <span className="subtle">—</span> : <span className="num">{t} yrs</span>),
    },
    {
      title: "Payroll",
      dataIndex: "p",
      key: "payrollMtd",
      align: "right",
      render: (p) => <span className="num">{p > 0 ? fmtINR(p) : "—"}</span>,
    },
  ];

  const filteredRows = filterBySearch(hrRows, search, (r) => [r.d]);

  const hrExportArgs = () => [
    "HR Report",
    `${periodLabel ?? ""} · Attendance and payroll summary by department`,
    ["Department", "Headcount", "Attendance %", "Avg tenure", "Payroll"],
    hrRows.map((r) => [
      r.d,
      r.h,
      r.a == null ? "—" : `${r.a}%`,
      r.t == null ? "—" : `${r.t} yrs`,
      r.p > 0 ? fmtINR(r.p) : "—",
    ]),
  ] as const;
  const handleExportPdf = () => downloadGenericTablePdf(...hrExportArgs());
  const handleExportExcel = () => downloadGenericTableExcel(...hrExportArgs());
  registerExport?.({ pdf: handleExportPdf, excel: handleExportExcel });

  return (
    <ReportShell
      title={`HR Report · ${periodLabel ?? new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}`}
      sub="Attendance and payroll summary by department"
      search={search}
      onSearchChange={setSearch}
      onExportPdf={handleExportPdf}
      onExportExcel={handleExportExcel}
    >
      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <Kpi icon="users" label="Headcount" value={String(kpiTotals.headcount)} />
        <Kpi
          icon="check"
          label={`Avg attendance · ${periodLabel ?? ""}`}
          value={kpiTotals.attendancePct != null ? kpiTotals.attendancePct.toFixed(1) : "—"}
          unit={kpiTotals.attendancePct != null ? "%" : undefined}
        />
        <Kpi
          icon="badge"
          label="Avg tenure"
          value={kpiTotals.avgTenure != null ? kpiTotals.avgTenure.toFixed(1) : "—"}
          unit={kpiTotals.avgTenure != null ? "yrs" : undefined}
        />
        <Kpi
          icon="money"
          label={`Payroll · ${periodLabel ?? ""}`}
          value={kpiTotals.payrollTotal > 0 ? fmtINR(kpiTotals.payrollTotal) : "—"}
        />
      </div>
      <CommonTable
        {...ERP_TABLE_PROPS}
        columns={hrColumns}
        dataSource={filteredRows}
        rowKey="d"
        loading={attendanceReport.loading || payrollLoading}
        scroll={{ x: "max-content" }}
      />
    </ReportShell>
  );
};

/* ============================================================
   PACKAGING INVENTORY (with bag auto-calc)
   ============================================================ */
const PackagingInventory = () => {
  const router = useRouter();
  const { items: packagingItems, loading, error: loadError, reload } = usePackaging();
  const [calcOpen, setCalcOpen] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [orderQty, setOrderQty] = useState(24);
  const [bagSize, setBagSize] = useState(1000);
  const [deletingCode, setDeletingCode] = useState(null);

  const viewDetail = useMemo(() => {
    if (!viewItem) return null;
    return buildPackagingView(viewItem);
  }, [viewItem]);
  const bagsNeeded = Math.ceil(orderQty * 1000 / bagSize);
  const generateStockRequest = () => {
    const p = packagingItems.find((x) => x.unit === "pcs" && x.capacity === bagSize);
    if (!p) {
      message.info("No matching packaging SKU found for this bag size.");
    } else if (p.stock < bagsNeeded) {
      message.warning(
        `${p.code} has only ${fmtNum(p.stock)} ${p.unit} in stock — short by ${fmtNum(bagsNeeded - p.stock)} for this order.`
      );
    } else {
      message.success(`${p.code} has enough stock (${fmtNum(p.stock)} ${p.unit}) for this order.`);
    }
    setCalcOpen(false);
  };

  const deletePackaging = useCallback(
    async (code) => {
      setDeletingCode(code);
      try {
        const res = await fetch(`/api/inventory/packaging/${encodeURIComponent(code)}`, {
          method: "DELETE",
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        message.success("Packaging deleted.");
        await reload();
      } catch (e) {
        message.error(e instanceof Error ? e.message : "Delete failed");
      } finally {
        setDeletingCode(null);
      }
    },
    [reload]
  );

  const packagingStats = useMemo(() => {
    const bagItems = packagingItems.filter((p) => p.unit === "pcs");
    const fabricItems = packagingItems.filter((p) => p.unit !== "pcs");
    const totalBagsInStock = bagItems.reduce((sum, p) => sum + p.stock, 0);
    const coverageItems = packagingItems.filter((p) => p.reorder > 0);
    const avgCoverageDays = coverageItems.length
      ? Math.round(
          coverageItems.reduce((sum, p) => sum + (p.stock / p.reorder) * 7, 0) /
            coverageItems.length
        )
      : 0;
    return {
      bagCount: bagItems.length,
      fabricCount: fabricItems.length,
      totalBagsInStock,
      avgCoverageDays,
    };
  }, [packagingItems]);

  const [search, setSearch] = useState("");
  const [materialFilter, setMaterialFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredPackaging = useMemo(() => {
    return packagingItems.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (materialFilter !== "all") {
        const lowerCode = p.code.toLowerCase();
        const lowerName = p.name.toLowerCase();
        if (materialFilter === "fibc" && !lowerCode.includes("fibc") && !lowerName.includes("fibc")) return false;
        if (materialFilter === "ppw" && !lowerCode.includes("ppw") && !lowerName.includes("pp")) return false;
        if (materialFilter === "bopp" && !lowerCode.includes("bopp") && !lowerName.includes("bopp")) return false;
      }
      if (search) {
        const t = search.toLowerCase();
        if (!p.code.toLowerCase().includes(t) && !p.name.toLowerCase().includes(t)) {
          return false;
        }
      }
      return true;
    });
  }, [packagingItems, search, materialFilter, statusFilter]);

  const columns = useMemo(
    () => [
      {
        title: "SKU",
        dataIndex: "code",
        key: "code",
        render: (code) => <span className="mono strong">{code}</span>,
      },
      {
        title: "Description",
        dataIndex: "name",
        key: "name",
        render: (name) => <span className="strong">{name}</span>,
      },
      {
        title: "Stock",
        key: "stock",
        align: "right",
        render: (_, p) => (
          <>
            <span className="mono strong">{fmtNum(p.stock)}</span>{" "}
            <span className="subtle" style={{ fontSize: 11 }}>{p.unit}</span>
          </>
        ),
      },
      {
        title: "Reorder at",
        key: "reorder",
        render: (_, p) => <span className="mono subtle">{fmtNum(p.reorder)} {p.unit}</span>,
      },
      {
        title: "Coverage",
        key: "coverage",
        width: 150,
        render: (_, p) => {
          const tone = p.status === "low" ? "warning" : "success";
          const cov = Math.round((p.stock / p.reorder) * 7);
          return (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Bar value={Math.min(100, (p.stock / (p.reorder * 3)) * 100)} tone={tone} />
              <span className="mono" style={{ fontSize: 11, width: 36, textAlign: "right" }}>{cov}d</span>
            </div>
          );
        },
      },
      // Trend is a stored field nothing ever computes — hidden until a stock-movement history exists.
      // {
      //   title: "Trend",
      //   dataIndex: "trend",
      //   key: "trend",
      //   render: (trend) => (
      //     <span style={{ fontSize: 12, color: trend > 0 ? "var(--success)" : "var(--danger)", fontWeight: 500 }}>
      //       {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
      //     </span>
      //   ),
      // },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (status) => inventoryStatusBadge(status),
      },
      {
        title: "Actions",
        key: "actions",
        width: 120,
        align: "center",
        render: (_, p) => (
          <ViewEditActions
            onView={() => setViewItem(p)}
            editHref={`/inventory/packaging/add?code=${encodeURIComponent(p.code)}`}
            showDelete
            onDelete={() => deletePackaging(p.code)}
            deleteLabel={deletingCode === p.code ? "Deleting…" : "Delete"}
            deleteConfirmTitle={`Delete ${p.code}? This cannot be undone.`}
          />
        ),
      },
    ],
    [deletingCode, deletePackaging]
  );

  const handlePackExport = (type: 'xls' | 'pdf') => {
    const title = "Packaging Inventory";
    const subtitle = `Exported ${new Date().toISOString().split("T")[0]}`;
    const head = ["SKU", "Description", "Stock", "Unit", "Reorder At", /* "Trend", */ "Status"];
    const body = filteredPackaging.map(p => [
      p.code, p.name, p.stock, p.unit, p.reorder,
      /* `${p.trend > 0 ? "↑" : "↓"} ${Math.abs(p.trend)}%`, */ p.status
    ]);
    if (type === 'pdf') {
      downloadGenericTablePdf(title, subtitle, head, body);
    } else {
      downloadGenericTableExcel(title, subtitle, head, body);
    }
    message.success(`Exported packaging as ${type === 'xls' ? 'Excel' : 'PDF'}`);
  };

  const packExportMenuItems = [
    { key: "xls", label: "Export as Excel (XLSX)", onClick: () => handlePackExport('xls') },
    { key: "pdf", label: "Export as PDF", onClick: () => handlePackExport('pdf') }
  ];

  return (
    <>
      <DashHead title="Packaging Inventory" sub="FIBC, PP woven, BOPP — stock, bag auto-calc, alerts">
        <Btn size="sm" icon="bolt" onClick={() => setCalcOpen(true)}>Bag calc</Btn>
        <Dropdown menu={{ items: packExportMenuItems }} placement="bottomRight">
          <Btn size="sm" icon="download">Export</Btn>
        </Dropdown>
        <Btn variant="primary" size="sm" icon="plus" onClick={() => router.push("/inventory/packaging/add")}>Add packaging</Btn>
      </DashHead>

      <ErpStatGrid cols={4}>
        <StatCard
          icon={AppstoreOutlined}
          label="Total SKUs"
          value={packagingItems.length}
          hint={`${packagingStats.bagCount} bag · ${packagingStats.fabricCount} fabric`}
        />
        <StatCard
          icon={ShoppingOutlined}
          label="Total bags in stock"
          value={fmtNum(packagingStats.totalBagsInStock)}
        />
        <StatCard
          icon={AlertOutlined}
          label="Low stock SKUs"
          value={packagingItems.filter((p) => p.status === "low").length}
          hint="Reorder needed"
          hintTone="warning"
        />
        <StatCard
          icon={ThunderboltOutlined}
          label="Coverage (days)"
          value={packagingStats.avgCoverageDays}
          hint="Average across SKUs"
        />
      </ErpStatGrid>

      <div className="card">
        <PageFilterPanel
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search Packaging SKU or name…"
          activeFilterCount={(materialFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0)}
          onApply={() => {}}
          onClear={() => {
            setSearch("");
            setMaterialFilter("all");
            setStatusFilter("all");
          }}
          drawerWidth={320}
        >
          <div className="arf-item">
            <span className="arf-label">Material</span>
            <Select
              className="w-full"
              value={materialFilter}
              onChange={setMaterialFilter}
              options={[
                { value: "all", label: "All materials" },
                { value: "fibc", label: "FIBC" },
                { value: "ppw", label: "PP Woven" },
                { value: "bopp", label: "BOPP" },
              ]}
            />
          </div>
          <div className="arf-item">
            <span className="arf-label">Status</span>
            <Select
              className="w-full"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All statuses" },
                { value: "healthy", label: "Healthy" },
                { value: "low", label: "Low stock" },
                { value: "critical", label: "Critical" },
              ]}
            />
          </div>
        </PageFilterPanel>
        <div style={{ padding: 16, paddingTop: 0 }}>
          {loadError ? (
            <p style={{ color: "var(--danger)", fontSize: 12, marginBottom: 12 }}>{loadError}</p>
          ) : null}
          <CommonTable
            {...ERP_TABLE_PROPS}
            columns={columns}
            dataSource={filteredPackaging}
            rowKey="code"
            loading={loading}
          />
        </div>
      </div>

      <Modal open={calcOpen} onClose={() => setCalcOpen(false)} title="Bag auto-calculator" sub="Compute packaging requirement from order quantity" wide
        footer={<><Btn variant="ghost" onClick={() => setCalcOpen(false)}>Close</Btn><Btn variant="primary" onClick={generateStockRequest}>Generate stock request</Btn></>}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div className="field"><label className="field-label">Order quantity (MT)</label>
            <input className="input lg" type="number" value={orderQty} onChange={(e) => setOrderQty(Number(e.target.value || 0))} />
          </div>
          <div className="field"><label className="field-label">Bag capacity</label>
            <select className="input lg" value={bagSize} onChange={(e) => setBagSize(Number(e.target.value))}>
              <option value="1000">FIBC · 1000 kg</option>
              <option value="500">FIBC · 500 kg</option>
              <option value="50">PP Woven · 50 kg</option>
              <option value="25">PP Woven · 25 kg</option>
              <option value="20">BOPP · 20 kg</option>
            </select>
          </div>
        </div>

        <div style={{
          padding: 24, background: "var(--primary-soft)", borderRadius: 12,
          marginBottom: 16, display: "flex", alignItems: "center", gap: 24,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "var(--primary)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>BAGS REQUIRED</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 44, fontWeight: 600, letterSpacing: "-0.025em", color: "var(--primary)", lineHeight: 1, marginTop: 4 }}>
              {fmtNum(bagsNeeded)}
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 6 }}>
              for <strong>{orderQty} MT</strong> @ <strong>{bagSize} kg</strong>/bag · includes 2% buffer
            </div>
          </div>
          <div style={{ width: 1, height: 80, background: "var(--primary-soft-2)" }}></div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Cost per bag</span><span className="mono">₹{bagSize === 1000 ? "180" : bagSize === 500 ? "120" : bagSize === 50 ? "14" : bagSize === 25 ? "9" : "16"}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Total packaging cost</span><span className="mono strong">₹{fmtNum(bagsNeeded * (bagSize === 1000 ? 180 : bagSize === 500 ? 120 : bagSize === 50 ? 14 : bagSize === 25 ? 9 : 16))}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Per MT</span><span className="mono">₹{Math.round(bagsNeeded * (bagSize === 1000 ? 180 : bagSize === 500 ? 120 : bagSize === 50 ? 14 : bagSize === 25 ? 9 : 16) / orderQty)}</span></div>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>STOCK AVAILABILITY</div>
        {packagingItems.filter((p) => p.unit === "pcs" && p.capacity === bagSize).map((p) => {
          const enough = p.stock >= bagsNeeded;
          const shortage = bagsNeeded - p.stock;
          return (
            <div key={p.code} style={{
              padding: 14, border: `1px solid ${enough ? "var(--success)" : "var(--warning)"}`,
              background: enough ? "var(--success-soft)" : "var(--warning-soft)",
              borderRadius: 10, display: "flex", alignItems: "center", gap: 12,
            }}>
              <Icon name={enough ? "check" : "alert"} size={18} style={{ color: enough ? "var(--success)" : "var(--warning)" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>
                  In stock: <strong className="mono">{fmtNum(p.stock)}</strong> · Required: <strong className="mono">{fmtNum(bagsNeeded)}</strong>
                  {!enough && <> · Short by <strong className="mono" style={{ color: "var(--warning)" }}>{fmtNum(shortage)}</strong></>}
                </div>
              </div>
              {!enough && <Btn variant="primary" size="sm" icon="cart">Raise PO</Btn>}
            </div>
          );
        })}
      </Modal>

      <Modal
        open={!!viewItem}
        onClose={() => setViewItem(null)}
        title={viewDetail?.name ?? viewItem?.name ?? "Packaging"}
        sub={viewDetail ? `${viewDetail.code} · ${viewDetail.statusLabel}` : viewItem?.code}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setViewItem(null)}>
              Close
            </Btn>
            {viewItem ? (
              <Btn
                variant="primary"
                size="sm"
                icon="edit"
                onClick={() => {
                  router.push(
                    `/inventory/packaging/add?code=${encodeURIComponent(viewItem.code)}`
                  );
                  setViewItem(null);
                }}
              >
                Edit
              </Btn>
            ) : null}
          </>
        }
      >
        {viewDetail ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(120px, 38%) 1fr",
              gap: "10px 16px",
              fontSize: 13,
            }}
          >
            {viewDetail.fields.map((field) => (
              <React.Fragment key={field.label}>
                <span className="muted">{field.label}</span>
                <span>{field.value}</span>
              </React.Fragment>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            Packaging details unavailable.
          </p>
        )}
      </Modal>
    </>
  );
};

export { Employees, Attendance, Payroll, Reports, PackagingInventory };
