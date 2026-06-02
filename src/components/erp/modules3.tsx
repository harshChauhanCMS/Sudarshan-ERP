// @ts-nocheck
'use client';


import React, { useState } from "react";
import { Icon } from "./icons";
import { useDATA } from "./data";
import { Btn, Badge, StatusBadge, Avatar, Bar, Sparkline, Kpi, Modal, fmtINR, fmtINRFull, fmtNum, AreaChart, BarChart, Donut } from "./ui";
import { EntityFormModal, FormField, FormGrid, FormInput, FormSelect, useFormState, requireFields } from "@/components/forms";
import { useEntityMutation } from "@/hooks/use-entity-mutation";
import { nextEmployeeId, nextPackagingCode, formatDisplayDate } from "@/lib/id-generators";
import { DashHead, SectionH } from "./dashboards";

/* ============================================================
   MODULES PART 3 — HR/Attendance, Payroll, Reports, Packaging
   ============================================================ */


/* ============================================================
   EMPLOYEES (HR master)
   ============================================================ */
import { Table, Button as AntButton, Badge as AntBadge, Avatar as AntAvatar } from "antd";
import { TeamOutlined, UserAddOutlined, ExportOutlined, WarningOutlined, RightOutlined, CalendarOutlined, DownloadOutlined, PlusOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, EnvironmentOutlined, ThunderboltOutlined, EyeOutlined, MailOutlined, FilterOutlined, AlertOutlined, MoneyCollectOutlined, FileTextOutlined, CheckOutlined, CloseOutlined } from "@ant-design/icons";


const Employees = () => {
  const DATA = useDATA();
  const { append, saving, error, clearError } = useEntityMutation();
  const [open, setOpen] = useState(false);
  const empForm = useFormState({ name: "", role: "", dept: "Operations", since: String(new Date().getFullYear()) });

  const saveEmployee = async () => {
    const err = requireFields(empForm.values, ["name", "role"]);
    if (err) throw new Error(err);
    await append("employees", {
      id: nextEmployeeId(DATA.EMPLOYEES),
      name: empForm.values.name.trim(),
      role: empForm.values.role.trim(),
      dept: empForm.values.dept,
      status: "active",
      since: empForm.values.since,
    });
    setOpen(false);
    empForm.reset({ name: "", role: "", dept: "Operations", since: String(new Date().getFullYear()) });
  };

  const columns = [
    { title: "Emp ID", dataIndex: "id", key: "id", render: (text) => <span className="mono strong">{text}</span> },
    { title: "Name", dataIndex: "name", key: "name", render: (text, record, i) => (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <AntAvatar style={{ backgroundColor: ["#f56a00", "#7265e6", "#ffbf00", "#00a2ae"][i % 4] }}>{text.charAt(0)}</AntAvatar>
        <div className="strong">{text}</div>
      </div>
    )},
    { title: "Role", dataIndex: "role", key: "role" },
    { title: "Department", dataIndex: "dept", key: "dept", render: (text) => <span className="muted">{text}</span> },
    { title: "Joined", dataIndex: "since", key: "since", render: (text) => <span className="muted">{text}</span> },
    { title: "Reporting to", key: "reporting", render: (_, __, i) => <span className="muted">{i === 0 ? "—" : i < 3 ? "Rajiv Mehta" : "Priya Sharma"}</span> },
    { title: "Status", key: "status", render: () => <AntBadge status="success" text="Active" /> },
    { title: "", key: "action", width: 48, render: () => <AntButton type="text" size="small" icon={<EyeOutlined />} aria-label="View" title="View" /> },
  ];

  return (
    <>
      <DashHead title="Employees" sub="HR master across both companies">
        <AntButton size="small" icon={<ExportOutlined />}>Import</AntButton>
        <AntButton type="primary" size="small" icon={<UserAddOutlined />} onClick={() => setOpen(true)}>Add employee</AntButton>
      </DashHead>

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <div className="kpi" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <div><div className="kpi-label"><TeamOutlined style={{ marginRight: 6 }} />Total headcount</div><div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 4 }}>From database</div></div>
          <div className="kpi-value tabular">{DATA.EMPLOYEES.length}</div>
        </div>
        <div className="kpi" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <div><div className="kpi-label"><UserAddOutlined style={{ marginRight: 6 }} />New hires (MTD)</div><div style={{ fontSize: 11, color: "var(--success)", marginTop: 4 }}>2 onboarding</div></div>
          <div className="kpi-value tabular">4</div>
        </div>
        <div className="kpi" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <div><div className="kpi-label"><ExportOutlined style={{ marginRight: 6 }} />Exits (MTD)</div><div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 4 }}>0.3% attrition</div></div>
          <div className="kpi-value tabular">1</div>
        </div>
        <div className="kpi" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <div><div className="kpi-label"><WarningOutlined style={{ marginRight: 6 }} />Pending actions</div><div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 4 }}>3 approvals + 3 docs</div></div>
          <div className="kpi-value tabular" style={{ color: "var(--warning)" }}>6</div>
        </div>
      </div>

      <div className="card">
        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex" }}>
          <div className="tabs" style={{ border: "none", marginBottom: -1 }}>
            <span className="tab active">All <span className="tab-count">{DATA.EMPLOYEES.length}</span></span>
            <span className="tab">Active <span className="tab-count">{DATA.EMPLOYEES.length}</span></span>
            <span className="tab">Onboarding <span className="tab-count">2</span></span>
            <span className="tab">On leave <span className="tab-count">3</span></span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <select className="input" style={{ height: 30, width: 140 }}><option>All depts</option><option>Operations</option><option>Procurement</option><option>Production</option><option>Sales</option><option>HR</option></select>
            <input className="input" placeholder="Search employee…" style={{ height: 30, width: 200 }} />
          </div>
        </div>
        <div style={{ padding: 16 }}>
          <Table dataSource={DATA.EMPLOYEES} columns={columns} pagination={false} rowKey="id" />
        </div>
      </div>

      <EntityFormModal open={open} onClose={() => setOpen(false)} title="Add employee" wide submitLabel="Create employee" saving={saving} error={error} onSubmit={saveEmployee}>
        <FormGrid>
          <FormField label="Full name"><FormInput value={empForm.values.name} onChange={(v) => empForm.setField("name", v)} /></FormField>
          <FormField label="Role / designation"><FormInput value={empForm.values.role} onChange={(v) => empForm.setField("role", v)} /></FormField>
          <FormField label="Department">
            <FormSelect value={empForm.values.dept} onChange={(v) => empForm.setField("dept", v)}>
              <option>Operations</option><option>Procurement</option><option>Production</option><option>Logistics</option><option>Sales</option><option>HR</option>
            </FormSelect>
          </FormField>
          <FormField label="Joined year"><FormInput value={empForm.values.since} onChange={(v) => empForm.setField("since", v)} /></FormField>
        </FormGrid>
      </EntityFormModal>
    </>
  );
};

