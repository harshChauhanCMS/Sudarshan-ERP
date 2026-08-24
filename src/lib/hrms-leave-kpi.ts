import dayjs from "dayjs";

export type LeaveApprovalKpi = {
  pending: number;
  pendingSla: number;
  approvedMonth: number;
  approvedDays: number;
  approvedEmployees: number;
  rejectedMonth: number;
  onLeaveToday: number;
  onLeaveBreakdown: string;
};

const LEAVE_TYPE_SHORT: Record<string, string> = {
  casual: "CL",
  sick: "SL",
  privilege: "PL",
  compOff: "Comp.Off",
  unpaid: "Unpaid",
  privilege_leave: "PL",
};

export function computeLeaveApprovalKpi(
  leaves: Record<string, unknown>[]
): LeaveApprovalKpi {
  const now = dayjs();
  const monthStart = now.startOf("month");
  const today = now.startOf("day");

  const pending = leaves.filter((l) => l.status === "pending");
  const pendingSla = pending.filter((l) => {
    const created = dayjs(String(l.createdAt ?? l.appliedOn ?? ""));
    return created.isValid() && now.diff(created, "day") > 2;
  }).length;

  const approvedMonth = leaves.filter((l) => {
    // "completed" leaves were approved too — they just auto-transitioned
    // once their end date passed (see syncCompletedLeaveStatuses).
    if (l.status !== "approved" && l.status !== "completed") return false;
    const approvedAt = dayjs(String(l.hrApprovedAt ?? l.updatedAt ?? l.fromDate ?? ""));
    return approvedAt.isValid() && !approvedAt.isBefore(monthStart);
  });

  const approvedDays = approvedMonth.reduce(
    (sum, l) => sum + Number(l.days ?? 0),
    0
  );
  const approvedEmployees = new Set(
    approvedMonth.map((l) => String(l.employeeId ?? ""))
  ).size;

  const rejectedMonth = leaves.filter((l) => {
    if (l.status !== "rejected") return false;
    const rejectedAt = dayjs(String(l.updatedAt ?? l.fromDate ?? ""));
    return rejectedAt.isValid() && !rejectedAt.isBefore(monthStart);
  }).length;

  const onLeaveTodayRows = leaves.filter((l) => {
    if (l.status !== "approved") return false;
    const from = dayjs(String(l.fromDate ?? ""));
    const to = dayjs(String(l.toDate ?? ""));
    if (!from.isValid() || !to.isValid()) return false;
    return !today.isBefore(from, "day") && !today.isAfter(to, "day");
  });

  const typeCounts = new Map<string, number>();
  for (const row of onLeaveTodayRows) {
    const type = String(row.leaveType ?? "leave");
    const short = LEAVE_TYPE_SHORT[type] ?? type;
    typeCounts.set(short, (typeCounts.get(short) ?? 0) + 1);
  }
  const onLeaveBreakdown = typeCounts.size
    ? [...typeCounts.entries()].map(([t, n]) => `${n} ${t}`).join(" · ")
    : "No one on leave today";

  return {
    pending: pending.length,
    pendingSla,
    approvedMonth: approvedMonth.length,
    approvedDays,
    approvedEmployees,
    rejectedMonth,
    onLeaveToday: onLeaveTodayRows.length,
    onLeaveBreakdown,
  };
}
