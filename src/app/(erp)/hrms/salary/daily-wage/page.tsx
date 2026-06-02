"use client";

import { useMemo, useState } from "react";
import { Table, Button, Select, Tag, message } from "antd";
import {
  FilterOutlined,
  DownloadOutlined,
  LockOutlined,
  TeamOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  DollarOutlined,
} from "@ant-design/icons";

import RepHeader from "@/components/hrms/RepHeader";
import ReportSection from "@/components/hrms/ReportSection";
import StatCard from "@/components/common/StatCard";
import {
  getDailyWageWorkers,
  filterWorkers,
  getDailyWageKpi,
  getTradeSummary,
  getDisbursementSummary,
  getContractorSplit,
  calcWorkerPay,
  getSampleWorker,
  formatInr,
  formatLakhs,
  PAY_PERIODS,
  PAY_FREQUENCIES,
  UNITS,
  SKILL_FILTERS,
  CONTRACTORS,
  DISBURSEMENT_FILTERS,
} from "@/lib/daily-wage-dummy";

function skillTagClass(skill: string) {
  if (skill === "Skilled") return "daily-wage-skill-tag--skilled";
  if (skill === "Semi") return "daily-wage-skill-tag--semi";
  return "daily-wage-skill-tag--unskilled";
}

export default function DailyWagePayrollPage() {
  const allWorkers = useMemo(() => getDailyWageWorkers(), []);

  const [payPeriod, setPayPeriod] = useState("2025-03");
  const [payFrequency, setPayFrequency] = useState("Monthly");
  const [unit, setUnit] = useState("All");
  const [skill, setSkill] = useState("All");
  const [contractor, setContractor] = useState("All");
  const [disbursement, setDisbursement] = useState("All");

  const workers = useMemo(
    () => filterWorkers(allWorkers, { unit, skill, contractor, disbursement }),
    [allWorkers, unit, skill, contractor, disbursement]
  );

  const kpi = useMemo(() => getDailyWageKpi(workers), [workers]);
  const tradeRows = useMemo(() => getTradeSummary(workers), [workers]);
  const disbursementRows = useMemo(
    () => getDisbursementSummary(workers),
    [workers]
  );
  const contractorSplit = useMemo(() => getContractorSplit(workers), [workers]);
  const sample = useMemo(() => getSampleWorker(workers), [workers]);
  const samplePay = sample ? calcWorkerPay(sample) : null;

  const periodLabel =
    PAY_PERIODS.find((p) => p.value === payPeriod)?.label ?? payPeriod;

  const tableData = useMemo(
    () => workers.map((w) => ({ ...w, ...calcWorkerPay(w), key: w.id })),
    [workers]
  );

  const totals = useMemo(() => {
    let days = 0, wages = 0, otHrs = 0, otAmt = 0, gross = 0, ded = 0, net = 0;
    for (const r of tableData) {
      days += r.days; wages += r.wages; otHrs += r.otHours;
      otAmt += r.otAmount; gross += r.gross; ded += r.deductions; net += r.net;
    }
    return { days, wages, otHrs, otAmt, gross, ded, net };
  }, [tableData]);

  const columns = [
    {
      title: "Code", dataIndex: "code", key: "code", width: 100,
      render: (v: string) => <span className="font-mono text-[12px] font-semibold">{v}</span>,
    },
    {
      title: "Name", dataIndex: "name", key: "name", width: 180,
      render: (v: string) => <span className="font-semibold">{v}</span>,
    },
    {
      title: "Skill", dataIndex: "skill", key: "skill", width: 90,
      render: (v: string) => (
        <Tag className={skillTagClass(v)} style={{ borderRadius: 20, fontWeight: 600 }}>{v}</Tag>
      ),
    },
    { title: "Trade", dataIndex: "trade", key: "trade", width: 90 },
    { title: "Contractor", dataIndex: "contractor", key: "contractor", width: 150, ellipsis: true },
    {
      title: "Daily rate", dataIndex: "dailyRate", key: "rate", width: 110, align: "right" as const,
      render: (v: number) => formatInr(v),
    },
    { title: "Days", dataIndex: "days", key: "days", width: 60, align: "center" as const },
    {
      title: "Wages", dataIndex: "wages", key: "wages", width: 100, align: "right" as const,
      render: (v: number) => formatInr(v),
    },
    { title: "OT hrs", dataIndex: "otHours", key: "otHrs", width: 70, align: "center" as const },
    {
      title: "OT amount", dataIndex: "otAmount", key: "otAmt", width: 100, align: "right" as const,
      render: (v: number) => formatInr(v),
    },
    {
      title: "Gross", dataIndex: "gross", key: "gross", width: 100, align: "right" as const,
      render: (v: number) => <span className="font-semibold">{formatInr(v)}</span>,
    },
    {
      title: "Deductions", dataIndex: "deductions", key: "ded", width: 110, align: "right" as const,
      render: (v: number) => <span className="text-rose-600">{formatInr(v)}</span>,
    },
    {
      title: "Net pay", dataIndex: "net", key: "net", width: 110, align: "right" as const,
      render: (v: number) => <span className="font-extrabold">{formatInr(v)}</span>,
    },
    { title: "Mode", dataIndex: "mode", key: "mode", width: 70 },
    {
      title: "Status", dataIndex: "status", key: "status", width: 100,
      render: (v: string) => (
        <Tag color={v === "Approved" ? "green" : "orange"} style={{ borderRadius: 20, border: 0, fontWeight: 600 }}>
          {v}
        </Tag>
      ),
    },
  ];

  return (
    <div className="attendance-reports-page daily-wage-page">
      <RepHeader
        title="Daily Wage Payroll"
        subtitle="Wage labour register — daily rate × days worked + overtime, separate from monthly CTC"
        backHref="/hrms/salary"
        backLabel="Salary hub"
        actions={
          <>
            <Button icon={<DownloadOutlined />} onClick={() => message.info("Export Excel — preview")}>
              Export
            </Button>
            <Button
              type="primary"
              icon={<LockOutlined />}
              style={{ background: "#059669", borderColor: "#059669" }}
              onClick={() => message.success("Payroll generated & locked (preview)")}
            >
              Generate &amp; lock
            </Button>
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
              <span className="arf-label">Pay Period</span>
              <Select
                className="w-full"
                value={payPeriod}
                onChange={setPayPeriod}
                options={PAY_PERIODS.map((p) => ({ value: p.value, label: p.label }))}
              />
            </div>
            <div className="arf-item">
              <span className="arf-label">Pay Frequency</span>
              <Select
                className="w-full"
                value={payFrequency}
                onChange={setPayFrequency}
                options={PAY_FREQUENCIES.map((f) => ({ value: f, label: f }))}
              />
            </div>
            <div className="arf-item">
              <span className="arf-label">Unit / Site</span>
              <Select
                className="w-full"
                value={unit}
                onChange={setUnit}
                options={UNITS.map((u) => ({ value: u, label: u }))}
              />
            </div>
            <div className="arf-item">
              <span className="arf-label">Skill category</span>
              <Select
                className="w-full"
                value={skill}
                onChange={setSkill}
                options={SKILL_FILTERS.map((s) => ({ value: s, label: s }))}
              />
            </div>
            <div className="arf-item">
              <span className="arf-label">Contractor</span>
              <Select
                className="w-full"
                value={contractor}
                onChange={setContractor}
                options={CONTRACTORS.map((c) => ({ value: c, label: c }))}
              />
            </div>
            <div className="arf-item">
              <span className="arf-label">Disbursement</span>
              <Select
                className="w-full"
                value={disbursement}
                onChange={setDisbursement}
                options={DISBURSEMENT_FILTERS.map((d) => ({ value: d, label: d }))}
              />
            </div>
          </div>
        </div>

        <div className="arf-footer">
          <Button type="primary" icon={<FilterOutlined />}>
            Apply filters
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="daily-wage-kpi-grid">
        <StatCard
          icon={TeamOutlined}
          label="Total wage labour"
          value={String(kpi.headcount)}
          hint={`${kpi.skilled} skilled · ${kpi.semi} semi · ${kpi.unskilled} unskilled`}
        />
        <StatCard
          icon={CalendarOutlined}
          label="Mandays worked"
          value={kpi.mandays.toLocaleString("en-IN")}
          hint={`Avg ${kpi.avgDays} days · ${kpi.absentees} absentees`}
          hintTone="default"
        />
        <StatCard
          icon={ClockCircleOutlined}
          label="Overtime hours"
          value={String(kpi.otHours)}
          hint={`Avg ${kpi.avgOt} hrs / labour`}
          hintTone="warning"
        />
        <StatCard
          icon={DollarOutlined}
          label="Total wage payout"
          value={formatLakhs(kpi.totalPayout)}
          hint={`${formatLakhs(kpi.totalWages)} wages · ${formatLakhs(kpi.totalOt)} OT`}
          hintTone="positive"
        />
      </div>

      {/* Sample calculation */}
      {sample && samplePay && (
        <ReportSection
          title={`Sample calculation — ${sample.name}`}
          meta={`${sample.code} · ${sample.skill} · ${sample.trade}`}
        >
          <div className="daily-wage-sample-grid">
            <div className="daily-wage-sample-tile">
              <p className="daily-wage-sample-tile__label">Daily Rate</p>
              <p className="daily-wage-sample-tile__value">{formatInr(sample.dailyRate)}</p>
              <p className="daily-wage-sample-tile__sub">{sample.skill} — {sample.trade.toLowerCase()}</p>
            </div>
            <div className="daily-wage-sample-tile">
              <p className="daily-wage-sample-tile__label">Days Worked</p>
              <p className="daily-wage-sample-tile__value">{sample.days}</p>
              <p className="daily-wage-sample-tile__sub">of {sample.days} attended</p>
            </div>
            <div className="daily-wage-sample-tile">
              <p className="daily-wage-sample-tile__label">Wages</p>
              <p className="daily-wage-sample-tile__value">{formatInr(samplePay.wages)}</p>
              <p className="daily-wage-sample-tile__sub">rate × days</p>
            </div>
            <div className="daily-wage-sample-tile">
              <p className="daily-wage-sample-tile__label">OT Hours</p>
              <p className="daily-wage-sample-tile__value">{sample.otHours} hrs</p>
              <p className="daily-wage-sample-tile__sub">Sun + weekdays</p>
            </div>
            <div className="daily-wage-sample-tile">
              <p className="daily-wage-sample-tile__label">OT Amount</p>
              <p className="daily-wage-sample-tile__value">{formatInr(samplePay.otAmount)}</p>
              <p className="daily-wage-sample-tile__sub">× 2 hourly rate</p>
            </div>
            <div className="daily-wage-sample-tile">
              <p className="daily-wage-sample-tile__label">Gross</p>
              <p className="daily-wage-sample-tile__value">{formatInr(samplePay.gross)}</p>
              <p className="daily-wage-sample-tile__sub">wages + OT</p>
            </div>
            <div className="daily-wage-sample-tile">
              <p className="daily-wage-sample-tile__label">PF (12%)</p>
              <p className="daily-wage-sample-tile__value">{formatInr(samplePay.pf)}</p>
              <p className="daily-wage-sample-tile__sub">on basic wage</p>
            </div>
            <div className="daily-wage-sample-tile">
              <p className="daily-wage-sample-tile__label">Advance Recovery</p>
              <p className="daily-wage-sample-tile__value">{formatInr(sample.advance)}</p>
              <p className="daily-wage-sample-tile__sub">running deduction</p>
            </div>
            <div className="daily-wage-sample-tile daily-wage-sample-tile--highlight">
              <p className="daily-wage-sample-tile__label">Net Pay</p>
              <p className="daily-wage-sample-tile__value" style={{ color: "var(--success)" }}>
                {formatInr(samplePay.net)}
              </p>
              <p className="daily-wage-sample-tile__sub">{sample.mode} transfer</p>
            </div>
          </div>
        </ReportSection>
      )}

      {/* Main payroll table */}
      <ReportSection
        title={`Wage labour payroll — ${periodLabel.split(" ")[0]} ${periodLabel.split(" ")[1] ?? ""}`}
        meta={`${workers.length} labourers · ${formatLakhs(kpi.totalPayout)}`}
        flush
      >
        <Table
          dataSource={tableData}
          columns={columns}
          rowKey="key"
          size="small"
          scroll={{ x: 1400 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (t, r) => `Showing ${r[0]}–${r[1]} of ${t}`,
          }}
          className="attendance-report-table"
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row style={{ background: "var(--bg-sunken)", fontWeight: 700 }}>
                <Table.Summary.Cell index={0} colSpan={5}>Totals</Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="center">{totals.days}</Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">{formatInr(totals.wages)}</Table.Summary.Cell>
                <Table.Summary.Cell index={7} align="center">{totals.otHrs}</Table.Summary.Cell>
                <Table.Summary.Cell index={8} align="right">{formatInr(totals.otAmt)}</Table.Summary.Cell>
                <Table.Summary.Cell index={9} align="right">{formatInr(totals.gross)}</Table.Summary.Cell>
                <Table.Summary.Cell index={10} align="right">{formatInr(totals.ded)}</Table.Summary.Cell>
                <Table.Summary.Cell index={11} align="right">{formatInr(totals.net)}</Table.Summary.Cell>
                <Table.Summary.Cell index={12} colSpan={2} />
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </ReportSection>

      {/* Trade + disbursement summary */}
      <div className="daily-wage-bottom-grid">
        <ReportSection title="Trade-wise summary" flush>
          <Table
            dataSource={tradeRows}
            rowKey="trade"
            size="small"
            pagination={false}
            className="attendance-report-table"
            columns={[
              { title: "Trade", dataIndex: "trade", key: "trade" },
              { title: "Count", dataIndex: "count", key: "count", align: "center" as const },
              { title: "Avg rate", dataIndex: "avgRate", key: "avg", align: "right" as const, render: (v: number) => formatInr(v) },
              { title: "Mandays", dataIndex: "mandays", key: "md", align: "center" as const },
              { title: "Wages", dataIndex: "wages", key: "wages", align: "right" as const, render: (v: number) => formatInr(v) },
            ]}
          />
        </ReportSection>

        <ReportSection title="Disbursement summary" flush>
          <Table
            dataSource={disbursementRows}
            rowKey="mode"
            size="small"
            pagination={false}
            className="attendance-report-table"
            columns={[
              { title: "Mode", dataIndex: "mode", key: "mode" },
              { title: "Labourers", dataIndex: "labourers", key: "lab", align: "center" as const },
              { title: "Amount", dataIndex: "amount", key: "amt", align: "right" as const, render: (v: number) => formatInr(v) },
              {
                title: "Status", dataIndex: "status", key: "status",
                render: (v: string, row: { statusTone: string }) => (
                  <Tag color={row.statusTone === "warning" ? "orange" : "blue"} style={{ borderRadius: 20, border: 0 }}>{v}</Tag>
                ),
              },
            ]}
          />
          <div className="attendance-report-section__footer">
            Contractor split:{" "}
            {contractorSplit.map((c, i) => (
              <span key={c.name}>
                {i > 0 && " · "}
                <strong>{c.name}</strong> {formatLakhs(c.amount)}
              </span>
            ))}
          </div>
          <div style={{ padding: "0 20px 16px", display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button style={{ background: "#0d9488", borderColor: "#0d9488", color: "#fff" }} onClick={() => message.info("Cash voucher")}>
              Cash voucher
            </Button>
            <Button onClick={() => message.info("Bank file (NEFT)")}>Bank file (NEFT)</Button>
            <Button onClick={() => message.info("Print muster")}>Print muster</Button>
          </div>
        </ReportSection>
      </div>
    </div>
  );
}
