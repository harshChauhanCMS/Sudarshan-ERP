"use client";

import { useMemo, useState } from "react";
import { Select } from "antd";
import PageFilterPanel from "@/components/common/PageFilterPanel";

export interface EmployeeFilterValues {
  search: string;
  department: string;
  role: string;
  shift: string;
  location: string;
  empType: string;
  status: string;
}

export const DEFAULT_EMPLOYEE_FILTERS: EmployeeFilterValues = {
  search: "",
  department: "all",
  role: "all",
  shift: "all",
  location: "all",
  empType: "all",
  status: "all",
};

interface FilterOptions {
  departments: { value: string; label: string }[];
  roles: { value: string; label: string }[];
  shifts: { value: string; label: string }[];
  locations: { value: string; label: string }[];
  empTypes: { value: string; label: string }[];
  statuses: { value: string; label: string }[];
}

interface Props {
  filters: EmployeeFilterValues;
  setFilters: (next: EmployeeFilterValues) => void;
  options: FilterOptions;
  loading?: boolean;
  onApply: () => void;
  onClear?: () => void;
}

export default function EmployeeFilterPanel({
  filters,
  setFilters,
  options,
  loading = false,
  onApply,
  onClear,
}: Props) {


  const patch = (key: keyof EmployeeFilterValues, value: string) =>
    setFilters({ ...filters, [key]: value });

  const handleClear = () => {
    if (onClear) {
      onClear();
      return;
    }
    setFilters(DEFAULT_EMPLOYEE_FILTERS);
    onApply();
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.department !== "all") count += 1;
    if (filters.role !== "all") count += 1;
    if (filters.shift !== "all") count += 1;
    if (filters.empType !== "all") count += 1;
    if (filters.status !== "all") count += 1;
    return count;
  }, [filters]);

  return (
    <PageFilterPanel
      search={filters.search}
      onSearchChange={(v) => patch("search", v)}
      searchPlaceholder="Name, employee ID, phone, department, role…"
      activeFilterCount={activeFilterCount}
      onApply={onApply}
      onClear={handleClear}
      loading={loading}
    >
      <div className="arf-item">
          <span className="arf-label">Department</span>
          <Select
            className="w-full"
            value={filters.department}
            onChange={(v) => patch("department", v)}
            options={[
              { value: "all", label: "All departments" },
              ...options.departments,
            ]}
          />
        </div>

        <div className="arf-item">
          <span className="arf-label">Role</span>
          <Select
            className="w-full"
            value={filters.role}
            onChange={(v) => patch("role", v)}
            options={[
              { value: "all", label: "All roles" },
              ...options.roles,
            ]}
          />
        </div>

        <div className="arf-item">
          <span className="arf-label">Shift</span>
          <Select
            className="w-full"
            value={filters.shift}
            onChange={(v) => patch("shift", v)}
            options={[
              { value: "all", label: "All shifts" },
              ...options.shifts,
            ]}
          />
        </div>

        <div className="arf-item">
          <span className="arf-label">Employment type</span>
          <Select
            className="w-full"
            value={filters.empType}
            onChange={(v) => patch("empType", v)}
            options={[
              { value: "all", label: "All emp. types" },
              ...options.empTypes,
            ]}
          />
        </div>

        <div className="arf-item">
          <span className="arf-label">Status</span>
          <Select
            className="w-full"
            value={filters.status}
            onChange={(v) => patch("status", v)}
            options={[
              { value: "all", label: "All status" },
              ...options.statuses,
            ]}
          />
        </div>
    </PageFilterPanel>
  );
}
