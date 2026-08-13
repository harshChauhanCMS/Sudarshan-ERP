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
import type { Deduction } from "@/hooks/use-deductions";
import {
  DEDUCTION_BASIS_OPTIONS,
  type DeductionBasis,
} from "@/lib/deduction-utils";

type DeductionFormValues = {
  name: string;
  percentage: number;
  basis: DeductionBasis;
  maxAmount: number;
  applicableUpToGross: number;
  isDefault: boolean;
  isActive: boolean;
  description?: string;
};

const EMPTY_FORM: DeductionFormValues = {
  name: "",
  percentage: 1,
  basis: "gross",
  maxAmount: 0,
  applicableUpToGross: 0,
  isDefault: false,
  isActive: true,
  description: "",
};

const inr = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

export function DeductionsEditor() {
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Deduction | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form] = Form.useForm<DeductionFormValues>();

  // Watched so the worked example under the form updates as the rate changes.
  const percentage = Form.useWatch("percentage", form);
  const basis = Form.useWatch("basis", form);
  const maxAmount = Form.useWatch("maxAmount", form);

  const preview = useMemo(() => {
    const pct = Number(percentage);
    if (!Number.isFinite(pct) || pct <= 0) return null;
    // A round ₹20,000 sample makes the rule concrete without HR doing sums.
    const sample = 20000;
    const raw = sample * (pct / 100);
    const capped = maxAmount ? Math.min(raw, maxAmount) : raw;
    return `On a ${inr(sample)} ${basis === "basic" ? "basic" : "gross"} salary this deducts ${inr(
      Math.round(capped * 100) / 100
    )}/month.`;
  }, [percentage, basis, maxAmount]);

  const filtered = useMemo(() => {
    const byStatus = deductions.filter((d) => {
      if (statusFilter === "active") return d.isActive !== false;
      if (statusFilter === "inactive") return d.isActive === false;
      return true;
    });
    return filterBySearch(byStatus, search, (d) => [d.name, d.basis, d.description]);
  }, [deductions, search, statusFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrms/deductions", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || json?.error) throw new Error(json?.error || "Failed to load");
      setDeductions(json.data || []);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to load deductions");
      setDeductions([]);
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

  const openEdit = (deduction: Deduction) => {
    setEditing(deduction);
    form.setFieldsValue({
      name: deduction.name,
      percentage: deduction.percentage,
      basis: deduction.basis ?? "gross",
      maxAmount: deduction.maxAmount ?? 0,
      applicableUpToGross: deduction.applicableUpToGross ?? 0,
      isDefault: deduction.isDefault === true,
      isActive: deduction.isActive !== false,
      description: deduction.description ?? "",
    });
    setModalOpen(true);
  };

  const submit = async () => {
    const values = await form.validateFields();
    const payload = {
      name: values.name,
      percentage: values.percentage,
      basis: values.basis,
      maxAmount: values.maxAmount ?? 0,
      applicableUpToGross: values.applicableUpToGross ?? 0,
      isDefault: values.isDefault,
      isActive: values.isActive,
      description: values.description ?? "",
    };

    setSaving(true);
    try {
      const res = await fetch(
        editing ? `/api/hrms/deductions/${editing._id}` : "/api/hrms/deductions",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok || json?.error) throw new Error(json?.error || "Save failed");
      message.success(editing ? "Deduction updated." : "Deduction created.");
      setModalOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (deduction: Deduction) => {
    try {
      const res = await fetch(`/api/hrms/deductions/${deduction._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || json?.error) throw new Error(json?.error || "Delete failed");
      // Deductions in use are deactivated instead — say so, don't imply a delete.
      message.success(json.data?.message ?? "Deduction deleted.");
      await load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const columns = useMemo(
    () => [
      {
        title: "Deduction",
        dataIndex: "name",
        key: "name",
        render: (name: string, d: Deduction) => (
          <span>
            <span className="strong">{name}</span>
            {d.isDefault ? (
              <Tag color="blue" style={{ marginLeft: 8 }}>
                Default
              </Tag>
            ) : null}
          </span>
        ),
      },
      {
        title: "Rate",
        key: "rate",
        width: 110,
        render: (_: unknown, d: Deduction) => (
          <span className="mono strong">{d.percentage}%</span>
        ),
      },
      {
        title: "Applied on",
        dataIndex: "basis",
        key: "basis",
        width: 130,
        render: (basis: DeductionBasis) =>
          basis === "basic" ? "Basic salary" : "Gross salary",
      },
      {
        title: "Max / month",
        key: "maxAmount",
        width: 120,
        render: (_: unknown, d: Deduction) =>
          d.maxAmount ? <span className="mono">{inr(d.maxAmount)}</span> : "—",
      },
      {
        title: "Applicable up to",
        key: "applicableUpToGross",
        width: 150,
        render: (_: unknown, d: Deduction) =>
          d.applicableUpToGross ? (
            <span className="mono">{inr(d.applicableUpToGross)} gross</span>
          ) : (
            "All salaries"
          ),
      },
      {
        title: "Status",
        key: "status",
        width: 100,
        render: (_: unknown, d: Deduction) =>
          d.isActive === false ? (
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
        render: (_: unknown, d: Deduction) => (
          <ViewEditActions
            showView={false}
            showDelete
            onEdit={() => openEdit(d)}
            onDelete={() => remove(d)}
            deleteConfirmTitle={`Delete ${d.name}?`}
          />
        ),
      },
    ],
    []
  );

  return (
    <ReportSection
      title="Deductions"
      meta="Applied to employees from the Salary step of the employee form"
    >
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add deduction
        </Button>
      </div>
      <PageFilterPanel
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search deduction name…"
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
              { value: "all", label: "All deductions" },
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
        locale={{
          emptyText: <span className="muted">No deductions defined yet.</span>,
        }}
      />

      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={submit}
        okText={editing ? "Save changes" : "Create deduction"}
        confirmLoading={saving}
        title={editing ? `Edit ${editing.name}` : "Add deduction"}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" initialValues={EMPTY_FORM}>
          <Form.Item
            name="name"
            label="Deduction name"
            rules={[{ required: true, message: "Name is required" }]}
          >
            <Input placeholder="Provident Fund" maxLength={60} />
          </Form.Item>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 12 }}>
            <Form.Item
              name="percentage"
              label="Percentage"
              // 0 is allowed: TDS, Advance and Other Deduction carry no
              // company-wide rate — HR types those per employee.
              rules={[
                { required: true, message: "Percentage is required" },
                {
                  type: "number",
                  min: 0,
                  max: 100,
                  message: "Must be between 0 and 100",
                },
              ]}
            >
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                max={100}
                step={0.25}
                addonAfter="%"
              />
            </Form.Item>
            <Form.Item name="basis" label="Applied on">
              <Select options={DEDUCTION_BASIS_OPTIONS} />
            </Form.Item>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Form.Item
              name="maxAmount"
              label="Maximum per month"
              tooltip="Caps the deducted amount, like PF's ₹1,800 ceiling. 0 = uncapped."
            >
              <InputNumber style={{ width: "100%" }} min={0} step={100} addonBefore="₹" />
            </Form.Item>
            <Form.Item
              name="applicableUpToGross"
              label="Applicable up to gross"
              tooltip="Skip this deduction when gross is above this figure, like ESIC's ₹21,000 limit. 0 = always applies."
            >
              <InputNumber style={{ width: "100%" }} min={0} step={1000} addonBefore="₹" />
            </Form.Item>
          </div>

          {preview ? (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                marginBottom: 12,
                fontSize: 13,
                background: "var(--bg-elev, #f5f5f5)",
              }}
            >
              {preview}
            </div>
          ) : null}

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} maxLength={300} />
          </Form.Item>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Form.Item
              name="isDefault"
              label="Apply to new employees"
              valuePropName="checked"
              tooltip="Pre-ticks this deduction on the add-employee form."
            >
              <Switch />
            </Form.Item>
            <Form.Item name="isActive" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </ReportSection>
  );
}
