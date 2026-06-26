// @ts-nocheck
'use client';


import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./icons";
import { useDATA } from "./data";
import { Btn, Badge, StatusBadge, Avatar, Bar, Sparkline, Kpi, Modal, fmtINR, fmtINRFull, fmtNum, AreaChart, BarChart, Donut } from "./ui";
import { EntityFormModal, FormField, FormGrid, FormInput, FormSelect, useFormState, requireFields } from "@/components/forms";
import { useEntityMutation } from "@/hooks/use-entity-mutation";
import { nextEmployeeId, formatDisplayDate } from "@/lib/id-generators";
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
import { ErpViewAction } from "@/components/common/TableActionIcons";
import StatCard, { ErpStatGrid } from "@/components/common/StatCard";


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
    { title: "Actions", key: "action", width: 72, align: "center", render: () => <ErpViewAction /> },
  ];

  return (
    <>
      <DashHead title="Employees" sub="HR master across both companies">
        <AntButton size="small" icon={<ExportOutlined />}>Import</AntButton>
        <AntButton type="primary" size="small" icon={<UserAddOutlined />} onClick={() => setOpen(true)}>Add employee</AntButton>
      </DashHead>

      <ErpStatGrid cols={4}>
        <StatCard
          icon={TeamOutlined}
          label="Total headcount"
          value={DATA.EMPLOYEES.length}
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
          <CommonTable {...ERP_TABLE_PROPS} dataSource={DATA.EMPLOYEES} columns={columns} rowKey="id" />
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

      <ErpStatGrid cols={5}>
        <StatCard
          icon={CheckCircleOutlined}
          label="Present today"
          value={DATA.ATTENDANCE_TODAY.present}
          hint={`${Math.round(DATA.ATTENDANCE_TODAY.present / DATA.ATTENDANCE_TODAY.total * 100)}% attendance`}
          hintTone="positive"
        />
        <StatCard
          icon={ClockCircleOutlined}
          label="Late comers"
          value={DATA.ATTENDANCE_TODAY.late}
          hint="3.9%"
          hintTone="warning"
        />
        <StatCard
          icon={CalendarOutlined}
          label="On leave"
          value={DATA.ATTENDANCE_TODAY.leave}
          hint="11 sick · 7 planned"
        />
        <StatCard
          icon={CloseCircleOutlined}
          label="Absent"
          value={DATA.ATTENDANCE_TODAY.absent}
          hint="Unscheduled"
          hintTone="negative"
        />
        <StatCard
          icon={EnvironmentOutlined}
          label="On field"
          value={DATA.ATTENDANCE_TODAY.onField}
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
            rowKey="id"
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

const ProfitReport = () => {
  const profitRows = [
    { name: "Talcum Powder", r: 3_22_00_000, c: 2_05_00_000, m: 36.3, d: 8.4 },
    { name: "Calcium Carbonate", r: 2_45_00_000, c: 1_64_00_000, m: 33.1, d: 4.2 },
    { name: "China Clay", r: 1_96_00_000, c: 1_28_00_000, m: 34.7, d: -1.8 },
    { name: "Dolomite & Quartz", r: 1_58_00_000, c: 1_18_00_000, m: 25.3, d: 2.4 },
    { name: "Chemicals", r: 1_32_00_000, c: 87_00_000, m: 34.1, d: 6.7 },
    { name: "FIBC + PP Woven", r: 2_87_00_000, c: 1_84_00_000, m: 35.9, d: 14.2 },
    { name: "BOPP & Fabrics", r: 1_42_00_000, c: 94_00_000, m: 33.8, d: 4.8 },
  ];
  const profitColumns = [
    {
      title: "Product line",
      dataIndex: "name",
      key: "name",
      render: (name) => <span className="strong">{name}</span>,
    },
    {
      title: "Revenue",
      dataIndex: "r",
      key: "revenue",
      align: "right",
      render: (r) => <span className="num">{fmtINR(r)}</span>,
    },
    {
      title: "COGS",
      dataIndex: "c",
      key: "cogs",
      align: "right",
      render: (c) => <span className="num">{fmtINR(c)}</span>,
    },
    {
      title: "GP",
      key: "gp",
      align: "right",
      render: (_, r) => <span className="num strong">{fmtINR(r.r - r.c)}</span>,
    },
    {
      title: "GM%",
      dataIndex: "m",
      key: "gm",
      align: "right",
      render: (m) => <span className="num">{m}%</span>,
    },
    {
      title: "vs Apr",
      dataIndex: "d",
      key: "vsApr",
      render: (d) => (
        <span style={{ fontSize: 12, color: d >= 0 ? "var(--success)" : "var(--danger)", fontWeight: 500 }}>
          {d >= 0 ? "↑" : "↓"} {Math.abs(d)}%
        </span>
      ),
    },
  ];

  return (
    <ReportShell title="Profit Analysis · May 2026" sub="Revenue, COGS, gross margin by product line — both companies">
      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <Kpi icon="money" label="Revenue" value={fmtINR(11_82_00_000)} delta={12.4} spark={[8, 9, 10, 10, 11, 11, 12]} />
        <Kpi icon="layers" label="COGS" value={fmtINR(7_70_00_000)} delta={9.1} spark={[5, 6, 6, 6, 7, 7, 8]} sparkColor="var(--danger)" />
        <Kpi icon="chart" label="Gross profit" value={fmtINR(4_12_00_000)} delta={20.5} spark={[2, 2, 3, 3, 4, 4, 4]} sparkColor="var(--success)" />
        <Kpi icon="bolt" label="Gross margin" value="34.8" unit="%" delta={2.4} spark={[31, 32, 33, 34, 34, 34, 35]} sparkColor="var(--success)" />
      </div>
      <CommonTable
        {...ERP_TABLE_PROPS}
        columns={profitColumns}
        dataSource={profitRows}
        rowKey="name"
      />
    </ReportShell>
  );
};

const InventoryReport = () => {
  const DATA = useDATA();
  const inventoryRows = DATA.RAW_MATERIALS.map((r, i) => ({
    ...r,
    classCode: i < 3 ? "A" : i < 7 ? "B" : "C",
    movementCode: i % 3 === 0 ? "fast" : i % 3 === 1 ? "medium" : "slow",
  }));
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
      render: (_, r) => <span className="num">{r.stock} {r.unit}</span>,
    },
    {
      title: "Value",
      dataIndex: "value",
      key: "value",
      align: "right",
      render: (value) => <span className="num">{fmtINR(value)}</span>,
    },
    {
      title: "Class",
      dataIndex: "classCode",
      key: "classCode",
      render: (classCode) => <Badge tone={classCode === "A" ? "primary" : classCode === "B" ? "info" : "default"}>{classCode}</Badge>,
    },
    {
      title: "Movement",
      dataIndex: "movementCode",
      key: "movementCode",
      render: (movementCode) => <Badge tone={movementCode === "fast" ? "success" : movementCode === "medium" ? "warning" : "default"} dot>{movementCode}</Badge>,
    },
    {
      title: "Last 30d",
      key: "last30d",
      width: 90,
      render: (_, __, i) => (
        <Sparkline values={[20 + i * 3, 22, 18, 24, 28, 26, 30 + i * 2]} w={70} h={20} color="var(--primary)" />
      ),
    },
  ];
  return (
  <ReportShell title="Inventory Report · As of May 21" sub="Stock value, ABC analysis, ageing">
    <div className="grid grid-3" style={{ marginBottom: 20 }}>
      <Kpi icon="money" label="Total inventory value" value={fmtINR(2_50_00_000)} delta={4.8} spark={[2.2,2.3,2.3,2.4,2.4,2.5,2.5]} />
      <Kpi icon="loader" label="Inventory turns (annualized)" value="6.2x" delta={0.4} spark={[5.5,5.7,5.9,6.0,6.0,6.1,6.2]} sparkColor="var(--success)" />
      <Kpi icon="alert" label="Slow-moving SKUs" value="3" delta={0} spark={[3,3,3,3,3,3,3]} sparkColor="var(--warning)" />
    </div>
    <CommonTable
      {...ERP_TABLE_PROPS}
      columns={inventoryColumns}
      dataSource={inventoryRows}
      rowKey="code"
    />
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

const DispatchReport = () => {
  const dispatchRows = [
    { route: "Udaipur → Mumbai", trips: 48, volume: 1140, onTime: 96.0, leadTime: 10.4, freightCost: 21_45_000 },
    { route: "Udaipur → Pune", trips: 22, volume: 528, onTime: 95.5, leadTime: 11.2, freightCost: 11_84_000 },
    { route: "Udaipur → Kolkata", trips: 14, volume: 386, onTime: 88.4, leadTime: 28.6, freightCost: 12_40_000 },
    { route: "Ahmedabad → Mumbai", trips: 38, volume: 912, onTime: 97.4, leadTime: 8.2, freightCost: 12_84_000 },
    { route: "Ahmedabad → Bhavnagar", trips: 41, volume: 984, onTime: 98.2, leadTime: 3.4, freightCost: 5_20_000 },
    { route: "Udaipur → Gotan", trips: 12, volume: 324, onTime: 95.0, leadTime: 4.8, freightCost: 2_60_000 },
  ];
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
      render: (trips) => <span className="num">{trips}</span>,
    },
    {
      title: "Vol (MT)",
      dataIndex: "volume",
      key: "volume",
      align: "right",
      render: (volume) => <span className="num">{volume}</span>,
    },
    {
      title: "On-time %",
      dataIndex: "onTime",
      key: "onTime",
      align: "right",
      render: (onTime) => <span className="num" style={{ color: onTime >= 95 ? "var(--success)" : "var(--warning)", fontWeight: 500 }}>{onTime}%</span>,
    },
    {
      title: "Avg lead (hrs)",
      dataIndex: "leadTime",
      key: "leadTime",
      align: "right",
      render: (leadTime) => <span className="num">{leadTime}</span>,
    },
    {
      title: "Freight cost",
      dataIndex: "freightCost",
      key: "freightCost",
      align: "right",
      render: (freightCost) => <span className="num">{fmtINR(freightCost)}</span>,
    },
  ];

  return (
    <ReportShell title="Dispatch Report · May 2026" sub="On-time delivery, lead time, route P&L">
      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <Kpi icon="truck" label="Vehicles dispatched" value="218" delta={11} spark={[180, 190, 200, 205, 210, 215, 218]} />
        <Kpi icon="bolt" label="On-time %" value="94.2" unit="%" delta={1.2} sparkColor="var(--success)" spark={[91, 92, 93, 93, 93, 94, 94]} />
        <Kpi icon="clock" label="Avg lead time" value="11.4" unit="hrs" delta={-4} sparkColor="var(--success)" spark={[12, 12, 12, 11.5, 11.4, 11.4, 11.4]} />
        <Kpi icon="money" label="Freight cost / MT" value="₹482" delta={-3.2} sparkColor="var(--success)" spark={[510, 500, 495, 490, 488, 485, 482]} />
      </div>
      <CommonTable
        {...ERP_TABLE_PROPS}
        columns={dispatchColumns}
        dataSource={dispatchRows}
        rowKey="route"
      />
    </ReportShell>
  );
};

