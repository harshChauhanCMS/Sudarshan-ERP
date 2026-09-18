"use client";

import { Button, Modal, Tag, Select, DatePicker, Tooltip, Spin, message } from "antd";
import {
  FileExcelOutlined,
  ReloadOutlined,
  SyncOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  DollarOutlined,
  MinusCircleOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import RepHeader from "@/components/hrms/RepHeader";
import CommonTable from "@/components/common/CommonTable";
import { ViewEditActions } from "@/components/common/TableActionIcons";
import { ERP_TABLE_PROPS } from "@/components/common/erpStatusBadges";
import { HRMS_BACK } from "@/lib/hrms-nav";
import ReportSection from "@/components/hrms/ReportSection";
import StatCard from "@/components/common/StatCard";
import {
  getPayrollSheetKpi,
  formatPayrollInr,
  SALARY_STATUS_LABEL,
  SALARY_STATUS_COLOR,
  type PayrollSheetRow,
} from "@/lib/payroll-sheet";
import PageFilterPanel from "@/components/common/PageFilterPanel";
import { downloadGenericTableExcel } from "@/lib/generic-table-excel";
import {
  cycleLockedReason,
  cycleUnlockDate,
} from "@/lib/salary-generation-window";
import { filterBySearch } from "@/lib/filter-search";

/** One computed-but-unsaved sheet, as the generate route's dry run returns it. */
type PreviewSheet = Record<string, unknown>;

type GeneratePreview = {
  rows: PreviewSheet[];
  /** Employees left alone because a sheet for the cycle already exists. */
  skipped: number;
  /** Sheets that are approved or disbursed, so they are never rewritten. */
  locked: number;
};

const num = (row: PreviewSheet, key: string): number => Number(row[key] ?? 0);
const str = (row: PreviewSheet, key: string): string => String(row[key] ?? "");

/** Columns of the pre-generation Excel — what each employee would be paid. */
const PREVIEW_COLUMNS: {
  header: string;
  pick: (row: PreviewSheet) => string | number;
}[] = [
  { header: "Employee Code", pick: (r) => str(r, "employeeId") },
  { header: "Employee Name", pick: (r) => str(r, "employeeName") },
  { header: "Department", pick: (r) => str(r, "department") },
  { header: "Designation", pick: (r) => str(r, "designation") },
  { header: "Working Days", pick: (r) => num(r, "workingDays") },
  { header: "Days Present", pick: (r) => num(r, "daysPresent") },
  { header: "Paid Holidays", pick: (r) => num(r, "holidayDays") },
  { header: "Paid Leave", pick: (r) => num(r, "leaveDays") },
  { header: "Absent Days", pick: (r) => num(r, "absentDays") },
  { header: "LWP Days", pick: (r) => num(r, "unpaidLeaveDays") },
  { header: "Basic", pick: (r) => num(r, "basicSalary") },
  { header: "HRA", pick: (r) => num(r, "hra") },
  { header: "Other / Conveyance", pick: (r) => num(r, "otherConveyance") },
  { header: "Special / Bonus", pick: (r) => num(r, "specialBonus") },
  { header: "Gross Salary", pick: (r) => num(r, "grossSalary") },
  { header: "Overtime Hours", pick: (r) => num(r, "overtimeHours") },
  { header: "Overtime Amount", pick: (r) => num(r, "overtimeAmount") },
  { header: "Arrears", pick: (r) => num(r, "arrears") },
  { header: "Leave / LWP Deduction", pick: (r) => num(r, "leaveDeduction") },
  { header: "PF", pick: (r) => num(r, "pfEmployee") },
  { header: "ESI", pick: (r) => num(r, "esi") },
  { header: "TDS", pick: (r) => num(r, "tds") },
  { header: "Advance", pick: (r) => num(r, "advance") },
  { header: "Other Deductions", pick: (r) => num(r, "otherDeductions") },
  { header: "Total Deductions", pick: (r) => previewDeductions(r) },
  { header: "Net Payable", pick: (r) => num(r, "netPayable") },
];

function previewDeductions(row: PreviewSheet): number {
  return (
    num(row, "leaveDeduction") +
    num(row, "pfEmployee") +
    num(row, "esi") +
    num(row, "tds") +
    num(row, "advance") +
    num(row, "otherDeductions")
  );
}

/** `?cycle=YYYY-MM`, as sent by bulk-approve and the row pages; today otherwise. */
function parseCycleParam(value: string | null): dayjs.Dayjs {
  if (value && dayjs(value, "YYYY-MM", true).isValid()) return dayjs(value, "YYYY-MM");
  return dayjs();
}

function PayrollBulkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [month, setMonth] = useState(() => parseCycleParam(searchParams.get("cycle")));
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<GeneratePreview | null>(null);

  const [rows, setRows] = useState<PayrollSheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const loadSeq = useRef(0);

  const cycleKey = month.format("YYYY-MM");

  const load = useCallback(async () => {
    // Changing month/status re-runs `load`, and the drawer's Apply button runs
    // it again — without this guard a slower earlier response could land last
    // and repaint the table with the previous filter's rows.
    const requestId = ++loadSeq.current;
    const isStale = () => requestId !== loadSeq.current;

    setLoading(true);
    try {
      const params = new URLSearchParams({ cycle: cycleKey });
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      const res = await fetch(`/api/hrms/salary/bulk?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (isStale()) return false;
      if (!res.ok) throw new Error(json?.error || "Failed to load payroll sheet");
      setRows(json.data || []);
      setSelectedRowKeys([]);
      return true;
    } catch (e) {
      if (isStale()) return false;
      message.error(e instanceof Error ? e.message : "Failed to load payroll sheet");
      setRows([]);
      return false;
    } finally {
      if (!isStale()) setLoading(false);
    }
  }, [cycleKey, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Opens the confirmation modal with a dry run of the month: every sheet is
   * computed exactly as saving would compute it, but nothing is written yet,
   * so HR can export the figures to Excel and check them before confirming.
   */
  const openGenerateConfirm = async () => {
    setConfirmOpen(true);
    setPreviewLoading(true);
    setPreview(null);
    try {
      const selectedEmployeeIds = rows
        .filter((r) => selectedRowKeys.includes(r.id))
        .map((r) => r.employeeId);
      const res = await fetch("/api/hrms/salary/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          from: month.startOf("month").format("YYYY-MM-DD"),
          to: month.endOf("month").format("YYYY-MM-DD"),
          preview: true,
          ...(selectedEmployeeIds.length > 0
            ? { employeeIds: selectedEmployeeIds }
            : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to build the preview");
      setPreview({
        rows: Array.isArray(json.data?.rows) ? json.data.rows : [],
        skipped: Number(json.data?.skipped || 0),
        locked: Number(json.data?.locked || 0),
      });
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to build the preview");
      setConfirmOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  /** The previewed figures, as the same columns the salary register uses. */
  const downloadPreviewExcel = async () => {
    if (!preview?.rows.length) return;
    const head = PREVIEW_COLUMNS.map((c) => c.header);
    const body = preview.rows.map((row) => PREVIEW_COLUMNS.map((c) => c.pick(row)));
    await downloadGenericTableExcel(
      `Salary preview ${month.format("MMMM YYYY")}`,
      `${preview.rows.length} employees · not yet generated`,
      head,
      body,
    );
  };

  const runGenerate = async (regenerate: boolean) => {
    const selectedEmployeeIds = rows
      .filter((r) => selectedRowKeys.includes(r.id))
      .map((r) => r.employeeId);

    setGenerating(true);
    try {
      const res = await fetch("/api/hrms/salary/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          from: month.startOf("month").format("YYYY-MM-DD"),
          to: month.endOf("month").format("YYYY-MM-DD"),
          ...(regenerate ? { regenerate: true } : {}),
          ...(selectedEmployeeIds.length > 0
            ? { employeeIds: selectedEmployeeIds }
            : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");
      const { generated = 0, skipped = 0, locked = 0 } = json.data ?? {};
      const cycleLabel = month.format("MMMM YYYY");
      const lockedNote =
        locked > 0 ? ` · ${locked} approved/disbursed, not rebuilt` : "";

      // Skipped employees already have a sheet for the cycle — say so rather
      // than reporting "Generated 0", which reads like a failure.
      if (generated === 0 && skipped > 0) {
        message.info(
          `Salary already generated for ${skipped === 1 ? "this employee" : `all ${skipped} selected employees`} in ${cycleLabel}. Use Regenerate to rebuild them.`,
        );
      } else if (generated === 0 && locked > 0) {
        message.info(
          `Nothing to rebuild — ${locked === 1 ? "this sheet is" : `all ${locked} sheets are`} approved or disbursed.`,
        );
      } else {
        message.success(
          `${regenerate ? "Regenerated" : "Generated"} ${generated} salary slip${
            generated === 1 ? "" : "s"
          } for ${cycleLabel}${
            skipped > 0 ? ` · ${skipped} already generated, left untouched` : ""
          }${lockedNote}`,
        );
      }
      setSelectedRowKeys([]);
      setConfirmOpen(false);
      setPreview(null);
      void load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setGenerating(false);
    }
  };

  /** Rows the Generate/Regenerate buttons act on: the selection, or everything. */
  const targetRows = useMemo(
    () =>
      selectedRowKeys.length > 0
        ? rows.filter((r) => selectedRowKeys.includes(r.id))
        : rows,
    [rows, selectedRowKeys],
  );
  // Only drafts can be rebuilt; approved and disbursed sheets are records of
  // what was paid, so the server refuses to touch them either way.
  const rebuildableCount = targetRows.filter((r) => r.status === "draft").length;

  const confirmRegenerate = () => {
    Modal.confirm({
      title: `Regenerate ${rebuildableCount} salary slip${rebuildableCount === 1 ? "" : "s"}?`,
      content: `Rebuilds ${
        selectedRowKeys.length > 0 ? "the selected" : "every"
      } draft sheet for ${month.format(
        "MMMM YYYY",
      )} from the employees' current salary, attendance and deduction rules. Manual edits to those sheets are overwritten; approved and disbursed sheets are left untouched.`,
      okText: "Regenerate",
      okButtonProps: { danger: true },
      onOk: () => runGenerate(true),
    });
  };

  /** Departments present in the loaded cycle, for the filter dropdown. */
  const departmentOptions = useMemo(() => {
    const names = new Set<string>();
    for (const row of rows) {
      const dept = row.department?.trim();
      if (dept) names.add(dept);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filtered = useMemo(() => {
    const byDepartment =
      departmentFilter === "all"
        ? rows
        : rows.filter((r) => (r.department?.trim() || "") === departmentFilter);
    return filterBySearch(byDepartment, search, (r) => [
      r.employeeId,
      r.name,
      r.department,
      r.designation,
      r.pfUan,
      r.esiIp,
      r.accountNo,
      r.ifsc,
    ]);
  }, [rows, search, departmentFilter]);

  const kpi = getPayrollSheetKpi(filtered);

  /**
   * Salary runs are held back until the month's last day — see
   * salary-generation-window. `null` means the month is open for generation.
   */
  const generateLockedReason = cycleLockedReason(cycleKey);
  const unlockDate = cycleUnlockDate(cycleKey);

  /**
   * When this cycle was last generated. A cycle is generated once: with sheets
   * on record the run is closed, and corrections go through Regenerate (drafts
   * only) or the per-employee edit screen.
   */
  const generatedOn = useMemo(() => {
    const stamps = rows
      .map((row) => row.generatedAt)
      .filter(Boolean)
      .map((iso) => dayjs(iso))
      .filter((d) => d.isValid());
    if (!stamps.length) return null;
    return stamps.reduce((latest, d) => (d.isAfter(latest) ? d : latest), stamps[0]);
  }, [rows]);

  const generatedCount = useMemo(
    () => rows.filter((row) => row.status !== "pending").length,
    [rows],
  );

  /**
   * What a Generate run would actually act on: employees with no sheet yet,
   * within the current selection if there is one. A sheet that exists is never
   * rebuilt by Generate, so once the cycle is covered the button is closed.
   */
  const pendingTargets = useMemo(() => {
    const scope = selectedRowKeys.length
      ? rows.filter((row) => selectedRowKeys.includes(row.id))
      : rows;
    return scope.filter((row) => row.status === "pending");
  }, [rows, selectedRowKeys]);

  const alreadyGeneratedReason =
    generatedOn && pendingTargets.length === 0
      ? `Salary for ${month.format("MMMM YYYY")} was already generated on ${generatedOn.format(
          "D MMM YYYY",
        )} — it is not generated twice. Edit an individual sheet to correct it.`
      : null;
  /** Either reason closes the Generate button; the month lock is reported first. */
  const generateBlockedReason = generateLockedReason ?? alreadyGeneratedReason;

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setDepartmentFilter("all");
    setMonth(dayjs());
  };

  /**
   * Downloads the salary register for exactly what the page is showing: the
   * ticked rows when there is a selection, otherwise every row left by the
   * month, status, department and search filters.
   */
  const downloadExcel = async () => {
    const scope = selectedRowKeys.length
      ? filtered.filter((row) => selectedRowKeys.includes(row.id))
      : filtered;
    if (!scope.length) {
      message.info("No rows to export for the current filters.");
      return;
    }

    setExporting(true);
    try {
      const res = await fetch("/api/hrms/salary/export.xlsx", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cycle: cycleKey,
          status: statusFilter,
          department: departmentFilter === "all" ? "" : departmentFilter,
          employeeIds: scope.map((row) => row.employeeId),
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Export failed");
      }
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = `salary-register-${cycleKey}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
      message.success(
        `Exported ${scope.length} employee${scope.length === 1 ? "" : "s"} for ${month.format("MMMM YYYY")}`,
      );
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const money = (v: number) => (
    <span className="font-semibold whitespace-nowrap">{formatPayrollInr(v)}</span>
  );

  const columns = [
    {
      title: "Emp ID",
      dataIndex: "employeeId",
      key: "eid",
      width: 96,
      fixed: "left" as const,
      render: (v: string) => (
        <span className="font-mono text-[12px] font-semibold">{v}</span>
      ),
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: 140,
      fixed: "left" as const,
      render: (v: string) => <span className="font-semibold">{v}</span>,
    },
    { title: "Department", dataIndex: "department", key: "dept", width: 110 },
    { title: "Designation", dataIndex: "designation", key: "desig", width: 120 },
    { title: "DOJ", dataIndex: "doj", key: "doj", width: 100 },
    {
      title: "PF / UAN",
      dataIndex: "pfUan",
      key: "pf",
      width: 130,
      render: (v: string) => (
        <span className="text-[11px] font-mono">{v}</span>
      ),
    },
    { title: "ESI / IP", dataIndex: "esiIp", key: "esi", width: 100 },
    {
      title: "Account no.",
      dataIndex: "accountNo",
      key: "acc",
      width: 140,
      render: (v: string) => (
        <span className="text-[11px] font-mono">{v}</span>
      ),
    },
    { title: "IFSC", dataIndex: "ifsc", key: "ifsc", width: 110 },
    {
      title: "Month days",
      dataIndex: "monthDays",
      key: "md",
      width: 88,
      align: "center" as const,
    },
    {
      title: "Present",
      dataIndex: "present",
      key: "pres",
      width: 72,
      align: "center" as const,
      render: (v: number, r: PayrollSheetRow) =>
        r.status === "pending" ? "—" : v,
    },
    {
      title: "Leave",
      dataIndex: "leave",
      key: "leave",
      width: 64,
      align: "center" as const,
      render: (v: number, r: PayrollSheetRow) =>
        r.status === "pending" ? "—" : v,
    },
    {
      title: "LWP",
      dataIndex: "lwp",
      key: "lwp",
      width: 56,
      align: "center" as const,
      render: (v: number, r: PayrollSheetRow) =>
        r.status === "pending" ? "—" : v,
    },
    {
      title: "Pay days",
      dataIndex: "payDays",
      key: "pay",
      width: 80,
      align: "center" as const,
      render: (v: number, r: PayrollSheetRow) =>
        r.status === "pending" ? "—" : v,
    },
    { title: "CTC", dataIndex: "ctc", key: "ctc", width: 100, render: money },
    { title: "Gross", dataIndex: "gross", key: "gross", width: 100, render: money },
    {
      title: "Bonus",
      dataIndex: "bonus",
      key: "bonus",
      width: 90,
      render: (v: number) => (v ? money(v) : "—"),
    },
    {
      title: "Incentives",
      dataIndex: "incentives",
      key: "inc",
      width: 100,
      render: (v: number) => (v ? money(v) : "—"),
    },
    {
      title: "Deductions",
      dataIndex: "deductions",
      key: "ded",
      width: 110,
      render: (v: number, r: PayrollSheetRow) =>
        r.status === "pending" ? (
          "—"
        ) : (
          <span className="font-semibold text-rose-600">
            {formatPayrollInr(v)}
          </span>
        ),
    },
    {
      title: "Reimbursement",
      dataIndex: "reimbursement",
      key: "reim",
      width: 120,
      render: (v: number) => (v ? money(v) : "—"),
    },
    {
      title: "Net pay",
      dataIndex: "netPay",
      key: "net",
      width: 110,
      render: (v: number) => (
        <span className="font-extrabold">{formatPayrollInr(v)}</span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (v: string) => (
        <Tag
          color={SALARY_STATUS_COLOR[v] || "default"}
          style={{ borderRadius: 20, border: 0, fontWeight: 600 }}
        >
          {SALARY_STATUS_LABEL[v] || v}
        </Tag>
      ),
    },
    {
      title: "Remarks",
      dataIndex: "remarks",
      key: "rem",
      width: 140,
      ellipsis: true,
      render: (v: string) => v || "—",
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      fixed: "right" as const,
      render: (_: unknown, record: PayrollSheetRow) => (
        <ViewEditActions
          showView={record.status !== "pending"}
          viewLabel="View salary slip"
          viewHref={`/hrms/salary/bulk/${encodeURIComponent(record.id)}/slip?cycle=${encodeURIComponent(cycleKey)}`}
          editLabel="Edit salary"
          onEdit={() => {
            router.push(
              `/hrms/salary/bulk/${encodeURIComponent(record.id)}?cycle=${encodeURIComponent(cycleKey)}`,
            );
          }}
        />
      ),
    },
  ];

  return (
    <div className="attendance-reports-page">
      <RepHeader
        {...HRMS_BACK.salary}
        title="Payroll Sheet — Bulk View"
        subtitle="Full salary register with bank details, statutory deductions and attendance columns"
        actions={
          <Button
            icon={<FileExcelOutlined />}
            onClick={() => void downloadExcel()}
            loading={exporting}
            disabled={loading || filtered.length === 0}
          >
            {selectedRowKeys.length > 0
              ? `Download Excel (${selectedRowKeys.length})`
              : "Download Excel"}
          </Button>
        }
      />

      <div className="attendance-kpi-grid attendance-kpi-grid--auto">
        <StatCard
          icon={TeamOutlined}
          label="Employees"
          value={String(kpi.employees)}
          hint={month.format("MMMM YYYY")}
        />
        <StatCard
          icon={DollarOutlined}
          label="Total gross"
          value={formatPayrollInr(kpi.gross)}
          hint="Before deductions"
          hintTone="positive"
        />
        <StatCard
          icon={MinusCircleOutlined}
          label="Total deductions"
          value={formatPayrollInr(kpi.deductions)}
          hint="PF, ESI, TDS, LWP"
          hintTone="warning"
        />
        <StatCard
          icon={WalletOutlined}
          label="Net pay"
          value={formatPayrollInr(kpi.netPay)}
          hint="Disbursal amount"
          hintTone="positive"
        />
      </div>

      <PageFilterPanel
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search employee ID, name, department…"
        activeFilterCount={
          (statusFilter !== "all" ? 1 : 0) +
          (departmentFilter !== "all" ? 1 : 0) +
          (month.isSame(dayjs(), "month") ? 0 : 1)
        }
        trailing={
          <>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => void load().then((ok) => ok && message.success("Refreshed"))}
              loading={loading}
            >
              Refresh
            </Button>
            {/* Regenerate — hidden for now. With no rows ticked it rebuilds
                every draft sheet in the month (and creates any that are
                missing), overwriting manual edits, which is wider than a
                correction should be. `confirmRegenerate` and the API's
                `regenerate` flag are kept so it can be restored — ideally
                requiring a row selection first.
            <Tooltip
              title={
                generateLockedReason ??
                "Rebuild existing draft sheets from current salary, attendance and deductions"
              }
            >
              <Button
                icon={<SyncOutlined />}
                onClick={confirmRegenerate}
                loading={generating}
                disabled={rebuildableCount === 0 || Boolean(generateLockedReason)}
              >
                {selectedRowKeys.length > 0
                  ? `Regenerate (${rebuildableCount})`
                  : "Regenerate drafts"}
              </Button>
            </Tooltip>
            */}
            <div className="payroll-generate-action">
              <Tooltip title={generateBlockedReason ?? ""}>
                <Button
                  icon={<ThunderboltOutlined />}
                  onClick={() => void openGenerateConfirm()}
                  loading={generating}
                  disabled={Boolean(generateBlockedReason)}
                  style={
                    generateBlockedReason
                      ? undefined
                      : { background: "#7c3aed", borderColor: "#7c3aed", color: "#fff" }
                  }
                >
                  {selectedRowKeys.length > 0
                    ? `Generate (${pendingTargets.length})`
                    : generatedOn && pendingTargets.length > 0
                      ? `Generate (${pendingTargets.length} pending)`
                      : "Generate All"}
                </Button>
              </Tooltip>
              {generatedOn ? (
                <span className="payroll-generate-action__note">
                  Generated on {generatedOn.format("D MMM YYYY")}
                  {generatedCount ? ` · ${generatedCount} sheets` : ""}
                </span>
              ) : unlockDate && generateLockedReason ? (
                <span className="payroll-generate-action__note">
                  Opens {unlockDate.format("D MMM YYYY")}
                </span>
              ) : null}
            </div>
          </>
        }
        onApply={() => void load()}
        onClear={handleClearFilters}
        loading={loading}
      >
        <div className="arf-item">
          <span className="arf-label">Month</span>
          <DatePicker
            className="w-full"
            picker="month"
            value={month}
            onChange={(d) => d && setMonth(d)}
            allowClear={false}
          />
        </div>
        <div className="arf-item">
          <span className="arf-label">Department</span>
          <Select
            className="w-full"
            value={departmentFilter}
            onChange={setDepartmentFilter}
            showSearch
            optionFilterProp="label"
            options={[
              { value: "all", label: "All departments" },
              ...departmentOptions.map((d) => ({ value: d, label: d })),
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
              { value: "pending", label: "Pending" },
              { value: "draft", label: "Draft" },
              { value: "approved", label: "Approved" },
              { value: "disbursed", label: "Disbursed" },
            ]}
          />
        </div>
      </PageFilterPanel>

      <ReportSection
        title={`Payroll register · ${month.format("MMMM YYYY")}`}
        meta={
          generateLockedReason && unlockDate
            ? `${filtered.length} employees · salary can be generated from ${unlockDate.format("D MMM YYYY")}`
            : `${filtered.length} employees · scroll horizontally for all columns`
        }
        flush
      >
        <CommonTable<PayrollSheetRow>
          {...ERP_TABLE_PROPS}
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          size="middle"
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys as string[]),
          }}
          locale={{
            emptyText: loading
              ? "Loading…"
              : "No monthly CTC employees found for this period.",
          }}
          className="attendance-report-table"
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            showTotal: (n) => `${n} rows`,
          }}
          scroll={{ x: 3200 }}
        />
      </ReportSection>

      <Modal
        open={confirmOpen}
        onCancel={() => {
          if (generating) return;
          setConfirmOpen(false);
          setPreview(null);
        }}
        width={620}
        title={`Generate salary · ${month.format("MMMM YYYY")}`}
        footer={
          <div className="salary-confirm__footer">
            <Button
              icon={<FileExcelOutlined />}
              onClick={() => void downloadPreviewExcel()}
              disabled={previewLoading || !preview?.rows.length}
            >
              Download Excel
            </Button>
            <div className="salary-confirm__footer-right">
              <Button
                onClick={() => {
                  setConfirmOpen(false);
                  setPreview(null);
                }}
                disabled={generating}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                loading={generating}
                disabled={previewLoading || !preview?.rows.length}
                onClick={() => void runGenerate(false)}
              >
                Generate {preview?.rows.length ? `(${preview.rows.length})` : ""}
              </Button>
            </div>
          </div>
        }
      >
        {previewLoading ? (
          <div className="salary-confirm__loading">
            <Spin /> <span>Calculating this month&apos;s salary…</span>
          </div>
        ) : preview ? (
          <div className="salary-confirm">
            <p className="salary-confirm__lead">
              Nothing has been saved yet. Download the Excel to check every
              employee&apos;s figures, then confirm — salary for a month is
              generated once.
            </p>
            <div className="salary-confirm__stats">
              <div>
                <span>Employees</span>
                <strong>{preview.rows.length}</strong>
              </div>
              <div>
                <span>Total gross</span>
                <strong>
                  {formatPayrollInr(
                    preview.rows.reduce((sum, r) => sum + Number(r.grossSalary || 0), 0),
                  )}
                </strong>
              </div>
              <div>
                <span>Total deductions</span>
                <strong>
                  {formatPayrollInr(
                    preview.rows.reduce((sum, r) => sum + previewDeductions(r), 0),
                  )}
                </strong>
              </div>
              <div>
                <span>Net payable</span>
                <strong>
                  {formatPayrollInr(
                    preview.rows.reduce((sum, r) => sum + Number(r.netPayable || 0), 0),
                  )}
                </strong>
              </div>
            </div>
            {preview.skipped > 0 || preview.locked > 0 ? (
              <p className="salary-confirm__note">
                {preview.skipped > 0
                  ? `${preview.skipped} employee${preview.skipped === 1 ? "" : "s"} already generated and left untouched. `
                  : ""}
                {preview.locked > 0
                  ? `${preview.locked} approved or disbursed sheet${preview.locked === 1 ? "" : "s"} will not be rewritten.`
                  : ""}
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

export default function PayrollBulkPage() {
  return (
    <Suspense
      fallback={
        <div className="attendance-reports-page" style={{ padding: 24 }}>
          Loading payroll sheet…
        </div>
      }
    >
      <PayrollBulkContent />
    </Suspense>
  );
}
