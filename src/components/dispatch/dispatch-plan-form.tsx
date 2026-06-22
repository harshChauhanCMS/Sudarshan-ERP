"use client";

import { useMemo, useState } from "react";
import { message } from "antd";
import { Icon } from "@/components/erp/icons";
import { Btn } from "@/components/erp/ui";
import { useFormState } from "@/components/forms";
import {
  buildInitialFromOrder,
  createDispatchPlan,
  findAwaitingOrder,
  type AwaitingOrderView,
  type DispatchPlanFormValues,
} from "@/lib/dispatch-planning-api";
import { DispatchPlanChip } from "./dispatch-plan-chip";

type DispatchPlanFormProps = {
  orders: AwaitingOrderView[];
  companyLabel: string;
  initialOrderId?: string;
  initialStatus?: DispatchPlanFormValues["planStatus"];
  onSuccess?: () => void;
};

export function DispatchPlanForm({
  orders,
  companyLabel,
  initialOrderId,
  initialStatus,
  onSuccess,
}: DispatchPlanFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialValues = useMemo(() => {
    const order = findAwaitingOrder(orders, initialOrderId);
    if (!order) {
      return {
        orderId: "",
        customer: "",
        sourceLocation: "",
        deliveryLocation: "",
        dispatchDate: new Date().toISOString().slice(0, 10),
        quantity: "",
        vehicleReg: "",
        vehicleType: "32ft",
        driverName: "",
        waRef: "",
        planStatus: "ready" as const,
        remarks: "",
      };
    }
    const initial = buildInitialFromOrder(order);
    if (initialStatus) initial.planStatus = initialStatus;
    return initial;
  }, [orders, initialOrderId, initialStatus]);

  const form = useFormState(initialValues);

  const selectedOrder = useMemo(
    () => findAwaitingOrder(orders, form.values.orderId),
    [orders, form.values.orderId]
  );

  const packagingOk = selectedOrder?.packagingOk !== false;
  const packagingNote =
    selectedOrder?.packagingNote ??
    (packagingOk ? "Ready — can load." : "Awaiting packing.");

  const loadOrder = (order: AwaitingOrderView) => {
    const next = buildInitialFromOrder(order);
    form.setField("orderId", next.orderId);
    form.setField("customer", next.customer);
    form.setField("sourceLocation", next.sourceLocation);
    form.setField("deliveryLocation", next.deliveryLocation);
    form.setField("dispatchDate", next.dispatchDate);
    form.setField("quantity", next.quantity);
    form.setField("vehicleReg", next.vehicleReg);
    form.setField("vehicleType", next.vehicleType);
    form.setField("driverName", next.driverName);
    form.setField("waRef", next.waRef);
    form.setField("planStatus", next.planStatus);
    form.setField("remarks", next.remarks);
  };

  const planDispatch = async (assignVehicle = false) => {
    setError(null);
    if (!form.values.orderId) {
      message.error("Select an order.");
      return;
    }
    if (!form.values.deliveryLocation.trim()) {
      message.error("Delivery location is required.");
      return;
    }

    const planStatus = assignVehicle ? "vehicle" : form.values.planStatus;

    if (assignVehicle && !form.values.vehicleReg.trim()) {
      message.info("Enter vehicle registration to assign.");
      form.setField("planStatus", "vehicle");
      return;
    }

    setSaving(true);
    try {
      const result = await createDispatchPlan({
        orderId: form.values.orderId,
        sourceLocation: form.values.sourceLocation,
        deliveryLocation: form.values.deliveryLocation,
        dispatchDate: form.values.dispatchDate,
        quantity: form.values.quantity,
        vehicleReg: form.values.vehicleReg,
        vehicleType: form.values.vehicleType,
        driverName: form.values.driverName,
        waRef: form.values.waRef,
        planStatus,
        remarks: form.values.remarks,
      });
      message.success(
        `Dispatch ${result.dispatch.id} planned for ${selectedOrder?.customer ?? "customer"}.`
      );
      onSuccess?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to plan dispatch";
      setError(msg);
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!orders.length) {
    return (
      <div className="card dispatch-plan-form-card dispatch-plan-form-card--full">
        <div className="dispatch-plan-form-card__body">
          <p style={{ margin: 0, color: "var(--fg-muted)", fontSize: 14 }}>
            No orders are awaiting dispatch planning right now.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card dispatch-plan-form-card dispatch-plan-form-card--full">
      <div className="dispatch-plan-form-card__head">
        <h2>
          <Icon name="invoice" size={15} /> New dispatch plan
        </h2>
      </div>
      <div className="dispatch-plan-form-card__body">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            planDispatch(false).catch(() => {});
          }}
        >
          <div className="dispatch-plan-section-title">Current company</div>
          <div className="dispatch-plan-company">
            <p>
              <Icon name="factory" size={13} /> {companyLabel}
            </p>
            <span>Company is set at login.</span>
          </div>

          <div className="dispatch-plan-section-title">Order & customer</div>
          <div className="field">
            <label className="field-label" htmlFor="orderId">
              Order
            </label>
            <select
              id="orderId"
              className="input"
              value={form.values.orderId}
              onChange={(e) => {
                const order = orders.find((o) => o.id === e.target.value);
                if (order) loadOrder(order);
              }}
            >
              <option value="">Select order</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.id} — {o.customer}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="customer">
              Customer
            </label>
            <input
              id="customer"
              className="input dispatch-plan-readonly"
              value={form.values.customer}
              readOnly
            />
          </div>

          <div className="dispatch-plan-section-title">Packaging readiness</div>
          <div className={`dispatch-plan-pkg ${packagingOk ? "ok" : "pending"}`}>
            <Icon name={packagingOk ? "check" : "alert"} size={14} />
            <span>
              <strong>{packagingOk ? "Ready" : "Pending"}</strong> — {packagingNote}
            </span>
          </div>

          <div className="dispatch-plan-section-title">Source & destination</div>
          <div className="field">
            <label className="field-label" htmlFor="sourceLocation">
              Source location (dispatch from)
            </label>
            <input
              id="sourceLocation"
              className="input"
              value={form.values.sourceLocation}
              onChange={(e) => form.setField("sourceLocation", e.target.value)}
              placeholder="Plant / warehouse"
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="deliveryLocation">
              Destination / delivery location
            </label>
            <input
              id="deliveryLocation"
              className="input"
              value={form.values.deliveryLocation}
              onChange={(e) => form.setField("deliveryLocation", e.target.value)}
              placeholder="Customer address or site"
            />
          </div>

          <div className="dispatch-plan-section-title">Dispatch details</div>
          <div className="field">
            <label className="field-label" htmlFor="dispatchDate">
              Dispatch date
            </label>
            <input
              id="dispatchDate"
              className="input"
              type="date"
              value={form.values.dispatchDate}
              onChange={(e) => form.setField("dispatchDate", e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="quantity">
              Quantity (MT)
            </label>
            <input
              id="quantity"
              className="input dispatch-plan-readonly"
              type="number"
              value={form.values.quantity}
              readOnly
            />
          </div>

          <div className="dispatch-plan-section-title">Vehicle capture</div>
          <div className="field">
            <label className="field-label" htmlFor="vehicleReg">
              Vehicle registration
            </label>
            <input
              id="vehicleReg"
              className="input"
              value={form.values.vehicleReg}
              onChange={(e) => form.setField("vehicleReg", e.target.value)}
              placeholder="e.g. GJ-01-AB-1234"
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="vehicleType">
              Vehicle type
            </label>
            <select
              id="vehicleType"
              className="input"
              value={form.values.vehicleType}
              onChange={(e) => form.setField("vehicleType", e.target.value)}
            >
              <option value="">Select type</option>
              <option value="32ft">32 ft open truck</option>
              <option value="20ft">20 ft closed truck</option>
              <option value="trailer">Trailer (20 MT+)</option>
              <option value="container">Container</option>
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="driverName">
              Driver name
            </label>
            <input
              id="driverName"
              className="input"
              value={form.values.driverName}
              onChange={(e) => form.setField("driverName", e.target.value)}
              placeholder="Driver name"
            />
          </div>

          <div className="dispatch-plan-section-title">Planned via WhatsApp (optional)</div>
          <div className="field">
            <label className="field-label" htmlFor="waRef">
              WhatsApp reference note
            </label>
            <input
              id="waRef"
              className="input"
              value={form.values.waRef}
              onChange={(e) => form.setField("waRef", e.target.value)}
              placeholder="e.g. WA-2025-0312 — Slot agreed 09:00"
            />
          </div>

          <div className="dispatch-plan-section-title">Status</div>
          <div className="field">
            <label className="field-label" htmlFor="status">
              Dispatch status
            </label>
            <select
              id="status"
              className="input"
              value={form.values.planStatus}
              onChange={(e) =>
                form.setField("planStatus", e.target.value as DispatchPlanFormValues["planStatus"])
              }
            >
              <option value="ready">Ready</option>
              <option value="pack">Packaging Pending</option>
              <option value="vehicle">Vehicle Pending</option>
              <option value="delayed">Delayed</option>
            </select>
            <span className="dispatch-plan-chip-hint">
              Chips: <DispatchPlanChip status="ready" /> <DispatchPlanChip status="pack" />{" "}
              <DispatchPlanChip status="vehicle" /> <DispatchPlanChip status="delayed" />
            </span>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="remarks">
              Remarks
            </label>
            <textarea
              id="remarks"
              className="input dispatch-plan-textarea"
              rows={2}
              value={form.values.remarks}
              onChange={(e) => form.setField("remarks", e.target.value)}
              placeholder="Loading slot, GRN ref, special instructions"
            />
          </div>

          <div className="dispatch-plan-driver-note">
            <strong>Note:</strong> Driver app is not mandatory. Dispatch can be planned and
            tracked via phone/WhatsApp; vehicle and driver can be captured here or at gate.
          </div>

          {error ? (
            <p style={{ color: "var(--danger)", fontSize: 12, margin: "0.75rem 0 0" }}>
              {error}
            </p>
          ) : null}

          <div className="dispatch-plan-actions">
            <Btn variant="primary" size="sm" icon="truck" type="submit" disabled={saving}>
              {saving ? "Planning…" : "Plan dispatch"}
            </Btn>
            <Btn
              variant="secondary"
              size="sm"
              icon="truck"
              type="button"
              disabled={saving}
              onClick={() => {
                planDispatch(true).catch(() => {});
              }}
            >
              Assign vehicle
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}