const VendorReport = () => {
  const DATA = useDATA();
  const vendorRows = DATA.VENDORS.map((v, i) => ({
    ...v,
    rowIndex: i,
    poMtd: Math.round(v.poCount / 6),
    spendMtd: Math.round(v.ytd / 6),
  }));
  const vendorColumns = [
    {
      title: "Vendor",
      dataIndex: "name",
      key: "vendor",
      render: (_, v) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar name={v.name} color={(v.rowIndex % 5) + 1} />
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
      render: (poMtd) => <span className="num">{poMtd}</span>,
    },
    {
      title: "Spend MTD",
      dataIndex: "spendMtd",
      key: "spendMtd",
      align: "right",
      render: (spendMtd) => <span className="num">{fmtINR(spendMtd)}</span>,
    },
    {
      title: "YTD",
      dataIndex: "ytd",
      key: "ytd",
      align: "right",
      render: (ytd) => <span className="num">{fmtINR(ytd)}</span>,
    },
    {
      title: "Rating",
      dataIndex: "rating",
      key: "rating",
      render: (rating) => <><span style={{ color: "var(--secondary)" }}>★</span> <span className="mono strong">{rating}</span></>,
    },
    {
      title: "Payment SLA",
      dataIndex: "rating",
      key: "paymentSla",
      render: (rating) => <Badge tone={rating >= 4.5 ? "success" : "warning"} dot>{rating >= 4.5 ? "On time" : "Avg 4d late"}</Badge>,
    },
  ];
  return (
  <ReportShell title="Vendor Purchase Report" sub="PO volume, spend, rating, payment history">
    <CommonTable
      {...ERP_TABLE_PROPS}
      columns={vendorColumns}
      dataSource={vendorRows}
      rowKey="id"
    />
  </ReportShell>
  );
};

