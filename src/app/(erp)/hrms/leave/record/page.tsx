"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Select, Tag, Dropdown, message } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import RepHeader from "@/components/hrms/RepHeader";
import { HRMS_BACK } from "@/lib/hrms-nav";
import CommonTable, { type CommonTableColumn } from "@/components/common/CommonTable";
import ReportSection from "@/components/hrms/ReportSection";
import EmployeeSelect from "@/components/erp/EmployeeSelect";
import PageFilterPanel from "@/components/common/PageFilterPanel";
import { ViewEditActions } from "@/components/common/TableActionIcons";
import { leaveTypeColor } from "@/lib/leave-apply";
import { filterBySearch } from "@/lib/filter-search";

type LeaveHistoryRow = {
  id: string;
  type: string;
  typeColor: string;
  from: string;
  to: string;
  days: number;
  reason: string;
  approver: string;
  appliedOn: string;
  status: "Approved" | "Pending" | "Cancelled" | "Completed";
};

const TYPE_META: Record<string, { idle: string; idleBg: string; active: string }> = {
  All: { idle: "#374d95", idleBg: "#eef1fa", active: "#374d95" },
  PL: { idle: "#059669", idleBg: "#e3f4ea", active: "#059669" },
  CL: { idle: "#2563eb", idleBg: "#dbeafe", active: "#2563eb" },
  SL: { idle: "#dc2626", idleBg: "#fee2e2", active: "#dc2626" },
  "Comp.Off": { idle: "#d97706", idleBg: "#fef3c7", active: "#d97706" },
  OD: { idle: "#7c3aed", idleBg: "#ede9fe", active: "#7c3aed" },
};

const LEAVE_TYPE_LABEL: Record<string, string> = {
  casual: "CL",
  sick: "SL",
  privilege: "PL",
  unpaid: "Unpaid",
};

const STATUS_COLOR = {
  Approved: "success",
  Pending: "processing",
  Cancelled: "error",
  Completed: "cyan",
} as const;

function LeaveTypeFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
        padding: "14px 20px 10px",
        borderBottom: "1px solid var(--border)",
      }}
    >
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

function mapLeaveStatus(status: string): LeaveHistoryRow["status"] {
  if (status === "completed") return "Completed";
  if (status === "approved") return "Approved";
  if (status === "pending" || status === "rolled_back") return "Pending";
  return "Cancelled";
}

