"use client";

import { Button, DatePicker, Select } from "antd";
import { FilterOutlined } from "@ant-design/icons";
import type dayjs from "dayjs";
import EmployeeSelect from "@/components/erp/EmployeeSelect";
import FilterSearchField from "@/components/hrms/FilterSearchField";

export type PeriodOption = { value: string; label: string };

const DEFAULT_PERIOD_OPTIONS: PeriodOption[] = [
  { value: "month", label: "This month" },
  { value: "last", label: "Last month" },
  { value: "custom", label: "Pick month…" },
];

interface Props {
  range: [dayjs.Dayjs, dayjs.Dayjs];
  setRange: (r: [dayjs.Dayjs, dayjs.Dayjs]) => void;
  dept: string;
  setDept: (v: string) => void;
  shift?: string;
  setShift?: (v: string) => void;
  unit: string;
  setUnit: (v: string) => void;
  period: string;
  setPeriod: (v: string) => void;
  departments: string[];
  units: string[];
  loading: boolean;
  onApply: () => void;
  periodOptions?: PeriodOption[];
  showShift?: boolean;
  showEmployee?: boolean;
  employeeId?: string;
  setEmployeeId?: (v: string | undefined) => void;
  splitApplyRow?: boolean;
  search?: string;
  setSearch?: (v: string) => void;
  searchPlaceholder?: string;
}

export default function AttendanceFilterPanel({
  range, setRange,
  dept, setDept,
  shift = "all", setShift,
  unit, setUnit,
  period, setPeriod,
  departments, units,
  loading, onApply,
  periodOptions = DEFAULT_PERIOD_OPTIONS,
  showShift = true,
  showEmployee = false,
  employeeId,
  setEmployeeId,
  splitApplyRow = true,
  search = "",
  setSearch,
  searchPlaceholder,
}: Props) {
  const controlsClass = splitApplyRow
    ? "arf-controls ap-filters-controls ap-filters-controls--split-apply"
    : "arf-controls ap-filters-controls";

  return (
    <div className="arf-panel ap-filters-panel">
      <div className="arf-head">
        <FilterOutlined style={{ color: "var(--primary)", fontSize: 12 }} />
        <span className="arf-head-title">Filters</span>
      </div>

      <div className="arf-body">
        <div className={controlsClass}>
          {setSearch ? (
            <FilterSearchField
              value={search}
              onChange={setSearch}
              placeholder={
                searchPlaceholder ??
                "Search employee name, ID, department…"
              }
            />
          ) : null}

          <div className="arf-item">
            <label htmlFor="arf-period" className="arf-label">Time period</label>
            <Select
              id="arf-period"
              className="w-full"
              value={period}
              onChange={setPeriod}
              options={periodOptions}
            />
          </div>

          {period === "date" && (
            <div className="arf-item">
              <label htmlFor="arf-date" className="arf-label">Date</label>
              <DatePicker
                id="arf-date"
                className="w-full"
                value={range[0]}
                onChange={(d) => {
                  if (d) setRange([d.startOf("day"), d.endOf("day")]);
                }}
                allowClear={false}
              />
            </div>
          )}

          {period === "custom" && (
            <div className="arf-item">
              <label htmlFor="arf-month" className="arf-label">Month</label>
              <DatePicker
                id="arf-month"
                className="w-full"
                picker="month"
                value={range[0]}
                onChange={(d) => {
                  if (d) setRange([d.startOf("month"), d.endOf("month")]);
                }}
                allowClear={false}
              />
            </div>
          )}

          <div className="arf-item">
            <label htmlFor="arf-unit" className="arf-label">Unit</label>
            <Select
              id="arf-unit"
              className="w-full"
              value={unit}
              onChange={setUnit}
              options={[
                { value: "all", label: "All units" },
                ...units.map((u) => ({ value: u, label: u })),
              ]}
            />
          </div>

          <div className="arf-item">
            <label htmlFor="arf-dept" className="arf-label">Department</label>
            <Select
              id="arf-dept"
              className="w-full"
              value={dept}
              onChange={setDept}
              options={[
                { value: "all", label: "All departments" },
                ...departments.map((d) => ({ value: d, label: d })),
              ]}
            />
          </div>

          {showShift && (
            <div className="arf-item">
              <label htmlFor="arf-shift" className="arf-label">Shift</label>
              <Select
                id="arf-shift"
                className="w-full"
                value={shift}
                onChange={setShift}
                options={[
                  { value: "all", label: "All shifts" },
                  { value: "Shift A", label: "Shift A" },
                  { value: "Shift B", label: "Shift B" },
                  { value: "Shift C", label: "Shift C" },
                ]}
              />
            </div>
          )}

          {showEmployee && setEmployeeId && (
            <div className="arf-item">
              <label htmlFor="arf-employee" className="arf-label">Employee</label>
              <EmployeeSelect
                id="arf-employee"
                value={employeeId}
                onChange={(id) => setEmployeeId(id)}
                placeholder="All employees"
                allowClear
              />
            </div>
          )}

          {splitApplyRow && (
            <>
              <div className="ap-filters-row-break" aria-hidden="true" />
              <div className="ap-filters-spacer" aria-hidden="true" />
            </>
          )}

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
