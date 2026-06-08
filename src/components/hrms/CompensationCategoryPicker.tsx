"use client";

import { Checkbox } from "antd";

const OPTIONS = [
  {
    value: "Monthly CTC",
    title: "Monthly CTC (Salaried)",
    description: "Fixed monthly components (Basic + HRA + DA)",
  },
  {
    value: "Daily wage",
    title: "Daily wage (Wage labour)",
    description: "Paid by shifts/days worked × daily rate",
  },
] as const;

type CompensationCategoryPickerProps = {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
};

export default function CompensationCategoryPicker({
  value,
  onChange,
  disabled,
}: CompensationCategoryPickerProps) {
  const select = (next: string) => {
    if (disabled) return;
    onChange?.(next);
  };

  return (
    <div className="emp-compensation-cards" role="group" aria-label="Compensation category">
      {OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <div
            key={opt.value}
            className={`emp-compensation-card${selected ? " emp-compensation-card--selected" : ""}${disabled ? " emp-compensation-card--disabled" : ""}`}
            onClick={() => select(opt.value)}
            onKeyDown={(e) => {
              if (disabled) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                select(opt.value);
              }
            }}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-pressed={selected}
          >
            <Checkbox
              checked={selected}
              disabled={disabled}
              onClick={(e) => e.stopPropagation()}
              onChange={() => select(opt.value)}
            />
            <div className="emp-compensation-card__content">
              <strong className="emp-compensation-card__title">{opt.title}</strong>
              <span className="emp-compensation-card__desc">{opt.description}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
