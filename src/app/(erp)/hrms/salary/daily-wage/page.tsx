"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Table, Button, Select, Tag, message } from "antd";
import dayjs from "dayjs";
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
import { HRMS_BACK } from "@/lib/hrms-nav";
import CommonTable from "@/components/common/CommonTable";
import ReportSection from "@/components/hrms/ReportSection";
import StatCard from "@/components/common/StatCard";
import { ERP_TABLE_PROPS } from "@/components/common/erpStatusBadges";
import {
  type DailyWageWorker,
  filterWorkers,
  getDailyWageKpi,
  getTradeSummary,
  getDisbursementSummary,
  getContractorSplit,
  calcWorkerPay,
  getSampleWorker,
  formatInr,
  formatLakhs,
  PAY_FREQUENCIES,
  SKILL_FILTERS,
  DISBURSEMENT_FILTERS,
} from "@/lib/daily-wage-dummy";
import FilterSearchField from "@/components/hrms/FilterSearchField";
import { filterBySearch } from "@/lib/filter-search";
import { downloadCsv } from "@/lib/download-csv";

function skillTagClass(skill: string) {
  if (skill === "Skilled") return "daily-wage-skill-tag--skilled";
  if (skill === "Semi") return "daily-wage-skill-tag--semi";
  return "daily-wage-skill-tag--unskilled";
}

function buildPeriodOptions() {
  const options: { value: string; label: string }[] = [];
  const now = dayjs();
  for (let i = 0; i < 12; i++) {
    const d = now.subtract(i, "month");
    options.push({
      value: d.format("YYYY-MM"),
      label: d.format("MMM YYYY"),
    });
  }
  return options;
}

