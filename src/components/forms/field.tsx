"use client";

import type { HTMLAttributes, ReactNode } from "react";

export function FormGrid({
  children,
  cols = 2,
}: {
  children: ReactNode;
  cols?: 2 | 3;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: cols === 3 ? "1fr 1fr 1fr" : "1fr 1fr",
        gap: 14,
      }}
    >
      {children}
    </div>
  );
}

export function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

export function FormInput({
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength,
  inputMode,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <input
      className="input"
      type={type}
      value={value}
      placeholder={placeholder}
      maxLength={maxLength}
      inputMode={inputMode}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function FormSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <select
      className="input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {children}
    </select>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p style={{ color: "var(--danger)", fontSize: 12, margin: "8px 0 0" }}>
      {message}
    </p>
  );
}
