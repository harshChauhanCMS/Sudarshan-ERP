import dayjs, { type Dayjs } from "dayjs";

export const APPLY_LEAVE_TYPES = ["PL", "CL", "SL", "LWP"] as const;
export type ApplyLeaveUiType = (typeof APPLY_LEAVE_TYPES)[number];

export const UI_LEAVE_TO_API: Record<ApplyLeaveUiType, string> = {
  PL: "privilege",
  CL: "casual",
  SL: "sick",
  LWP: "unpaid",
};

export const API_LEAVE_TO_UI: Record<string, ApplyLeaveUiType> = {
  privilege: "PL",
  casual: "CL",
  sick: "SL",
  unpaid: "LWP",
};

export const API_LEAVE_LABELS: Record<string, string> = {
  privilege: "Privilege Leave (PL)",
  casual: "Casual Leave (CL)",
  sick: "Sick Leave (SL)",
  unpaid: "Leave Without Pay (LWP)",
};

export function calcLeaveDays(
  from: Dayjs,
  to: Dayjs,
  duration: string,
): number {
  if (!from.isValid() || !to.isValid() || to.isBefore(from, "day")) {
    return 0;
  }

  if (from.isSame(to, "day")) {
    return duration === "full" ? 1 : 0.5;
  }

  let days = to.diff(from, "day") + 1;
  if (duration === "first-half-first" || duration === "second-half-first") {
    days -= 0.5;
  }
  if (duration === "first-half-last" || duration === "second-half-last") {
    days -= 0.5;
  }

  return Math.max(0.5, days);
}

export function uiTypeToApi(type: string): string | null {
  return UI_LEAVE_TO_API[type as ApplyLeaveUiType] ?? null;
}

const LEAVE_TYPE_TAG_COLORS: Record<string, string> = {
  privilege: "green",
  casual: "blue",
  sick: "red",
  unpaid: "default",
  PL: "green",
  CL: "blue",
  SL: "red",
  LWP: "default",
};

export function leaveTypeColor(code: string) {
  return LEAVE_TYPE_TAG_COLORS[code] ?? "default";
}

export const LEAVE_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  hod_approved: "Manager Approved",
  approved: "HR Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  rolled_back: "Rolled Back",
  completed: "Completed",
};

export const LEAVE_STATUS_COLOR: Record<string, string> = {
  pending: "orange",
  hod_approved: "gold",
  approved: "green",
  rejected: "red",
  cancelled: "default",
  rolled_back: "purple",
  completed: "cyan",
};

/** True when leave is stored as completed or the end date is before today. */
export function isLeavePeriodCompleted(
  toDate: unknown,
  status?: unknown,
): boolean {
  if (String(status ?? "").toLowerCase() === "completed") return true;
  if (toDate == null || toDate === "") return false;
  const end = dayjs(String(toDate));
  if (!end.isValid()) return false;
  return end.endOf("day").isBefore(dayjs());
}
