"use client";

import { Suspense, use, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Alert,
  Button,
  DatePicker,
  Form,
  Input,
  Modal,
  Select,
  Spin,
  Tag,
  message,
} from "antd";
import {
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  RollbackOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import RepHeader from "@/components/hrms/RepHeader";
import { HRMS_BACK } from "@/lib/hrms-nav";
import {
  API_LEAVE_LABELS,
  LEAVE_STATUS_COLOR,
  LEAVE_STATUS_LABEL,
} from "@/lib/leave-apply";
import type { PermissionsMap } from "@/lib/permission-types";
import { hrCannotActionOwnLeave } from "@/lib/leave-approval-rules";

type LeaveDetail = {
  _id: string;
  employeeId: string;
  employeeName: string;
  department?: string;
  reportingManager?: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason?: string;
  status: string;
  hrApprovedBy?: string;
  hrApprovedAt?: string;
  rejectionReason?: string;
  rollbackReason?: string;
  createdAt?: string;
};

type EditForm = {
  leaveType: string;
  range: [dayjs.Dayjs, dayjs.Dayjs];
  reason: string;
};

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="salary-edit-page__readonly-item">
      <dt>{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}

function LeaveRecordContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();

  const [form] = Form.useForm<EditForm>();
  const [rejectForm] = Form.useForm<{ reason: string }>();
  const [rollbackForm] = Form.useForm<{ reason: string }>();
  const [leave, setLeave] = useState<LeaveDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState(false);
  const [editMode, setEditMode] = useState(searchParams.get("edit") === "1");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rollbackOpen, setRollbackOpen] = useState(false);
  const [viewer, setViewer] = useState<{
    employeeId?: string;
    role?: string;
    permissions?: PermissionsMap;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hrms/leave/${encodeURIComponent(id)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load leave request");
      const l = json.data?.leave;
      if (!l) throw new Error("Leave request not found");
      setLeave(l);
      form.setFieldsValue({
        leaveType: l.leaveType,
        range: [dayjs(l.fromDate), dayjs(l.toDate)],
        reason: l.reason ?? "",
      });
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to load");
      setLeave(null);
    } finally {
      setLoading(false);
    }
  }, [id, form]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetch("/api/auth/session")
      .then((res) => res.json())
      .then((json) => {
        if (json?.data?.user) setViewer(json.data.user);
      })
      .catch(() => {});
  }, []);

  const editable = leave?.status === "pending";
  const ownLeave = leave ? hrCannotActionOwnLeave(viewer ?? undefined, leave.employeeId) : false;

  const cycleLabel = useMemo(() => {
    if (!leave) return "";
    return `${dayjs(leave.fromDate).format("DD MMM YYYY")} → ${dayjs(leave.toDate).format("DD MMM YYYY")}`;
  }, [leave]);

  const onFinish = async (values: EditForm) => {
    if (!leave || !editable) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/hrms/leave/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          leaveType: values.leaveType,
          fromDate: values.range[0].format("YYYY-MM-DD"),
          toDate: values.range[1].format("YYYY-MM-DD"),
          reason: values.reason,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Save failed");
      message.success("Leave request updated");
      setEditMode(false);
      void load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const act = async (action: "approve" | "reject" | "rollback", reason?: string) => {
    setActing(true);
    try {
      const res = await fetch(`/api/hrms/leave/${encodeURIComponent(id)}/${action}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: reason ? JSON.stringify({ reason }) : undefined,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");
      message.success(
        action === "approve" ? "Approved" : action === "reject" ? "Rejected" : "Rolled back",
      );
      void load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setActing(false);
    }
  };

  const submitReject = async (values: { reason: string }) => {
    await act("reject", values.reason);
    setRejectOpen(false);
    rejectForm.resetFields();
  };

  const submitRollback = async (values: { reason: string }) => {
    await act("rollback", values.reason);
    setRollbackOpen(false);
    rollbackForm.resetFields();
  };

  if (loading) {
    return (
      <div className="emp-details-page__loading">
        <Spin size="large" description="Loading leave request…" />
      </div>
    );
  }

  if (!leave) {
    return (
      <div className="attendance-reports-page">
        <RepHeader
          {...HRMS_BACK.leave}
          title="Leave request"
          subtitle="Leave request not found"
        />
      </div>
    );
  }

  const formDisabled = !editMode || !editable;

  return (
    <div className="attendance-reports-page salary-edit-page">
      <RepHeader
        {...HRMS_BACK.leave}
        title="Leave request"
        subtitle={`${leave.employeeName} · ${leave.employeeId} · ${cycleLabel}`}
        actions={
          <>
            {leave.status === "pending" && !ownLeave ? (
              <>
                <Button
                  danger
                  icon={<CloseOutlined />}
                  loading={acting}
                  onClick={() => setRejectOpen(true)}
                >
                  Reject
                </Button>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={acting}
                  style={{ background: "#059669", border: "none" }}
                  onClick={() => void act("approve")}
                >
                  Approve
                </Button>
              </>
            ) : null}
            {leave.status === "approved" && !ownLeave ? (
              <Button icon={<RollbackOutlined />} loading={acting} onClick={() => setRollbackOpen(true)}>
                Rollback approval
              </Button>
            ) : null}
            {!editMode && editable ? (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => setEditMode(true)}
                style={{ background: "#374d95", border: "none" }}
              >
                Edit details
              </Button>
            ) : null}
            {editMode && editable ? (
              <>
                <Button onClick={() => setEditMode(false)} disabled={saving}>
                  Cancel edit
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={saving}
                  onClick={() => form.submit()}
                  style={{ background: "#16a34a", border: "none" }}
                >
                  Save changes
                </Button>
              </>
            ) : null}
          </>
        }
      />

      <div className="salary-edit-page__main">
        <div className="salary-edit-page__card">
          {ownLeave && leave.status === "pending" && (
            <Alert
              type="info"
              showIcon
              message="This is your own leave request — you cannot approve, reject or edit its status."
            />
          )}
          {!editable && (
            <Alert
              type="info"
              showIcon
              message={`This leave request is ${LEAVE_STATUS_LABEL[leave.status] || leave.status} and its details can no longer be edited.`}
            />
          )}

          <div className="emp-form-subpanel">
            <div className="emp-form-subpanel__head">
              <div className="emp-form-subpanel__head-main">
                <span>Employee &amp; status</span>
              </div>
              <Tag
                color={LEAVE_STATUS_COLOR[leave.status] || "default"}
                style={{ borderRadius: 20, border: 0, fontWeight: 600 }}
              >
                {LEAVE_STATUS_LABEL[leave.status] || leave.status}
              </Tag>
            </div>

            <dl className="salary-edit-page__readonly">
              <ReadonlyField label="Employee" value={`${leave.employeeName} (${leave.employeeId})`} />
              <ReadonlyField label="Department" value={leave.department ?? "—"} />
              <ReadonlyField label="Reporting manager" value={leave.reportingManager ?? "—"} />
              <ReadonlyField
                label="Applied on"
                value={leave.createdAt ? dayjs(leave.createdAt).format("DD MMM YYYY") : "—"}
              />
              {leave.hrApprovedBy && (
                <ReadonlyField
                  label="Approved by"
                  value={`${leave.hrApprovedBy}${leave.hrApprovedAt ? " · " + dayjs(leave.hrApprovedAt).format("DD MMM YYYY") : ""}`}
                />
              )}
              {leave.rejectionReason && (
                <ReadonlyField label="Rejection reason" value={leave.rejectionReason} />
              )}
              {leave.rollbackReason && (
                <ReadonlyField label="Rollback reason" value={leave.rollbackReason} />
              )}
            </dl>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            disabled={formDisabled}
            requiredMark="optional"
          >
            <div className="emp-form-subpanel">
              <div className="emp-form-subpanel__head">
                <div className="emp-form-subpanel__head-main">
                  <span>Leave details</span>
                </div>
              </div>
              <div className="salary-edit-page__grid">
                <Form.Item
                  name="leaveType"
                  label="Leave type"
                  rules={[{ required: true, message: "Select a leave type" }]}
                >
                  <Select
                    options={Object.entries(API_LEAVE_LABELS).map(([value, label]) => ({
                      value,
                      label,
                    }))}
                  />
                </Form.Item>
                <Form.Item
                  name="range"
                  label="From — To"
                  rules={[{ required: true, message: "Select the leave dates" }]}
                  className="emp-form-grid__full"
                  style={{ gridColumn: "span 2" }}
                >
                  <DatePicker.RangePicker className="w-full" />
                </Form.Item>
                <Form.Item
                  name="reason"
                  label="Reason"
                  className="emp-form-grid__full"
                  style={{ gridColumn: "span 3" }}
                >
                  <Input.TextArea rows={3} placeholder="Reason for leave" />
                </Form.Item>
              </div>
            </div>
          </Form>
        </div>
      </div>

      <Modal
        title="Reject leave"
        open={rejectOpen}
        onCancel={() => {
          setRejectOpen(false);
          rejectForm.resetFields();
        }}
        footer={null}
        width={400}
        destroyOnClose
      >
        <Form form={rejectForm} layout="vertical" onFinish={submitReject} style={{ marginTop: 16 }}>
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
            <Button danger htmlType="submit" loading={acting}>
              Reject
            </Button>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Rollback approved leave"
        open={rollbackOpen}
        onCancel={() => {
          setRollbackOpen(false);
          rollbackForm.resetFields();
        }}
        footer={null}
        width={400}
        destroyOnClose
      >
        <Form form={rollbackForm} layout="vertical" onFinish={submitRollback} style={{ marginTop: 16 }}>
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
              loading={acting}
              style={{ background: "#7c3aed", borderColor: "#7c3aed", color: "#fff" }}
            >
              Rollback
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

export default function LeaveRecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="emp-details-page__loading">
          <Spin size="large" description="Loading leave request…" />
        </div>
      }
    >
      <LeaveRecordContent params={params} />
    </Suspense>
  );
}
