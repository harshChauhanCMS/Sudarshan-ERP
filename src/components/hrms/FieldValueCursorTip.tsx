"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dayjs from "dayjs";
import type { FormInstance } from "antd";

type Props = {
  /** The form whose current values are read on hover. */
  form: FormInstance;
  /** Ref to the element wrapping the form — hover is delegated from here. */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Only follow the cursor while this is true (i.e. while editing). */
  enabled: boolean;
};

const EMPTY = "—";
/** Offset from the pointer so the tip never sits under the cursor itself. */
const OFFSET_X = 16;
const OFFSET_Y = 18;

function formatValue(value: unknown): string {
  if (value == null || value === "") return EMPTY;
  if (dayjs.isDayjs(value)) return value.format("DD/MM/YYYY");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    if (!value.length) return EMPTY;
    // Arrays of plain strings read fine inline; arrays of objects (deduction
    // rates, for one) only get a count.
    if (value.every((v) => typeof v === "string" || typeof v === "number")) {
      return value.join(", ");
    }
    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }
  if (typeof value === "object") return EMPTY;
  return String(value);
}

/** The antd control inside a Form.Item carries `id` === the field name. */
function fieldNameFor(item: Element): string | null {
  const control = item.querySelector<HTMLElement>(
    ".ant-form-item-control-input input[id], .ant-form-item-control-input textarea[id]",
  );
  return control?.id || null;
}

function labelFor(item: Element): string {
  const label = item.querySelector(".ant-form-item-label label");
  return label?.textContent?.trim() || "";
}

/**
 * A tooltip that rides the cursor while hovering the form, showing the hovered
 * field's label and its current value. The edit form packs long values —
 * addresses, shift labels, bank details — into a dense grid where they get
 * clipped, so hovering is the fastest way to read one in full.
 */
export default function FieldValueCursorTip({ form, containerRef, enabled }: Props) {
  const tipRef = useRef<HTMLDivElement | null>(null);
  const [content, setContent] = useState<{ label: string; value: string } | null>(
    null,
  );

  // Position is written straight to the node — putting it in state would
  // re-render the whole page on every mousemove.
  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    if (!container) return;

    const place = (clientX: number, clientY: number) => {
      const tip = tipRef.current;
      if (!tip) return;
      const { offsetWidth: w, offsetHeight: h } = tip;
      // Flip back over the cursor when the tip would run off-screen.
      const x =
        clientX + OFFSET_X + w > window.innerWidth
          ? Math.max(8, clientX - OFFSET_X - w)
          : clientX + OFFSET_X;
      const y =
        clientY + OFFSET_Y + h > window.innerHeight
          ? Math.max(8, clientY - OFFSET_Y - h)
          : clientY + OFFSET_Y;
      tip.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    const resolve = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return null;
      const item = target.closest(".ant-form-item");
      if (!item || !container.contains(item)) return null;
      const label = labelFor(item);
      const name = fieldNameFor(item);
      if (!label && !name) return null;
      const value = name ? formatValue(form.getFieldValue(name)) : EMPTY;
      return { label: label || name || "", value };
    };

    const onMove = (event: MouseEvent) => {
      const next = resolve(event.target);
      // Place before the state update so a tip that just appeared never paints
      // a frame at the top-left corner first.
      if (next) place(event.clientX, event.clientY);
      setContent((prev) => {
        if (!next) return prev === null ? prev : null;
        if (prev && prev.label === next.label && prev.value === next.value) {
          return prev;
        }
        return next;
      });
    };

    const onLeave = () => setContent(null);

    container.addEventListener("mousemove", onMove);
    container.addEventListener("mouseleave", onLeave);
    window.addEventListener("scroll", onLeave, true);
    return () => {
      container.removeEventListener("mousemove", onMove);
      container.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("scroll", onLeave, true);
      setContent(null);
    };
  }, [enabled, containerRef, form]);

  // `enabled` is false on the server and on first paint (the form opens in
  // read-only mode), so the portal never runs during hydration.
  if (!enabled || typeof document === "undefined") return null;

  // Always mounted while editing so `tipRef` exists for the very first
  // positioning pass; visibility is what toggles.
  return createPortal(
    <div
      ref={tipRef}
      className="field-cursor-tip"
      data-visible={content ? "true" : "false"}
      role="tooltip"
      aria-hidden="true"
    >
      <span className="field-cursor-tip__label">{content?.label}</span>
      <span className="field-cursor-tip__value">{content?.value}</span>
    </div>,
    document.body,
  );
}
