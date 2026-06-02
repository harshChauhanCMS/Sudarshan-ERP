"use client";

import { Button, DatePicker, Select } from "antd";
import { FilterOutlined } from "@ant-design/icons";
import type dayjs from "dayjs";

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
  showShift?: boolean;
}

export default function AttendanceFilterPanel({
  range, setRange,
  dept, setDept,
  shift = "all", setShift,
  unit, setUnit,
  period, setPeriod,
  departments, units,
  loading, onApply,
  showShift = true,
}: Props) {
  return (
    <div className="arf-panel ap-filters-panel">
      <div className="arf-head">
        <FilterOutlined style={{ color: "var(--primary)", fontSize: 12 }} />
        <span className="arf-head-title">Filters</span>
      </div>

      <div className="arf-body">
        <div className="arf-controls ap-filters-controls">
          <div className="arf-item">
            <span className="arf-label">Time period</span>
            <Select
              className="w-full"
              value={period}
              onChange={setPeriod}
              options={[
                { value: "month", label: "This month" },
                { value: "last", label: "Last month" },
                { value: "custom", label: "Pick month…" },
              ]}
            />
          </div>

          {period === "custom" && (
            <div className="arf-item">
              <span className="arf-label">Month</span>
              <DatePicker
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
            <span className="arf-label">Unit</span>
            <Select
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
            <span className="arf-label">Department</span>
            <Select
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
              <span className="arf-label">Shift</span>
              <Select
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
