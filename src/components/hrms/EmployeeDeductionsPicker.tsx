"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { Empty, InputNumber, Spin, Tag } from "antd";

import { useDeductions } from "@/hooks/use-deductions";
import {
  calcDeductionAmount,
  formatDeductionBasis,
  type EmployeeDeductionRate,
} from "@/lib/deduction-utils";

const inr = (n: number) =>
  `₹${(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/**
 * Sets this employee's deduction percentages.
 *
 * Every deduction defined in Deduction Management gets a row with its own
 * percentage box, so HR types the rate that applies to this person — the master
 * only supplies the basis (gross/basic), any monthly cap and any eligibility
 * ceiling. A blank or 0 rate means the deduction doesn't apply to them.
 *
 * A controlled field (`value`/`onChange`) so it drops straight into
 * `<Form.Item name="deductionRates">` on both the add and edit employee forms.
 */
export default function EmployeeDeductionsPicker({
  value,
  onChange,
  gross = 0,
  basic = 0,
  arrears = 0,
  disabled = false,
  autoSelectDefaults = false,
}: {
  value?: EmployeeDeductionRate[];
  onChange?: (rates: EmployeeDeductionRate[]) => void;
  gross?: number;
  basic?: number;
  arrears?: number;
  disabled?: boolean;
  /** Pre-fill rows flagged "apply to new employees" with their default rate. */
  autoSelectDefaults?: boolean;
}) {
  const { deductions, loading } = useDeductions(true);
  const rates = useMemo(() => value ?? [], [value]);
  const seededRef = useRef(false);

  useEffect(() => {
    if (!autoSelectDefaults || seededRef.current || loading) return;
    if (!deductions.length) return;
    seededRef.current = true;
    // Only seed an untouched field — never overwrite an explicit choice.
    if (value === undefined) {
      const defaults = deductions
        .filter((d) => d.isDefault && d.percentage > 0)
        .map((d) => ({ deductionId: d._id, percentage: d.percentage }));
      if (defaults.length) onChange?.(defaults);
    }
  }, [autoSelectDefaults, deductions, loading, onChange, value]);

  const rateById = useMemo(
    () => new Map(rates.map((r) => [String(r.deductionId), Number(r.percentage) || 0])),
    [rates]
  );

  const rows = useMemo(
    () =>
      deductions.map((d) => {
        const percentage = rateById.get(d._id) ?? 0;
        return {
          ...d,
          percentage,
          amount:
            percentage > 0
              ? calcDeductionAmount({ ...d, percentage }, { gross, basic })
              : 0,
        };
      }),
    [deductions, rateById, gross, basic]
  );

  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  const setRate = (id: string, percentage: number | null) => {
    const pct = Number(percentage) || 0;
    const rest = rates.filter((r) => String(r.deductionId) !== id);
    // A zero rate is stored as "not applied" rather than as a 0% row.
    onChange?.(pct > 0 ? [...rest, { deductionId: id, percentage: pct }] : rest);
  };

  if (loading) {
    return (
      <div style={{ padding: 16, textAlign: "center" }}>
        <Spin size="small" />
      </div>
    );
  }

  if (!deductions.length) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <span>
            No deductions defined yet.{" "}
            <Link href="/hrms/deductions">Create one in Deduction Management</Link>
          </span>
        }
      />
    );
  }

  return (
    <div>
      <div style={{ display: "grid", gap: 8 }}>
        {rows.map((row) => (
          <div
            key={row._id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "8px 12px",
              border: "1px solid var(--border, #e5e7eb)",
              borderRadius: 8,
              opacity: disabled ? 0.7 : 1,
            }}
          >
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 600 }}>{row.name}</span>
              {row.isDefault ? (
                <Tag color="blue" style={{ marginLeft: 8 }}>
                  Default
                </Tag>
              ) : null}
              <div style={{ fontSize: 12, color: "var(--fg-muted, #6b7280)" }}>
                {formatDeductionBasis(row)}
              </div>
            </span>
            <InputNumber
              value={row.percentage || null}
              onChange={(v) => setRate(row._id, v)}
              disabled={disabled}
              min={0}
              max={100}
              step={0.25}
              placeholder="0"
              addonAfter="%"
              style={{ width: 130 }}
              aria-label={`${row.name} percentage`}
            />
            <span
              className="mono"
              style={{
                width: 110,
                textAlign: "right",
                fontWeight: row.amount > 0 ? 700 : 400,
                color: row.amount > 0 ? "inherit" : "var(--fg-subtle, #9ca3af)",
                whiteSpace: "nowrap",
              }}
            >
              {row.amount > 0 ? inr(row.amount) : "—"}
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 12,
          padding: "10px 12px",
          borderRadius: 8,
          background: "var(--bg-elev, #f5f5f5)",
        }}
      >
        {[
          { label: "Gross monthly salary", value: gross + arrears },
          { label: "Total monthly deductions", value: -Math.round(total * 100) / 100 },
        ].map((line) => (
          <div
            key={line.label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "2px 0",
            }}
          >
            <span>{line.label}</span>
            <span className="mono">
              {line.value < 0 ? `− ${inr(Math.abs(line.value))}` : inr(line.value)}
            </span>
          </div>
        ))}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 8,
            paddingTop: 8,
            borderTop: "1px solid var(--border, #e5e7eb)",
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          <span>Net monthly salary</span>
          <span className="mono">
            {inr(Math.max(0, Math.round((gross + arrears - total) * 100) / 100))}
          </span>
        </div>
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: "var(--fg-muted, #6b7280)" }}>
        Previewed against the salary entered above, before attendance is applied.
        Leave a percentage blank if it doesn&apos;t apply to this employee.
        Payroll recalculates these every cycle from the current rates.
      </div>
    </div>
  );
}
