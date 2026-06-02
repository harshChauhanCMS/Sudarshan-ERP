"use client";

import { use, useEffect, useState } from "react";
import {
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Radio,
  Checkbox,
  Button,
  Collapse,
  Space,
  ConfigProvider,
  message,
  Avatar,
  Tag,
  Spin,
} from "antd";
import {
  SaveOutlined,
  SecurityScanOutlined,
  CalculatorOutlined,
  EditOutlined,
  CloseOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import PageHeader from "@/components/common/PageHeader";
import { HRMS_BACK } from "@/lib/hrms-nav";

const { Panel } = Collapse;

export default function EmployeeDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [compensationType, setCompensationType] = useState("Monthly CTC");
  const [messageApi, contextHolder] = message.useMessage();
  const [originalData, setOriginalData] = useState<any>(null);

  // Profile banner state
  const [profileName, setProfileName] = useState("");
  const [profileRole, setProfileRole] = useState("");
  const [profileDept, setProfileDept] = useState("");
  const [profileStatus, setProfileStatus] = useState("Active");
  const [avatarInitials, setAvatarInitials] = useState("");
  const [avatarColors, setAvatarColors] = useState({ bg: "#dbeafe", fg: "#1d4ed8" });
  const [departmentOptions, setDepartmentOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    fetch("/api/system/roles")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setDepartmentOptions(d.data.map((role: any) => ({ value: role.roleKey, label: role.label })));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function loadEmployee() {
      try {
        setLoading(true);
        const response = await fetch(`/api/hrms/employees/${id}`);
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
            dob: emp.dob ? dayjs(emp.dob, "DD/MM/YYYY") : null,
            dateJoining: emp.dateJoining ? dayjs(emp.dateJoining, "DD/MM/YYYY") : null,
            dateConfirmation: emp.dateConfirmation ? dayjs(emp.dateConfirmation, "DD/MM/YYYY") : null,
          };

          form.setFieldsValue(formatted);
          setCompensationType(emp.compensationType || "Monthly CTC");
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

  const handleCompensationTypeChange = (e: any) => {
    setCompensationType(e.target.value);
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

  const onFinish = async (values: any) => {
    setSaving(true);

    const formattedValues = {
      ...values,
      dob: values.dob ? values.dob.format("DD/MM/YYYY") : undefined,
      dateJoining: values.dateJoining ? values.dateJoining.format("DD/MM/YYYY") : undefined,
      dateConfirmation: values.dateConfirmation ? values.dateConfirmation.format("DD/MM/YYYY") : undefined,
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
        content: "Employee records updated successfully!",
        duration: 2,
      });

      // Update static view banner states
      setProfileName(formattedValues.fullName || "");
      setProfileRole(formattedValues.designation || "");
      setProfileDept(formattedValues.department || "");
      setProfileStatus(formattedValues.employmentType === "Apprentice" ? "Onboarding" : "Active");

      // Save new dataset as clean original copy
      setOriginalData(values);
      setIsEditing(false);
    } catch (err: any) {
      messageApi.error({
        content: err.message || "An error occurred while updating.",
        duration: 4,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (originalData) {
      form.setFieldsValue(originalData);
      setCompensationType(originalData.compensationType || "Monthly CTC");
    }
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
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
      }}
    >
      {contextHolder}
      <div className="flex flex-col gap-6 w-full pb-12">
        {/* Header */}
        <PageHeader
          compact
          {...HRMS_BACK.employees}
          title="Employee profile"
          subtitle={`Detailed view and editing panel for employee ${id}`}
          actions={
            <Space>
              {!isEditing ? (
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
              ) : (
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
                    onClick={() => form.submit()}
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
              )}
            </Space>
          }
        />

        {/* ID Card & Form Layout */}
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark="optional"
          className="flex flex-col gap-6 w-full"
        >
          <div className="flex flex-col lg:flex-row gap-6 w-full">
            
            {/* Vertical ID Card */}
            <div className="w-full lg:w-[340px] shrink-0 bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs relative self-start">
            <div className="h-32 bg-gradient-to-br from-[#374d95] to-[#2a3c74] w-full absolute top-0 left-0" />
            <div className="relative z-10 p-6 pt-5 flex flex-col items-center">
              <div className="w-full flex justify-center mb-6">
                <img src="/sudarshan-group-logo.webp" alt="Sudarshan Logo" className="h-8 brightness-0 invert opacity-90" />
              </div>
              <Avatar
                style={{
                  backgroundColor: avatarColors.bg,
                  color: avatarColors.fg,
                  fontWeight: 800,
                  fontSize: 40,
                  border: "4px solid white",
                  boxShadow: "0 8px 16px rgba(0,0,0,0.08)",
                }}
                size={110}
                className="mt-2"
              >
                {avatarInitials}
              </Avatar>
              <h2 className="mt-5 text-[22px] font-extrabold text-zinc-900 leading-none text-center">{profileName}</h2>
              <div className="mt-2.5 bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] font-bold text-xs px-3.5 py-1.5 rounded-full text-center">
                {profileRole}
              </div>
              
              <div className="w-full mt-8 flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                  <span className="text-[10.5px] text-zinc-400 font-bold uppercase tracking-widest">Emp ID</span>
                  <span className="text-[14px] font-black text-zinc-800 font-mono tracking-tight">{id}</span>
                </div>
                <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                  <span className="text-[10.5px] text-zinc-400 font-bold uppercase tracking-widest">Department</span>
                  <span className="text-[13px] font-semibold text-zinc-700">{profileDept}</span>
                </div>
                <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                  <span className="text-[10.5px] text-zinc-400 font-bold uppercase tracking-widest">Joining Date</span>
                  <span className="text-[13px] font-semibold text-zinc-700">{originalData?.dateJoining ? originalData.dateJoining.format("DD MMM YYYY") : "—"}</span>
                </div>
                <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                  <span className="text-[10.5px] text-zinc-400 font-bold uppercase tracking-widest">Shift</span>
                  <span className="text-[13px] font-semibold text-zinc-700">{originalData?.primaryShift || "—"}</span>
                </div>
                <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                  <span className="text-[10.5px] text-zinc-400 font-bold uppercase tracking-widest">Location</span>
                  <span className="text-[13px] font-semibold text-zinc-700 truncate max-w-[150px] text-right" title={originalData?.locationUnit}>{originalData?.locationUnit || "—"}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-[10.5px] text-zinc-400 font-bold uppercase tracking-widest">Status</span>
                  <Tag color={profileStatus === "Active" ? "success" : "processing"} className="m-0 border-none px-3 py-0.5 font-bold shadow-xs text-xs">
                    {profileStatus}
                  </Tag>
                </div>
              </div>
            </div>
            {/* Barcode/Footer purely for visuals */}
            <div className="w-full bg-zinc-50 border-t border-zinc-200 py-3 flex justify-center items-center">
              <div className="flex gap-1 opacity-40">
                {[...Array(24)].map((_, i) => (
                  <div key={i} className={`h-8 bg-zinc-900 ${i % 3 === 0 ? 'w-1.5' : i % 2 === 0 ? 'w-1' : 'w-0.5'}`}></div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Form Section: Profile & Contact Details */}
          <div className="flex-1">
            <Collapse
              defaultActiveKey={["1", "2"]}
              className="border border-zinc-200 bg-white rounded-xl shadow-xs overflow-hidden flex flex-col gap-1.5"
              ghost
            >
              {/* Section 1: Profile details */}
            <Panel
              header={<span className="font-bold text-zinc-900 text-sm">1. Profile Details</span>}
              key="1"
              className="border-b border-zinc-100 bg-[#fbfbfb] px-4 py-2"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1 p-2">
                <Form.Item name="fullName" label="Full Name" rules={[{ required: true, message: "Required" }]}>
                  <Input style={{ height: 38 }} disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="employeeId" label="Employee ID" rules={[{ required: true, message: "Required" }]}>
                  <Input style={{ height: 38 }} disabled={true} />
                </Form.Item>
                <Form.Item name="fatherName" label="Father's Name">
                  <Input style={{ height: 38 }} disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="dob" label="Date of Birth">
                  <DatePicker style={{ height: 38, width: "100%" }} format="DD/MM/YYYY" disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="gender" label="Gender">
                  <Select
                    style={{ height: 38 }}
                    disabled={!isEditing}
                    options={[
                      { value: "Male", label: "Male" },
                      { value: "Female", label: "Female" },
                      { value: "Other", label: "Other" },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="qualification" label="Qualification">
                  <Input style={{ height: 38 }} disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="experience" label="Experience">
                  <Input style={{ height: 38 }} disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="castCategory" label="Cast Category">
                  <Select
                    style={{ height: 38 }}
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
              header={<span className="font-bold text-zinc-900 text-sm">2. Contact & Address</span>}
              key="2"
              className="border-b border-zinc-100 bg-[#fbfbfb] px-4 py-2"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1 p-2">
                <Form.Item name="primaryContact" label="Primary Contact No." rules={[{ required: true, message: "Required" }]}>
                  <Input style={{ height: 38 }} disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="personalEmail" label="Personal Email">
                  <Input style={{ height: 38 }} disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="alternateContact" label="Alternate Contact No.">
                  <Input style={{ height: 38 }} disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="emergencyContact" label="Emergency Contact No.">
                  <Input style={{ height: 38 }} disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="emergencyNameRelation" label="Emergency Contact — Name & Relation">
                  <Input style={{ height: 38 }} disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="officialEmail" label="Official Email (if assigned)">
                  <Input style={{ height: 38 }} disabled={!isEditing} />
                </Form.Item>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 p-2 border-t border-zinc-100/50 mt-2 pt-4">
                <div>
                  <Form.Item name="currentAddress" label="Current Address">
                    <Input.TextArea rows={2} disabled={!isEditing} />
                  </Form.Item>
                  <Form.Item name="currentStatePin" label="State / PIN Code">
                    <Input style={{ height: 38 }} disabled={!isEditing} />
                  </Form.Item>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-zinc-700 font-medium text-xs">Permanent Address</span>
                    <Checkbox
                      onChange={(e) => handleCurrentAddressCopy(e.target.checked)}
                      disabled={!isEditing}
                      className="text-[11px] text-zinc-500"
                    >
                      Same as current
                    </Checkbox>
                  </div>
                  <Form.Item name="permanentAddress" noStyle>
                    <Input.TextArea rows={2} className="mb-2.5" disabled={!isEditing} />
                  </Form.Item>
                  <div className="h-2" />
                  <Form.Item name="permanentStatePin" label="State / PIN Code">
                    <Input style={{ height: 38 }} disabled={!isEditing} />
                  </Form.Item>
                </div>
              </div>
            </Panel>
            </Collapse>
          </div>
        </div>

        {/* Bottom Form Sections: Full Width */}
        <Collapse
          defaultActiveKey={["4", "6"]}
          className="border border-zinc-200 bg-white rounded-xl shadow-xs overflow-hidden flex flex-col gap-1.5"
          ghost
        >
            {/* Section 3: Identity & bank */}
            <Panel
              header={<span className="font-bold text-zinc-900 text-sm">3. Identity & Bank Details</span>}
              key="3"
              className="border-b border-zinc-100 bg-[#fbfbfb] px-4 py-2"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1 p-2">
                <Form.Item name="aadhar" label="Aadhar No.">
                  <Input style={{ height: 38 }} disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="pan" label="PAN No.">
                  <Input style={{ height: 38 }} disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="pfUan" label="PF / UAN No.">
                  <Input style={{ height: 38 }} disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="esiIp" label="ESI / IP No.">
                  <Input style={{ height: 38 }} disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="bankName" label="Bank Name">
                  <Input style={{ height: 38 }} disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="accountNo" label="Account No.">
                  <Input style={{ height: 38 }} disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="ifscCode" label="IFSC Code">
                  <Input style={{ height: 38 }} disabled={!isEditing} />
                </Form.Item>
              </div>
            </Panel>

            {/* Section 4: Employment & payroll */}
            <Panel
              header={<span className="font-bold text-zinc-900 text-sm">4. Employment & Payroll</span>}
              key="4"
              className="border-b border-zinc-100 bg-[#fbfbfb] px-4 py-2"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1 p-2">
                <Form.Item name="department" label="Department" rules={[{ required: true, message: "Required" }]}>
                  <Select
                    style={{ height: 38 }}
                    disabled={!isEditing}
                    options={departmentOptions}
                    loading={departmentOptions.length === 0}
                    showSearch
                  />
                </Form.Item>
                <Form.Item name="designation" label="Designation" rules={[{ required: true, message: "Required" }]}>
                  <Input style={{ height: 38 }} disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="locationUnit" label="Location / Unit" rules={[{ required: true, message: "Required" }]}>
                  <Select
                    style={{ height: 38 }}
                    disabled={!isEditing}
                    options={[
                      { value: "Sudarshan Minerals (Udaipur — Plant 1)", label: "Sudarshan Minerals (Udaipur — Plant 1)" },
                      { value: "Sudarshan Minerals (Udaipur — Plant 2)", label: "Sudarshan Minerals (Udaipur — Plant 2)" },
                      { value: "Sudarshan Microns (Udaipur)", label: "Sudarshan Microns (Udaipur)" },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="reportingManager" label="Reporting Manager">
                  <Select
                    style={{ height: 38 }}
                    disabled={!isEditing}
                    options={[
                      { value: "EMP-2010 — Sunil Mehra (Plant Head)", label: "EMP-2010 — Sunil Mehra (Plant Head)" },
                      { value: "EMP-2014 — Rajiv Mehta (Owner)", label: "EMP-2014 — Rajiv Mehta (Owner)" },
                    ]}
                  />
                </Form.Item>

                <Form.Item name="employmentType" label="Employment Type" rules={[{ required: true, message: "Required" }]}>
                  <Select
                    style={{ height: 38 }}
                    disabled={!isEditing}
                    options={[
                      { value: "Permanent", label: "Permanent" },
                      { value: "Contractual", label: "Contractual" },
                      { value: "Apprentice", label: "Apprentice" },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="dateJoining" label="Date of Joining" rules={[{ required: true, message: "Required" }]}>
                  <DatePicker style={{ height: 38, width: "100%" }} format="DD/MM/YYYY" disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="dateConfirmation" label="Confirmation Date">
                  <DatePicker style={{ height: 38, width: "100%" }} format="DD/MM/YYYY" disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="probationMonths" label="Probation Period (Months)">
                  <InputNumber style={{ height: 38, width: "100%" }} min={0} disabled={!isEditing} />
                </Form.Item>
              </div>
            </Panel>

            {/* Section 5: Shift assignment */}
            <Panel
              header={<span className="font-bold text-zinc-900 text-sm">5. Shift Assignment</span>}
              key="5"
              className="border-b border-zinc-100 bg-[#fbfbfb] px-4 py-2"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1 p-2">
                <Form.Item name="shiftMode" label="Shift Mode">
                  <Select
                    style={{ height: 38 }}
                    disabled={!isEditing}
                    options={[
                      { value: "Single shift (fixed)", label: "Single shift (fixed)" },
                      { value: "Multiple shifts (rotating)", label: "Multiple shifts (rotating)" },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="primaryShift" label="Primary Shift">
                  <Select
                    style={{ height: 38 }}
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
                    style={{ height: 38 }}
                    disabled={!isEditing}
                    options={[
                      { value: "None", label: "None" },
                      { value: "Weekly rotation", label: "Weekly rotation" },
                      { value: "Fortnightly rotation", label: "Fortnightly rotation" },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="workingHours" label="Working Hours / Day">
                  <InputNumber style={{ height: 38, width: "100%" }} min={1} max={24} disabled={!isEditing} />
                </Form.Item>
                <Form.Item name="weeklyOff" label="Weekly Off Day">
                  <Select
                    style={{ height: 38 }}
                    disabled={!isEditing}
                    options={[
                      { value: "Sunday", label: "Sunday" },
                      { value: "Saturday", label: "Saturday" },
                      { value: "Rotating", label: "Rotating" },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="overtimeApplicable" label="Overtime Applicability" valuePropName="checked" className="pt-2">
                  <Checkbox className="font-medium text-zinc-700 text-xs" disabled={!isEditing}>
                    Eligible for Overtime (OT)
                  </Checkbox>
                </Form.Item>
              </div>
            </Panel>

            {/* Section 6: Salary structure */}
            <Panel
              header={<span className="font-bold text-zinc-900 text-sm">6. Salary & Compensation Structure</span>}
              key="6"
              className="border-b border-zinc-100 bg-[#fbfbfb] px-4 py-2"
            >
              <div className="p-2 flex flex-col gap-4">
                <Form.Item
                  name="compensationType"
                  label={<span className="font-semibold text-zinc-800 text-xs">Compensation Category</span>}
                  rules={[{ required: true, message: "Required" }]}
                >
                  <Radio.Group onChange={handleCompensationTypeChange} disabled={!isEditing} className="flex gap-4">
                    <Radio value="Monthly CTC">
                      <div className="flex flex-col text-left leading-normal">
                        <span className="font-bold text-zinc-800">Monthly CTC (Salaried)</span>
                        <span className="text-[11px] text-zinc-400 font-normal">Fixed monthly components (Basic + HRA + DA)</span>
                      </div>
                    </Radio>
                    <Radio value="Daily wage">
                      <div className="flex flex-col text-left leading-normal">
                        <span className="font-bold text-zinc-800">Daily wage (Wage labour)</span>
                        <span className="text-[11px] text-zinc-400 font-normal">Paid by shifts/days worked × daily rate</span>
                      </div>
                    </Radio>
                  </Radio.Group>
                </Form.Item>

                {/* Sub-Form: Monthly CTC Details */}
                {compensationType === "Monthly CTC" && (
                  <div className="bg-zinc-50 border border-zinc-200/50 rounded-xl p-6 flex flex-col gap-4 mt-2">
                    <div className="flex items-center gap-2 border-b border-zinc-200/50 pb-2.5">
                      <CalculatorOutlined className="text-[#374d95] text-base" />
                      <span className="font-bold text-zinc-900 text-xs uppercase tracking-wider">Monthly Components</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1">
                      <Form.Item name="annualCtc" label="Annual CTC (₹)">
                        <InputNumber
                          style={{ height: 38, width: "100%" }}
                          formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                          parser={v => parseFloat(v?.replace(/\₹\s?|(,*)/g, "") || "0") || 0}
                          onChange={handleAnnualCtcChange}
                          disabled={!isEditing}
                        />
                      </Form.Item>
                      <Form.Item name="monthlyGross" label="Monthly Gross (₹)">
                        <InputNumber
                          style={{ height: 38, width: "100%" }}
                          formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                          parser={v => parseFloat(v?.replace(/\₹\s?|(,*)/g, "") || "0") || 0}
                          disabled={!isEditing}
                        />
                      </Form.Item>
                      <Form.Item name="basicSalary" label="Basic Salary (₹/mo)">
                        <InputNumber
                          style={{ height: 38, width: "100%" }}
                          formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                          parser={v => parseFloat(v?.replace(/\₹\s?|(,*)/g, "") || "0") || 0}
                          disabled={!isEditing}
                        />
                      </Form.Item>
                      <Form.Item name="da" label="DA (₹/mo)">
                        <InputNumber
                          style={{ height: 38, width: "100%" }}
                          formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                          parser={v => parseFloat(v?.replace(/\₹\s?|(,*)/g, "") || "0") || 0}
                          disabled={!isEditing}
                        />
                      </Form.Item>
                      <Form.Item name="hra" label="HRA (₹/mo)">
                        <InputNumber
                          style={{ height: 38, width: "100%" }}
                          formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                          parser={v => parseFloat(v?.replace(/\₹\s?|(,*)/g, "") || "0") || 0}
                          disabled={!isEditing}
                        />
                      </Form.Item>
                      <Form.Item name="otherConveyance" label="Other / Conveyance (₹/mo)">
                        <InputNumber
                          style={{ height: 38, width: "100%" }}
                          formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                          parser={v => parseFloat(v?.replace(/\₹\s?|(,*)/g, "") || "0") || 0}
                          disabled={!isEditing}
                        />
                      </Form.Item>
                      <Form.Item name="specialBonus" label="Special / Bonus (₹/mo)">
                        <InputNumber
                          style={{ height: 38, width: "100%" }}
                          formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                          parser={v => parseFloat(v?.replace(/\₹\s?|(,*)/g, "") || "0") || 0}
                          disabled={!isEditing}
                        />
                      </Form.Item>
                      <Form.Item name="reimbursementCap" label="Reimbursement Cap (₹/mo)">
                        <InputNumber
                          style={{ height: 38, width: "100%" }}
                          formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                          parser={v => parseFloat(v?.replace(/\₹\s?|(,*)/g, "") || "0") || 0}
                          disabled={!isEditing}
                        />
                      </Form.Item>
                    </div>
                  </div>
                )}

                {/* Sub-Form: Daily Wage Details */}
                {compensationType === "Daily wage" && (
                  <div className="bg-zinc-50 border border-zinc-200/50 rounded-xl p-6 flex flex-col gap-4 mt-2">
                    <div className="flex items-center justify-between border-b border-zinc-200/50 pb-2.5">
                      <div className="flex items-center gap-2">
                        <SecurityScanOutlined className="text-amber-500 text-base" />
                        <span className="font-bold text-zinc-900 text-xs uppercase tracking-wider">Labor / Daily Wage Grid</span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-semibold bg-white border border-zinc-200 px-2 py-0.5 rounded">
                        Hourly calculation enabled
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1">
                      <Form.Item name="dailyWageRate" label="Daily Wage Rate (₹/day)">
                        <InputNumber
                          style={{ height: 38, width: "100%" }}
                          formatter={v => `₹ ${v}`}
                          parser={v => parseFloat(v?.replace(/\₹\s?|(,*)/g, "") || "0") || 0}
                          disabled={!isEditing}
                        />
                      </Form.Item>
                      <Form.Item name="skillCategory" label="Skill Category">
                        <Select
                          style={{ height: 38 }}
                          disabled={!isEditing}
                          options={[
                            { value: "Skilled", label: "Skilled" },
                            { value: "Semi-Skilled", label: "Semi-Skilled" },
                            { value: "Unskilled", label: "Unskilled" },
                          ]}
                        />
                      </Form.Item>
                      <Form.Item name="tradeJobRole" label="Trade / Job Role">
                        <Input style={{ height: 38 }} disabled={!isEditing} />
                      </Form.Item>
                      <Form.Item name="engagedVia" label="Engaged Via">
                        <Select
                          style={{ height: 38 }}
                          disabled={!isEditing}
                          options={[
                            { value: "Direct (on-roll)", label: "Direct (on-roll)" },
                            { value: "Contractor (off-roll)", label: "Contractor (off-roll)" },
                          ]}
                        />
                      </Form.Item>
                      <Form.Item name="payFrequency" label="Pay Frequency">
                        <Select
                          style={{ height: 38 }}
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
                          style={{ height: 38 }}
                          disabled={!isEditing}
                          options={[
                            { value: "Bank transfer", label: "Bank transfer" },
                            { value: "Cash", label: "Cash" },
                            { value: "Cheque", label: "Cheque" },
                          ]}
                        />
                      </Form.Item>
                    </div>

                    {/* Auto-Formula Explainer Card */}
                    <div className="bg-amber-50/50 border border-amber-200/50 rounded-lg p-4 text-amber-800 text-[12px] font-medium leading-relaxed flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2.5">
                      <CalculatorOutlined className="text-amber-600 text-sm mt-0.5" />
                      <div>
                        <div>
                          <span className="font-bold text-amber-900">Auto-formula details</span>: Net pay = (Daily rate × Days worked) + (OT hrs × 2 × Hourly rate) − PF/ESI − Advance.
                        </div>
                        <div className="text-zinc-500 mt-1 text-[11px] font-normal">
                          Example: For ₹540/day at 26 days + 8 OT hrs = ₹14,040 + ₹1,080 = ₹15,120 gross.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          </Collapse>
        </Form>
      </div> {/* End main flex-col pb-12 */}
    </ConfigProvider>
  );
}
