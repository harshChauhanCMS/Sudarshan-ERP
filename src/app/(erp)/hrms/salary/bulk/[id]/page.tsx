"use client";

import { Suspense, use, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Tag,
  Spin,
  message,
} from "antd";
import { EditOutlined, EyeOutlined, SaveOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import RepHeader from "@/components/hrms/RepHeader";
import { HRMS_BACK } from "@/lib/hrms-nav";
import {
  formatPayrollInr,
  monthDaysInCycle,
  SALARY_STATUS_LABEL,
  SALARY_STATUS_COLOR,
  type PayrollSheetRow,
} from "@/lib/payroll-sheet";

type SalarySheetForm = {
  employeeName: string;
  department: string;
  designation: string;
  basicSalary: number;
  hra: number;
  otherConveyance: number;
  specialBonus: number;
  grossSalary: number;
  workingDays: number;
  daysPresent: number;
  leaveDays: number;
  unpaidLeaveDays: number;
  leaveDeduction: number;
  overtimeHours: number;
  overtimeAmount: number;
  pfEmployee: number;
  pfEmployer: number;
  esi: number;
  tds: number;
  advance: number;
  otherDeductions: number;
  netPayable: number;
  notes: string;
};

type SheetMeta = {
  _id: string;
  employeeId: string;
  employeeName: string;
  department?: string;
  designation?: string;
  cycle: string;
  status: string;
};

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="salary-edit-page__readonly-item">
      <dt>{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}

function EditSalaryContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const cycle = searchParams.get("cycle") || dayjs().format("YYYY-MM");

  const [form] = Form.useForm<SalarySheetForm>();
  const [meta, setMeta] = useState<SheetMeta | null>(null);
  const [payrollRow, setPayrollRow] = useState<PayrollSheetRow | null>(null);
  const [sheetEditable, setSheetEditable] = useState(false);
  const [pending, setPending] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetId, setSheetId] = useState(id);

  const daysPresent = Form.useWatch("daysPresent", form) ?? 0;
  const leaveDays = Form.useWatch("leaveDays", form) ?? 0;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/hrms/salary/${encodeURIComponent(sheetId)}?cycle=${encodeURIComponent(cycle)}`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load salary sheet");

      const sheet = json.data?.sheet;
      if (!sheet) throw new Error("Salary sheet not found");

      if (sheet._id && sheet._id !== sheetId && !String(sheet._id).startsWith("pending-")) {
        setSheetId(String(sheet._id));
      }

      const isPending = Boolean(json.data?.pending);
      const canEdit = Boolean(json.data?.editable) || isPending;

      setMeta({
        _id: String(sheet._id),
        employeeId: String(sheet.employeeId),
        employeeName: String(sheet.employeeName ?? ""),
        department: sheet.department,
        designation: sheet.designation,
        cycle: String(sheet.cycle ?? cycle),
        status: String(sheet.status ?? "pending"),
      });
      setPayrollRow(json.data?.payrollRow ?? null);
      setSheetEditable(canEdit);
      setPending(isPending);
      setEditMode(canEdit);

      form.setFieldsValue({
        employeeName: sheet.employeeName ?? "",
        department: sheet.department ?? "",
        designation: sheet.designation ?? "",
        basicSalary: sheet.basicSalary ?? 0,
        hra: sheet.hra ?? 0,
        otherConveyance: sheet.otherConveyance ?? 0,
        specialBonus: sheet.specialBonus ?? 0,
        grossSalary: sheet.grossSalary ?? 0,
        workingDays: sheet.workingDays ?? monthDaysInCycle(cycle),
        daysPresent: sheet.daysPresent ?? 0,
        leaveDays: sheet.leaveDays ?? 0,
        unpaidLeaveDays: sheet.unpaidLeaveDays ?? 0,
        leaveDeduction: sheet.leaveDeduction ?? 0,
        overtimeHours: sheet.overtimeHours ?? 0,
        overtimeAmount: sheet.overtimeAmount ?? 0,
        pfEmployee: sheet.pfEmployee ?? 0,
        pfEmployer: sheet.pfEmployer ?? 0,
        esi: sheet.esi ?? 0,
        tds: sheet.tds ?? 0,
        advance: sheet.advance ?? 0,
        otherDeductions: sheet.otherDeductions ?? 0,
        netPayable: sheet.netPayable ?? 0,
        notes: sheet.notes ?? "",
      });
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to load");
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [cycle, form, sheetId]);

  useEffect(() => {
    void load();
  }, [load]);

  const cycleLabel = useMemo(() => {
    const parsed = dayjs(cycle, "YYYY-MM", true);
    return parsed.isValid() ? parsed.format("MMMM YYYY") : cycle;
  }, [cycle]);

  const payDays = useMemo(
    () => Math.max(0, Number(daysPresent || 0) + Number(leaveDays || 0)),
    [daysPresent, leaveDays],
  );

  const pfEmployee = Form.useWatch("pfEmployee", form) ?? 0;
  const esi = Form.useWatch("esi", form) ?? 0;
  const tds = Form.useWatch("tds", form) ?? 0;
  const leaveDeduction = Form.useWatch("leaveDeduction", form) ?? 0;
  const advance = Form.useWatch("advance", form) ?? 0;
  const otherDeductions = Form.useWatch("otherDeductions", form) ?? 0;
  const totalDeductions =
    Number(leaveDeduction) +
    Number(pfEmployee) +
    Number(esi) +
    Number(tds) +
    Number(advance) +
    Number(otherDeductions);

  const onFinish = async (values: SalarySheetForm) => {
    if (!editMode || !meta || !sheetEditable) return;
    setSaving(true);
    try {
      const url = pending
        ? `/api/hrms/salary/${encodeURIComponent(meta._id)}?cycle=${encodeURIComponent(cycle)}`
        : `/api/hrms/salary/${encodeURIComponent(meta._id)}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Save failed");

      const savedId = String(json.data?.sheet?._id ?? meta._id);
      message.success(
        pending ? "Salary sheet created as draft" : "Salary sheet updated",
      );
      if (pending && savedId && !savedId.startsWith("pending-")) {
        router.replace(
          `/hrms/salary/bulk/${encodeURIComponent(savedId)}?cycle=${encodeURIComponent(cycle)}`,
        );
      } else {
        router.push(`/hrms/salary/bulk?cycle=${encodeURIComponent(cycle)}`);
      }
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="emp-details-page__loading">
        <Spin size="large" description="Loading salary sheet…" />
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="attendance-reports-page">
        <RepHeader
          {...HRMS_BACK.salary}
          backHref={`/hrms/salary/bulk?cycle=${encodeURIComponent(cycle)}`}
          backLabel="Payroll sheet"
          title="Edit salary"
          subtitle="Salary sheet not found"
        />
      </div>
    );
  }

  const formDisabled = !editMode || !sheetEditable;

  return (
    <div className="attendance-reports-page salary-edit-page">
      <RepHeader
        {...HRMS_BACK.salary}
        backHref={`/hrms/salary/bulk?cycle=${encodeURIComponent(cycle)}`}
        backLabel="Payroll sheet"
        title="Edit salary"
        subtitle={`${meta.employeeName} · ${meta.employeeId} · ${cycleLabel}`}
        actions={
          <>
            {!pending ? (
              <Button
                icon={<EyeOutlined />}
                onClick={() =>
                  router.push(
                    `/hrms/salary/bulk/${encodeURIComponent(sheetId)}/slip?cycle=${encodeURIComponent(cycle)}`,
                  )
                }
              >
                View salary slip
              </Button>
            ) : null}
            {!editMode && sheetEditable ? (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => setEditMode(true)}
                style={{ background: "#374d95", border: "none" }}
              >
                Edit all fields
              </Button>
            ) : null}
            {editMode && sheetEditable ? (
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
          {pending && (
            <Alert
              type="info"
              showIcon
              message="Salary not generated yet"
              description="Fill in all fields below and save — a draft salary sheet will be created for this month."
            />
          )}

          {!sheetEditable && (
            <Alert
              type="info"
              showIcon
              message={`This salary sheet is ${SALARY_STATUS_LABEL[meta.status] || meta.status} and cannot be edited.`}
            />
          )}

          <div className="emp-form-subpanel">
            <div className="emp-form-subpanel__head">
              <div className="emp-form-subpanel__head-main">
                <span>Employee & pay cycle</span>
              </div>
              <Tag
                color={SALARY_STATUS_COLOR[meta.status] || "default"}
                style={{
                  borderRadius: 20,
                  border: 0,
                  fontWeight: 600,
                }}
              >
                {SALARY_STATUS_LABEL[meta.status] || meta.status}
              </Tag>
            </div>

            <dl className="salary-edit-page__readonly">
              <ReadonlyField label="Employee ID" value={meta.employeeId} />
              <ReadonlyField label="Pay cycle" value={cycleLabel} />
              <ReadonlyField label="Date of joining" value={payrollRow?.doj ?? "—"} />
              <ReadonlyField
                label="Annual CTC"
                value={
                  payrollRow?.ctc
                    ? formatPayrollInr(payrollRow.ctc)
                    : "—"
                }
              />
              <ReadonlyField label="PF / UAN" value={payrollRow?.pfUan ?? "—"} />
              <ReadonlyField label="ESI / IP" value={payrollRow?.esiIp ?? "—"} />
              <ReadonlyField label="Account no." value={payrollRow?.accountNo ?? "—"} />
              <ReadonlyField label="IFSC" value={payrollRow?.ifsc ?? "—"} />
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
                  <span>Employee details</span>
                </div>
              </div>
              <div className="salary-edit-page__grid">
                <Form.Item name="employeeName" label="Employee name">
                  <Input />
                </Form.Item>
                <Form.Item name="department" label="Department">
                  <Input />
                </Form.Item>
                <Form.Item name="designation" label="Designation">
                  <Input />
                </Form.Item>
              </div>
            </div>

            <div className="emp-form-subpanel">
              <div className="emp-form-subpanel__head">
                <div className="emp-form-subpanel__head-main">
                  <span>Attendance</span>
                </div>
              </div>
              <div className="salary-edit-page__grid">
                <Form.Item label="Month days">
                  <Input
                    readOnly
                    value={String(payrollRow?.monthDays ?? monthDaysInCycle(cycle))}
                  />
                </Form.Item>
                <Form.Item name="workingDays" label="Working days">
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="daysPresent" label="Days present">
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="leaveDays" label="Paid leave days">
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="unpaidLeaveDays" label="Unpaid leave (LWP)">
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item label="Pay days">
                  <Input readOnly value={String(payDays)} />
                </Form.Item>
              </div>
            </div>

            <div className="emp-form-subpanel">
              <div className="emp-form-subpanel__head">
                <div className="emp-form-subpanel__head-main">
                  <span>Earnings</span>
                </div>
              </div>
              <div className="salary-edit-page__grid">
                <Form.Item name="basicSalary" label="Basic salary">
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="hra" label="HRA">
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="otherConveyance" label="Other / conveyance">
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="specialBonus" label="Bonus">
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="grossSalary" label="Gross salary">
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="overtimeHours" label="Overtime hours">
                  <InputNumber min={0} step={0.5} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="overtimeAmount" label="Incentives / OT amount">
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
              </div>
            </div>

            <div className="emp-form-subpanel">
              <div className="emp-form-subpanel__head">
                <div className="emp-form-subpanel__head-main">
                  <span>Deductions</span>
                </div>
              </div>
              <div className="salary-edit-page__grid">
                <Form.Item name="leaveDeduction" label="Leave / LWP deduction">
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="pfEmployee" label="PF (employee)">
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="pfEmployer" label="PF (employer)">
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="esi" label="ESI">
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="tds" label="TDS">
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="advance" label="Advance">
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="otherDeductions" label="Other deductions">
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item label="Total deductions">
                  <Input
                    readOnly
                    value={formatPayrollInr(Number(totalDeductions || 0))}
                  />
                </Form.Item>
              </div>
            </div>

            <div className="emp-form-subpanel">
              <div className="emp-form-subpanel__head">
                <div className="emp-form-subpanel__head-main">
                  <span>Net pay & remarks</span>
                </div>
              </div>
              <div className="salary-edit-page__grid salary-edit-page__grid--3">
                <Form.Item name="netPayable" label="Net payable">
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item
                  name="notes"
                  label="Remarks"
                  className="emp-form-grid__full"
                  style={{ gridColumn: "span 2" }}
                >
                  <Input.TextArea
                    rows={2}
                    placeholder="Optional notes for this salary row"
                  />
                </Form.Item>
              </div>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}

export default function EditSalaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="emp-details-page__loading">
          <Spin size="large" description="Loading salary sheet…" />
        </div>
      }
    >
      <EditSalaryContent params={params} />
    </Suspense>
  );
}
