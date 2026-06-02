"use client";

import { Input } from "antd";
import type { InputProps } from "antd";

export type NumericInputProps = InputProps & {
  maxDigits?: number;
};

/** Text input that accepts digits only (for phone, Aadhaar, account no., etc.). */
export default function NumericInput({
  maxDigits,
  onChange,
  onKeyDown,
  style,
  ...rest
}: NumericInputProps) {
  const sanitize = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    return maxDigits != null ? digits.slice(0, maxDigits) : digits;
  };

  return (
    <Input
      {...rest}
      style={style}
      inputMode="numeric"
      autoComplete="off"
      onKeyDown={(e) => {
        if (
          e.key.length === 1 &&
          !/\d/.test(e.key) &&
          !e.ctrlKey &&
          !e.metaKey &&
          !e.altKey
        ) {
          e.preventDefault();
        }
        onKeyDown?.(e);
      }}
      onChange={(e) => {
        const next = sanitize(e.target.value);
        if (e.target.value !== next) {
          e.target.value = next;
        }
        onChange?.(e);
      }}
    />
  );
}
