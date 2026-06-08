"use client";

import { Button, Modal, Form, Input, InputNumber, Switch, Select, message, Tag, Tooltip } from "antd";
import { PlusOutlined, EditOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import CommonTable from "@/components/common/CommonTable";
import { ERP_TABLE_PROPS } from "@/components/common/erpStatusBadges";

const LEAVE_TYPE_LABEL: Record<string, string> = {
  casual: "Casual", sick: "Sick", earned: "Earned", unpaid: "Unpaid",
};

export function LeavePolicyEditor() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrms/leave/policy");
      const json = await res.json();
      setPolicies(json.data || []);
    } catch { message.error("Failed to load policies"); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const openEdit = (record: any) => {
    setEditing(record);
    form.setFieldsValue(record);
    setOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const save = async (values: any) => {
    try {
      if (editing) {
        const res = await fetch(`/api/hrms/leave/policy/${editing._id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(values),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed");
        message.success("Policy updated");
      } else {
        const res = await fetch("/api/hrms/leave/policy", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(values),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed");
        message.success("Policy created");
      }
      setOpen(false);
      void load();
    } catch (e) { message.error(e instanceof Error ? e.message : "Failed"); }
  };

  const columns = [
    { title: "Leave Type", dataIndex: "leaveType", key: "type", render: (v: string) => LEAVE_TYPE_LABEL[v] || v },
    { title: "Label", dataIndex: "label", key: "label", render: (v: string) => <strong>{v}</strong> },
    { title: "Annual Quota (days)", dataIndex: "annualQuota", key: "quota" },
    { title: "Carry Forward", dataIndex: "carryForwardAllowed", key: "cf", render: (v: boolean) => <Tag color={v ? "green" : "default"} style={{ borderRadius: 20, border: 0 }}>{v ? "Yes" : "No"}</Tag> },
    { title: "Max Carry (days)", dataIndex: "carryForwardMax", key: "cfmax" },
    { title: "Applicable To", dataIndex: "applicableTo", key: "app", render: (v: string) => <Tag style={{ borderRadius: 20, border: 0, textTransform: "capitalize" }}>{v}</Tag> },
    { title: "Active", dataIndex: "isActive", key: "active", render: (v: boolean) => <Tag color={v ? "green" : "red"} style={{ borderRadius: 20, border: 0 }}>{v ? "Active" : "Inactive"}</Tag> },
    {
      title: "Actions", key: "actions", width: 80, align: "center" as const,
      render: (_: any, row: any) => (
        <Tooltip title="Edit">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(row)}
            aria-label="Edit"
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#09090b", margin: 0 }}>Leave Policies</h1>
          <p style={{ color: "#71717a", fontSize: 13, margin: "6px 0 0" }}>Configure leave types, quotas and carry-forward rules</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Policy</Button>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 12, overflow: "hidden" }}>
        <CommonTable loading={loading} {...ERP_TABLE_PROPS} dataSource={policies} columns={columns as any} rowKey="_id" pagination={false} size="middle" style={{ padding: 4 }} />
      </div>

      <Modal title={editing ? "Edit Policy" : "New Leave Policy"} open={open} onCancel={() => { setOpen(false); form.resetFields(); }} footer={null} width={480}>
        <Form form={form} layout="vertical" onFinish={save} style={{ marginTop: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Form.Item name="leaveType" label="Leave Type" rules={[{ required: true }]}>
              <Select disabled={!!editing}>
                {Object.entries(LEAVE_TYPE_LABEL).map(([k, v]) => <Select.Option key={k} value={k}>{v}</Select.Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="label" label="Display Label" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="annualQuota" label="Annual Quota (days)" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="applicableTo" label="Applicable To">
              <Select>
                <Select.Option value="all">All</Select.Option>
                <Select.Option value="permanent">Permanent</Select.Option>
                <Select.Option value="contractual">Contractual</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="carryForwardAllowed" label="Carry Forward" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="carryForwardMax" label="Max Carry Days">
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </div>
          <Form.Item name="isActive" label="Active" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">Save</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
