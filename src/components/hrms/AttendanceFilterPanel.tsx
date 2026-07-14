"use client";

import { useMemo, useState } from "react";
import { DatePicker, Select } from "antd";
import type dayjs from "dayjs";
import EmployeeSelect from "@/components/erp/EmployeeSelect";
import PageFilterPanel from "@/components/common/PageFilterPanel";

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
  defaultPeriod?: string;
  departments: string[];
  units: string[];
  loading: boolean;
  onApply: () => void;
  onClear?: () => void;
  periodOptions?: PeriodOption[];
  showShift?: boolean;
  showEmployee?: boolean;
  employeeId?: string;
  setEmployeeId?: (v: string | undefined) => void;
  search?: string;
  setSearch?: (v: string) => void;
  searchPlaceholder?: string;
}

export default function AttendanceFilterPanel({
  range,
  setRange,
  dept,
  setDept,
  shift = "all",
  setShift,
  unit,
  setUnit,
  period,
  setPeriod,
  defaultPeriod = "month",
  departments,
  units,
  loading,
  onApply,
  onClear,
  periodOptions = DEFAULT_PERIOD_OPTIONS,
  showShift = true,
  showEmployee = false,
  employeeId,
  setEmployeeId,
  search = "",
  setSearch,
  searchPlaceholder,
}: Props) {

  const handleClear = () => {
    if (onClear) {
      onClear();
      return;
    }
    if (setSearch) setSearch("");
    onApply();
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (dept !== "all") count += 1;
    if (unit !== "all") count += 1;
    if (showShift && shift !== "all") count += 1;
    if (period !== defaultPeriod) count += 1;
    if (showEmployee && employeeId) count += 1;
    return count;
  }, [dept, unit, shift, period, defaultPeriod, showShift, showEmployee, employeeId]);

  return (
    <PageFilterPanel
      {...(setSearch
        ? {
            search,
            onSearchChange: setSearch,
            searchPlaceholder:
              searchPlaceholder ?? "Search employee name, ID, department…",
          }
        : {})}
      activeFilterCount={activeFilterCount}
      onApply={onApply}
      onClear={handleClear}
      loading={loading}
    >
      <div className="arf-item">
          <label htmlFor="arf-period" className="arf-label">
            Time period
          </label>
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
            <label htmlFor="arf-date" className="arf-label">
              Date
            </label>
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
            <label htmlFor="arf-month" className="arf-label">
              Month
            </label>
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
          <label htmlFor="arf-unit" className="arf-label">
            Unit
          </label>
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
          <label htmlFor="arf-dept" className="arf-label">
            Department
          </label>
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

        {showShift && setShift ? (
          <div className="arf-item">
            <label htmlFor="arf-shift" className="arf-label">
              Shift
            </label>
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
        ) : null}

        {showEmployee && setEmployeeId ? (
          <div className="arf-item">
            <label htmlFor="arf-employee" className="arf-label">
              Employee
            </label>
            <EmployeeSelect
              id="arf-employee"
              value={employeeId}
              onChange={(id) => setEmployeeId(id)}
              placeholder="All employees"
              allowClear
            />
          </div>
        ) : null}
    </PageFilterPanel>
  );
}