export default function LeaveRecordPage() {
  const [employee, setEmployee] = useState<string | undefined>(undefined);
  const [year, setYear] = useState(String(dayjs().year()));
  const [typeFilter, setTypeFilter] = useState("All");
  const [search, setSearch] = useState("");

  const [leaves, setLeaves] = useState<Record<string, unknown>[]>([]);
  const [employees, setEmployees] = useState<
    { employeeId: string; fullName: string; department?: string; designation?: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch("/api/hrms/leave").then((r) => r.json()),
      fetch("/api/hrms/employees").then((r) => r.json()),
    ])
      .then(([leaveJson, empJson]) => {
        if (cancelled) return;
        setLeaves(Array.isArray(leaveJson?.data) ? leaveJson.data : []);
        setEmployees(Array.isArray(empJson?.data) ? empJson.data : []);
      })
      .catch(() => {
        if (!cancelled) {
          setLeaves([]);
          setEmployees([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedEmployee = employees.find((e) => e.employeeId === employee);

  const history = useMemo((): LeaveHistoryRow[] => {
    const yearNum = Number(year);
    return leaves
      .filter((l) => !employee || String(l.employeeId) === employee)
      .filter((l) => {
        const from = dayjs(String(l.fromDate ?? ""));
        return !yearNum || !from.isValid() || from.year() === yearNum;
      })
      .map((l) => {
        const leaveType = String(l.leaveType ?? "");
        const typeLabel = LEAVE_TYPE_LABEL[leaveType] ?? leaveType;
        return {
          id: String(l._id ?? ""),
          type: typeLabel,
          typeColor: leaveTypeColor(leaveType),
          from: dayjs(String(l.fromDate)).isValid()
            ? dayjs(String(l.fromDate)).format("DD MMM YYYY")
            : "—",
          to: dayjs(String(l.toDate)).isValid()
            ? dayjs(String(l.toDate)).format("DD MMM YYYY")
            : "—",
          days: Number(l.days ?? 0),
          reason: String(l.reason ?? "—"),
          approver: String(l.hrApprovedBy ?? l.reportingManager ?? "—"),
          appliedOn: dayjs(String(l.createdAt ?? "")).isValid()
            ? dayjs(String(l.createdAt)).format("DD MMM YYYY")
            : "—",
          status: mapLeaveStatus(String(l.status ?? "")),
        };
      });
  }, [leaves, employee, year]);

  const filteredHistory = useMemo(() => {
    const byType =
      typeFilter === "All"
        ? history
        : history.filter((h) => h.type === typeFilter);
    return filterBySearch(byType, search, (h) => [
      h.type,
      h.from,
      h.to,
      h.reason,
      h.approver,
      h.appliedOn,
      h.status,
      selectedEmployee?.fullName,
      selectedEmployee?.employeeId,
      selectedEmployee?.department,
      selectedEmployee?.designation,
    ]);
  }, [history, typeFilter, search, selectedEmployee]);

  const yearOptions = useMemo(() => {
    const years = new Set<number>([dayjs().year()]);
    for (const l of leaves) {
      const y = dayjs(String(l.fromDate ?? "")).year();
      if (Number.isFinite(y)) years.add(y);
    }
    return [...years]
      .sort((a, b) => b - a)
      .map((y) => ({ value: String(y), label: String(y) }));
  }, [leaves]);

  const handleClearFilters = () => {
    setSearch("");
    setEmployee(undefined);
    setYear(String(dayjs().year()));
    setTypeFilter("All");
  };

  const tp = {
    bordered: false as const,
    size: "middle" as const,
    className: "attendance-report-table",
  };

  const historyColumns: CommonTableColumn<LeaveHistoryRow>[] = [
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (t: string, r) => <Tag color={r.typeColor}>{t}</Tag>,
    },
    { title: "From", dataIndex: "from", key: "from" },
    { title: "To", dataIndex: "to", key: "to" },
    { title: "Days", dataIndex: "days", key: "days", width: 60 },
    { title: "Reason", dataIndex: "reason", key: "reason", ellipsis: true },
    { title: "Approver", dataIndex: "approver", key: "approver" },
    { title: "Applied on", dataIndex: "appliedOn", key: "applied" },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (s: LeaveHistoryRow["status"]) => (
        <Tag color={STATUS_COLOR[s]}>{s}</Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 90,
      fixed: "right" as const,
      render: (_, r) => (
        <ViewEditActions
          viewHref={`/hrms/leave/record/${encodeURIComponent(r.id)}`}
          editHref={`/hrms/leave/record/${encodeURIComponent(r.id)}?edit=1`}
          viewLabel="View leave"
          editLabel="Edit / change status"
        />
      ),
    },
  ];

  return (
    <div className="attendance-reports-page">
      <RepHeader
        {...HRMS_BACK.dashboard}
        title="Leave Record"
        subtitle="Leave history for your team"
        actions={
          <Dropdown
            menu={{
              items: [
                { key: "xls", label: "Export as Excel (XLSX)" },
                { key: "pdf", label: "Export as PDF" },
              ],
              onClick: async ({ key }) => {
                const headers = ["Type", "From", "To", "Days", "Reason", "Approver", "Applied On", "Status"];
                const body = filteredHistory.map(h => [
                  h.type, h.from, h.to, h.days, h.reason, h.approver, h.appliedOn, h.status
                ]);
                const fileName = `leave_record_${new Date().toISOString().split("T")[0]}`;
                if (key === "xls") {
                  const XLSX = await import("xlsx");
                  const ws = XLSX.utils.aoa_to_sheet([headers, ...body]);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Leave Record");
                  XLSX.writeFile(wb, `${fileName}.xlsx`);
                } else {
                  const { jsPDF } = await import("jspdf");
                  const { default: autoTable } = await import("jspdf-autotable");
                  const doc = new jsPDF({ orientation: "landscape" });
                  doc.text("Leave Record", 14, 15);
                  autoTable(doc, {
                    head: [headers],
                    body,
                    startY: 20,
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [37, 99, 235] },
                  });
                  doc.save(`${fileName}.pdf`);
                }
                message.success(`Exported as ${key === "xls" ? "Excel" : "PDF"}`);
              },
            }}
            placement="bottomRight"
          >
            <Button icon={<DownloadOutlined />}>Export</Button>
          </Dropdown>
        }
      />

      <PageFilterPanel
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search leave type, reason, approver…"
        activeFilterCount={
          (employee ? 1 : 0) + (year !== String(dayjs().year()) ? 1 : 0)
        }
        onApply={() => {}}
        onClear={handleClearFilters}
      >
        <div className="arf-item">
          <span className="arf-label">Employee</span>
          <EmployeeSelect value={employee} onChange={(v) => setEmployee(v)} />
        </div>
        <div className="arf-item">
          <span className="arf-label">Leave year</span>
          <Select
            className="w-full"
            value={year}
            onChange={setYear}
            options={yearOptions}
          />
        </div>
      </PageFilterPanel>

      {selectedEmployee ? (
        <div className="lv-emp-card">
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 4,
              }}
            >
              <h2 className="lv-emp-card__name">{selectedEmployee.fullName}</h2>
            </div>
            <p className="lv-emp-card__meta">
              {selectedEmployee.employeeId}
              {selectedEmployee.department
                ? ` · ${selectedEmployee.department}`
                : ""}
              {selectedEmployee.designation
                ? ` · ${selectedEmployee.designation}`
                : ""}
            </p>
          </div>
        </div>
      ) : null}

      <ReportSection title="Leave history" meta={`FY ${year}`} flush>
        <LeaveTypeFilter value={typeFilter} onChange={setTypeFilter} />
        <CommonTable
          {...tp}
          loading={loading}
          columns={historyColumns}
          dataSource={filteredHistory}
          rowKey="id"
          scroll={{ x: 1100 }}
          pagination={{ pageSize: 15, showTotal: (n) => `${n} records` }}
          locale={{
            emptyText: (
              <div className="py-8 text-center text-zinc-400 font-medium">
                No leave records found
              </div>
            ),
          }}
        />
      </ReportSection>
    </div>
  );
}
