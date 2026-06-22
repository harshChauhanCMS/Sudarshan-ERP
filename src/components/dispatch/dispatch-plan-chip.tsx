import { STATUS_LABELS, type PlanStatus } from "@/lib/dispatch-planning-api";

export function DispatchPlanChip({ status }: { status: PlanStatus }) {
  return (
    <span className={`dispatch-plan-chip dispatch-plan-chip--${status}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
