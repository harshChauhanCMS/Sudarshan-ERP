"use client";

import { useState, useEffect } from "react";
import {
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Checkbox,
  Button,
  ConfigProvider,
  message,
  Steps,
} from "antd";
import {
  SaveOutlined,
  SecurityScanOutlined,
  CalculatorOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/common/PageHeader";
import CompensationCategoryPicker from "@/components/hrms/CompensationCategoryPicker";
import NumericInput from "@/components/common/NumericInput";
import { HRMS_BACK } from "@/lib/hrms-nav";
import {
  disableEmployeeDobUnder18,
  employeeMinAgeDobRule,
  latestAllowedEmployeeDob,
} from "@/lib/hrms-dob";
import {
  departmentSkipsReportingManager,
  EMPLOYEE_EXPERIENCE_OPTIONS,
  EMPLOYEE_QUALIFICATION_OPTIONS,
} from "@/lib/hrms-employee-options";
import { formatReportingManagerLabel } from "@/lib/manager-scope-shared";

const DRAFT_KEY = "hrms_employee_draft";

const EMPLOYEE_COMPANY_OPTIONS = [
  { value: "smi", label: "Sudarshan Minerals & Industries (SMI)" },
  { value: "smic", label: "Sudarshan Microns" },
];

const digitsOnlyRule = { pattern: /^\d+$/, message: "Numbers only" };

const STEP_META = [
  {
    title: "Profile Details",
    description:
      "Personal information, DOB and background — employee ID is assigned automatically",
  },
  {
    title: "Contact & Address",
    description: "Phone numbers, email and residential address",
  },
  {
    title: "Identity & Bank",
    description: "Aadhar, PAN, PF/UAN and bank account",
  },
  {
    title: "Employment",
    description: "Department, designation, company access and joining",
  },
  {
    title: "Shift Assignment",
    description: "Shift mode, working hours and weekly off",
  },
  {
    title: "Salary Structure",
    description: "Monthly CTC or daily wage compensation",
  },
];

export default function AddEmployeePage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [messageApi, contextHolder] = message.useMessage();
  const compensationType =
    Form.useWatch("compensationType", form) ?? "Monthly CTC";
  const department = Form.useWatch("department", form);
  const showReportingManager = !departmentSkipsReportingManager(department);
  const [departmentOptions, setDepartmentOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [reportingManagerOptions, setReportingManagerOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [nextEmployeeId, setNextEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    if (!showReportingManager) {
      form.setFieldValue("reportingManager", undefined);
    }
  }, [showReportingManager, form]);

  useEffect(() => {
    fetch("/api/hrms/employees/next-id")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.employeeId) setNextEmployeeId(d.employeeId);
      })
      .catch(() => {});

    fetch("/api/system/roles")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setDepartmentOptions(
            d.data.map((role: any) => ({
              value: role.roleKey,
              label: role.label,
            })),
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

    // Load draft if it exists
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        const parsedDraft = JSON.parse(draft);
        delete parsedDraft.employeeId;
        if (parsedDraft.dob) parsedDraft.dob = dayjs(parsedDraft.dob);
        if (parsedDraft.dateJoining)
          parsedDraft.dateJoining = dayjs(parsedDraft.dateJoining);
        if (parsedDraft.dateConfirmation)
          parsedDraft.dateConfirmation = dayjs(parsedDraft.dateConfirmation);

        form.setFieldsValue(parsedDraft);
        messageApi.info("Draft loaded successfully.");
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
    }
  }, []);

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

  const onFinish = async () => {
    setLoading(true);

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
      dob: values.dob ? values.dob.format("DD/MM/YYYY") : undefined,
      dateJoining: values.dateJoining
        ? values.dateJoining.format("DD/MM/YYYY")
        : undefined,
      dateConfirmation: values.dateConfirmation
        ? values.dateConfirmation.format("DD/MM/YYYY")
        : undefined,
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

      const createdId = data.data?.employeeId ?? nextEmployeeId;
      const emailNote = data.credentialsEmail?.sent
        ? " Login credentials emailed — employee must reset password within 1 hour."
        : data.credentialsEmail?.reason === "no_email"
          ? " Add an official or personal email to send login credentials."
          : "";
      messageApi.success({
        content: createdId
          ? `Employee ${createdId} created successfully!${emailNote} Redirecting…`
          : `Employee created successfully!${emailNote} Redirecting…`,
        duration: emailNote ? 3 : 1.5,
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

  const employmentFields = (fields: string[]) =>
    fields.filter(
      (field) =>
        field !== "reportingManager" || showReportingManager
    );

  const handleNext = async () => {
    try {
      const fieldsToValidate = employmentFields(steps[currentStep].fields);
      await form.validateFields(fieldsToValidate);
      setCurrentStep((prev) => prev + 1);
    } catch (error) {
      // Validation failed
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleCreateEmployee = async () => {
    try {
      const allFields = steps.flatMap((step) => employmentFields(step.fields));
      await form.validateFields(allFields);
      form.submit();
    } catch {
      messageApi.error("Please complete all required fields in every step.");
    }
  };

  const handleSaveDraft = () => {
    const values = form.getFieldsValue(true);
    const { employeeId: _omit, ...rest } = values;
    const draftValues = {
      ...rest,
      dob: values.dob ? values.dob.toISOString() : undefined,
      dateJoining: values.dateJoining
        ? values.dateJoining.toISOString()
        : undefined,
      dateConfirmation: values.dateConfirmation
        ? values.dateConfirmation.toISOString()
        : undefined,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftValues));
    messageApi.success("Draft saved successfully.");
  };

  const steps = [
    {
      title: "Profile",
      fields: [
        "fullName",
        "fatherName",
        "dob",
        "gender",
        "qualification",
        "experience",
        "castCategory",
      ],
      content: (
        <div className="emp-form-grid">
          <Form.Item
            name="fullName"
            label="Full Name"
            rules={[{ required: true, message: "Required" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="fatherName" label="Father's Name">
            <Input />
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
              disabledDate={disableEmployeeDobUnder18}
              defaultPickerValue={latestAllowedEmployeeDob()}
            />
          </Form.Item>
          <Form.Item name="gender" label="Gender">
            <Select
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
              options={[...EMPLOYEE_QUALIFICATION_OPTIONS]}
            />
          </Form.Item>
          <Form.Item name="experience" label="Experience">
            <Select
              allowClear
              placeholder="Select experience"
              options={[...EMPLOYEE_EXPERIENCE_OPTIONS]}
            />
          </Form.Item>
          <Form.Item name="castCategory" label="Cast Category">
            <Select
              options={[
                { value: "General", label: "General" },
                { value: "OBC", label: "OBC" },
                { value: "SC", label: "SC" },
                { value: "ST", label: "ST" },
              ]}
            />
          </Form.Item>
        </div>
      ),
    },
    {
      title: "Contact",
      fields: [
        "primaryContact",
        "personalEmail",
        "alternateContact",
        "emergencyContact",
        "emergencyNameRelation",
        "officialEmail",
        "currentAddress",
        "currentStatePin",
        "permanentAddress",
        "permanentStatePin",
      ],
      content: (
        <>
          <div className="emp-form-grid">
            <Form.Item
              name="primaryContact"
              label="Primary Contact No."
              rules={[
                { required: true, message: "Required" },
                digitsOnlyRule,
                { len: 10, message: "Enter a 10-digit mobile number" },
              ]}
            >
              <NumericInput maxDigits={10} />
            </Form.Item>
            <Form.Item
              name="personalEmail"
              label="Personal Email"
              className="emp-form-no-optional"
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="alternateContact"
              label="Alternate Contact No."
              rules={[{ pattern: /^\d*$/, message: "Numbers only" }]}
            >
              <NumericInput maxDigits={10} />
            </Form.Item>
            <Form.Item
              name="emergencyContact"
              label="Emergency Contact No."
              rules={[{ pattern: /^\d*$/, message: "Numbers only" }]}
            >
              <NumericInput maxDigits={10} />
            </Form.Item>
            <Form.Item
              name="emergencyNameRelation"
              label="Emergency name & relation"
              tooltip="Full name and relation of emergency contact"
            >
              <Input placeholder="e.g. Ramesh Kumar — Father" />
            </Form.Item>
            <Form.Item
              name="officialEmail"
              label="Official Email (if assigned)"
            >
              <Input />
            </Form.Item>
          </div>
          <div className="emp-form-grid emp-form-grid--2 emp-form-grid-divider">
            <div className="emp-form-address-col">
              <Form.Item name="currentAddress" label="Current Address">
                <Input.TextArea rows={2} />
              </Form.Item>
              <Form.Item
                className="emp-form-address-pin emp-form-no-optional"
                name="currentStatePin"
                label="State / PIN Code"
                rules={[
                  { pattern: /^\d*$/, message: "PIN must be numbers only" },
                ]}
              >
                <NumericInput maxDigits={6} />
              </Form.Item>
            </div>
            <div className="emp-form-address-col">
              <Form.Item
                name="permanentAddress"
                label={
                  <div className="emp-form-address-header">
                    <span className="emp-form-address-label">
                      Permanent Address
                    </span>
                    <Checkbox
                      onChange={(e) =>
                        handleCurrentAddressCopy(e.target.checked)
                      }
                    >
                      Same as current
                    </Checkbox>
                  </div>
                }
              >
                <Input.TextArea rows={2} />
              </Form.Item>
              <Form.Item
                className="emp-form-address-pin emp-form-no-optional"
                name="permanentStatePin"
                label="State / PIN Code"
                rules={[
                  { pattern: /^\d*$/, message: "PIN must be numbers only" },
                ]}
              >
                <NumericInput maxDigits={6} />
              </Form.Item>
            </div>
          </div>
        </>
      ),
    },
    {
      title: "Identity",
      fields: [
        "aadhar",
        "pan",
        "pfUan",
        "esiIp",
        "bankName",
        "accountNo",
        "ifscCode",
      ],
      content: (
        <div className="emp-form-grid">
          <Form.Item
            name="aadhar"
            label="Aadhar No."
            rules={[
              { pattern: /^\d{0,12}$/, message: "Aadhar must be 12 digits" },
            ]}
          >
            <NumericInput maxDigits={12} />
          </Form.Item>
          <Form.Item name="pan" label="PAN No.">
            <Input />
          </Form.Item>
          <Form.Item
            name="pfUan"
            label="PF / UAN No."
            rules={[{ pattern: /^\d*$/, message: "Numbers only" }]}
          >
            <NumericInput maxDigits={12} />
          </Form.Item>
          <Form.Item
            name="esiIp"
            label="ESI / IP No."
            rules={[{ pattern: /^\d*$/, message: "Numbers only" }]}
          >
            <NumericInput maxDigits={17} />
          </Form.Item>
          <Form.Item name="bankName" label="Bank Name">
            <Input />
          </Form.Item>
          <Form.Item
            name="accountNo"
            label="Account No."
            rules={[
              {
                pattern: /^\d*$/,
                message: "Account number must be numbers only",
              },
            ]}
          >
            <NumericInput maxDigits={18} />
          </Form.Item>
          <Form.Item name="ifscCode" label="IFSC Code">
            <Input />
          </Form.Item>
        </div>
      ),
    },
    {
      title: "Employment",
      fields: [
        "companies",
        "department",
        "designation",
        "reportingManager",
        "employmentType",
        "dateJoining",
        "dateConfirmation",
        "probationMonths",
      ],
      content: (
        <div className="emp-form-grid">
          <Form.Item
            name="companies"
            label="Companies"
            className="emp-form-grid__full"
            rules={[
              {
                required: true,
                type: "array",
                min: 1,
                message: "Select at least one company",
              },
            ]}
          >
            <Select
              mode="multiple"
              style={{ width: "100%" }}
              placeholder="Select company access"
              options={EMPLOYEE_COMPANY_OPTIONS}
              maxTagCount="responsive"
            />
          </Form.Item>
          <Form.Item
            name="department"
            label="Department"
            rules={[{ required: true, message: "Required" }]}
          >
            <Select
              options={departmentOptions}
              loading={departmentOptions.length === 0}
              showSearch
            />
          </Form.Item>
          <Form.Item
            name="designation"
            label="Designation"
            rules={[{ required: true, message: "Required" }]}
          >
            <Input />
          </Form.Item>

          {showReportingManager ? (
            <Form.Item name="reportingManager" label="Reporting Manager">
              <Select
                options={reportingManagerOptions}
                loading={reportingManagerOptions.length === 0}
                showSearch
                allowClear
                optionFilterProp="label"
              />
            </Form.Item>
          ) : null}
          <Form.Item
            name="employmentType"
            label="Employment Type"
            rules={[{ required: true, message: "Required" }]}
          >
            <Select
              options={[
                { value: "Permanent", label: "Permanent" },
                { value: "Contractual", label: "Contractual" },
                { value: "Apprentice", label: "Apprentice" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="dateJoining"
            label="Date of Joining"
            rules={[{ required: true, message: "Required" }]}
          >
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="dateConfirmation" label="Confirmation Date">
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="probationMonths" label="Probation Period (Months)">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
        </div>
      ),
    },
    {
      title: "Shift",
      fields: [
        "shiftMode",
        "primaryShift",
        "rotationPattern",
        "workingHours",
        "weeklyOff",
        "overtimeApplicable",
      ],
      content: (
        <div className="emp-form-grid">
          <Form.Item name="shiftMode" label="Shift Mode">
            <Select
              options={[
                {
                  value: "Single shift (fixed)",
                  label: "Single shift (fixed)",
                },
                {
                  value: "Multiple shifts (rotating)",
                  label: "Multiple shifts (rotating)",
                },
              ]}
            />
          </Form.Item>
          <Form.Item name="primaryShift" label="Primary Shift">
            <Select
              options={[
                {
                  value: "Shift A — 06:00 to 14:00",
                  label: "Shift A — 06:00 to 14:00",
                },
                {
                  value: "Shift B — 14:00 to 22:00",
                  label: "Shift B — 14:00 to 22:00",
                },
                {
                  value: "Shift C — 22:00 to 06:00",
                  label: "Shift C — 22:00 to 06:00",
                },
              ]}
            />
          </Form.Item>
          <Form.Item name="rotationPattern" label="Rotation Pattern">
            <Select
              options={[
                { value: "None", label: "None" },
                { value: "Weekly rotation", label: "Weekly rotation" },
                {
                  value: "Fortnightly rotation",
                  label: "Fortnightly rotation",
                },
              ]}
            />
          </Form.Item>
          <Form.Item name="workingHours" label="Working Hours / Day">
            <InputNumber style={{ width: "100%" }} min={1} max={24} />
          </Form.Item>
          <Form.Item name="weeklyOff" label="Weekly Off Day">
            <Select
              options={[
                { value: "Sunday", label: "Sunday" },
                { value: "Saturday", label: "Saturday" },
                { value: "Rotating", label: "Rotating" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="overtimeApplicable"
            label="Overtime Applicability"
            valuePropName="checked"
          >
            <Checkbox>Eligible for Overtime (OT)</Checkbox>
          </Form.Item>
        </div>
      ),
    },
    {
      title: "Salary",
      fields: [
        "compensationType",
        "annualCtc",
        "monthlyGross",
        "basicSalary",
        "da",
        "hra",
        "otherConveyance",
        "specialBonus",
        "reimbursementCap",
        "dailyWageRate",
        "skillCategory",
        "tradeJobRole",
        "engagedVia",
        "payFrequency",
        "paymentMode",
      ],
      content: (
        <div className="emp-form-compensation">
          <Form.Item
            name="compensationType"
            label="Compensation Category"
            rules={[{ required: true, message: "Required" }]}
          >
            <CompensationCategoryPicker />
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
                    formatter={(v) =>
                      `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }
                    parser={(v) =>
                      parseFloat(
                        v?.toString().replace(/\₹\s?|(,*)/g, "") || "0",
                      ) || 0
                    }
                    onChange={handleAnnualCtcChange}
                  />
                </Form.Item>
                <Form.Item name="monthlyGross" label="Monthly Gross (₹)">
                  <InputNumber
                    style={{ width: "100%" }}
                    formatter={(v) =>
                      `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }
                    parser={(v) =>
                      parseFloat(
                        v?.toString().replace(/\₹\s?|(,*)/g, "") || "0",
                      ) || 0
                    }
                  />
                </Form.Item>
                <Form.Item name="basicSalary" label="Basic Salary (₹/mo)">
                  <InputNumber
                    style={{ width: "100%" }}
                    formatter={(v) =>
                      `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }
                    parser={(v) =>
                      parseFloat(
                        v?.toString().replace(/\₹\s?|(,*)/g, "") || "0",
                      ) || 0
                    }
                  />
                </Form.Item>
                <Form.Item name="da" label="DA (₹/mo)">
                  <InputNumber
                    style={{ width: "100%" }}
                    formatter={(v) =>
                      `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }
                    parser={(v) =>
                      parseFloat(
                        v?.toString().replace(/\₹\s?|(,*)/g, "") || "0",
                      ) || 0
                    }
                  />
                </Form.Item>
                <Form.Item name="hra" label="HRA (₹/mo)">
                  <InputNumber
                    style={{ width: "100%" }}
                    formatter={(v) =>
                      `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }
                    parser={(v) =>
                      parseFloat(
                        v?.toString().replace(/\₹\s?|(,*)/g, "") || "0",
                      ) || 0
                    }
                  />
                </Form.Item>
                <Form.Item
                  name="otherConveyance"
                  label="Other / Conveyance (₹/mo)"
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    formatter={(v) =>
                      `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }
                    parser={(v) =>
                      parseFloat(
                        v?.toString().replace(/\₹\s?|(,*)/g, "") || "0",
                      ) || 0
                    }
                  />
                </Form.Item>
                <Form.Item name="specialBonus" label="Special / Bonus (₹/mo)">
                  <InputNumber
                    style={{ width: "100%" }}
                    formatter={(v) =>
                      `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }
                    parser={(v) =>
                      parseFloat(
                        v?.toString().replace(/\₹\s?|(,*)/g, "") || "0",
                      ) || 0
                    }
                  />
                </Form.Item>
                <Form.Item
                  name="reimbursementCap"
                  label="Reimbursement Cap (₹/mo)"
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    formatter={(v) =>
                      `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }
                    parser={(v) =>
                      parseFloat(
                        v?.toString().replace(/\₹\s?|(,*)/g, "") || "0",
                      ) || 0
                    }
                  />
                </Form.Item>
              </div>
            </div>
          )}

          {compensationType === "Daily wage" && (
            <div className="emp-form-subpanel">
              <div className="emp-form-subpanel__head">
                <div className="emp-form-subpanel__head-main">
                  <SecurityScanOutlined style={{ color: "#d97706" }} />
                  <span>Labor / Daily Wage Grid</span>
                </div>
                <span className="emp-form-subpanel__badge">
                  Hourly calculation enabled
                </span>
              </div>
              <div className="emp-form-grid">
                <Form.Item name="dailyWageRate" label="Daily Wage Rate (₹/day)">
                  <InputNumber
                    style={{ width: "100%" }}
                    formatter={(v) => `₹ ${v}`}
                    parser={(v) =>
                      parseFloat(
                        v?.toString().replace(/\₹\s?|(,*)/g, "") || "0",
                      ) || 0
                    }
                  />
                </Form.Item>
                <Form.Item name="skillCategory" label="Skill Category">
                  <Select
                    options={[
                      { value: "Skilled", label: "Skilled" },
                      { value: "Semi-Skilled", label: "Semi-Skilled" },
                      { value: "Unskilled", label: "Unskilled" },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="tradeJobRole" label="Trade / Job Role">
                  <Input />
                </Form.Item>
                <Form.Item name="engagedVia" label="Engaged Via">
                  <Select
                    options={[
                      { value: "Direct (on-roll)", label: "Direct (on-roll)" },
                      {
                        value: "Contractor (off-roll)",
                        label: "Contractor (off-roll)",
                      },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="payFrequency" label="Pay Frequency">
                  <Select
                    options={[
                      { value: "Monthly", label: "Monthly" },
                      { value: "Weekly", label: "Weekly" },
                      { value: "Daily", label: "Daily" },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="paymentMode" label="Payment Mode">
                  <Select
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
                  <strong>Auto-formula details</strong>: Net pay = (Daily rate ×
                  Days worked) + (OT hrs × 2 × Hourly rate) − PF/ESI − Advance.
                  <span className="emp-form-note__hint">
                    Example: For ₹540/day at 26 days + 8 OT hrs = ₹14,040 +
                    ₹1,080 = ₹15,120 gross.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      ),
    },
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
            itemMarginBottom: 10,
            labelFontSize: 12,
          },
        },
      }}
    >
      {contextHolder}
      <div className="emp-details-page emp-add-page">
        <PageHeader
          compact
          {...HRMS_BACK.employees}
          title="Add employee"
          subtitle="Register a new employee — complete each stage to create the profile"
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          preserve
          requiredMark="optional"
          initialValues={{
            overtimeApplicable: false,
            compensationType: "Monthly CTC",
          }}
          style={{ width: "100%" }}
        >
          <div className="emp-add-stack">
            <div className="emp-add-steps-panel emp-add-steps-panel--horizontal">
              <div className="emp-add-steps-panel__head">
                <span>Registration progress</span>
                <span className="emp-add-steps-panel__badge">
                  Step {currentStep + 1} of {steps.length}
                </span>
              </div>
              <div className="emp-add-steps-panel__body">
                <Steps
                  current={currentStep}
                  size="small"
                  titlePlacement="vertical"
                  responsive={false}
                  items={steps.map((item) => ({
                    title: item.title,
                  }))}
                />
              </div>
            </div>

            <div className="emp-add-main emp-add-main--full">
              <section className="emp-form-step-card">
                <header className="emp-form-step-card__head">
                  <div className="emp-form-step-card__step-num">
                    Step {currentStep + 1} of {steps.length}
                  </div>
                  <h2 className="emp-form-step-card__title">
                    {STEP_META[currentStep]?.title}
                  </h2>
                  <p className="emp-form-step-card__desc">
                    {STEP_META[currentStep]?.description}
                  </p>
                </header>
                <div className="emp-form-step-card__body">
                  {steps[currentStep].content}
                </div>
              </section>

              <div className="emp-add-actions">
                <Link href="/hrms/employees">
                  <Button>Cancel</Button>
                </Link>
                <Button onClick={handleSaveDraft}>Save as Draft</Button>
                {currentStep > 0 && (
                  <Button onClick={handlePrev}>Previous</Button>
                )}
                {currentStep < steps.length - 1 && (
                  <Button type="primary" onClick={handleNext}>
                    Next
                  </Button>
                )}
                {currentStep === steps.length - 1 && (
                  <Button
                    type="primary"
                    onClick={handleCreateEmployee}
                    loading={loading}
                    icon={<SaveOutlined />}
                  >
                    Create Employee
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Form>
      </div>
    </ConfigProvider>
  );
}
