"use client";

import { Button, Input, Select } from "antd";
import { FilterOutlined, SearchOutlined } from "@ant-design/icons";

export interface EmployeeFilterValues {
  search: string;
  department: string;
  role: string;
  shift: string;
  location: string;
  empType: string;
  status: string;
}

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
}

export default function EmployeeFilterPanel({
  filters,
  setFilters,
  options,
  loading = false,
  onApply,
}: Props) {
  const patch = (key: keyof EmployeeFilterValues, value: string) =>
    setFilters({ ...filters, [key]: value });

  return (
    <div className="arf-panel ap-filters-panel">
      <div className="arf-head">
        <FilterOutlined style={{ color: "var(--primary)", fontSize: 12 }} />
        <span className="arf-head-title">Filters</span>
      </div>

      <div className="arf-body">
        <div className="arf-controls ap-filters-controls ap-filters-controls--split-apply">
          <div className="arf-item ap-filters-search-field">
            <span className="arf-label">Search</span>
            <Input
              allowClear
              placeholder="Name, employee ID, phone, department, role…"
              prefix={<SearchOutlined style={{ color: "var(--fg-muted)" }} />}
              value={filters.search}
              onChange={(e) => patch("search", e.target.value)}
            />
          </div>

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
            <span className="arf-label">Location / unit</span>
            <Select
              className="w-full"
              value={filters.location}
              onChange={(v) => patch("location", v)}
              options={[
                { value: "all", label: "All locations / units" },
                ...options.locations,
              ]}
            />
          </div>

          <div className="ap-filters-row-break" aria-hidden="true" />

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

          <div className="ap-filters-spacer" aria-hidden="true" />
          <div className="arf-item ap-filters-actions">
            <Button
              type="primary"
              icon={<FilterOutlined />}
              loading={loading}
              onClick={onApply}
            >
              Apply filters
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
