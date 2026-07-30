"use client";

import {
  Tag,
  Button,
  Select,
  Modal,
  Form,
  Input,
  DatePicker,
  message,
  Tabs,
  Tooltip,
} from "antd";
import {
  CheckOutlined,
  CloseOutlined,
  RollbackOutlined,
  ReloadOutlined,
  DownloadOutlined,
  ThunderboltOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";

import RepHeader from "@/components/hrms/RepHeader";
import { HRMS_BACK } from "@/lib/hrms-nav";
import CommonTable from "@/components/common/CommonTable";
import StatCard from "@/components/common/StatCard";
import EmployeeSelect from "@/components/erp/EmployeeSelect";
import { ERP_TABLE_PROPS } from "@/components/common/erpStatusBadges";
import { leaveTypeColor, LEAVE_STATUS_LABEL, LEAVE_STATUS_COLOR } from "@/lib/leave-apply";
import { hrCannotActionOwnLeave, filterLeavesForHrApproval } from "@/lib/leave-approval-rules";
import { computeLeaveApprovalKpi } from "@/lib/hrms-leave-kpi";
import type { PermissionsMap } from "@/lib/permission-types";
import PageFilterPanel from "@/components/common/PageFilterPanel";
import { filterBySearch } from "@/lib/filter-search";

const LEAVE_TYPE_LABEL: Record<string, string> = {
  casual: "Casual",
  sick: "Sick",
  privilege: "Privilege",
  unpaid: "Unpaid",
};

function formatDate(v: unknown): string {
  if (v == null || v === "") return "—";
  const s = String(v);
  if (s.includes("→") || /[A-Za-z]{3}-\d{4}/.test(s)) return s;
  const d = dayjs(s);
  return d.isValid() ? d.format("DD MMM YYYY") : s;
}

export default function LeaveApprovalPage() {
  const [leaves, setLeaves] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [rollbackOpen, setRollbackOpen] = useState(false);
  const [rollbackId, setRollbackId] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [applyForm] = Form.useForm();
  const [rollbackForm] = Form.useForm();
  const [rejectForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [viewOpen, setViewOpen] = useState(false);
  const [viewRow, setViewRow] = useState<Record<string, unknown> | null>(null);
  const [viewer, setViewer] = useState<{
    employeeId?: string;
    role?: string;
    permissions?: PermissionsMap;
  } | null>(null);

  const isOwnLeave = (row: Record<string, unknown>) =>
    hrCannotActionOwnLeave(viewer ?? undefined, String(row.employeeId ?? ""));

  const openView = (row: Record<string, unknown>) => {
    setViewRow(row);
    setViewOpen(true);
  };
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrms/leave?forApproval=1");
      // Guard against HTML responses (auth redirect, 404 page, etc.)
      if (!res.headers.get("content-type")?.includes("application/json")) {
        setLeaves([]);
        return false;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");
      setLeaves(json.data || []);
      return true;
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to load");
      setLeaves([]);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    void fetch("/api/auth/session")
      .then((res) => res.json())
      .then((json) => {
        if (json?.data?.user) setViewer(json.data.user);
      })
      .catch(() => {});
  }, []);

  const approvalLeaves = useMemo(
    () =>
      filterLeavesForHrApproval(
        viewer ?? undefined,
        leaves as Array<Record<string, unknown> & { employeeId: string }>,
      ),
    [leaves, viewer],
  );

  const kpi = useMemo(() => computeLeaveApprovalKpi(approvalLeaves), [approvalLeaves]);

  const departmentOptions = useMemo(
    () =>
      Array.from(
        new Set(
          approvalLeaves
            .map((row) => String(row.department ?? "").trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [approvalLeaves],
  );

  const tableData = useMemo(() => {
    const byTab =
      activeTab === "all"
        ? approvalLeaves
        : approvalLeaves.filter((row) => String(row.status) === activeTab);
    const filtered = byTab.filter((row) => {
      if (leaveTypeFilter !== "all" && String(row.leaveType) !== leaveTypeFilter) return false;
      if (departmentFilter !== "all" && String(row.department) !== departmentFilter) return false;
      return true;
    });
    return filterBySearch(filtered, search, (row) => [
      String(row.employeeId ?? ""),
      String(row.employeeName ?? ""),
      String(row.department ?? ""),
      String(row.leaveType ?? ""),
      String(row.reason ?? ""),
      String(row.status ?? ""),
      String(row.fromDate ?? ""),
      String(row.toDate ?? ""),
    ]);
  }, [approvalLeaves, activeTab, search, leaveTypeFilter, departmentFilter]);

  const approve = async (id: string) => {
    try {
      const res = await fetch(`/api/hrms/leave/${id}/approve`, {
        method: "PATCH",
      });
      if (!res.headers.get("content-type")?.includes("application/json"))
        throw new Error("Server error");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");
      message.success("Approved");
      void load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const handleReject = async (values: { reason: string }) => {
    if (!rejectId) return;
    try {
      const res = await fetch(`/api/hrms/leave/${rejectId}/reject`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: values.reason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");
      message.success("Rejected");
      setRejectOpen(false);
      rejectForm.resetFields();
      void load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const handleRollback = async (values: { reason: string }) => {
    if (!rollbackId) return;
    try {
      const res = await fetch(`/api/hrms/leave/${rollbackId}/rollback`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: values.reason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");
      const emailNote = json?.data?.email?.sent
        ? " Employee notified by email."
        : "";
      message.success(`Rolled back.${emailNote}`);
      setRollbackOpen(false);
      rollbackForm.resetFields();
      void load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const bulkAction = async (action: "approve" | "reject") => {
    if (selectedRowKeys.length === 0) {
      message.warning("Select at least one row");
      return;
    }
    try {
      const res = await fetch("/api/hrms/leave/bulk-action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: selectedRowKeys, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");
      message.success(`${json.data.processed} records ${action}d`);
      setSelectedRowKeys([]);
      void load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed");
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyLeave = async (values: any) => {
    try {
      const fromDate = values.fromDate.format("YYYY-MM-DD");
      const toDate = values.toDate.format("YYYY-MM-DD");
      const days = values.toDate.diff(values.fromDate, "day") + 1;
      const res = await fetch("/api/hrms/leave", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...values, fromDate, toDate, days }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");
      message.success("Leave applied successfully");
      setApplyOpen(false);
      applyForm.resetFields();
      void load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const columns = [
    {
      title: "Emp ID",
      dataIndex: "employeeId",
      key: "eid",
      width: 100,
      render: (v: string) => (
        <span className="font-mono text-[12px] font-semibold">{v}</span>
      ),
    },
    {
      title: "Name",
      dataIndex: "employeeName",
      key: "name",
      render: (v: string) => <span className="font-semibold">{v}</span>,
    },
    { title: "Dept", dataIndex: "department", key: "dept", width: 120 },
    {
      title: "Type",
      dataIndex: "leaveType",
      key: "type",
      width: 90,
      render: (v: string) => LEAVE_TYPE_LABEL[v] || v,
    },
    {
      title: "From",
      dataIndex: "fromDate",
      key: "from",
      width: 105,
      render: (v: string) => dayjs(v).format("DD MMM YY"),
    },
    {
      title: "To",
      dataIndex: "toDate",
      key: "to",
      width: 105,
      render: (v: string) => dayjs(v).format("DD MMM YY"),
    },
    { title: "Days", dataIndex: "days", key: "days", width: 60 },
    { title: "Reason", dataIndex: "reason", key: "reason", ellipsis: true },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (v: string) => (
        <Tag
          color={LEAVE_STATUS_COLOR[v] || "default"}
          style={{ borderRadius: 20, border: 0, fontWeight: 600 }}
        >
          {LEAVE_STATUS_LABEL[v] || v}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 110,
      fixed: "right" as const,
      render: (_: unknown, row: Record<string, unknown>) => {
        const ownLeave = isOwnLeave(row);
        return (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Tooltip title="View details">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => openView(row)}
            />
          </Tooltip>
          {row.status === "pending" && !ownLeave && (
            <Tooltip title="Approve">
              <Button
                size="small"
                icon={<CheckOutlined />}
                style={{
                  background: "#059669",
                  borderColor: "#059669",
                  color: "#fff",
                }}
                onClick={() => approve(String(row._id))}
              />
            </Tooltip>
          )}
          {row.status === "pending" && !ownLeave && (
            <Tooltip title="Reject">
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={() => {
                  setRejectId(String(row._id));
                  setRejectOpen(true);
                }}
              />
            </Tooltip>
          )}
          {row.status === "pending" && ownLeave && (
            <Tooltip title="You cannot approve or reject your own leave">
              <span className="text-[11px] text-zinc-400">Self</span>
            </Tooltip>
          )}
          {row.status === "approved" && !ownLeave && (
            <Tooltip title="Rollback approval">
              <Button
                size="small"
                icon={<RollbackOutlined />}
                onClick={() => {
                  setRollbackId(String(row._id));
                  setRollbackOpen(true);
                }}
              />
            </Tooltip>
          )}
        </div>
        );
      },
    },
  ];

  const tabItems = [
    { key: "all", label: `All (${approvalLeaves.length})` },
    { key: "pending", label: `Pending (${approvalLeaves.filter((r) => r.status === "pending").length})` },
    { key: "approved", label: `Approved (${approvalLeaves.filter((r) => r.status === "approved").length})` },
    { key: "completed", label: `Completed (${approvalLeaves.filter((r) => r.status === "completed").length})` },
    { key: "rejected", label: `Rejected (${approvalLeaves.filter((r) => r.status === "rejected").length})` },
  ];

  return (
    <div className="attendance-reports-page">
      <RepHeader
        {...HRMS_BACK.leave}
        title="Leave Approval"
        subtitle="Approve, reject and manage leave requests"
        actions={
          <>
            {selectedRowKeys.length > 0 && (
              <>
                <Button
                  icon={<CheckOutlined />}
                  type="primary"
                  style={{ background: "#059669", borderColor: "#059669" }}
                  onClick={() => bulkAction("approve")}
                >
                  Approve ({selectedRowKeys.length})
                </Button>
                <Button
                  icon={<CloseOutlined />}
                  danger
                  onClick={() => bulkAction("reject")}
                >
                  Reject ({selectedRowKeys.length})
                </Button>
              </>
            )}
            <Button
              icon={<ReloadOutlined />}
              onClick={() => void load().then((ok) => ok && message.success("Refreshed"))}
              loading={loading}
            >
              Refresh
            </Button>
            <Button icon={<DownloadOutlined />}>Export</Button>
          </>
        }
      />

      {/* KPI cards */}
      <div className="attendance-kpi-grid attendance-kpi-grid--auto">
        <StatCard
          icon={ReloadOutlined}
          label="Pending approval"
          value={String(kpi.pending)}
          hint={`${kpi.pendingSla} SLA breach (>2 days)`}
          hintTone="warning"
        />
        <StatCard
          icon={CheckOutlined}
          label="Approved this month"
          value={String(kpi.approvedMonth)}
          hint={`${kpi.approvedDays} days · ${kpi.approvedEmployees} employees`}
          hintTone="positive"
        />
        <StatCard
          icon={CloseOutlined}
          label="Rejected this month"
          value={String(kpi.rejectedMonth)}
          hint="Balance or overlap"
        />
        <StatCard
          icon={ThunderboltOutlined}
          label="On leave today"
          value={String(kpi.onLeaveToday)}
          hint={kpi.onLeaveBreakdown}
        />
      </div>

      <PageFilterPanel
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search employee name, ID, leave type, reason…"
        activeFilterCount={(leaveTypeFilter !== "all" ? 1 : 0) + (departmentFilter !== "all" ? 1 : 0)}
        onApply={() => {}}
        onClear={() => {
          setSearch("");
          setLeaveTypeFilter("all");
          setDepartmentFilter("all");
        }}
        drawerWidth={320}
      >
        <div className="arf-item">
          <span className="arf-label">Leave Type</span>
          <Select
            className="w-full"
            value={leaveTypeFilter}
            onChange={setLeaveTypeFilter}
            options={[
              { value: "all", label: "All types" },
              ...Object.entries(LEAVE_TYPE_LABEL).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
        </div>
        <div className="arf-item">
          <span className="arf-label">Department</span>
          <Select
            className="w-full"
            value={departmentFilter}
            onChange={setDepartmentFilter}
            options={[
              { value: "all", label: "All departments" },
              ...departmentOptions.map((d) => ({ value: d, label: d })),
            ]}
          />
        </div>
      </PageFilterPanel>

      {/* Leave table */}
      <div className="attendance-report-section">
        <Tabs
          activeKey={activeTab}
          onChange={(k) => {
            setActiveTab(k);
            setSelectedRowKeys([]);
          }}
          style={{ padding: "0 20px" }}
          items={tabItems.map((t) => ({
            key: t.key,
            label: t.label,
            children: (
              <div style={{ paddingBottom: 16 }}>
                <CommonTable
                  {...ERP_TABLE_PROPS}
                  loading={loading}
                  dataSource={tableData}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  columns={columns as any}
                  rowKey="_id"
                  size="middle"
                  className="attendance-report-table"
                  rowSelection={{
                    selectedRowKeys,
                    onChange: (keys) => setSelectedRowKeys(keys as string[]),
                    getCheckboxProps: (record) => ({
                      disabled: isOwnLeave(record as Record<string, unknown>),
                    }),
                  }}
                  pagination={{
                    pageSize: 15,
                    showSizeChanger: true,
                    showTotal: (n) => `${n} records`,
                  }}
                  scroll={{ x: 1200 }}
                  locale={{
                    emptyText: (
                      <div className="py-8 text-center text-zinc-400 font-medium">
                        No leave requests
                      </div>
                    ),
                  }}
                />
              </div>
            ),
          }))}
        />
      </div>

      {/* View detail modal */}
      <Modal
        title="Leave request details"
        open={viewOpen}
        onCancel={() => {
          setViewOpen(false);
          setViewRow(null);
        }}
        width={520}
        footer={
          viewRow?.status === "pending" && !isOwnLeave(viewRow) ? (
            <div className="leave-view-modal-footer">
              <Button onClick={() => setViewOpen(false)}>Close</Button>
              <Button
                danger
                icon={<CloseOutlined />}
                onClick={() => {
                  setRejectId(String(viewRow._id));
                  setViewOpen(false);
                  setRejectOpen(true);
                }}
              >
                Reject
              </Button>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                style={{ background: "#059669", borderColor: "#059669" }}
                onClick={() => {
                  void approve(String(viewRow._id));
                  setViewOpen(false);
                  setViewRow(null);
                }}
              >
                Approve
              </Button>
            </div>
          ) : viewRow?.status === "pending" && isOwnLeave(viewRow) ? (
            <div className="leave-view-modal-footer">
              <span className="text-[13px] text-zinc-500">
                You cannot approve or reject your own leave request.
              </span>
              <Button onClick={() => setViewOpen(false)}>Close</Button>
            </div>
          ) : (
            <Button
              onClick={() => {
                setViewOpen(false);
                setViewRow(null);
              }}
            >
              Close
            </Button>
          )
        }
      >
        {viewRow && (
          <dl className="leave-view-detail">
            <div className="leave-view-detail__row">
              <dt>Employee</dt>
              <dd>
                <strong>{String(viewRow.employeeName ?? "—")}</strong>
                <span className="leave-view-detail__muted">
                  {" "}
                  · {String(viewRow.employeeId ?? "")}
                </span>
              </dd>
            </div>
            <div className="leave-view-detail__row">
              <dt>Department</dt>
              <dd>{String(viewRow.department ?? "—")}</dd>
            </div>
            <div className="leave-view-detail__row">
              <dt>Leave type</dt>
              <dd>
                <Tag color={leaveTypeColor(String(viewRow.leaveType ?? ""))}>
                  {LEAVE_TYPE_LABEL[String(viewRow.leaveType)] ||
                    String(viewRow.leaveType ?? "—")}
                </Tag>
              </dd>
            </div>
            <div className="leave-view-detail__row">
              <dt>Dates</dt>
              <dd>
                {formatDate(viewRow.fromDate)} → {formatDate(viewRow.toDate)}
              </dd>
            </div>
            <div className="leave-view-detail__row">
              <dt>Days</dt>
              <dd>{String(viewRow.days ?? "—")}</dd>
            </div>
            <div className="leave-view-detail__row">
              <dt>Reason</dt>
              <dd>{String(viewRow.description ?? viewRow.reason ?? "—")}</dd>
            </div>
            {viewRow.balanceAfter != null && (
              <div className="leave-view-detail__row">
                <dt>Balance after</dt>
                <dd>{String(viewRow.balanceAfter)}</dd>
              </div>
            )}
            <div className="leave-view-detail__row">
              <dt>Applied on</dt>
              <dd>{formatDate(viewRow.appliedOn ?? viewRow.createdAt)}</dd>
            </div>
            {viewRow.contact != null && String(viewRow.contact) !== "" && (
              <div className="leave-view-detail__row">
                <dt>Contact</dt>
                <dd>{String(viewRow.contact)}</dd>
              </div>
            )}
            <div className="leave-view-detail__row">
              <dt>Status</dt>
              <dd>
                <Tag
                  color={LEAVE_STATUS_COLOR[String(viewRow.status)] || "default"}
                  style={{ borderRadius: 20, border: 0 }}
                >
                  {LEAVE_STATUS_LABEL[String(viewRow.status)] ||
                    String(viewRow.status)}
                </Tag>
              </dd>
            </div>
          </dl>
        )}
      </Modal>

      {/* Apply leave modal */}
      <Modal
        title="Apply for leave"
        open={applyOpen}
        onCancel={() => {
          setApplyOpen(false);
          applyForm.resetFields();
        }}
        footer={null}
        width={480}
      >
        <Form
          form={applyForm}
          layout="vertical"
          onFinish={applyLeave}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="employeeId"
            label="Employee"
            rules={[{ required: true, message: "Select an employee" }]}
          >
            <EmployeeSelect
              placeholder="Search by name or ID"
              allowClear={false}
            />
          </Form.Item>
          <Form.Item
            name="leaveType"
            label="Leave type"
            rules={[{ required: true }]}
          >
            <Select>
              {Object.entries(LEAVE_TYPE_LABEL).map(([k, v]) => (
                <Select.Option key={k} value={k}>
                  {v}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item
              name="fromDate"
              label="From date"
              rules={[{ required: true }]}
            >
              <DatePicker className="w-full" />
            </Form.Item>
            <Form.Item
              name="toDate"
              label="To date"
              rules={[{ required: true }]}
            >
              <DatePicker className="w-full" />
            </Form.Item>
          </div>
          <Form.Item name="reason" label="Reason">
            <Input.TextArea rows={3} placeholder="Reason for leave" />
          </Form.Item>
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => {
                setApplyOpen(false);
                applyForm.resetFields();
              }}
            >
              Cancel
            </Button>
            <Button type="primary" htmlType="submit">
              Submit
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Reject modal */}
      <Modal
        title="Reject leave"
        open={rejectOpen}
        onCancel={() => {
          setRejectOpen(false);
          rejectForm.resetFields();
        }}
        footer={null}
        width={400}
      >
        <Form
          form={rejectForm}
          layout="vertical"
          onFinish={handleReject}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="reason"
            label="Rejection reason"
            rules={[{ required: true, message: "Reason is required" }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => {
                setRejectOpen(false);
                rejectForm.resetFields();
              }}
            >
              Cancel
            </Button>
            <Button danger htmlType="submit">
              Reject
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Rollback modal */}
      <Modal
        title="Rollback approved leave"
        open={rollbackOpen}
        onCancel={() => {
          setRollbackOpen(false);
          rollbackForm.resetFields();
        }}
        footer={null}
        width={400}
      >
        <Form
          form={rollbackForm}
          layout="vertical"
          onFinish={handleRollback}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="reason"
            label="Rollback reason"
            rules={[{ required: true, message: "Reason is required" }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => {
                setRollbackOpen(false);
                rollbackForm.resetFields();
              }}
            >
              Cancel
            </Button>
            <Button
              htmlType="submit"
              style={{
                background: "#7c3aed",
                borderColor: "#7c3aed",
                color: "#fff",
              }}
            >
              Rollback
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
