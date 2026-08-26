"use client";

import { useMemo, useState } from "react";
import { Button, Modal, Tooltip } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

import {
  DAY_STATUS_CODES,
  DAY_STATUS_LABELS,
  resolveDayStatus,
  toDayKey,
  type DayStatus,
  type HolidayInfo,
} from "@/lib/holiday-rules";
import { formatWorkedDuration } from "@/lib/format-duration";
import { isWeeklyOffDate } from "@/lib/shift-utils";

export type CalendarDayRow = {
  day: string;
  present?: boolean;
  absent?: boolean;
  late?: boolean;
  onLeave?: boolean;
  leaveLabel?: string;
  workedHours?: number;
  inAt?: string | null;
  outAt?: string | null;
};

type Props = {
  rows: CalendarDayRow[];
  holidays: HolidayInfo[];
  /** Range from the page filters — bounds which months can be navigated to. */
  from: string;
  to: string;
  loading?: boolean;
  /** The employee's weekly-off day (defaults to Sunday when unset). */
  weeklyOff?: string;
};

type Cell = {
  date: Dayjs;
  key: string;
  inRange: boolean;
  status: DayStatus;
  holiday?: HolidayInfo;
  row?: CalendarDayRow;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AttendanceCalendarView({
  rows,
  holidays,
  from,
  to,
  loading = false,
  weeklyOff,
}: Props) {
  const legend: { status: DayStatus; note: string }[] = useMemo(
    () => [
      { status: "present", note: "Punched in" },
      { status: "absent", note: "No punch, not a holiday or leave" },
      { status: "leave", note: "Approved leave" },
      { status: "holiday", note: "Company holiday — paid, not leave" },
      { status: "week-off", note: `Weekly off (${weeklyOff?.trim() || "Sunday"})` },
      { status: "half-day", note: "Worked under half the shift" },
    ],
    [weeklyOff],
  );
  const rangeStart = useMemo(() => dayjs(from).startOf("day"), [from]);
  const rangeEnd = useMemo(() => dayjs(to).endOf("day"), [to]);

  // Opens on the month the filter starts in, so the calendar and the table
  // are showing the same period the moment you switch tabs.
  const [month, setMonth] = useState<Dayjs>(() => dayjs(from).startOf("month"));
  const [openCell, setOpenCell] = useState<Cell | null>(null);

  const rowByDay = useMemo(() => {
    const map = new Map<string, CalendarDayRow>();
    for (const r of rows) map.set(r.day, r);
    return map;
  }, [rows]);

  const holidayByDay = useMemo(() => {
    const map = new Map<string, HolidayInfo>();
    for (const h of holidays) map.set(h.date, h);
    return map;
  }, [holidays]);

  const cells = useMemo<Cell[]>(() => {
    const gridStart = month.startOf("month").startOf("week");
    const gridEnd = month.endOf("month").endOf("week");
    const out: Cell[] = [];

    for (let d = gridStart; !d.isAfter(gridEnd, "day"); d = d.add(1, "day")) {
      const key = toDayKey(d.toDate());
      const row = rowByDay.get(key);
      const holiday = holidayByDay.get(key);
      // Inside the filter range *and* the month being displayed — leading and
      // trailing cells from adjacent months render greyed out.
      const inRange =
        d.isSame(month, "month") &&
        !d.isBefore(rangeStart, "day") &&
        !d.isAfter(rangeEnd, "day");

      out.push({
        date: d,
        key,
        inRange,
        holiday,
        row,
        // Same resolver the API uses, so a cell can never disagree with the
        // table or the totals.
        status: resolveDayStatus({
          present: !!row?.present,
          onLeave: !!row?.onLeave,
          isHoliday: !!holiday,
          isWeekOff: isWeeklyOffDate(d.toDate(), weeklyOff),
        }),
      });
    }
    return out;
  }, [month, rowByDay, holidayByDay, rangeStart, rangeEnd, weeklyOff]);

  const canPrev = month.startOf("month").isAfter(rangeStart, "day");
  const canNext = month.endOf("month").isBefore(rangeEnd, "day");

  const monthTotals = useMemo(() => {
    const counts: Partial<Record<DayStatus, number>> = {};
    for (const c of cells) {
      if (!c.inRange) continue;
      counts[c.status] = (counts[c.status] ?? 0) + 1;
    }
    return counts;
  }, [cells]);

  return (
    <div className="att-cal">
      <div className="att-cal__bar">
        <Button
          size="small"
          icon={<LeftOutlined />}
          disabled={!canPrev || loading}
          onClick={() => setMonth((m) => m.subtract(1, "month"))}
          aria-label="Previous month"
        />
        <strong className="att-cal__title">{month.format("MMMM YYYY")}</strong>
        <Button
          size="small"
          icon={<RightOutlined />}
          disabled={!canNext || loading}
          onClick={() => setMonth((m) => m.add(1, "month"))}
          aria-label="Next month"
        />
        <span className="att-cal__totals">
          {legend.filter((l) => monthTotals[l.status]).map((l) => (
            <span key={l.status} className={`att-cal__chip att-cal__chip--${l.status}`}>
              {DAY_STATUS_LABELS[l.status]} {monthTotals[l.status]}
            </span>
          ))}
        </span>
      </div>

      <div className="att-cal__grid att-cal__grid--head" role="row">
        {WEEKDAYS.map((w) => (
          <div key={w} className="att-cal__head" role="columnheader">
            {w}
          </div>
        ))}
      </div>

      <div className="att-cal__grid">
        {cells.map((cell) => {
          const code = cell.holiday
            ? cell.holiday.initials
            : DAY_STATUS_CODES[cell.status];
          const label = cell.holiday
            ? cell.holiday.name
            : DAY_STATUS_LABELS[cell.status];

          const body = (
            <button
              type="button"
              className={[
                "att-cal__cell",
                `att-cal__cell--${cell.status}`,
                cell.inRange ? "" : "att-cal__cell--muted",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={!cell.inRange}
              onClick={() => setOpenCell(cell)}
              aria-label={`${cell.date.format("D MMMM YYYY")} — ${label}`}
            >
              <span className="att-cal__date">{cell.date.date()}</span>
              {cell.inRange ? (
                <span className="att-cal__code">{code}</span>
              ) : null}
            </button>
          );

          // Holidays get their full name on hover, per spec.
          return cell.inRange ? (
            <Tooltip key={cell.key} title={label} mouseEnterDelay={0.15}>
              {body}
            </Tooltip>
          ) : (
            <div key={cell.key}>{body}</div>
          );
        })}
      </div>

      <ul className="att-cal__legend">
        {legend.map((l) => (
          <li key={l.status}>
            <span className={`att-cal__swatch att-cal__swatch--${l.status}`} />
            <strong>{DAY_STATUS_CODES[l.status]}</strong>
            <span>{DAY_STATUS_LABELS[l.status]}</span>
            <span className="att-cal__legend-note">{l.note}</span>
          </li>
        ))}
      </ul>

      <Modal
        open={!!openCell}
        onCancel={() => setOpenCell(null)}
        footer={null}
        title={openCell?.date.format("dddd, D MMMM YYYY")}
      >
        {openCell ? (
          <dl className="att-cal__detail">
            <dt>Status</dt>
            <dd>
              <span className={`att-cal__chip att-cal__chip--${openCell.status}`}>
                {DAY_STATUS_LABELS[openCell.status]}
              </span>
            </dd>
            {openCell.holiday ? (
              <>
                <dt>Holiday</dt>
                <dd>
                  {openCell.holiday.name}
                  <span className="muted"> ({openCell.holiday.type})</span>
                </dd>
              </>
            ) : null}
            {openCell.row?.onLeave ? (
              <>
                <dt>Leave</dt>
                <dd>{openCell.row.leaveLabel ?? "Approved leave"}</dd>
              </>
            ) : null}
            <dt>Punch in</dt>
            <dd>{openCell.row?.inAt ? dayjs(openCell.row.inAt).format("HH:mm") : "—"}</dd>
            <dt>Punch out</dt>
            <dd>{openCell.row?.outAt ? dayjs(openCell.row.outAt).format("HH:mm") : "—"}</dd>
            <dt>Worked</dt>
            <dd>
              {openCell.row?.workedHours
                ? formatWorkedDuration(openCell.row.workedHours)
                : "—"}
            </dd>
            {openCell.row?.late ? (
              <>
                <dt>Late</dt>
                <dd>Punched in after the shift grace period</dd>
              </>
            ) : null}
          </dl>
        ) : null}
      </Modal>
    </div>
  );
}