/* ============================================================
   ATTENDANCE
   ============================================================ */
const Attendance = () => {
  const DATA = useDATA();
  const { update, saving, error, clearError } = useEntityMutation();
  const [applyLeave, setApplyLeave] = useState(false);
  const [leaveReason, setLeaveReason] = useState("");

  const submitLeave = async () => {
    const att = DATA.ATTENDANCE_TODAY;
    await update("attendanceToday", "today", {
      leave: (att.leave ?? 0) + 1,
      present: Math.max(0, (att.present ?? 0) - 1),
      lastLeaveNote: leaveReason || "Leave application",
      lastLeaveAt: formatDisplayDate(),
    });
    setApplyLeave(false);
    setLeaveReason("");
  };

  const columns = [
    { title: "Emp ID", dataIndex: "id", key: "id", render: (text) => <span className="mono strong">{text}</span> },
    { title: "Name", dataIndex: "name", key: "name", render: (text, record, i) => (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <AntAvatar style={{ backgroundColor: ["#f56a00", "#7265e6", "#ffbf00", "#00a2ae"][i % 4] }}>{text.charAt(0)}</AntAvatar>
        {text}
      </div>
    )},
    { title: "Department", dataIndex: "dept", key: "dept", render: (text) => <span className="muted">{text}</span> },
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

  const dataSource = DATA.EMPLOYEES.map((e, i) => {
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

      <div className="grid grid-5" style={{ marginBottom: 20 }}>
        <div className="kpi"><div className="kpi-label"><CheckCircleOutlined style={{ marginRight: 6 }} />Present today</div><div className="kpi-value tabular" style={{ color: "var(--success)" }}>{DATA.ATTENDANCE_TODAY.present}</div><div style={{ fontSize: 11, color: "var(--fg-muted)" }}>{Math.round(DATA.ATTENDANCE_TODAY.present / DATA.ATTENDANCE_TODAY.total * 100)}% attendance</div></div>
        <div className="kpi"><div className="kpi-label"><ClockCircleOutlined style={{ marginRight: 6 }} />Late comers</div><div className="kpi-value tabular" style={{ color: "var(--warning)" }}>{DATA.ATTENDANCE_TODAY.late}</div><div style={{ fontSize: 11, color: "var(--fg-muted)" }}>3.9%</div></div>
        <div className="kpi"><div className="kpi-label"><CalendarOutlined style={{ marginRight: 6 }} />On leave</div><div className="kpi-value tabular">{DATA.ATTENDANCE_TODAY.leave}</div><div style={{ fontSize: 11, color: "var(--fg-muted)" }}>11 sick · 7 planned</div></div>
        <div className="kpi"><div className="kpi-label"><CloseCircleOutlined style={{ marginRight: 6 }} />Absent</div><div className="kpi-value tabular" style={{ color: "var(--danger)" }}>{DATA.ATTENDANCE_TODAY.absent}</div><div style={{ fontSize: 11, color: "var(--fg-muted)" }}>Unscheduled</div></div>
        <div className="kpi"><div className="kpi-label"><EnvironmentOutlined style={{ marginRight: 6 }} />On field</div><div className="kpi-value tabular">{DATA.ATTENDANCE_TODAY.onField}</div><div style={{ fontSize: 11, color: "var(--fg-muted)" }}>Sales reps</div></div>
      </div>

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
          <Table dataSource={dataSource} columns={columns} pagination={false} rowKey="id" />
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
  const DATA = useDATA();
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

  const PAYROLL = DATA.EMPLOYEES.map((e, i) => {
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
    { title: "Emp ID", dataIndex: "id", key: "id", render: (text) => <span className="mono strong">{text}</span> },
    { title: "Name", dataIndex: "name", key: "name", render: (text, record, i) => (
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
    { title: "", key: "action", width: 48, render: () => <AntButton type="text" size="small" icon={<EyeOutlined />} aria-label="View payslip" title="View payslip" /> },
  ];

  return (
    <>
      <DashHead title="Payroll & Payslips" sub="Salary sheets, payroll runs, daily-wage register">
        <AntButton size="small" icon={<CalendarOutlined />}>May 2026</AntButton>
        <AntButton size="small" icon={<DownloadOutlined />}>Salary sheet · CSV</AntButton>
        <AntButton type="primary" size="small" icon={<ThunderboltOutlined />} onClick={() => { clearError(); setRunOpen(true); }}>Run payroll</AntButton>
      </DashHead>

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <div className="kpi"><div className="kpi-label"><TeamOutlined style={{ marginRight: 6 }} />Headcount on payroll</div><div className="kpi-value tabular">306</div><div style={{ fontSize: 11, color: "var(--fg-muted)" }}>+ 48 daily wage</div></div>
        <div className="kpi"><div className="kpi-label"><MoneyCollectOutlined style={{ marginRight: 6 }} />Gross payout</div><div className="kpi-value">{fmtINR(total * 1.25)}</div><div style={{ fontSize: 11, color: "var(--fg-muted)" }}>May estimate</div></div>
        <div className="kpi"><div className="kpi-label"><FileTextOutlined style={{ marginRight: 6 }} />Statutory dues</div><div className="kpi-value">{fmtINR(total * 0.2)}</div><div style={{ fontSize: 11, color: "var(--fg-muted)" }}>PF + ESI + TDS</div></div>
        <div className="kpi"><div className="kpi-label"><CheckCircleOutlined style={{ marginRight: 6 }} />Status</div><div className="kpi-value" style={{ color: "var(--warning)", fontSize: 18 }}>Draft</div><div style={{ fontSize: 11, color: "var(--fg-muted)" }}>Run by May 28</div></div>
      </div>

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
          <Table 
            dataSource={PAYROLL} 
            columns={columns} 
            pagination={false} 
            rowKey="id" 
            onRow={(record) => ({ onClick: () => setOpenSlip(record), style: { cursor: "pointer" } })} 
          />
        </div>
      </div>

      <Modal open={!!openSlip} onClose={() => setOpenSlip(null)} title="Payslip" sub={openSlip ? `${openSlip.name} · May 2026` : ""} wide
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
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{openSlip.name}</div>
                <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>{openSlip.id} · {openSlip.role}</div>
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
const Reports = () => {
  const DATA = useDATA();
  const [active, setActive] = useState("profit");

  const reports = [
    { id: "profit",    title: "Profit Analysis",     icon: "chart",    sub: "Revenue, COGS, gross margin by product line" },
    { id: "inventory", title: "Inventory Report",    icon: "box",      sub: "Stock movement, valuation, ABC analysis" },
    { id: "production",title: "Production Report",   icon: "factory",  sub: "Throughput, yield, downtime, defect rate" },
    { id: "dispatch",  title: "Dispatch Report",     icon: "truck",    sub: "On-time delivery, lead time, route P&L" },
    { id: "vendor",    title: "Vendor Purchase",     icon: "users",    sub: "PO volume, spend, rating, payment history" },
    { id: "hr",        title: "HR Report",           icon: "user",     sub: "Attendance, attrition, payroll summary" },
  ];

  return (
    <>
      <DashHead title="Reports" sub="Inventory · Production · Dispatch · Vendor · Profit · HR">
        <Btn size="sm" icon="calendar">May 2026</Btn>
        <Btn size="sm" icon="download">Export PDF</Btn>
        <Btn variant="primary" size="sm" icon="plus">Custom report</Btn>
      </DashHead>

      <div className="grid" style={{ gridTemplateColumns: "260px 1fr", gap: 20 }}>
        <div className="card">
          <div className="card-head"><div className="card-title">All reports</div></div>
          <div style={{ padding: 8 }}>
            {reports.map((r) => (
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

        <div>
          {active === "profit" && <ProfitReport />}
          {active === "inventory" && <InventoryReport />}
          {active === "production" && <ProductionReport />}
          {active === "dispatch" && <DispatchReport />}
          {active === "vendor" && <VendorReport />}
          {active === "hr" && <HRReport />}
        </div>
      </div>
    </>
  );
};

const ReportShell = ({ title, sub, children }) => (
  <div className="card">
    <div className="card-head">
      <div>
        <div className="card-title">{title}</div>
        <div style={{ fontSize: 11, color: "var(--fg-subtle)", marginTop: 2 }}>{sub}</div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <Btn size="sm" icon="filter">Filter</Btn>
        <Btn size="sm" icon="download">Export</Btn>
      </div>
    </div>
    <div className="card-body">{children}</div>
  </div>
);

const ProfitReport = () => (
  <ReportShell title="Profit Analysis · May 2026" sub="Revenue, COGS, gross margin by product line — both companies">
    <div className="grid grid-4" style={{ marginBottom: 20 }}>
      <Kpi icon="money" label="Revenue" value={fmtINR(11_82_00_000)} delta={12.4} spark={[8,9,10,10,11,11,12]} />
      <Kpi icon="layers" label="COGS"    value={fmtINR(7_70_00_000)} delta={9.1}  spark={[5,6,6,6,7,7,8]} sparkColor="var(--danger)" />
      <Kpi icon="chart" label="Gross profit" value={fmtINR(4_12_00_000)} delta={20.5} spark={[2,2,3,3,4,4,4]} sparkColor="var(--success)" />
      <Kpi icon="bolt"  label="Gross margin"  value="34.8" unit="%" delta={2.4} spark={[31,32,33,34,34,34,35]} sparkColor="var(--success)" />
    </div>
    <table className="tbl">
      <thead>
        <tr>
          <th>Product line</th>
          <th style={{ textAlign: "right" }}>Revenue</th>
          <th style={{ textAlign: "right" }}>COGS</th>
          <th style={{ textAlign: "right" }}>GP</th>
          <th style={{ textAlign: "right" }}>GM%</th>
          <th>vs Apr</th>
        </tr>
      </thead>
      <tbody>
        {[
          { name: "Talcum Powder",      r: 3_22_00_000, c: 2_05_00_000, m: 36.3, d: 8.4 },
          { name: "Calcium Carbonate",  r: 2_45_00_000, c: 1_64_00_000, m: 33.1, d: 4.2 },
          { name: "China Clay",         r: 1_96_00_000, c: 1_28_00_000, m: 34.7, d: -1.8 },
          { name: "Dolomite & Quartz",  r: 1_58_00_000, c: 1_18_00_000, m: 25.3, d: 2.4 },
          { name: "Chemicals",          r: 1_32_00_000, c: 87_00_000,   m: 34.1, d: 6.7 },
          { name: "FIBC + PP Woven",    r: 2_87_00_000, c: 1_84_00_000, m: 35.9, d: 14.2 },
          { name: "BOPP & Fabrics",     r: 1_42_00_000, c: 94_00_000,   m: 33.8, d: 4.8 },
        ].map((r) => (
          <tr key={r.name}>
            <td className="strong">{r.name}</td>
            <td className="num">{fmtINR(r.r)}</td>
            <td className="num">{fmtINR(r.c)}</td>
            <td className="num strong">{fmtINR(r.r - r.c)}</td>
            <td className="num">{r.m}%</td>
            <td>
              <span style={{ fontSize: 12, color: r.d >= 0 ? "var(--success)" : "var(--danger)", fontWeight: 500 }}>
                {r.d >= 0 ? "↑" : "↓"} {Math.abs(r.d)}%
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </ReportShell>
);

const InventoryReport = () => {
  const DATA = useDATA();
  return (
  <ReportShell title="Inventory Report · As of May 21" sub="Stock value, ABC analysis, ageing">
    <div className="grid grid-3" style={{ marginBottom: 20 }}>
      <Kpi icon="money" label="Total inventory value" value={fmtINR(2_50_00_000)} delta={4.8} spark={[2.2,2.3,2.3,2.4,2.4,2.5,2.5]} />
      <Kpi icon="loader" label="Inventory turns (annualized)" value="6.2x" delta={0.4} spark={[5.5,5.7,5.9,6.0,6.0,6.1,6.2]} sparkColor="var(--success)" />
      <Kpi icon="alert" label="Slow-moving SKUs" value="3" delta={0} spark={[3,3,3,3,3,3,3]} sparkColor="var(--warning)" />
    </div>
    <table className="tbl">
      <thead>
        <tr><th>SKU</th><th>Material</th><th style={{ textAlign: "right" }}>Stock</th><th style={{ textAlign: "right" }}>Value</th><th>Class</th><th>Movement</th><th>Last 30d</th></tr>
      </thead>
      <tbody>
        {DATA.RAW_MATERIALS.map((r, i) => {
          const cls = i < 3 ? "A" : i < 7 ? "B" : "C";
          const mov = i % 3 === 0 ? "fast" : i % 3 === 1 ? "medium" : "slow";
          return (
            <tr key={r.code}>
              <td className="mono strong">{r.code}</td>
              <td>{r.name}</td>
              <td className="num">{r.stock} {r.unit}</td>
              <td className="num">{fmtINR(r.value)}</td>
              <td><Badge tone={cls === "A" ? "primary" : cls === "B" ? "info" : "default"}>{cls}</Badge></td>
              <td><Badge tone={mov === "fast" ? "success" : mov === "medium" ? "warning" : "default"} dot>{mov}</Badge></td>
              <td style={{ width: 80 }}>
                <Sparkline values={[20+i*3, 22, 18, 24, 28, 26, 30+i*2]} w={70} h={20} color="var(--primary)" />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </ReportShell>
  );
};

const ProductionReport = () => (
  <ReportShell title="Production Report · Last 30 days" sub="Throughput, yield, downtime, defect rate">
    <div className="grid grid-4" style={{ marginBottom: 20 }}>
      <Kpi icon="factory" label="Total output" value="2,420" unit="MT" delta={8.4} spark={[300,310,320,330,340,350,360]} />
      <Kpi icon="bolt"    label="Yield"        value="96.8" unit="%"  delta={1.2} spark={[95,96,96,96,97,97,97]} sparkColor="var(--success)" />
      <Kpi icon="clock"   label="Downtime"     value="42"   unit="hrs" delta={-12} spark={[60,55,50,48,45,42,42]} sparkColor="var(--success)" />
      <Kpi icon="alert"   label="Defect rate"  value="3.8"  unit="ppm" delta={-15} spark={[5,4.5,4.2,4,3.9,3.8,3.8]} sparkColor="var(--success)" />
    </div>
    <div className="grid grid-2">
      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Output by product line (MT)</div>
        <BarChart
          data={[
            { day: "Talc", planned: 540, actual: 562 },
            { day: "CaCO3", planned: 420, actual: 408 },
            { day: "Dolomite", planned: 380, actual: 392 },
            { day: "PCC", planned: 160, actual: 142 },
            { day: "Quartz", planned: 320, actual: 338 },
            { day: "Chemical", planned: 580, actual: 578 },
          ]}
          keys={["planned", "actual"]}
          colors={["var(--border-strong)", "var(--primary)"]}
          h={180}
        />
      </div>
      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Downtime by reason</div>
        {[
          { l: "Changeover",      v: 14, color: "var(--primary)" },
          { l: "Power outage",    v: 9,  color: "var(--secondary)" },
          { l: "Maintenance",     v: 8,  color: "var(--info)" },
          { l: "Material delay",  v: 6,  color: "var(--warning)" },
          { l: "Other",           v: 5,  color: "var(--fg-faint)" },
        ].map((r) => (
          <div key={r.l} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
              <span>{r.l}</span>
              <span className="mono">{r.v} hrs</span>
            </div>
            <div className="bar" style={{ height: 4 }}>
              <span style={{ width: `${(r.v / 14) * 100}%`, background: r.color }}></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </ReportShell>
);

const DispatchReport = () => (
  <ReportShell title="Dispatch Report · May 2026" sub="On-time delivery, lead time, route P&L">
    <div className="grid grid-4" style={{ marginBottom: 20 }}>
      <Kpi icon="truck"  label="Vehicles dispatched" value="218" delta={11} spark={[180,190,200,205,210,215,218]} />
      <Kpi icon="bolt"   label="On-time %" value="94.2" unit="%" delta={1.2} sparkColor="var(--success)" spark={[91,92,93,93,93,94,94]} />
      <Kpi icon="clock"  label="Avg lead time" value="11.4" unit="hrs" delta={-4} sparkColor="var(--success)" spark={[12,12,12,11.5,11.4,11.4,11.4]} />
      <Kpi icon="money"  label="Freight cost / MT" value="₹482" delta={-3.2} sparkColor="var(--success)" spark={[510,500,495,490,488,485,482]} />
    </div>
    <table className="tbl">
      <thead>
        <tr><th>Route</th><th style={{ textAlign: "right" }}>Trips</th><th style={{ textAlign: "right" }}>Vol (MT)</th><th style={{ textAlign: "right" }}>On-time %</th><th style={{ textAlign: "right" }}>Avg lead (hrs)</th><th style={{ textAlign: "right" }}>Freight cost</th></tr>
      </thead>
      <tbody>
        {[
          { r: "Udaipur → Mumbai",     t: 48, v: 1140, ot: 96.0, lt: 10.4, c: 21_45_000 },
          { r: "Udaipur → Pune",       t: 22, v:  528, ot: 95.5, lt: 11.2, c: 11_84_000 },
          { r: "Udaipur → Kolkata",    t: 14, v:  386, ot: 88.4, lt: 28.6, c: 12_40_000 },
          { r: "Ahmedabad → Mumbai",   t: 38, v:  912, ot: 97.4, lt:  8.2, c: 12_84_000 },
          { r: "Ahmedabad → Bhavnagar",t: 41, v:  984, ot: 98.2, lt:  3.4, c:  5_20_000 },
          { r: "Udaipur → Gotan",      t: 12, v:  324, ot: 95.0, lt:  4.8, c:  2_60_000 },
        ].map((r) => (
          <tr key={r.r}>
            <td className="strong">{r.r}</td>
            <td className="num">{r.t}</td>
            <td className="num">{r.v}</td>
            <td className="num" style={{ color: r.ot >= 95 ? "var(--success)" : "var(--warning)", fontWeight: 500 }}>{r.ot}%</td>
            <td className="num">{r.lt}</td>
            <td className="num">{fmtINR(r.c)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </ReportShell>
);

const VendorReport = () => {
  const DATA = useDATA();
  return (
  <ReportShell title="Vendor Purchase Report" sub="PO volume, spend, rating, payment history">
    <table className="tbl">
      <thead>
        <tr><th>Vendor</th><th>Category</th><th>POs MTD</th><th style={{ textAlign: "right" }}>Spend MTD</th><th style={{ textAlign: "right" }}>YTD</th><th>Rating</th><th>Payment SLA</th></tr>
      </thead>
      <tbody>
        {DATA.VENDORS.map((v, i) => (
          <tr key={v.id}>
            <td>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar name={v.name} color={(i % 5) + 1} />
                <div><div className="strong">{v.name}</div><div className="subtle" style={{ fontSize: 11 }}>{v.city}</div></div>
              </div>
            </td>
            <td><Badge tone={v.category === "Raw Material" ? "primary" : v.category === "Chemical" ? "info" : v.category === "Packaging" ? "gold" : "default"}>{v.category}</Badge></td>
            <td className="num">{Math.round(v.poCount / 6)}</td>
            <td className="num">{fmtINR(Math.round(v.ytd / 6))}</td>
            <td className="num">{fmtINR(v.ytd)}</td>
            <td><span style={{ color: "var(--secondary)" }}>★</span> <span className="mono strong">{v.rating}</span></td>
            <td><Badge tone={v.rating >= 4.5 ? "success" : "warning"} dot>{v.rating >= 4.5 ? "On time" : "Avg 4d late"}</Badge></td>
          </tr>
        ))}
      </tbody>
    </table>
  </ReportShell>
  );
};

const HRReport = () => (
  <ReportShell title="HR Report · May 2026" sub="Attendance, attrition, training, payroll summary">
    <div className="grid grid-4" style={{ marginBottom: 20 }}>
      <Kpi icon="users" label="Headcount" value="306" delta={1.3} spark={[298,300,301,303,304,305,306]} sparkColor="var(--primary)" />
      <Kpi icon="check" label="Avg attendance" value="92.4" unit="%" delta={1.2} spark={[90,91,91,92,92,92,92]} sparkColor="var(--success)" />
      <Kpi icon="logout" label="Attrition (YTD)" value="2.8" unit="%" delta={-0.4} spark={[3.2,3.1,3.0,3.0,2.9,2.8,2.8]} sparkColor="var(--success)" />
      <Kpi icon="badge" label="Avg tenure" value="4.2" unit="yrs" delta={0.2} spark={[4.0,4.0,4.1,4.1,4.2,4.2,4.2]} sparkColor="var(--success)" />
    </div>
    <table className="tbl">
      <thead>
        <tr><th>Department</th><th style={{ textAlign: "right" }}>Headcount</th><th style={{ textAlign: "right" }}>Attendance %</th><th style={{ textAlign: "right" }}>Avg tenure</th><th style={{ textAlign: "right" }}>Payroll MTD</th></tr>
      </thead>
      <tbody>
        {[
          { d: "Production", h: 142, a: 91.2, t: 5.1, p: 84_00_000 },
          { d: "Procurement", h: 14, a: 95.4, t: 4.8, p: 12_00_000 },
          { d: "Logistics", h: 38, a: 89.6, t: 3.4, p: 22_00_000 },
          { d: "Sales", h: 24, a: 94.8, t: 2.8, p: 18_00_000 },
          { d: "Operations", h: 18, a: 96.2, t: 6.2, p: 24_00_000 },
          { d: "HR", h: 8, a: 97.4, t: 4.6, p: 8_40_000 },
          { d: "Accounts", h: 12, a: 96.0, t: 5.8, p: 11_80_000 },
          { d: "QC & Lab", h: 22, a: 93.2, t: 3.9, p: 14_60_000 },
          { d: "Daily wage", h: 28, a: 88.4, t: 1.2, p: 7_80_000 },
        ].map((r) => (
          <tr key={r.d}>
            <td className="strong">{r.d}</td>
            <td className="num">{r.h}</td>
            <td className="num" style={{ color: r.a >= 95 ? "var(--success)" : r.a >= 90 ? "var(--fg-muted)" : "var(--warning)" }}>{r.a}%</td>
            <td className="num">{r.t} yrs</td>
            <td className="num">{fmtINR(r.p)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </ReportShell>
);

/* ============================================================
   PACKAGING INVENTORY (with bag auto-calc)
   ============================================================ */
const PackagingInventory = () => {
  const DATA = useDATA();
  const { append, update, saving, error, clearError } = useEntityMutation();
  const [calcOpen, setCalcOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [orderQty, setOrderQty] = useState(24);
  const [bagSize, setBagSize] = useState(1000);
  const bagsNeeded = Math.ceil(orderQty * 1000 / bagSize);
  const packForm = useFormState({ name: "", code: nextPackagingCode(DATA.PACKAGING), stock: "0", reorder: "1500", unit: "pcs" });

  const savePackaging = async () => {
    const err = requireFields(packForm.values, ["name"]);
    if (err) throw new Error(err);
    const stock = parseInt(packForm.values.stock, 10) || 0;
    await append("packaging", {
      code: packForm.values.code || nextPackagingCode(DATA.PACKAGING),
      name: packForm.values.name.trim(),
      stock,
      unit: packForm.values.unit,
      reorder: parseInt(packForm.values.reorder, 10) || 1500,
      status: stock <= parseInt(packForm.values.reorder, 10) ? "low" : "ok",
      trend: 0,
    });
    setAddOpen(false);
  };

  const generateStockRequest = async () => {
    const codeMap = { 1000: "PK-FIBC-25", 500: "PK-FIBC-12", 50: "PK-PPW-50", 25: "PK-PPW-25", 20: "PK-BOPP-20" };
    const code = codeMap[bagSize];
    const p = DATA.PACKAGING.find((x) => x.code === code);
    if (p && p.stock < bagsNeeded) {
      await update("packaging", code, { status: "low" }, "code");
    }
    setCalcOpen(false);
  };

  return (
    <>
      <DashHead title="Packaging Inventory" sub="FIBC, PP woven, BOPP — stock, bag auto-calc, alerts">
        <Btn size="sm" icon="bolt" onClick={() => setCalcOpen(true)}>Bag calc</Btn>
        <Btn size="sm" icon="download">Export</Btn>
        <Btn variant="primary" size="sm" icon="plus" onClick={() => { clearError(); setAddOpen(true); }}>Add packaging</Btn>
      </DashHead>

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <div className="kpi"><div className="kpi-label"><Icon name="package" size={13} className="ico" />Total SKUs</div><div className="kpi-value tabular">{DATA.PACKAGING.length}</div><div style={{ fontSize: 11, color: "var(--fg-muted)" }}>4 bag · 2 fabric</div></div>
        <div className="kpi"><div className="kpi-label"><Icon name="bag" size={13} className="ico" />Total bags in stock</div><div className="kpi-value tabular">39,820</div><div style={{ fontSize: 11, color: "var(--success)" }}>+4.2% this week</div></div>
        <div className="kpi"><div className="kpi-label"><Icon name="alert" size={13} className="ico" />Low stock SKUs</div><div className="kpi-value" style={{ color: "var(--warning)" }}>{DATA.PACKAGING.filter(p => p.status === "low").length}</div><div style={{ fontSize: 11, color: "var(--fg-muted)" }}>Reorder needed</div></div>
        <div className="kpi"><div className="kpi-label"><Icon name="bolt" size={13} className="ico" />Coverage (days)</div><div className="kpi-value tabular">21</div><div style={{ fontSize: 11, color: "var(--fg-muted)" }}>At current run rate</div></div>
      </div>

      <div className="card">
        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center" }}>
          <div className="tabs" style={{ border: "none", marginBottom: -1 }}>
            <span className="tab active">All <span className="tab-count">{DATA.PACKAGING.length}</span></span>
            <span className="tab">FIBC <span className="tab-count">2</span></span>
            <span className="tab">PP Woven <span className="tab-count">2</span></span>
            <span className="tab">BOPP & Fabric <span className="tab-count">2</span></span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <input className="input" placeholder="Search packaging…" style={{ height: 30, width: 220 }} />
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr><th>SKU</th><th>Description</th><th style={{ textAlign: "right" }}>Stock</th><th>Reorder at</th><th>Coverage</th><th>Trend</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {DATA.PACKAGING.map((p) => {
                const tone = p.status === "low" ? "warning" : "success";
                const cov = Math.round((p.stock / p.reorder) * 7);
                return (
                  <tr key={p.code}>
                    <td className="mono strong">{p.code}</td>
                    <td className="strong">{p.name}</td>
                    <td style={{ textAlign: "right" }}>
                      <span className="mono strong">{fmtNum(p.stock)}</span> <span className="subtle" style={{ fontSize: 11 }}>{p.unit}</span>
                    </td>
                    <td className="mono subtle">{fmtNum(p.reorder)} {p.unit}</td>
                    <td style={{ width: 110 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Bar value={Math.min(100, (p.stock / (p.reorder * 3)) * 100)} tone={tone} />
                        <span className="mono" style={{ fontSize: 11, width: 36, textAlign: "right" }}>{cov}d</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: p.trend > 0 ? "var(--success)" : "var(--danger)", fontWeight: 500 }}>
                        {p.trend > 0 ? "↑" : "↓"} {Math.abs(p.trend)}%
                      </span>
                    </td>
                    <td><StatusBadge status={p.status} /></td>
                    <td><div style={{ display: "flex", gap: 4 }}>
                      <Btn variant="ghost" size="sm">Adjust</Btn>
                      <button className="tb-iconbtn"><Icon name="moreV" size={14} /></button>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={calcOpen} onClose={() => setCalcOpen(false)} title="Bag auto-calculator" sub="Compute packaging requirement from order quantity" wide
        footer={<><Btn variant="ghost" onClick={() => setCalcOpen(false)}>Close</Btn><Btn variant="primary" onClick={generateStockRequest} disabled={saving}>Generate stock request</Btn></>}>
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
        {DATA.PACKAGING.filter(p => {
          if (bagSize === 1000) return p.code === "PK-FIBC-25";
          if (bagSize === 500)  return p.code === "PK-FIBC-12";
          if (bagSize === 50)   return p.code === "PK-PPW-50";
          if (bagSize === 25)   return p.code === "PK-PPW-25";
          if (bagSize === 20)   return p.code === "PK-BOPP-20";
          return false;
        }).map((p) => {
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

      <EntityFormModal open={addOpen} onClose={() => setAddOpen(false)} title="Add packaging SKU" sub="Register a new packaging item" wide submitLabel="Save packaging" saving={saving} error={error} onSubmit={savePackaging}>
        <FormGrid>
          <FormField label="SKU code"><FormInput value={packForm.values.code} onChange={(v) => packForm.setField("code", v)} /></FormField>
          <FormField label="Description"><FormInput value={packForm.values.name} onChange={(v) => packForm.setField("name", v)} /></FormField>
          <FormField label="Opening stock"><FormInput value={packForm.values.stock} onChange={(v) => packForm.setField("stock", v)} /></FormField>
          <FormField label="Reorder at"><FormInput value={packForm.values.reorder} onChange={(v) => packForm.setField("reorder", v)} /></FormField>
        </FormGrid>
      </EntityFormModal>
    </>
  );
};

export { Employees, Attendance, Payroll, Reports, PackagingInventory };
