"use client";

import { Select, Spin } from "antd";
import { useEffect, useState } from "react";

interface Employee {
  _id: string;
  employeeId: string;
  fullName: string;
  department?: string;
  designation?: string;
}

interface EmployeeSelectProps {
  id?: string;
  value?: string;
  onChange?: (value: string, employee?: Employee) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  allowClear?: boolean;
}

export default function EmployeeSelect({
  id,
  value,
  onChange,
  placeholder = "Search employee",
  style,
  disabled,
  allowClear = true,
}: EmployeeSelectProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/hrms/employees")
      .then((r) => r.json())
      .then((j) => setEmployees(j?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const options = employees.map((e) => ({
    value: e.employeeId,
    label: (
      <div style={{ display: "flex", flexDirection: "column", gap: 1, lineHeight: 1.3 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{e.fullName}</span>
        <span style={{ fontSize: 11, color: "#71717a" }}>
          {e.employeeId}{e.department ? ` · ${e.department}` : ""}
        </span>
      </div>
    ),
    // Plain text for filtering
    search: `${e.employeeId} ${e.fullName} ${e.department || ""} ${e.designation || ""}`.toLowerCase(),
  }));

  return (
    <Select
      id={id}
      showSearch
      value={value || undefined}
      placeholder={loading ? "Loading employees..." : placeholder}
      disabled={disabled || loading}
      allowClear={allowClear}
      style={{ width: "100%", ...style }}
      optionFilterProp="search"
      notFoundContent={loading ? <Spin size="small" /> : "No employees found"}
      onChange={(val) => {
        const emp = employees.find((e) => e.employeeId === val);
        onChange?.(val, emp);
      }}
      options={options as any}
      filterOption={(input, option: any) =>
        option?.search?.includes(input.toLowerCase()) ?? false
      }
      optionLabelProp="label"
    />
  );
}
