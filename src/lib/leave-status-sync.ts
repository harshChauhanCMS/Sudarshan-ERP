import dayjs from "dayjs";
import LeaveRequest from "@/lib/models/LeaveRequest";

/** Statuses that count toward leave balance usage for the year. */
export const LEAVE_BALANCE_USAGE_STATUSES = [
  "pending",
  "hod_approved",
  "approved",
  "completed",
] as const;

/** Approved leave still within its date range (not yet auto-completed). */
export const LEAVE_ACTIVE_APPROVED_STATUSES = ["approved", "hod_approved"] as const;

/** Mark approved leaves as completed once their end date is before today. */
export async function syncCompletedLeaveStatuses(): Promise<number> {
  const todayStart = dayjs().startOf("day").toDate();
  const result = await LeaveRequest.updateMany(
    {
      status: "approved",
      toDate: { $lt: todayStart },
    },
    {
      $set: { status: "completed" },
    },
  );
  return result.modifiedCount ?? 0;
}