const HRReport = () => {
  const hrRows = [
    { d: "Production", h: 142, a: 91.2, t: 5.1, p: 84_00_000 },
    { d: "Procurement", h: 14, a: 95.4, t: 4.8, p: 12_00_000 },
    { d: "Logistics", h: 38, a: 89.6, t: 3.4, p: 22_00_000 },
    { d: "Sales", h: 24, a: 94.8, t: 2.8, p: 18_00_000 },
    { d: "Operations", h: 18, a: 96.2, t: 6.2, p: 24_00_000 },
    { d: "HR", h: 8, a: 97.4, t: 4.6, p: 8_40_000 },
    { d: "Accounts", h: 12, a: 96.0, t: 5.8, p: 11_80_000 },
    { d: "QC & Lab", h: 22, a: 93.2, t: 3.9, p: 14_60_000 },
    { d: "Daily wage", h: 28, a: 88.4, t: 1.2, p: 7_80_000 },
  ];
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
      render: (a) => <span className="num" style={{ color: a >= 95 ? "var(--success)" : a >= 90 ? "var(--fg-muted)" : "var(--warning)" }}>{a}%</span>,
    },
    {
      title: "Avg tenure",
      dataIndex: "t",
      key: "avgTenure",
      align: "right",
      render: (t) => <span className="num">{t} yrs</span>,
    },
    {
      title: "Payroll MTD",
      dataIndex: "p",
      key: "payrollMtd",
      align: "right",
      render: (p) => <span className="num">{fmtINR(p)}</span>,
    },
  ];

  return (
    <ReportShell title="HR Report · May 2026" sub="Attendance, attrition, training, payroll summary">
      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <Kpi icon="users" label="Headcount" value="306" delta={1.3} spark={[298, 300, 301, 303, 304, 305, 306]} sparkColor="var(--primary)" />
        <Kpi icon="check" label="Avg attendance" value="92.4" unit="%" delta={1.2} spark={[90, 91, 91, 92, 92, 92, 92]} sparkColor="var(--success)" />
        <Kpi icon="logout" label="Attrition (YTD)" value="2.8" unit="%" delta={-0.4} spark={[3.2, 3.1, 3.0, 3.0, 2.9, 2.8, 2.8]} sparkColor="var(--success)" />
        <Kpi icon="badge" label="Avg tenure" value="4.2" unit="yrs" delta={0.2} spark={[4.0, 4.0, 4.1, 4.1, 4.2, 4.2, 4.2]} sparkColor="var(--success)" />
      </div>
      <CommonTable
        {...ERP_TABLE_PROPS}
        columns={hrColumns}
        dataSource={hrRows}
        rowKey="d"
      />
    </ReportShell>
  );
};

