"use client";

import { useState, useEffect } from "react";
import {
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Radio,
  Checkbox,
  Button,
  Space,
  ConfigProvider,
  message,
  Steps,
} from "antd";
import {
  SaveOutlined,
  SecurityScanOutlined,
  CalculatorOutlined,
  LockOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/common/PageHeader";
import { HRMS_BACK } from "@/lib/hrms-nav";

const DRAFT_KEY = "hrms_employee_draft";

export default function AddEmployeePage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [compensationType, setCompensationType] = useState("Monthly CTC");
  const [messageApi, contextHolder] = message.useMessage();
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
      
    // Load draft if it exists
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        const parsedDraft = JSON.parse(draft);
        if (parsedDraft.dob) parsedDraft.dob = dayjs(parsedDraft.dob);
        if (parsedDraft.dateJoining) parsedDraft.dateJoining = dayjs(parsedDraft.dateJoining);
        if (parsedDraft.dateConfirmation) parsedDraft.dateConfirmation = dayjs(parsedDraft.dateConfirmation);
        
        form.setFieldsValue(parsedDraft);
        if (parsedDraft.compensationType) {
          setCompensationType(parsedDraft.compensationType);
        }
        messageApi.info("Draft loaded successfully.");
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
    }
  }, []);

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
    setLoading(true);

    const formattedValues = {
      ...values,
      dob: values.dob ? values.dob.format("DD/MM/YYYY") : undefined,
      dateJoining: values.dateJoining ? values.dateJoining.format("DD/MM/YYYY") : undefined,
      dateConfirmation: values.dateConfirmation ? values.dateConfirmation.format("DD/MM/YYYY") : undefined,
      overtimeApplicable: !!values.overtimeApplicable,
    };

    try {
      const response = await fetch("/api/hrms/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedValues),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create employee");
      }

      messageApi.success({
        content: "Employee created successfully! Redirecting to list...",
        duration: 1.5,
      });
      
      localStorage.removeItem(DRAFT_KEY);

      setTimeout(() => {
        router.push("/hrms/employees");
      }, 1000);
    } catch (err: any) {
      messageApi.error({
        content: err.message || "An error occurred during submission.",
        duration: 4,
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleNext = async () => {
    try {
      const fieldsToValidate = steps[currentStep].fields;
      await form.validateFields(fieldsToValidate);
      setCurrentStep((prev) => prev + 1);
    } catch (error) {
      // Validation failed
    }
  };
  
  const handlePrev = () => {
    setCurrentStep((prev) => prev - 1);
  };
  
  const handleSaveDraft = () => {
    const values = form.getFieldsValue(true);
    const draftValues = {
      ...values,
      dob: values.dob ? values.dob.toISOString() : undefined,
      dateJoining: values.dateJoining ? values.dateJoining.toISOString() : undefined,
      dateConfirmation: values.dateConfirmation ? values.dateConfirmation.toISOString() : undefined,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftValues));
    messageApi.success("Draft saved successfully.");
  };

  const steps = [
    {
      title: "Profile",
      fields: ["fullName", "employeeId", "fatherName", "dob", "gender", "qualification", "experience", "castCategory"],
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1 p-2">
          <Form.Item name="fullName" label="Full Name" rules={[{ required: true, message: "Required" }]}>
            <Input style={{ height: 38 }} />
          </Form.Item>
          <Form.Item name="employeeId" label="Employee ID" rules={[{ required: true, message: "Required" }]}>
            <Input style={{ height: 38 }} />
          </Form.Item>
          <Form.Item name="fatherName" label="Father's Name">
            <Input style={{ height: 38 }} />
          </Form.Item>
          <Form.Item name="dob" label="Date of Birth">
            <DatePicker style={{ height: 38, width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="gender" label="Gender">
            <Select
              style={{ height: 38 }}
              options={[
                { value: "Male", label: "Male" },
                { value: "Female", label: "Female" },
                { value: "Other", label: "Other" },
              ]}
            />
          </Form.Item>
          <Form.Item name="qualification" label="Qualification">
            <Input style={{ height: 38 }} />
          </Form.Item>
          <Form.Item name="experience" label="Experience">
            <Input style={{ height: 38 }} />
          </Form.Item>
          <Form.Item name="castCategory" label="Cast Category">
            <Select
              style={{ height: 38 }}
              options={[
                { value: "General", label: "General" },
                { value: "OBC", label: "OBC" },
                { value: "SC", label: "SC" },
                { value: "ST", label: "ST" },
              ]}
            />
          </Form.Item>
        </div>
      )
    },
    {
      title: "Contact",
      fields: ["primaryContact", "personalEmail", "alternateContact", "emergencyContact", "emergencyNameRelation", "officialEmail", "currentAddress", "currentStatePin", "permanentAddress", "permanentStatePin"],
      content: (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1 p-2">
            <Form.Item name="primaryContact" label="Primary Contact No." rules={[{ required: true, message: "Required" }]}>
              <Input style={{ height: 38 }} />
            </Form.Item>
            <Form.Item name="personalEmail" label="Personal Email">
              <Input style={{ height: 38 }} />
            </Form.Item>
            <Form.Item name="alternateContact" label="Alternate Contact No.">
              <Input style={{ height: 38 }} />
            </Form.Item>
            <Form.Item name="emergencyContact" label="Emergency Contact No.">
              <Input style={{ height: 38 }} />
            </Form.Item>
            <Form.Item name="emergencyNameRelation" label="Emergency Contact — Name & Relation">
              <Input style={{ height: 38 }} />
            </Form.Item>
            <Form.Item name="officialEmail" label="Official Email (if assigned)">
              <Input style={{ height: 38 }} />
            </Form.Item>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 p-2 border-t border-zinc-100/50 mt-2 pt-4">
            <div>
              <Form.Item name="currentAddress" label="Current Address">
                <Input.TextArea rows={2} />
              </Form.Item>
              <Form.Item name="currentStatePin" label="State / PIN Code">
                <Input style={{ height: 38 }} />
              </Form.Item>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-zinc-700 font-medium text-xs">Permanent Address</span>
                <Checkbox onChange={(e) => handleCurrentAddressCopy(e.target.checked)} className="text-[11px] text-zinc-500">Same as current</Checkbox>
              </div>
              <Form.Item name="permanentAddress" noStyle>
                <Input.TextArea rows={2} className="mb-2.5" />
              </Form.Item>
              <div className="h-2" />
              <Form.Item name="permanentStatePin" label="State / PIN Code">
                <Input style={{ height: 38 }} />
              </Form.Item>
            </div>
          </div>
        </>
      )
    },
    {
      title: "Identity",
      fields: ["aadhar", "pan", "pfUan", "esiIp", "bankName", "accountNo", "ifscCode"],
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1 p-2">
          <Form.Item name="aadhar" label="Aadhar No.">
            <Input style={{ height: 38 }} />
          </Form.Item>
          <Form.Item name="pan" label="PAN No.">
            <Input style={{ height: 38 }} />
          </Form.Item>
          <Form.Item name="pfUan" label="PF / UAN No.">
            <Input style={{ height: 38 }} />
          </Form.Item>
          <Form.Item name="esiIp" label="ESI / IP No.">
            <Input style={{ height: 38 }} />
          </Form.Item>
          <Form.Item name="bankName" label="Bank Name">
            <Input style={{ height: 38 }} />
          </Form.Item>
          <Form.Item name="accountNo" label="Account No.">
            <Input style={{ height: 38 }} />
          </Form.Item>
          <Form.Item name="ifscCode" label="IFSC Code">
            <Input style={{ height: 38 }} />
          </Form.Item>
        </div>
      )
    },
    {
      title: "Employment",
      fields: ["department", "designation", "locationUnit", "reportingManager", "employmentType", "dateJoining", "dateConfirmation", "probationMonths"],
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1 p-2">
          <Form.Item name="department" label="Department" rules={[{ required: true, message: "Required" }]}>
            <Select
              style={{ height: 38 }}
              options={departmentOptions}
              loading={departmentOptions.length === 0}
              showSearch
            />
          </Form.Item>
          <Form.Item name="designation" label="Designation" rules={[{ required: true, message: "Required" }]}>
            <Input style={{ height: 38 }} />
          </Form.Item>
          <Form.Item name="locationUnit" label="Location / Unit" rules={[{ required: true, message: "Required" }]}>
            <Select
              style={{ height: 38 }}
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
              options={[
                { value: "EMP-2010 — Sunil Mehra (Plant Head)", label: "EMP-2010 — Sunil Mehra (Plant Head)" },
                { value: "EMP-2014 — Rajiv Mehta (Owner)", label: "EMP-2014 — Rajiv Mehta (Owner)" },
              ]}
            />
          </Form.Item>
          <Form.Item name="employmentType" label="Employment Type" rules={[{ required: true, message: "Required" }]}>
            <Select
              style={{ height: 38 }}
              options={[
                { value: "Permanent", label: "Permanent" },
                { value: "Contractual", label: "Contractual" },
                { value: "Apprentice", label: "Apprentice" },
              ]}
            />
          </Form.Item>
          <Form.Item name="dateJoining" label="Date of Joining" rules={[{ required: true, message: "Required" }]}>
            <DatePicker style={{ height: 38, width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="dateConfirmation" label="Confirmation Date">
            <DatePicker style={{ height: 38, width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="probationMonths" label="Probation Period (Months)">
            <InputNumber style={{ height: 38, width: "100%" }} min={0} />
          </Form.Item>
        </div>
      )
    },
    {
      title: "Shift",
      fields: ["shiftMode", "primaryShift", "rotationPattern", "workingHours", "weeklyOff", "overtimeApplicable"],
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1 p-2">
          <Form.Item name="shiftMode" label="Shift Mode">
            <Select
              style={{ height: 38 }}
              options={[
                { value: "Single shift (fixed)", label: "Single shift (fixed)" },
                { value: "Multiple shifts (rotating)", label: "Multiple shifts (rotating)" },
              ]}
            />
          </Form.Item>
          <Form.Item name="primaryShift" label="Primary Shift">
            <Select
              style={{ height: 38 }}
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
              options={[
                { value: "None", label: "None" },
                { value: "Weekly rotation", label: "Weekly rotation" },
                { value: "Fortnightly rotation", label: "Fortnightly rotation" },
              ]}
            />
          </Form.Item>
          <Form.Item name="workingHours" label="Working Hours / Day">
            <InputNumber style={{ height: 38, width: "100%" }} min={1} max={24} />
          </Form.Item>
          <Form.Item name="weeklyOff" label="Weekly Off Day">
            <Select
              style={{ height: 38 }}
              options={[
                { value: "Sunday", label: "Sunday" },
                { value: "Saturday", label: "Saturday" },
                { value: "Rotating", label: "Rotating" },
              ]}
            />
          </Form.Item>
          <Form.Item name="overtimeApplicable" label="Overtime Applicability" valuePropName="checked" className="pt-2">
            <Checkbox className="font-medium text-zinc-700 text-xs">Eligible for Overtime (OT)</Checkbox>
          </Form.Item>
        </div>
      )
    },
    {
      title: "Salary",
      fields: ["compensationType", "annualCtc", "monthlyGross", "basicSalary", "da", "hra", "otherConveyance", "specialBonus", "reimbursementCap", "dailyWageRate", "skillCategory", "tradeJobRole", "engagedVia", "payFrequency", "paymentMode"],
      content: (
        <div className="p-2 flex flex-col gap-4">
          <Form.Item name="compensationType" label={<span className="font-semibold text-zinc-800 text-xs">Compensation Category</span>} rules={[{ required: true, message: "Required" }]}>
            <Radio.Group onChange={handleCompensationTypeChange} className="flex gap-4">
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
                  <InputNumber style={{ height: 38, width: "100%" }} formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} parser={v => parseFloat(v?.toString().replace(/\₹\s?|(,*)/g, "") || "0") || 0} onChange={handleAnnualCtcChange} />
                </Form.Item>
                <Form.Item name="monthlyGross" label="Monthly Gross (₹)">
                  <InputNumber style={{ height: 38, width: "100%" }} formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} parser={v => parseFloat(v?.toString().replace(/\₹\s?|(,*)/g, "") || "0") || 0} />
                </Form.Item>
                <Form.Item name="basicSalary" label="Basic Salary (₹/mo)">
                  <InputNumber style={{ height: 38, width: "100%" }} formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} parser={v => parseFloat(v?.toString().replace(/\₹\s?|(,*)/g, "") || "0") || 0} />
                </Form.Item>
                <Form.Item name="da" label="DA (₹/mo)">
                  <InputNumber style={{ height: 38, width: "100%" }} formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} parser={v => parseFloat(v?.toString().replace(/\₹\s?|(,*)/g, "") || "0") || 0} />
                </Form.Item>
                <Form.Item name="hra" label="HRA (₹/mo)">
                  <InputNumber style={{ height: 38, width: "100%" }} formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} parser={v => parseFloat(v?.toString().replace(/\₹\s?|(,*)/g, "") || "0") || 0} />
                </Form.Item>
                <Form.Item name="otherConveyance" label="Other / Conveyance (₹/mo)">
                  <InputNumber style={{ height: 38, width: "100%" }} formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} parser={v => parseFloat(v?.toString().replace(/\₹\s?|(,*)/g, "") || "0") || 0} />
                </Form.Item>
                <Form.Item name="specialBonus" label="Special / Bonus (₹/mo)">
                  <InputNumber style={{ height: 38, width: "100%" }} formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} parser={v => parseFloat(v?.toString().replace(/\₹\s?|(,*)/g, "") || "0") || 0} />
                </Form.Item>
                <Form.Item name="reimbursementCap" label="Reimbursement Cap (₹/mo)">
                  <InputNumber style={{ height: 38, width: "100%" }} formatter={v => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} parser={v => parseFloat(v?.toString().replace(/\₹\s?|(,*)/g, "") || "0") || 0} />
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
                <span className="text-[10px] text-zinc-400 font-semibold bg-white border border-zinc-200 px-2 py-0.5 rounded">Hourly calculation enabled</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1">
                <Form.Item name="dailyWageRate" label="Daily Wage Rate (₹/day)">
                  <InputNumber style={{ height: 38, width: "100%" }} formatter={v => `₹ ${v}`} parser={v => parseFloat(v?.toString().replace(/\₹\s?|(,*)/g, "") || "0") || 0} />
                </Form.Item>
                <Form.Item name="skillCategory" label="Skill Category">
                  <Select
                    style={{ height: 38 }}
                    options={[
                      { value: "Skilled", label: "Skilled" },
                      { value: "Semi-Skilled", label: "Semi-Skilled" },
                      { value: "Unskilled", label: "Unskilled" },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="tradeJobRole" label="Trade / Job Role">
                  <Input style={{ height: 38 }} />
                </Form.Item>
                <Form.Item name="engagedVia" label="Engaged Via">
                  <Select
                    style={{ height: 38 }}
                    options={[
                      { value: "Direct (on-roll)", label: "Direct (on-roll)" },
                      { value: "Contractor (off-roll)", label: "Contractor (off-roll)" },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="payFrequency" label="Pay Frequency">
                  <Select
                    style={{ height: 38 }}
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
      )
    }
  ];

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#374d95",
          borderRadius: 8,
        },
        components: {
          Form: {
            itemMarginBottom: 12,
          },
        },
      }}
    >
      {contextHolder}
      <div className="flex flex-col gap-4 w-full pb-12">
        <PageHeader
          compact
          {...HRMS_BACK.employees}
          title="Add employee"
          subtitle="Register a new employee workspace across companies"
        />

        <div className="bg-white shadow-sm" style={{ marginTop: "24px", marginBottom: "16px", padding: "24px", borderRadius: "12px" }}>
          <Steps current={currentStep} items={steps.map(item => ({ title: item.title }))} />
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark="optional"
          initialValues={{
            overtimeApplicable: false,
            compensationType: "Monthly CTC",
          }}
        >
          <div className="bg-white shadow-sm min-h-[400px]" style={{ border: "1px solid #D0D0D0", padding: "24px", borderRadius: "12px" }}>
            {steps[currentStep].content}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "2rem", width: "100%", alignItems: "center" }}>
            <Link href="/hrms/employees">
              <Button style={{ height: 38, borderRadius: 6, fontWeight: 500 }} className="text-zinc-600">
                Cancel
              </Button>
            </Link>
            <Button onClick={handleSaveDraft} style={{ height: 38, borderRadius: 6 }}>
              Save as Draft
            </Button>
            {currentStep > 0 && (
              <Button onClick={handlePrev} style={{ height: 38, borderRadius: 6 }}>
                Previous
              </Button>
            )}
            {currentStep < steps.length - 1 && (
              <Button type="primary" onClick={handleNext} style={{ height: 38, borderRadius: 6, background: "#374d95" }}>
                Next
              </Button>
            )}
            {currentStep === steps.length - 1 && (
              <Button
                type="primary"
                onClick={() => form.submit()}
                loading={loading}
                style={{ height: 38, borderRadius: 6, background: "#374d95" }}
                icon={<SaveOutlined />}
              >
                Create Employee
              </Button>
            )}
          </div>
        </Form>
      </div>
    </ConfigProvider>
  );
}