export default function DailyWagePayrollPage() {
  const periodOptions = useMemo(() => buildPeriodOptions(), []);
  const [allWorkers, setAllWorkers] = useState<DailyWageWorker[]>([]);
  const [unitOptions, setUnitOptions] = useState<string[]>([]);
  const [contractorOptions, setContractorOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [payPeriod, setPayPeriod] = useState(
    () => dayjs().format("YYYY-MM")
  );
  const [payFrequency, setPayFrequency] = useState("Monthly");
  const [unit, setUnit] = useState("All");
  const [skill, setSkill] = useState("All");
  const [contractor, setContractor] = useState("All");
  const [disbursement, setDisbursement] = useState("All");
  const [search, setSearch] = useState("");

  const loadWorkers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/hrms/salary/daily-wage?period=${encodeURIComponent(payPeriod)}`
      );
      const json = await res.json();
      if (!res.ok || json?.error) throw new Error(json?.error ?? "Failed");
      setAllWorkers(json.data?.workers ?? []);
      setUnitOptions(json.data?.units ?? []);
      setContractorOptions(json.data?.contractors ?? []);
    } catch (e) {
      message.error(
        e instanceof Error ? e.message : "Failed to load daily wage employees"
      );
      setAllWorkers([]);
      setUnitOptions([]);
      setContractorOptions([]);
    } finally {
      setLoading(false);
    }
  }, [payPeriod]);

  useEffect(() => {
    void loadWorkers();
  }, [loadWorkers]);

  const workers = useMemo(
    () => filterWorkers(allWorkers, { unit, skill, contractor, disbursement }),
    [allWorkers, unit, skill, contractor, disbursement],
  );

  const kpi = useMemo(() => getDailyWageKpi(workers), [workers]);
  const tradeRows = useMemo(() => getTradeSummary(workers), [workers]);
  const disbursementRows = useMemo(
    () => getDisbursementSummary(workers),
    [workers],
  );
  const contractorSplit = useMemo(() => getContractorSplit(workers), [workers]);
  const sample = useMemo(() => getSampleWorker(workers), [workers]);
  const samplePay = sample ? calcWorkerPay(sample) : null;

  const periodLabel =
    periodOptions.find((p) => p.value === payPeriod)?.label ?? payPeriod;

  const searchedWorkers = useMemo(
    () =>
      filterBySearch(workers, search, (w) => [
        w.id,
        w.name,
        w.trade,
        w.skill,
        w.unit,
        w.contractor,
      ]),
    [workers, search],
  );

  const tableData = useMemo(
    () =>
      searchedWorkers.map((w) => ({ ...w, ...calcWorkerPay(w), key: w.id })),
    [searchedWorkers],
  );

  const totals = useMemo(() => {
    let days = 0,
      wages = 0,
      otHrs = 0,
      otAmt = 0,
      gross = 0,
      ded = 0,
      net = 0;
    for (const r of tableData) {
      days += r.days;
      wages += r.wages;
      otHrs += r.otHours;
      otAmt += r.otAmount;
      gross += r.gross;
      ded += r.deductions;
      net += r.net;
    }
    return { days, wages, otHrs, otAmt, gross, ded, net };
  }, [tableData]);

  const columns = [
    {
      title: "Code",
      dataIndex: "code",
      key: "code",
      width: 100,
      render: (v: string) => (
        <span className="font-mono text-[12px] font-semibold">{v}</span>
      ),
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: 180,
      render: (v: string) => <span className="font-semibold">{v}</span>,
    },
    {
      title: "Skill",
      dataIndex: "skill",
      key: "skill",
      width: 90,
      render: (v: string) => (
        <Tag
          className={skillTagClass(v)}
          style={{ borderRadius: 20, fontWeight: 600 }}
        >
          {v}
        </Tag>
      ),
    },
    { title: "Trade", dataIndex: "trade", key: "trade", width: 90 },
    {
      title: "Contractor",
      dataIndex: "contractor",
      key: "contractor",
      width: 150,
      ellipsis: true,
    },
    {
      title: "Daily rate",
      dataIndex: "dailyRate",
      key: "rate",
      width: 110,
      align: "center" as const,
      render: (v: number) => formatInr(v),
    },
    {
      title: "Days",
      dataIndex: "days",
      key: "days",
      width: 60,
      align: "center" as const,
    },
    {
      title: "Wages",
      dataIndex: "wages",
      key: "wages",
      width: 100,
      align: "center" as const,
      render: (v: number) => formatInr(v),
    },
    {
      title: "OT hrs",
      dataIndex: "otHours",
      key: "otHrs",
      width: 70,
      align: "center" as const,
    },
    {
      title: "OT amount",
      dataIndex: "otAmount",
      key: "otAmt",
      width: 100,
      align: "center" as const,
      render: (v: number) => formatInr(v),
    },
    {
      title: "Gross",
      dataIndex: "gross",
      key: "gross",
      width: 100,
      align: "center" as const,
      render: (v: number) => (
        <span className="font-semibold">{formatInr(v)}</span>
      ),
    },
    {
      title: "Deductions",
      dataIndex: "deductions",
      key: "ded",
      width: 110,
      align: "center" as const,
      render: (v: number) => (
        <span className="text-rose-600">{formatInr(v)}</span>
      ),
    },
    {
      title: "Net pay",
      dataIndex: "net",
      key: "net",
      width: 110,
      align: "center" as const,
      render: (v: number) => (
        <span className="font-extrabold">{formatInr(v)}</span>
      ),
    },
    { title: "Mode", dataIndex: "mode", key: "mode", width: 70 },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (v: string) => (
        <Tag
          color={v === "Approved" ? "green" : "orange"}
          style={{ borderRadius: 20, border: 0, fontWeight: 600 }}
        >
          {v}
        </Tag>
      ),
    },
  ];

  return (
    <div className="attendance-reports-page daily-wage-page">
      <RepHeader
        {...HRMS_BACK.salary}
        title="Daily Wage Payroll"
        subtitle="Wage labour register — daily rate × days worked + overtime, separate from monthly CTC"
        actions={
          <>
            <Button
              icon={<DownloadOutlined />}
              disabled={!searchedWorkers.length}
              onClick={() => {
                downloadCsv(
                  `daily-wage-${payPeriod}.csv`,
                  [
                    "code",
                    "name",
                    "unit",
                    "skill",
                    "trade",
                    "dailyRate",
                    "days",
                    "wages",
                    "otHours",
                    "otPay",
                    "totalPay",
                    "contractor",
                    "status",
                  ],
                  searchedWorkers.map((w) => {
                    const pay = calcWorkerPay(w);
                    return {
                      code: w.code,
                      name: w.name,
                      unit: w.unit,
                      skill: w.skill,
                      trade: w.trade,
                      dailyRate: w.dailyRate,
                      days: w.days,
                      wages: pay.wages,
                      otHours: w.otHours,
                      otPay: pay.otAmount,
                      totalPay: pay.net,
                      contractor: w.contractor,
                      status: w.status,
                    };
                  }),
                );
              }}
            >
              Export CSV
            </Button>
            <Button
              type="primary"
              icon={<LockOutlined />}
              style={{ background: "#059669", borderColor: "#059669" }}
              onClick={() =>
                message.success("Payroll generated & locked (preview)")
              }
            >
              Generate &amp; lock
            </Button>
          </>
        }
      />

      {/* Filters */}
      <div className="arf-panel ap-filters-panel">
        <div className="arf-head">
          <FilterOutlined style={{ color: "var(--primary)", fontSize: 12 }} />
          <span className="arf-head-title">Filters</span>
        </div>

        <div className="arf-body">
          <div className="arf-controls ap-filters-controls ap-filters-controls--split-apply">
            <FilterSearchField
              value={search}
              onChange={setSearch}
              placeholder="Search worker name, ID, trade, contractor…"
            />
            <div className="arf-item">
              <span className="arf-label">Pay Period</span>
              <Select
                className="w-full"
                value={payPeriod}
                onChange={setPayPeriod}
                options={periodOptions}
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
                options={[
                  { value: "All", label: "All units" },
                  ...unitOptions.map((u) => ({ value: u, label: u })),
                ]}
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
            <div className="ap-filters-row-break" aria-hidden="true" />
            <div className="arf-item">
              <span className="arf-label">Contractor</span>
              <Select
                className="w-full"
                value={contractor}
                onChange={setContractor}
                options={[
                  { value: "All", label: "All contractors" },
                  ...contractorOptions.map((c) => ({ value: c, label: c })),
                ]}
              />
            </div>
            <div className="arf-item">
              <span className="arf-label">Disbursement</span>
              <Select
                className="w-full"
                value={disbursement}
                onChange={setDisbursement}
                options={DISBURSEMENT_FILTERS.map((d) => ({
                  value: d,
                  label: d,
                }))}
              />
            </div>
            <div className="ap-filters-spacer" aria-hidden="true" />
            <div className="arf-item ap-filters-actions">
              <Button
                type="primary"
                icon={<FilterOutlined />}
                loading={loading}
                onClick={() => void loadWorkers()}
              >
                Apply filters
              </Button>
            </div>
          </div>
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
              <p className="daily-wage-sample-tile__value">
                {formatInr(sample.dailyRate)}
              </p>
              <p className="daily-wage-sample-tile__sub">
                {sample.skill} — {sample.trade.toLowerCase()}
              </p>
            </div>
            <div className="daily-wage-sample-tile">
              <p className="daily-wage-sample-tile__label">Days Worked</p>
              <p className="daily-wage-sample-tile__value">{sample.days}</p>
              <p className="daily-wage-sample-tile__sub">
                of {sample.days} attended
              </p>
            </div>
            <div className="daily-wage-sample-tile">
              <p className="daily-wage-sample-tile__label">Wages</p>
              <p className="daily-wage-sample-tile__value">
                {formatInr(samplePay.wages)}
              </p>
              <p className="daily-wage-sample-tile__sub">rate × days</p>
            </div>
            <div className="daily-wage-sample-tile">
              <p className="daily-wage-sample-tile__label">OT Hours</p>
              <p className="daily-wage-sample-tile__value">
                {sample.otHours} hrs
              </p>
              <p className="daily-wage-sample-tile__sub">Sun + weekdays</p>
            </div>
            <div className="daily-wage-sample-tile">
              <p className="daily-wage-sample-tile__label">OT Amount</p>
              <p className="daily-wage-sample-tile__value">
                {formatInr(samplePay.otAmount)}
              </p>
              <p className="daily-wage-sample-tile__sub">× 2 hourly rate</p>
            </div>
            <div className="daily-wage-sample-tile">
              <p className="daily-wage-sample-tile__label">Gross</p>
              <p className="daily-wage-sample-tile__value">
                {formatInr(samplePay.gross)}
              </p>
              <p className="daily-wage-sample-tile__sub">wages + OT</p>
            </div>
            <div className="daily-wage-sample-tile">
              <p className="daily-wage-sample-tile__label">PF (12%)</p>
              <p className="daily-wage-sample-tile__value">
                {formatInr(samplePay.pf)}
              </p>
              <p className="daily-wage-sample-tile__sub">on basic wage</p>
            </div>
            <div className="daily-wage-sample-tile">
              <p className="daily-wage-sample-tile__label">Advance Recovery</p>
              <p className="daily-wage-sample-tile__value">
                {formatInr(sample.advance)}
              </p>
              <p className="daily-wage-sample-tile__sub">running deduction</p>
            </div>
            <div className="daily-wage-sample-tile daily-wage-sample-tile--highlight">
              <p className="daily-wage-sample-tile__label">Net Pay</p>
              <p
                className="daily-wage-sample-tile__value"
                style={{ color: "var(--success)" }}
              >
                {formatInr(samplePay.net)}
              </p>
              <p className="daily-wage-sample-tile__sub">
                {sample.mode} transfer
              </p>
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
        <CommonTable
          {...ERP_TABLE_PROPS}
          loading={loading}
          dataSource={tableData}
          columns={columns}
          rowKey="key"
          size="small"
          scroll={{ x: 1400 }}
          locale={{
            emptyText: loading
              ? "Loading…"
              : "No daily wage employees found. Add employees with compensation type “Daily wage”.",
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (t, r) => `Showing ${r[0]}–${r[1]} of ${t}`,
          }}
          className="attendance-report-table"
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row
                className="daily-wage-table-totals-row"
                style={{ background: "var(--bg-sunken)", fontWeight: 700 }}
              >
                <Table.Summary.Cell index={0} colSpan={6} align="center">
                  Totals
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="center">
                  {totals.days}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7} align="center">
                  {formatInr(totals.wages)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={8} align="center">
                  {totals.otHrs}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={9} align="center">
                  {formatInr(totals.otAmt)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={10} align="center">
                  {formatInr(totals.gross)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={11} align="center">
                  {formatInr(totals.ded)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={12} align="center">
                  {formatInr(totals.net)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={13} colSpan={2} />
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </ReportSection>

      {/* Trade + disbursement summary */}
      <div className="daily-wage-bottom-grid">
        <ReportSection title="Trade-wise summary" flush>
          <CommonTable
            {...ERP_TABLE_PROPS}
            dataSource={tradeRows}
            rowKey="trade"
            size="small"
            pagination={false}
            className="attendance-report-table"
            columns={[
              { title: "Trade", dataIndex: "trade", key: "trade" },
              {
                title: "Count",
                dataIndex: "count",
                key: "count",
                align: "center" as const,
              },
              {
                title: "Avg rate",
                dataIndex: "avgRate",
                key: "avg",
                align: "right" as const,
                render: (v: number) => formatInr(v),
              },
              {
                title: "Mandays",
                dataIndex: "mandays",
                key: "md",
                align: "center" as const,
              },
              {
                title: "Wages",
                dataIndex: "wages",
                key: "wages",
                align: "right" as const,
                render: (v: number) => formatInr(v),
              },
            ]}
          />
        </ReportSection>

        <ReportSection title="Disbursement summary" flush>
          <CommonTable
            {...ERP_TABLE_PROPS}
            dataSource={disbursementRows}
            rowKey="mode"
            size="small"
            pagination={false}
            className="attendance-report-table"
            columns={[
              { title: "Mode", dataIndex: "mode", key: "mode" },
              {
                title: "Labourers",
                dataIndex: "labourers",
                key: "lab",
                align: "center" as const,
              },
              {
                title: "Amount",
                dataIndex: "amount",
                key: "amt",
                align: "right" as const,
                render: (v: number) => formatInr(v),
              },
              {
                title: "Status",
                dataIndex: "status",
                key: "status",
                render: (v: string, row: { statusTone: string }) => (
                  <Tag
                    color={row.statusTone === "warning" ? "orange" : "blue"}
                    style={{ borderRadius: 20, border: 0 }}
                  >
                    {v}
                  </Tag>
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
        </ReportSection>
      </div>
    </div>
  );
}
