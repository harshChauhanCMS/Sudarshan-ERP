"use client";

import { Icon } from "@/components/erp/icons";
import { Bar, fmtINRFull } from "@/components/erp/ui";
import { erpStatusBadge } from "@/components/common/erpStatusBadges";
import type { Order } from "@/lib/entity-types";

type OrderDetailPanelProps = {
  order: Order;
};

function display(value: string | number | boolean | undefined | null): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function OrderDetailPanel({ order }: OrderDetailPanelProps) {
  return (
    <div className="order-detail">
      <div className="card order-detail-card">
        <div className="card-head">
          <div className="card-title">
            <Icon name="ticket" size={14} /> Order overview
          </div>
          {erpStatusBadge(order.status)}
        </div>
        <div className="card-body">
          <dl className="dispatch-detail-meta order-detail-meta">
            <div>
              <dt>Sales order</dt>
              <dd className="mono">{order.id}</dd>
            </div>
            <div>
              <dt>Customer</dt>
              <dd>{order.customer}</dd>
            </div>
            <div>
              <dt>Product</dt>
              <dd>{order.product}</dd>
            </div>
            <div>
              <dt>Quantity</dt>
              <dd className="num">{order.qty}</dd>
            </div>
            <div>
              <dt>Order value</dt>
              <dd className="num">{fmtINRFull(order.value)}</dd>
            </div>
            <div>
              <dt>Due date</dt>
              <dd>{order.due}</dd>
            </div>
            <div>
              <dt>Order date</dt>
              <dd>{display(order.orderDate)}</dd>
            </div>
            <div>
              <dt>Dispatch date</dt>
              <dd>{display(order.dispatchDate)}</dd>
            </div>
            <div>
              <dt>Priority</dt>
              <dd className="capitalize">{display(order.priority)}</dd>
            </div>
            <div>
              <dt>Assigned unit</dt>
              <dd>{display(order.assignedUnit)}</dd>
            </div>
          </dl>

          <div className="dispatch-detail-progress">
            <div className="dispatch-detail-progress__head">
              <span>Fulfillment progress</span>
              <span className="mono">{order.progress}%</span>
            </div>
            <div className="bar">
              <span style={{ width: `${order.progress}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="card order-detail-card">
        <div className="card-head">
          <div className="card-title">
            <Icon name="package" size={14} /> Material & packaging
          </div>
        </div>
        <div className="card-body">
          <dl className="dispatch-detail-meta order-detail-meta">
            <div>
              <dt>Material code</dt>
              <dd className="mono">{display(order.materialCode)}</dd>
            </div>
            <div>
              <dt>Grade</dt>
              <dd>{display(order.grade)}</dd>
            </div>
            <div>
              <dt>Quantity</dt>
              <dd>
                {order.quantity != null
                  ? `${order.quantity} ${order.unit ?? ""}`.trim()
                  : order.qty}
              </dd>
            </div>
            <div>
              <dt>Packaging</dt>
              <dd>{display(order.packaging)}</dd>
            </div>
            <div>
              <dt>Bag size</dt>
              <dd>{order.bagSize ? `${order.bagSize} kg` : "—"}</dd>
            </div>
            <div>
              <dt>Bags per ton</dt>
              <dd>{display(order.bagsPerTon)}</dd>
            </div>
            <div>
              <dt>Bags required</dt>
              <dd>{display(order.bagsRequired)}</dd>
            </div>
            <div>
              <dt>Palletised</dt>
              <dd>{display(order.palletised)}</dd>
            </div>
            <div>
              <dt>Bags per pallet</dt>
              <dd>{display(order.bagsPerPallet)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {order.specialInstructions?.trim() ? (
        <div className="card order-detail-card">
          <div className="card-head">
            <div className="card-title">
              <Icon name="invoice" size={14} /> Special instructions
            </div>
          </div>
          <div className="card-body">
            <p className="order-detail-notes">{order.specialInstructions}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
