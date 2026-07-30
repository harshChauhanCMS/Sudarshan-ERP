"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Switch,
  Tag,
  message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";

import CommonTable from "@/components/common/CommonTable";
import ReportSection from "@/components/hrms/ReportSection";
import { ViewEditActions } from "@/components/common/TableActionIcons";
import { ERP_TABLE_PROPS } from "@/components/common/erpStatusBadges";
import PageFilterPanel from "@/components/common/PageFilterPanel";
import { filterBySearch } from "@/lib/filter-search";
import type { Shift } from "@/hooks/use-shifts";
import {
  WEEKLY_OFF_OPTIONS,
  crossesMidnight,
  formatDuration,
  formatMinutes,
  shiftWorkMinutes,
  splitMinutes,
  toMinutes,
} from "@/lib/shift-utils";

const HOURS = Array.from({ length: 24 }, (_, h) => ({
  value: h,
  label: String(h).padStart(2, "0"),
}));

/** 5-minute granularity — finer than that is noise for a shift roster. */
const MINUTES = Array.from({ length: 12 }, (_, i) => ({
  value: i * 5,
  label: String(i * 5).padStart(2, "0"),
}));

type TimeValue = { hour: number; minute: number };

/**
 * Separate hour and minute selects rather than a free-text time field: the
 * value can only ever be a real time, so nothing downstream has to parse it.
 */
function TimeSelect({
  value,
  onChange,
  id,
}: {
  value?: TimeValue;
  onChange?: (v: TimeValue) => void;
  id?: string;
}) {
  const current = value ?? { hour: 9, minute: 0 };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <Select
        id={id}
        style={{ flex: 1, minWidth: 76 }}
        value={current.hour}
        options={HOURS}
        onChange={(hour) => onChange?.({ ...current, hour })}
        aria-label="Hour"
      />
      <span style={{ fontWeight: 600 }}>:</span>
      <Select
        style={{ flex: 1, minWidth: 76 }}
        value={current.minute}
        options={MINUTES}
        onChange={(minute) => onChange?.({ ...current, minute })}
        aria-label="Minute"
      />
    </div>
  );
}

type ShiftFormValues = {
  code: string;
  name: string;
  start: TimeValue;
  end: TimeValue;
  breakMinutes: number;
  weeklyOff: string;
  isActive: boolean;
  description?: string;
};

const EMPTY_FORM: ShiftFormValues = {
  code: "",
  name: "",
  start: { hour: 9, minute: 0 },
  end: { hour: 18, minute: 0 },
  breakMinutes: 30,
  weeklyOff: "Sunday",
  isActive: true,
  description: "",
};

