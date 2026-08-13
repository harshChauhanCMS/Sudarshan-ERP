"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Checkbox,
  Button,
  Collapse,
  Space,
  ConfigProvider,
  message,
  Avatar,
  Tag,
  Spin,
  Popconfirm,
} from "antd";
import {
  SaveOutlined,
  SecurityScanOutlined,
  CalculatorOutlined,
  EditOutlined,
  CloseOutlined,
  MailOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import PageHeader from "@/components/common/PageHeader";
import CompensationCategoryPicker from "@/components/hrms/CompensationCategoryPicker";
import EmployeeDeductionsPicker from "@/components/hrms/EmployeeDeductionsPicker";
import { HRMS_BACK } from "@/lib/hrms-nav";
import {
  disableEmployeeDobUnder18,
  employeeMinAgeDobRule,
  latestAllowedEmployeeDob,
} from "@/lib/hrms-dob";
import {
  departmentSkipsReportingManager,
  EMPLOYEE_COMPANY_OPTIONS,
  EMPLOYEE_EXPERIENCE_OPTIONS,
  EMPLOYEE_LOCATION_UNIT_OPTIONS,
  EMPLOYEE_QUALIFICATION_OPTIONS,
  EMPLOYEE_WORK_LOCATION_OPTIONS,
} from "@/lib/hrms-employee-options";
import { formatReportingManagerLabel } from "@/lib/manager-scope-shared";
import { useSessionUser } from "@/hooks/use-session-user";

const { Panel } = Collapse;

type CredentialStatus = {
  hasAccount: boolean;
  loginEmail?: string;
  requiresPasswordReset: boolean;
  expired: boolean;
  canResend: boolean;
  passwordResetDeadline?: string | null;
  reason?: string;
};

function canResendCredentials(role?: string): boolean {
  const r = role?.toLowerCase();
  return r === "owner" || r === "admin" || r === "hr" || r === "master";
}

function parseEmployeeDate(value: unknown) {
  if (value == null || value === "") return null;
  if (dayjs.isDayjs(value)) return value;
  const parsed = dayjs(String(value), ["DD/MM/YYYY", "YYYY-MM-DD"], true);
  return parsed.isValid() ? parsed : null;
}

function formatFormDate(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  if (dayjs.isDayjs(value)) return value.format("DD/MM/YYYY");
  return String(value);
}

export default function EmployeeDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, isManager } = useSessionUser();
  const canManageCredentials = canResendCredentials(user?.role);
  const [form] = Form.useForm();
  const department = Form.useWatch("department", form);
  const showReportingManager = !departmentSkipsReportingManager(department);

  useEffect(() => {
    if (isManager) setIsEditing(false);
  }, [isManager]);

  useEffect(() => {
    if (!showReportingManager) {
      form.setFieldValue("reportingManager", undefined);
    }
  }, [showReportingManager, form]);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const compensationType = Form.useWatch("compensationType", form) ?? "Monthly CTC";
  // Watched so the deduction preview re-prices as the salary is edited.
  const watchedBasic = Form.useWatch("basicSalary", form);
  const watchedGross = Form.useWatch("monthlyGross", form);
  const watchedArrears = Form.useWatch("arrears", form);
  const [originalData, setOriginalData] = useState<any>(null);

  // Profile banner state
  const [profileName, setProfileName] = useState("");
  const [profileRole, setProfileRole] = useState("");
  const [profileDept, setProfileDept] = useState("");
  const [profileStatus, setProfileStatus] = useState("Active");
  const [avatarInitials, setAvatarInitials] = useState("");
  const [avatarColors, setAvatarColors] = useState({ bg: "#dbeafe", fg: "#1d4ed8" });
  const [departmentOptions, setDepartmentOptions] = useState<
    { value: string; label: string; disabled?: boolean }[]
  >([]);
  const [reportingManagerOptions, setReportingManagerOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [credentialStatus, setCredentialStatus] = useState<CredentialStatus | null>(null);
  const [resendingCredentials, setResendingCredentials] = useState(false);

  useEffect(() => {
    fetch("/api/hrms/departments")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) {
          setDepartmentOptions(
            d.data.map((dept: string) => ({ value: dept, label: dept })),
          );
        }
      })
      .catch(() => {});

    fetch("/api/hrms/employees")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) {
          setReportingManagerOptions(
            d.data.map((emp: { employeeId: string; fullName: string }) => ({
              value: formatReportingManagerLabel(emp.employeeId, emp.fullName),
              label: formatReportingManagerLabel(emp.employeeId, emp.fullName),
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  // Ensure the employee's current department is selectable even if no other
  // employee currently shares it (Employee.distinct alone could otherwise omit it).
  useEffect(() => {
    const current = originalData?.department;
    if (!current) return;
    setDepartmentOptions((prev) =>
      prev.some((opt) => opt.value === current)
        ? prev
        : [...prev, { value: current, label: current }],
    );
  }, [originalData?.department]);

  useEffect(() => {
    async function loadEmployee() {
      try {
        setLoading(true);
        const response = await fetch(`/api/hrms/employees/${id}`);
        if (response.status === 403) {
          messageApi.error("You do not have access to this employee profile.");
          window.location.href = "/hrms/employees";
          return;
        }
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Failed to load employee details");
        }
        const data = await response.json();
        if (data.success && data.data) {
          const emp = data.data;

          // Format dates for DatePicker
          const formatted = {
            ...emp,
            workLocationType: emp.workLocationType || "Onsite",
            dob: parseEmployeeDate(emp.dob),
            dateJoining: parseEmployeeDate(emp.dateJoining),
            dateConfirmation: parseEmployeeDate(emp.dateConfirmation),
          };

          form.setFieldsValue(formatted);
          setOriginalData(formatted);

          // Update banner statistics
          setProfileName(emp.fullName || "");
          setProfileRole(emp.designation || "");
          setProfileDept(emp.department || "");
          setProfileStatus(emp.employmentType === "Apprentice" ? "Onboarding" : "Active");

          const names = (emp.fullName || "").trim().split(" ");
          const initials =
            names.length > 1
              ? (names[0][0] + names[names.length - 1][0]).toUpperCase()
              : names[0] ? names[0].substring(0, 2).toUpperCase() : "EE";

          const bgColors = ["#fef3c7", "#dbeafe", "#ffedd5", "#dcfce7", "#f3e8ff", "#e0e7ff", "#fee2e2"];
          const fgColors = ["#b45309", "#1d4ed8", "#c2410c", "#15803d", "#7e22ce", "#4338ca", "#b91c1c"];
          const index = (emp.fullName || "").charCodeAt(0) % bgColors.length;

          setAvatarInitials(initials);
          setAvatarColors({ bg: bgColors[index] || bgColors[0], fg: fgColors[index] || fgColors[0] });
        }
      } catch (err: any) {
        messageApi.error({
          content: err.message || "Could not retrieve employee details.",
          duration: 4,
        });
      } finally {
        setLoading(false);
      }
    }
    loadEmployee();
  }, [id, form, messageApi]);

  const refreshCredentialStatus = useCallback(async () => {
    if (!canManageCredentials) return;
    try {
      const res = await fetch(`/api/hrms/employees/${id}/credentials`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setCredentialStatus(json.data as CredentialStatus);
      }
    } catch {
      // keep the last known status; a later refresh will correct it
    }
  }, [id, canManageCredentials]);

  useEffect(() => {
    void refreshCredentialStatus();
  }, [refreshCredentialStatus]);

  // The temporary password blocks resending only until its deadline passes.
  // Without this the button would stay disabled on an open tab even after the
  // hour elapsed, because the status was only fetched on mount.
  useEffect(() => {
    if (!canManageCredentials) return;
    if (credentialStatus?.reason !== "not_expired") return;

    const deadline = credentialStatus.passwordResetDeadline
      ? new Date(credentialStatus.passwordResetDeadline).getTime()
      : NaN;
    if (Number.isNaN(deadline)) return;

    // +1s guard so the server also sees the deadline as passed.
    const delay = Math.max(deadline - Date.now() + 1000, 0);
    const timer = setTimeout(() => {
      void refreshCredentialStatus();
    }, delay);

    return () => clearTimeout(timer);
  }, [
    canManageCredentials,
    credentialStatus?.reason,
    credentialStatus?.passwordResetDeadline,
    refreshCredentialStatus,
  ]);

  // Re-check when the tab regains focus, so a page left in the background
  // (where timers are throttled) still picks up the expiry.
  useEffect(() => {
    if (!canManageCredentials) return;

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshCredentialStatus();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [canManageCredentials, refreshCredentialStatus]);

  const handleResendCredentials = async () => {
    setResendingCredentials(true);
    try {
      const response = await fetch(`/api/hrms/employees/${id}/credentials`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to resend credentials");
      }

      messageApi.success(
        data.data?.loginEmail
          ? `New temporary password emailed to ${data.data.loginEmail}. Valid for 1 hour.`
          : "New temporary password emailed successfully.",
      );

      await refreshCredentialStatus();
    } catch (err: unknown) {
      messageApi.error(
        err instanceof Error ? err.message : "Failed to resend credentials",
      );
    } finally {
      setResendingCredentials(false);
    }
  };

  const handleAnnualCtcChange = (value: number | null) => {
    if (value) {
      form.setFieldsValue({
        monthlyGross: Math.round(value / 12),
        basicSalary: Math.round((value / 12) * 0.5),
      });
    }
  };

  const handleCurrentAddressCopy = (checked: boolean) => {
    if (checked) {
      const currentAddress = form.getFieldValue("currentAddress");
      const currentStatePin = form.getFieldValue("currentStatePin");
      form.setFieldsValue({
        permanentAddress: currentAddress,
        permanentStatePin: currentStatePin,
      });
    }
  };

  const saveEmployee = async () => {
    setSaving(true);

    const values = form.getFieldsValue(true);
    const { employeeId: _omit, ...rest } = values;
    const formattedValues = {
      ...rest,
      reportingManager: departmentSkipsReportingManager(values.department)
        ? ""
        : values.reportingManager,
      fullName:
        typeof values.fullName === "string"
          ? values.fullName.trim()
          : values.fullName,
      dob: formatFormDate(values.dob),
      dateJoining: formatFormDate(values.dateJoining),
      dateConfirmation: formatFormDate(values.dateConfirmation),
      overtimeApplicable: !!values.overtimeApplicable,
    };

    try {
      const response = await fetch(`/api/hrms/employees/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedValues),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update employee details");
      }

      messageApi.success({
        content: "Employee records updated successfully! Redirecting…",
        duration: 2,
      });

      const savedFormValues = {
        ...values,
        fullName: formattedValues.fullName,
      };

      // Update static view banner states
      setProfileName(formattedValues.fullName || "");
      setProfileRole(formattedValues.designation || "");
      setProfileDept(formattedValues.department || "");
      setProfileStatus(formattedValues.employmentType === "Apprentice" ? "Onboarding" : "Active");

      setOriginalData(savedFormValues);
      setIsEditing(false);

      // Back to the employee list, same as after creating one — the saved row
      // is what HR wants to see next. Delayed so the success toast is readable.
      setTimeout(() => {
        router.push("/hrms/employees");
      }, 1000);
    } catch (err: any) {
      messageApi.error({
        content: err.message || "An error occurred while updating.",
        duration: 4,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      await form.validateFields();
      await saveEmployee();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "errorFields" in err) {
        const errorFields = (err as { errorFields?: { name: (string | number)[] }[] })
          .errorFields;
        messageApi.error("Please complete all required fields before saving.");
        const first = errorFields?.[0]?.name;
        if (first) {
          form.scrollToField(first, { behavior: "smooth", block: "center" });
        }
      }
    }
  };

  const onFinishFailed = () => {
    messageApi.error("Please fix the highlighted fields before saving.");
  };

  const handleCancel = () => {
    if (originalData) {
      form.setFieldsValue(originalData);
    }
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="emp-details-page__loading">
        <Spin size="large" description="Loading employee records..." />
      </div>
    );
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#374d95",
          borderRadius: 8,
        },
        components: {
          Form: {
            itemMarginBottom: 10,
            labelFontSize: 12,
          },
          Collapse: {
            headerPadding: "11px 18px",
            contentPadding: "16px 18px 18px",
          },
        },
      }}
    >
      {contextHolder}
      <div className="emp-details-page">
        {/* Header */}
        <PageHeader
          compact
          {...HRMS_BACK.employees}
          title="Employee profile"
          subtitle={
            isManager
              ? `Team member profile · ${id}`
              : `Detailed view and editing panel for employee ${id}`
          }
          actions={
            <Space>
              {canManageCredentials && credentialStatus ? (
                <Popconfirm
                  title={
                    credentialStatus.reason === "forgot_password"
                      ? "Send temporary password for reset?"
                      : credentialStatus.hasAccount
                        ? "Resend temporary password?"
                        : "Send temporary password email?"
                  }
                  description={
                    credentialStatus.reason === "forgot_password"
                      ? `A temporary password will be emailed to ${credentialStatus.loginEmail ?? "the employee"}. They can use Forgot password on mobile or web to set a new password within 1 hour.`
                      : credentialStatus.hasAccount
                        ? `A new temporary password will be emailed to ${credentialStatus.loginEmail ?? "the employee"}. They must log in and reset it within 1 hour.`
                        : `A temporary password will be generated and emailed to ${credentialStatus.loginEmail ?? "the employee"} to set up their account.`
                  }
                  okText="Send email"
                  cancelText="Cancel"
                  onConfirm={() => void handleResendCredentials()}
                  disabled={!credentialStatus.canResend}
                >
                  <Button
                    icon={<MailOutlined />}
                    loading={resendingCredentials}
                    disabled={!credentialStatus.canResend}
                    title={
                      !credentialStatus.canResend
                        ? !credentialStatus.loginEmail || credentialStatus.reason === "no_email"
                          ? "Employee has no email address. Please edit their details and add an email first."
                          : credentialStatus.reason === "not_expired" && credentialStatus.passwordResetDeadline
                            ? `Cannot resend yet. The previous temporary password is still valid until ${new Date(credentialStatus.passwordResetDeadline).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.`
                            : "Cannot send temporary password."
                        : undefined
                    }
                    style={{ height: 38, borderRadius: 6, fontWeight: 600 }}
                  >
                    {credentialStatus.reason === "forgot_password"
                      ? "Send password reset email"
                      : credentialStatus.hasAccount
                        ? "Resend temporary password"
                        : "Send temporary password"}
                  </Button>
                </Popconfirm>
              ) : null}
              {!isManager && !isEditing ? (
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => setIsEditing(true)}
                  style={{
                    height: 38,
                    borderRadius: 6,
                    background: "#374d95",
                    border: "none",
                    fontWeight: 600,
                  }}
                  className="hover:bg-[#2a3c74] active:bg-[#1e2a54] flex items-center gap-1.5"
                >
                  Edit Details
                </Button>
              ) : !isManager ? (
                <Space>
                  <Button
                    icon={<CloseOutlined />}
                    onClick={handleCancel}
                    disabled={saving}
                    style={{ height: 38, borderRadius: 6, fontWeight: 500 }}
                    className="text-zinc-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={() => void handleSave()}
                    loading={saving}
                    style={{
                      height: 38,
                      borderRadius: 6,
                      background: "#16a34a",
                      border: "none",
                      fontWeight: 600,
                    }}
                    className="hover:bg-green-700 active:bg-green-800 flex items-center gap-1.5"
                  >
                    Save Changes
                  </Button>
                </Space>
              ) : null}
            </Space>
          }
        />

        {/* ID Card & Form Layout */}
        <Form
          form={form}
          layout="vertical"
          onFinish={() => void saveEmployee()}
          onFinishFailed={onFinishFailed}
          requiredMark="optional"
          style={{ width: "100%" }}
        >
          <div className="emp-profile-layout">
            <aside className="emp-id-card" aria-label="Employee ID card">
              <div className="emp-id-card__header">
                <img
                  src="/sudarshan-group-logo.webp"
                  alt="Sudarshan Group"
                  className="emp-id-card__logo"
                />
              </div>
              <div className="emp-id-card__body">
                <div className="emp-id-card__avatar">
                  <Avatar
                    style={{
                      backgroundColor: avatarColors.bg,
                      color: avatarColors.fg,
                      fontWeight: 800,
                      fontSize: 36,
                    }}
                    size={96}
                  >
                    {avatarInitials}
                  </Avatar>
                </div>
                <h2 className="emp-id-card__name">{profileName}</h2>
                {profileRole ? (
                  <p className="emp-id-card__role" title={profileRole}>
                    {profileRole}
                  </p>
                ) : null}

                <dl className="emp-id-card__details">
                  <div className="emp-id-card__row">
                    <dt className="emp-id-card__label">Emp ID</dt>
                    <dd className="emp-id-card__value emp-id-card__value--mono">{id}</dd>
                  </div>
                  <div className="emp-id-card__row">
                    <dt className="emp-id-card__label">Department</dt>
                    <dd className="emp-id-card__value" title={profileDept}>{profileDept || "—"}</dd>
                  </div>
                  <div className="emp-id-card__row">
                    <dt className="emp-id-card__label">Joining</dt>
                    <dd className="emp-id-card__value">
                      {originalData?.dateJoining ? originalData.dateJoining.format("DD MMM YYYY") : "—"}
                    </dd>
                  </div>
                  <div className="emp-id-card__row">
                    <dt className="emp-id-card__label">Shift</dt>
                    <dd className="emp-id-card__value" title={originalData?.primaryShift}>
                      {originalData?.primaryShift || "—"}
                    </dd>
                  </div>
                  <div className="emp-id-card__row">
                    <dt className="emp-id-card__label">Location</dt>
                    <dd className="emp-id-card__value" title={originalData?.locationUnit}>
                      {originalData?.locationUnit || "—"}
                    </dd>
                  </div>
                  <div className="emp-id-card__row">
                    <dt className="emp-id-card__label">Work type</dt>
                    <dd className="emp-id-card__value" title={originalData?.workLocationType}>
                      {originalData?.workLocationType || "Onsite"}
                    </dd>
                  </div>
                  <div className="emp-id-card__row emp-id-card__row--status">
                    <dt className="emp-id-card__label">Status</dt>
                    <dd className="emp-id-card__value">
                      <Tag
                        color={profileStatus === "Active" ? "success" : "processing"}
                        style={{ margin: 0, border: "none", fontWeight: 700, fontSize: 11 }}
                      >
                        {profileStatus}
                      </Tag>
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="emp-id-card__barcode" aria-hidden="true">
                <div className="emp-id-card__barcode-lines">
                  {[...Array(24)].map((_, i) => (
                    <span
                      key={i}
                      style={{ width: i % 3 === 0 ? 3 : i % 2 === 0 ? 2 : 1 }}
                    />
                  ))}
                </div>
              </div>
            </aside>

          <div className="emp-profile-form">
            <Collapse
              defaultActiveKey={["1", "2"]}
              className="emp-form-collapse"
              expandIconPosition="end"
            >
            <Panel
              header={<span className="emp-form-collapse__title">1. Profile Details</span>}
              key="1"
            >
              <div className="emp-form-grid">
                <Form.Item name="fullName" label="Full Name" rules={[{ required: true, message: "Required" }]}>
                  <Input disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="employeeId" label="Employee ID" rules={[{ required: true, message: "Required" }]}>
                  <Input disabled={true} />
                </Form.Item>
                <Form.Item name="fatherName" label="Father's Name">
                  <Input disabled={!isEditing} />
                </Form.Item>
                <Form.Item
                  name="dob"
                  label="Date of Birth"
                  rules={[employeeMinAgeDobRule]}
                  tooltip="Employee must be at least 18 years old"
                >
                  <DatePicker
                    style={{ width: "100%" }}
                    format="DD/MM/YYYY"
                    disabled={!isEditing}
                    disabledDate={disableEmployeeDobUnder18}
                    defaultPickerValue={latestAllowedEmployeeDob()}
                  />
                </Form.Item>
                <Form.Item name="gender" label="Gender">
                  <Select
                    disabled={!isEditing}
                    options={[
                      { value: "Male", label: "Male" },
                      { value: "Female", label: "Female" },
                      { value: "Other", label: "Other" },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="qualification" label="Qualification">
                  <Select
                    allowClear
                    placeholder="Select qualification"
                    disabled={!isEditing}
                    options={[...EMPLOYEE_QUALIFICATION_OPTIONS]}
                  />
                </Form.Item>
                <Form.Item name="experience" label="Experience">
                  <Select
                    allowClear
                    placeholder="Select experience"
                    disabled={!isEditing}
                    options={[...EMPLOYEE_EXPERIENCE_OPTIONS]}
                  />
                </Form.Item>
                <Form.Item name="castCategory" label="Cast Category">
                  <Select
                    disabled={!isEditing}
                    options={[
                      { value: "General", label: "General" },
                      { value: "OBC", label: "OBC" },
                      { value: "SC", label: "SC" },
                      { value: "ST", label: "ST" },
                    ]}
                  />
                </Form.Item>
              </div>
            </Panel>

            {/* Section 2: Contact & address */}
            <Panel
              header={<span className="emp-form-collapse__title">2. Contact & Address</span>}
              key="2"
            >
              <div className="emp-form-grid">
                <Form.Item name="primaryContact" label="Primary Contact No." rules={[{ required: true, message: "Required" }]}>
                  <Input disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="personalEmail" label="Personal Email" className="emp-form-no-optional">
                  <Input disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="alternateContact" label="Alternate Contact No.">
                  <Input disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="emergencyContact" label="Emergency Contact No.">
                  <Input disabled={!isEditing} />
                </Form.Item>
                <Form.Item
                  name="emergencyNameRelation"
                  label="Emergency name & relation"
                  tooltip="Full name and relation of emergency contact"
                >
                  <Input
                    placeholder="e.g. Ramesh Kumar — Father"
                    disabled={!isEditing}
                  />
                </Form.Item>
                <Form.Item name="officialEmail" label="Official Email (if assigned)">
                  <Input disabled={!isEditing} />
                </Form.Item>
              </div>

              <div className="emp-form-grid emp-form-grid--2 emp-form-grid-divider">
                <div className="emp-form-address-col">
                  <Form.Item name="currentAddress" label="Current Address">
                    <Input.TextArea rows={2} disabled={!isEditing} />
                  </Form.Item>
                  <Form.Item className="emp-form-address-pin emp-form-no-optional" name="currentStatePin" label="State / PIN Code">
                    <Input disabled={!isEditing} />
                  </Form.Item>
                </div>
                <div className="emp-form-address-col">
                  <Form.Item
                    name="permanentAddress"
                    label={
                      <div className="emp-form-address-header">
                        <span className="emp-form-address-label">Permanent Address</span>
                        <Checkbox
                          onChange={(e) => handleCurrentAddressCopy(e.target.checked)}
                          disabled={!isEditing}
                        >
                          Same as current
                        </Checkbox>
                      </div>
                    }
                  >
                    <Input.TextArea rows={2} disabled={!isEditing} />
                  </Form.Item>
                  <Form.Item className="emp-form-address-pin emp-form-no-optional" name="permanentStatePin" label="State / PIN Code">
                    <Input disabled={!isEditing} />
                  </Form.Item>
                </div>
              </div>
            </Panel>
            </Collapse>
          </div>
        </div>

        <div className="emp-form-sections">
        <Collapse
          defaultActiveKey={["3", "4", "6"]}
          className="emp-form-collapse"
          expandIconPosition="end"
        >
            <Panel
              header={<span className="emp-form-collapse__title">3. Identity & Bank Details</span>}
              key="3"
            >
              <div className="emp-form-grid">
                <Form.Item name="aadhar" label="Aadhar No.">
                  <Input disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="pan" label="PAN No.">
                  <Input disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="pfUan" label="PF / UAN No.">
                  <Input disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="esiIp" label="ESI / IP No.">
                  <Input disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="bankName" label="Bank Name">
                  <Input disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="accountNo" label="Account No.">
                  <Input disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="ifscCode" label="IFSC Code">
                  <Input disabled={!isEditing} />
                </Form.Item>
              </div>
            </Panel>

            {/* Section 4: Employment & payroll */}
            <Panel
              header={<span className="emp-form-collapse__title">4. Employment & Payroll</span>}
              key="4"
            >
              <div className="emp-form-grid">
                <Form.Item
                  name="companies"
                  label="Companies"
                  className="emp-form-grid__full"
                  rules={[{ required: true, type: "array", min: 1, message: "Select at least one company" }]}
                >
                  <Select
                    disabled={!isEditing}
                    mode="multiple"
                    style={{ width: "100%" }}
                    placeholder="Select company access"
                    options={[...EMPLOYEE_COMPANY_OPTIONS]}
                    maxTagCount="responsive"
                  />
                </Form.Item>
                <Form.Item name="department" label="Department" rules={[{ required: true, message: "Required" }]}>
                  <Select
                    disabled={!isEditing}
                    options={departmentOptions}
                    loading={departmentOptions.length === 0}
                    showSearch
                  />
                </Form.Item>
                <Form.Item name="designation" label="Designation" rules={[{ required: true, message: "Required" }]}>
                  <Input disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="locationUnit" label="Location / Unit">
                  <Select
                    disabled={!isEditing}
                    options={[...EMPLOYEE_LOCATION_UNIT_OPTIONS]}
                    showSearch
                  />
                </Form.Item>
                <Form.Item
                  name="workLocationType"
                  label="Work location type"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <Select
                    disabled={!isEditing}
                    options={[...EMPLOYEE_WORK_LOCATION_OPTIONS]}
                  />
                </Form.Item>
                {showReportingManager ? (
                  <Form.Item name="reportingManager" label="Reporting Manager">
                    <Select
                      disabled={!isEditing}
                      options={reportingManagerOptions}
                      loading={reportingManagerOptions.length === 0}
                      showSearch
                      allowClear
                      optionFilterProp="label"
                    />
                  </Form.Item>
                ) : null}

                <Form.Item name="employmentType" label="Employment Type" rules={[{ required: true, message: "Required" }]}>
                  <Select
                    disabled={!isEditing}
                    options={[
                      { value: "Permanent", label: "Permanent" },
                      { value: "Contractual", label: "Contractual" },
                      { value: "Apprentice", label: "Apprentice" },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="dateJoining" label="Date of Joining" rules={[{ required: true, message: "Required" }]}>
                  <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="dateConfirmation" label="Confirmation Date">
                  <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="probationMonths" label="Probation Period (Months)">
                  <InputNumber style={{ width: "100%" }} min={0} disabled={!isEditing} />
                </Form.Item>
              </div>
            </Panel>

            {/* Section 5: Shift assignment */}
            <Panel
              header={<span className="emp-form-collapse__title">5. Shift Assignment</span>}
              key="5"
            >
              <div className="emp-form-grid">
                <Form.Item name="shiftMode" label="Shift Mode">
                  <Select
                    disabled={!isEditing}
                    options={[
                      { value: "Single shift (fixed)", label: "Single shift (fixed)" },
                      { value: "Multiple shifts (rotating)", label: "Multiple shifts (rotating)" },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="primaryShift" label="Primary Shift">
                  <Select
                    disabled={!isEditing}
                    options={[
                      { value: "Shift A — 06:00 to 14:00", label: "Shift A — 06:00 to 14:00" },
                      { value: "Shift B — 14:00 to 22:00", label: "Shift B — 14:00 to 22:00" },
                      { value: "Shift C — 22:00 to 06:00", label: "Shift C — 22:00 to 06:00" },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="rotationPattern" label="Rotation Pattern">
                  <Select
                    disabled={!isEditing}
                    options={[
                      { value: "None", label: "None" },
                      { value: "Weekly rotation", label: "Weekly rotation" },
                      { value: "Fortnightly rotation", label: "Fortnightly rotation" },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="workingHours" label="Working Hours / Day">
                  <InputNumber style={{ width: "100%" }} min={1} max={24} disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="weeklyOff" label="Weekly Off Day">
                  <Select
                    disabled={!isEditing}
                    options={[
                      { value: "Sunday", label: "Sunday" },
                      { value: "Saturday", label: "Saturday" },
                      { value: "Rotating", label: "Rotating" },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="overtimeApplicable" label="Overtime Applicability" valuePropName="checked">
                  <Checkbox disabled={!isEditing}>
                    Eligible for Overtime (OT)
                  </Checkbox>
                </Form.Item>
              </div>
            </Panel>

            {/* Section 6: Salary structure */}
            <Panel
              header={<span className="emp-form-collapse__title">6. Salary & Compensation Structure</span>}
              key="6"
            >
              <div className="emp-form-compensation">
                <Form.Item
                  name="compensationType"
                  label="Compensation Category"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <CompensationCategoryPicker disabled={!isEditing} />
                </Form.Item>

                {compensationType === "Monthly CTC" && (
                  <div className="emp-form-subpanel">
                    <div className="emp-form-subpanel__head">
                      <div className="emp-form-subpanel__head-main">
                        <CalculatorOutlined />
                        <span>Monthly Components</span>
                      </div>
                    </div>
                    <div className="emp-form-grid">
                      <Form.Item name="annualCtc" label="Annual CTC (₹)">
                        <InputNumber
                          style={{ width: "100%" }}
                          formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                          parser={v => parseFloat(v?.replace(/\₹\s?|(,*)/g, "") || "0") || 0}
                          onChange={handleAnnualCtcChange}
                          disabled={!isEditing}
                        />
                      </Form.Item>
                      <Form.Item name="monthlyGross" label="Monthly Gross (₹)">
                        <InputNumber
                          style={{ width: "100%" }}
                          formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                          parser={v => parseFloat(v?.replace(/\₹\s?|(,*)/g, "") || "0") || 0}
                          disabled={!isEditing}
                        />
                      </Form.Item>
                      <Form.Item name="basicSalary" label="Basic Salary (₹/mo)">
                        <InputNumber
                          style={{ width: "100%" }}
                          formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                          parser={v => parseFloat(v?.replace(/\₹\s?|(,*)/g, "") || "0") || 0}
                          disabled={!isEditing}
                        />
                      </Form.Item>
                      <Form.Item name="hra" label="HRA (₹/mo)">
                        <InputNumber
                          style={{ width: "100%" }}
                          formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                          parser={v => parseFloat(v?.replace(/\₹\s?|(,*)/g, "") || "0") || 0}
                          disabled={!isEditing}
                        />
                      </Form.Item>
                      <Form.Item name="otherConveyance" label="Other / Conveyance (₹/mo)">
                        <InputNumber
                          style={{ width: "100%" }}
                          formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                          parser={v => parseFloat(v?.replace(/\₹\s?|(,*)/g, "") || "0") || 0}
                          disabled={!isEditing}
                        />
                      </Form.Item>
                      <Form.Item name="specialBonus" label="Special / Bonus (₹/mo)">
                        <InputNumber
                          style={{ width: "100%" }}
                          formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                          parser={v => parseFloat(v?.replace(/\₹\s?|(,*)/g, "") || "0") || 0}
                          disabled={!isEditing}
                        />
                      </Form.Item>
                      <Form.Item name="reimbursementCap" label="Reimbursement Cap (₹/mo)">
                        <InputNumber
                          style={{ width: "100%" }}
                          formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                          parser={v => parseFloat(v?.replace(/\₹\s?|(,*)/g, "") || "0") || 0}
                          disabled={!isEditing}
                        />
                      </Form.Item>
                      <Form.Item
                        name="arrears"
                        label="Arrears (₹/mo)"
                        tooltip="Pending dues paid out with this month's salary. Printed on the payslip's Arrears row."
                      >
                        <InputNumber
                          style={{ width: "100%" }}
                          formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                          parser={v => parseFloat(v?.replace(/\₹\s?|(,*)/g, "") || "0") || 0}
                          disabled={!isEditing}
                        />
                      </Form.Item>
                    </div>
                  </div>
                )}

                {/* Sub-Form: Deductions applied to this employee */}
                <div className="emp-form-subpanel">
                  <div className="emp-form-subpanel__head">
                    <div className="emp-form-subpanel__head-main">
                      <CalculatorOutlined />
                      <span>Deductions</span>
                    </div>
                    <span className="emp-form-subpanel__badge">
                      Managed in Deduction Management
                    </span>
                  </div>
                  <Form.Item name="deductionRates" noStyle>
                    <EmployeeDeductionsPicker
                      disabled={!isEditing}
                      basic={Number(watchedBasic) || 0}
                      gross={Number(watchedGross) || 0}
                      arrears={Number(watchedArrears) || 0}
                    />
                  </Form.Item>
                </div>

                {/* Sub-Form: Daily Wage Details */}
                {compensationType === "Daily wage" && (
                  <div className="emp-form-subpanel">
                    <div className="emp-form-subpanel__head">
                      <div className="emp-form-subpanel__head-main">
                        <SecurityScanOutlined style={{ color: "#d97706" }} />
                        <span>Labor / Daily Wage Grid</span>
                      </div>
                      <span className="emp-form-subpanel__badge">Hourly calculation enabled</span>
                    </div>
                    <div className="emp-form-grid">
                      <Form.Item name="dailyWageRate" label="Daily Wage Rate (₹/day)">
                        <InputNumber
                          style={{ width: "100%" }}
                          formatter={v => `₹ ${v}`}
                          parser={v => parseFloat(v?.replace(/\₹\s?|(,*)/g, "") || "0") || 0}
                          disabled={!isEditing}
                        />
                      </Form.Item>
                      <Form.Item name="skillCategory" label="Skill Category">
                        <Select
                          disabled={!isEditing}
                          options={[
                            { value: "Skilled", label: "Skilled" },
                            { value: "Semi-Skilled", label: "Semi-Skilled" },
                            { value: "Unskilled", label: "Unskilled" },
                          ]}
                        />
                      </Form.Item>
                      <Form.Item name="tradeJobRole" label="Trade / Job Role">
                        <Input disabled={!isEditing} />
                      </Form.Item>
                      <Form.Item name="engagedVia" label="Engaged Via">
                        <Select
                          disabled={!isEditing}
                          options={[
                            { value: "Direct (on-roll)", label: "Direct (on-roll)" },
                            { value: "Contractor (off-roll)", label: "Contractor (off-roll)" },
                          ]}
                        />
                      </Form.Item>
                      <Form.Item name="payFrequency" label="Pay Frequency">
                        <Select
                          disabled={!isEditing}
                          options={[
                            { value: "Monthly", label: "Monthly" },
                            { value: "Weekly", label: "Weekly" },
                            { value: "Daily", label: "Daily" },
                          ]}
                        />
                      </Form.Item>
                      <Form.Item name="paymentMode" label="Payment Mode">
                        <Select
                          disabled={!isEditing}
                          options={[
                            { value: "Bank transfer", label: "Bank transfer" },
                            { value: "Cash", label: "Cash" },
                            { value: "Cheque", label: "Cheque" },
                          ]}
                        />
                      </Form.Item>
                    </div>

                    <div className="emp-form-note">
                      <CalculatorOutlined />
                      <div>
                        <strong>Auto-formula details</strong>: Net pay = (Daily rate × Days worked) + (OT hrs × 2 × Hourly rate) − PF/ESI − Advance.
                        <span className="emp-form-note__hint">
                          Example: For ₹540/day at 26 days + 8 OT hrs = ₹14,040 + ₹1,080 = ₹15,120 gross.
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          </Collapse>
        </div>
        </Form>
      </div> {/* End main flex-col pb-12 */}
    </ConfigProvider>
  );
}
