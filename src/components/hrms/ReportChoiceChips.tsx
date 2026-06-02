"use client";

import type { ReactNode } from "react";

export type ReportChipTone =
  | "blue"
  | "indigo"
  | "violet"
  | "cyan"
  | "teal"
  | "emerald"
  | "amber"
  | "orange"
  | "rose"
  | "red"
  | "slate";

export type ReportChipOption<T extends string> = {
  value: T;
  label: ReactNode;
  tone: ReportChipTone;
};

type ReportChoiceChipsProps<T extends string> = {
  options: ReportChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  "aria-label"?: string;
};

export default function ReportChoiceChips<T extends string>({
  options,
  value,
  onChange,
  "aria-label": ariaLabel,
}: ReportChoiceChipsProps<T>) {
  return (
    <div
      className="report-choice-chips"
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            data-tone={opt.tone}
            className={`report-chip${active ? " is-active" : ""}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