export function ShiftsEditor() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form] = Form.useForm<ShiftFormValues>();

  // Watched so the live duration preview updates as the selects change.
  const start = Form.useWatch("start", form);
  const end = Form.useWatch("end", form);
  const breakMinutes = Form.useWatch("breakMinutes", form);

  const preview = useMemo(() => {
    if (!start || !end) return null;
    const s = toMinutes(start.hour, start.minute);
    const e = toMinutes(end.hour, end.minute);
    if (s === e) return { error: "Start and end time cannot be the same" };
    const work = shiftWorkMinutes(s, e, breakMinutes ?? 0);
    if (work <= 0) return { error: "Break must be shorter than the shift itself" };
    return {
      text: `${formatMinutes(s)} → ${formatMinutes(e)} · ${formatDuration(work)} paid`,
      night: crossesMidnight(s, e),
    };
  }, [start, end, breakMinutes]);

  const filtered = useMemo(() => {
    const byStatus = shifts.filter((s) => {
      if (statusFilter === "active") return s.isActive !== false;
      if (statusFilter === "inactive") return s.isActive === false;
      return true;
    });
    return filterBySearch(byStatus, search, (s) => [s.code, s.name, s.weeklyOff]);
  }, [shifts, search, statusFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrms/shifts", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || json?.error) throw new Error(json?.error || "Failed to load");
      setShifts(json.data || []);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to load shifts");
      setShifts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch on mount; `load` is stable so this runs once.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (shift: Shift) => {
    setEditing(shift);
    form.setFieldsValue({
      code: shift.code,
      name: shift.name,
      start: splitMinutes(shift.startMinutes),
      end: splitMinutes(shift.endMinutes),
      breakMinutes: shift.breakMinutes ?? 0,
      weeklyOff: shift.weeklyOff ?? "Sunday",
      isActive: shift.isActive !== false,
      description: shift.description ?? "",
    });
    setModalOpen(true);
  };

  const submit = async () => {
    const values = await form.validateFields();
    const payload = {
      code: values.code,
      name: values.name,
      startMinutes: toMinutes(values.start.hour, values.start.minute),
      endMinutes: toMinutes(values.end.hour, values.end.minute),
      breakMinutes: values.breakMinutes ?? 0,
      weeklyOff: values.weeklyOff,
      isActive: values.isActive,
      description: values.description ?? "",
    };

    setSaving(true);
    try {
      const res = await fetch(
        editing ? `/api/hrms/shifts/${editing._id}` : "/api/hrms/shifts",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok || json?.error) throw new Error(json?.error || "Save failed");
      message.success(editing ? "Shift updated." : "Shift created.");
      setModalOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (shift: Shift) => {
    try {
      const res = await fetch(`/api/hrms/shifts/${shift._id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || json?.error) throw new Error(json?.error || "Delete failed");
      // Shifts in use are deactivated instead — surface that, don't imply a delete.
      message.success(json.data?.message ?? "Shift deleted.");
      await load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const columns = useMemo(
    () => [
      {
        title: "Code",
        dataIndex: "code",
        key: "code",
        width: 90,
        render: (code: string) => <span className="mono strong">{code}</span>,
      },
      { title: "Shift", dataIndex: "name", key: "name" },
      {
        title: "Timing",
        key: "timing",
        render: (_: unknown, s: Shift) => (
          <span className="mono">
            {formatMinutes(s.startMinutes)} – {formatMinutes(s.endMinutes)}
          </span>
        ),
      },
      {
        title: "Paid hours",
        key: "duration",
        render: (_: unknown, s: Shift) => (
          <span>
            {formatDuration(
              shiftWorkMinutes(s.startMinutes, s.endMinutes, s.breakMinutes ?? 0)
            )}
            {s.breakMinutes ? (
              <span className="muted" style={{ fontSize: 11 }}>
                {" "}
                (−{s.breakMinutes}m break)
              </span>
            ) : null}
          </span>
        ),
      },
      {
        title: "Weekly off",
        dataIndex: "weeklyOff",
        key: "weeklyOff",
        render: (v: string) => v || "—",
      },
      {
        title: "Type",
        key: "type",
        render: (_: unknown, s: Shift) =>
          s.isNightShift ? <Tag color="purple">Night</Tag> : <Tag>Day</Tag>,
      },
      {
        title: "Status",
        key: "status",
        render: (_: unknown, s: Shift) =>
          s.isActive === false ? (
            <Tag color="default">Inactive</Tag>
          ) : (
            <Tag color="green">Active</Tag>
          ),
      },
      {
        title: "Actions",
        key: "actions",
        width: 96,
        align: "center" as const,
        render: (_: unknown, s: Shift) => (
          <ViewEditActions
            showView={false}
            showDelete
            onEdit={() => openEdit(s)}
            onDelete={() => remove(s)}
            deleteConfirmTitle={`Delete ${s.name}?`}
          />
        ),
      },
    ],
    []
  );

  return (
    <ReportSection
      title="Shifts"
      meta="Available for assignment on the employee form"
    >
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 12,
        }}
      >
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add shift
        </Button>
      </div>
      <PageFilterPanel
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search code, name or weekly off…"
        activeFilterCount={statusFilter === "all" ? 0 : 1}
        onApply={() => {}}
        onClear={() => {
          setSearch("");
          setStatusFilter("all");
        }}
        drawerWidth={300}
      >
        <div className="arf-item">
          <span className="arf-label">Status</span>
          <Select
            className="w-full"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "All shifts" },
              { value: "active", label: "Active only" },
              { value: "inactive", label: "Inactive only" },
            ]}
          />
        </div>
      </PageFilterPanel>
      <CommonTable
        {...ERP_TABLE_PROPS}
        columns={columns}
        dataSource={filtered}
        rowKey="_id"
        loading={loading}
        locale={{ emptyText: <span className="muted">No shifts defined yet.</span> }}
      />

      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={submit}
        okText={editing ? "Save changes" : "Create shift"}
        confirmLoading={saving}
        title={editing ? `Edit ${editing.name}` : "Add shift"}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" initialValues={EMPTY_FORM}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
            <Form.Item
              name="code"
              label="Code"
              rules={[
                { required: true, message: "Code is required" },
                {
                  pattern: /^[A-Za-z0-9-]{1,10}$/,
                  message: "1–10 letters, digits or hyphens",
                },
              ]}
            >
              <Input placeholder="A" maxLength={10} />
            </Form.Item>
            <Form.Item
              name="name"
              label="Shift name"
              rules={[{ required: true, message: "Name is required" }]}
            >
              <Input placeholder="Shift A" maxLength={60} />
            </Form.Item>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Form.Item name="start" label="Start time (hh : mm)">
              <TimeSelect />
            </Form.Item>
            <Form.Item name="end" label="End time (hh : mm)">
              <TimeSelect />
            </Form.Item>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Form.Item name="breakMinutes" label="Unpaid break (minutes)">
              <InputNumber style={{ width: "100%" }} min={0} max={720} step={5} />
            </Form.Item>
            <Form.Item name="weeklyOff" label="Weekly off">
              <Select
                options={WEEKLY_OFF_OPTIONS.map((d) => ({ value: d, label: d }))}
              />
            </Form.Item>
          </div>

          {preview ? (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                marginBottom: 12,
                fontSize: 13,
                background: preview.error
                  ? "var(--danger-soft, #fee2e2)"
                  : "var(--bg-elev, #f5f5f5)",
                color: preview.error ? "var(--danger, #b91c1c)" : "inherit",
              }}
            >
              {preview.error ?? preview.text}
              {!preview.error && preview.night ? (
                <Tag color="purple" style={{ marginLeft: 8 }}>
                  Crosses midnight
                </Tag>
              ) : null}
            </div>
          ) : null}

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} maxLength={300} />
          </Form.Item>
          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </ReportSection>
  );
}
