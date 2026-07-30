"use client";

import { Tooltip } from "antd";
import dayjs from "dayjs";

import ReportSection from "@/components/hrms/ReportSection";
import type { HolidayInfo } from "@/lib/holiday-rules";

/**
 * Company holidays in the selected range, rendered as date cells.
 *
 * Driven by the holiday list the attendance API returns, so a holiday appears
 * here even when no employee has an attendance record that day — holidays are
 * never materialised as attendance rows.
 */
export default function HolidayStrip({
  holidays,
  rangeLabel,
}: {
  holidays: HolidayInfo[];
  rangeLabel: string;
}) {
  return (
    <ReportSection
      title="Company holidays"
      meta={`${rangeLabel} · ${holidays.length} holiday${holidays.length === 1 ? "" : "s"} · paid, not leave`}
    >
      {holidays.length === 0 ? (
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          No company holidays fall in this period.
        </p>
      ) : (
        <ul className="hol-strip">
          {holidays.map((h) => {
            const d = dayjs(h.date);
            return (
              <li key={h.date}>
                <Tooltip title={`${h.name} · ${d.format("dddd, D MMMM YYYY")}`}>
                  <div className="hol-strip__cell" tabIndex={0}>
                    <span className="hol-strip__dow">{d.format("ddd")}</span>
                    <span className="hol-strip__day">{d.format("D")}</span>
                    {/* Initials, per spec: Independence Day → ID */}
                    <span className="hol-strip__code">{h.initials}</span>
                    <span className="hol-strip__mon">{d.format("MMM")}</span>
                  </div>
                </Tooltip>
                <span className="hol-strip__name" title={h.name}>
                  {h.name}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </ReportSection>
  );
}