/* ============================================================
   PACKAGING INVENTORY (with bag auto-calc)
   ============================================================ */
const PackagingInventory = () => {
  const router = useRouter();
  const DATA = useDATA();
  const { update, saving, error, clearError } = useEntityMutation();
  const [calcOpen, setCalcOpen] = useState(false);
  const [orderQty, setOrderQty] = useState(24);
  const [bagSize, setBagSize] = useState(1000);
  const bagsNeeded = Math.ceil(orderQty * 1000 / bagSize);
  const generateStockRequest = async () => {
    const codeMap = { 1000: "PK-FIBC-25", 500: "PK-FIBC-12", 50: "PK-PPW-50", 25: "PK-PPW-25", 20: "PK-BOPP-20" };
    const code = codeMap[bagSize];
    const p = DATA.PACKAGING.find((x) => x.code === code);
    if (p && p.stock < bagsNeeded) {
      await update("packaging", code, { status: "low" }, "code");
    }
    setCalcOpen(false);
  };

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
      {
        title: "Trend",
        dataIndex: "trend",
        key: "trend",
        render: (trend) => (
          <span style={{ fontSize: 12, color: trend > 0 ? "var(--success)" : "var(--danger)", fontWeight: 500 }}>
            {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
        ),
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (status) => inventoryStatusBadge(status),
      },
      {
        title: "Actions",
        key: "actions",
        width: 110,
        align: "center",
        render: () => (
          <div style={{ display: "flex", gap: 4, alignItems: "center", justifyContent: "center" }}>
            <AntButton type="link" size="small">Adjust</AntButton>
            <AntButton type="text" size="small" icon={<MoreOutlined />} aria-label="More actions" />
          </div>
        ),
      },
    ],
    []
  );

  return (
    <>
      <DashHead title="Packaging Inventory" sub="FIBC, PP woven, BOPP — stock, bag auto-calc, alerts">
        <Btn size="sm" icon="bolt" onClick={() => setCalcOpen(true)}>Bag calc</Btn>
        <Btn size="sm" icon="download">Export</Btn>
        <Btn variant="primary" size="sm" icon="plus" onClick={() => { clearError(); router.push("/inventory/packaging/add"); }}>Add packaging</Btn>
      </DashHead>

      <ErpStatGrid cols={4}>
        <StatCard
          icon={AppstoreOutlined}
          label="Total SKUs"
          value={DATA.PACKAGING.length}
          hint="4 bag · 2 fabric"
        />
        <StatCard
          icon={ShoppingOutlined}
          label="Total bags in stock"
          value="39,820"
          hint="+4.2% this week"
          hintTone="positive"
        />
        <StatCard
          icon={AlertOutlined}
          label="Low stock SKUs"
          value={DATA.PACKAGING.filter((p) => p.status === "low").length}
          hint="Reorder needed"
          hintTone="warning"
        />
        <StatCard
          icon={ThunderboltOutlined}
          label="Coverage (days)"
          value={21}
          hint="At current run rate"
        />
      </ErpStatGrid>

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
        <div style={{ padding: 16 }}>
          <CommonTable
            {...ERP_TABLE_PROPS}
            columns={columns}
            dataSource={DATA.PACKAGING}
            rowKey="code"
          />
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
    </>
  );
};

export { Employees, Attendance, Payroll, Reports, PackagingInventory };
