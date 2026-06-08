"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Tag,
  Popconfirm,
  Space,
} from "antd";
import { PlusOutlined, DeleteOutlined, FilePdfOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

import CommonTable from "@/components/common/CommonTable";
import ReportSection from "@/components/hrms/ReportSection";
import { ViewEditActions } from "@/components/common/TableActionIcons";
import { ERP_TABLE_PROPS } from "@/components/common/erpStatusBadges";
import { downloadHolidayCalendarPdf } from "@/lib/holiday-calendar-pdf";

export type HolidayRecord = {
  _id: string;
  name: string;
  date: string;
  type: "national" | "regional" | "optional";
  description?: string;
  year?: number;
};

const TYPE_COLOR: Record<string, string> = {
  national: "red",
  regional: "blue",
  optional: "default",
};

const YEAR_OPTIONS = [2024, 2025, 2026, 2027, 2028];

type HolidayFormValues = {
  name: string;
  date: Dayjs;
  type: "national" | "regional" | "optional";
  description?: string;
};

type HolidaysEditorProps = {
  companyName?: string;
};

export function HolidaysEditor({ companyName = "Sudarshan Group" }: HolidaysEditorProps) {
  const [holidays, setHolidays] = useState<HolidayRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HolidayRecord | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [form] = Form.useForm<HolidayFormValues>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hrms/holidays?year=${year}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load");
      setHolidays(json.data || []);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to load holidays");
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    void load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ type: "national" });
    setModalOpen(true);
  };

  const openEdit = (row: HolidayRecord) => {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      date: dayjs(row.date),
      type: row.type,
      description: row.description ?? "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const saveHoliday = async (values: HolidayFormValues) => {
    const payload = {
      name: values.name,
      date: values.date.format("YYYY-MM-DD"),
      type: values.type,
      description: values.description ?? "",
    };

    try {
      const res = await fetch(
        editing ? `/api/hrms/holidays/${editing._id}` : "/api/hrms/holidays",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to save");
      message.success(editing ? "Holiday updated" : "Holiday added");
      closeModal();
      void load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to save");
    }
  };

  const exportPdf = async () => {
    setExportingPdf(true);
    try {
      downloadHolidayCalendarPdf(holidays, year, companyName);
      message.success(`Holiday calendar ${year} PDF downloaded`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to export PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  const deleteHoliday = async (id: string) => {
    try {
      const res = await fetch(`/api/hrms/holidays/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to delete");
      message.success("Holiday removed");
      void load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const columns = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: 130,
      render: (v: string) => (
        <span className="font-semibold">{dayjs(v).format("DD MMM YYYY")}</span>
      ),
      sorter: (a: HolidayRecord, b: HolidayRecord) =>
        new Date(a.date).getTime() - new Date(b.date).getTime(),
    },
    {
      title: "Day",
      dataIndex: "date",
      key: "dow",
      width: 80,
      render: (v: string) => dayjs(v).format("ddd"),
    },
    {
      title: "Holiday",
      dataIndex: "name",
      key: "name",
      render: (v: string) => <span className="font-semibold text-zinc-900">{v}</span>,
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 120,
      render: (v: string) => (
        <Tag color={TYPE_COLOR[v] || "default"} className="capitalize">
          {v}
        </Tag>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "desc",
      ellipsis: true,
      render: (v: string) => v || "—",
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      align: "center" as const,
      render: (_: unknown, row: HolidayRecord) => (
        <Space size={2}>
          <ViewEditActions
            showView={false}
            onEdit={() => openEdit(row)}
            editLabel="Edit holiday"
          />
          <Popconfirm
            title="Remove this holiday?"
            description="Employees will no longer see it on the calendar."
            onConfirm={() => deleteHoliday(row._id)}
            okText="Remove"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              aria-label="Delete holiday"
              className="hrms-table-actions__btn"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div className="arf-panel ap-filters-panel" style={{ marginBottom: 0 }}>
        <div className="arf-body" style={{ paddingTop: 14, paddingBottom: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div className="arf-item" style={{ maxWidth: 160, margin: 0 }}>
              <span className="arf-label">Calendar year</span>
              <Select
                className="w-full"
                value={year}
                onChange={setYear}
                options={YEAR_OPTIONS.map((y) => ({ value: y, label: String(y) }))}
              />
            </div>
            <Space wrap>
              <Button
                icon={<FilePdfOutlined />}
                loading={exportingPdf}
                onClick={() => void exportPdf()}
              >
                Export PDF
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
                Add holiday
              </Button>
            </Space>
          </div>
        </div>
      </div>

      <ReportSection
        title="Company holiday calendar"
        meta={`${holidays.length} holidays in ${year}`}
        flush
      >
        <CommonTable
          {...ERP_TABLE_PROPS}
          loading={loading}
          dataSource={holidays}
          columns={columns}
          rowKey="_id"
          size="middle"
          bordered
          className="attendance-report-table"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (n) => `${n} holidays`,
          }}
          locale={{
            emptyText: `No holidays for ${year}. Click “Add holiday” to create one.`,
          }}
        />
      </ReportSection>

      <Modal
        title={editing ? "Edit holiday" : "Add holiday"}
        open={modalOpen}
        onCancel={closeModal}
        footer={null}
        width={440}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={saveHoliday}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="Holiday name"
            rules={[{ required: true, message: "Enter a name" }]}
          >
            <Input placeholder="e.g. Independence Day" />
          </Form.Item>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Form.Item
              name="date"
              label="Date"
              rules={[{ required: true, message: "Pick a date" }]}
            >
              <DatePicker className="w-full" format="DD MMM YYYY" />
            </Form.Item>
            <Form.Item name="type" label="Type" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: "national", label: "National" },
                  { value: "regional", label: "Regional" },
                  { value: "optional", label: "Optional" },
                ]}
              />
            </Form.Item>
          </div>
          <Form.Item name="description" label="Description (optional)">
            <Input placeholder="Notes for HR or employees" />
          </Form.Item>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={closeModal}>Cancel</Button>
            <Button type="primary" htmlType="submit">
              {editing ? "Save changes" : "Add holiday"}
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
}
