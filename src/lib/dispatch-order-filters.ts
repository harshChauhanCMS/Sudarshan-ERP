import type { Dispatch, Order } from "@/lib/entity-types";

const CLOSED_ORDER_STATUSES = new Set(["delivered", "dispatched"]);

/** Sales orders available to link on dispatch create/edit (excludes completed & in-transit). */
export function filterEligibleSalesOrders(
  orders: Order[],
  dispatches: Dispatch[],
  options?: { includeOrderId?: string; excludeDispatchId?: string }
): Order[] {
  return orders
    .filter((order) => {
      if (options?.includeOrderId && order.id === options.includeOrderId) return true;
      if (CLOSED_ORDER_STATUSES.has(order.status)) return false;

      const linkedElsewhere = dispatches.some(
        (d) =>
          d.orderId === order.id &&
          d.id !== options?.excludeDispatchId &&
          d.status !== "delivered" &&
          d.status !== "cancelled"
      );
      if (linkedElsewhere) return false;

      return order.status === "scheduled" || order.status === "in-production";
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}
