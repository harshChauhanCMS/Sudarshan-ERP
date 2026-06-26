"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { message } from "antd";
import { Icon } from "@/components/erp/icons";
import { Btn } from "@/components/erp/ui";
import { useFormState, LocationAutocompleteInput } from "@/components/forms";
import {
  buildInitialFromOrder,
  createDispatchPlan,
  findAwaitingOrder,
  parseOrderQtyMt,
  updateDispatchPlan,
  validateDispatchOrderId,
  type AwaitingOrderView,
  type DispatchPlanFormValues,
} from "@/lib/dispatch-planning-api";
import type { Order } from "@/lib/entity-types";
import { fetchDrivers, type DriverRecord } from "@/lib/driver-api";
import { AddDriverModal } from "@/components/dispatch/add-driver-modal";
import { DispatchPlanChip } from "./dispatch-plan-chip";
import { useErpData } from "@/context/erp-data-provider";
import { filterEligibleSalesOrders } from "@/lib/dispatch-order-filters";
import type { Dispatch } from "@/lib/entity-types";

type DispatchPlanFormProps = {
  orders?: AwaitingOrderView[];
  allOrders?: Order[];
  companyLabel: string;
  initialOrderId?: string;
  initialStatus?: DispatchPlanFormValues["planStatus"];
  mode?: "create" | "edit";
  dispatchId?: string;
  linkedOrderId?: string;
  editValues?: DispatchPlanFormValues;
  requireDriverAssignment?: boolean;
  onSuccess?: () => void;
};

export function DispatchPlanForm({
  orders = [],
  allOrders = [],
  companyLabel,
  initialOrderId,
  initialStatus,
  mode = "create",
  dispatchId,
  linkedOrderId = "",
  editValues,
  requireDriverAssignment = false,
  onSuccess,
}: DispatchPlanFormProps) {
  const isEdit = mode === "edit";
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [driversLoading, setDriversLoading] = useState(true);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [addDriverOpen, setAddDriverOpen] = useState(false);

  const loadDrivers = useCallback(async () => {
    setDriversLoading(true);
    try {
      const rows = await fetchDrivers();
      setDrivers(rows);
    } catch {
      setDrivers([]);
    } finally {
      setDriversLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDrivers();
  }, [loadDrivers]);

  const initialValues = useMemo(() => {
    if (isEdit && editValues) return editValues;
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
  }, [orders, initialOrderId, initialStatus, isEdit, editValues]);

  const form = useFormState(initialValues);
  const { data: erpData } = useErpData();

  const eligibleSalesOrders = useMemo(() => {
    if (!isEdit) return allOrders;
    const ordersSource = allOrders.length > 0 ? allOrders : erpData.ORDERS;
    const dispatches = erpData.DISPATCHES as Dispatch[];
    const pinnedOrderId = form.values.orderId || linkedOrderId;
    return filterEligibleSalesOrders(ordersSource, dispatches, {
      includeOrderId: pinnedOrderId,
      excludeDispatchId: dispatchId,
    });
  }, [
    isEdit,
    allOrders,
    erpData.ORDERS,
    erpData.DISPATCHES,
    form.values.orderId,
    linkedOrderId,
    dispatchId,
  ]);

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

  const applyDriver = (driverId: string) => {
    setSelectedDriverId(driverId);
    if (!driverId) return;
    const driver = drivers.find((d) => d._id === driverId);
    if (!driver) return;
    form.setField("vehicleReg", driver.vehicleNumber);
    form.setField("driverName", driver.name);
    form.setField("vehicleType", driver.vehicleCategory);
  };

  const loadSalesOrder = (order: Order) => {
    form.setField("orderId", order.id);
    form.setField("customer", order.customer);
    form.setField("product", order.product);
    form.setField("quantity", parseOrderQtyMt(order));
  };

  const planDispatch = async () => {
    setError(null);
    const effectiveOrderId = (form.values.orderId || linkedOrderId || "").trim();
    const orderIdError = validateDispatchOrderId(effectiveOrderId);
    if (orderIdError) {
      message.error(orderIdError);
      setError(orderIdError);
      return;
    }
    if (!effectiveOrderId) {
      message.error("Select a sales order.");
      return;
    }
    if (!form.values.deliveryLocation.trim()) {
      message.error("Delivery location is required.");
      return;
    }

    if (requireDriverAssignment && !form.values.driverName.trim()) {
      message.error("Select or enter a driver to assign.");
      return;
    }
    if (requireDriverAssignment && !form.values.vehicleReg.trim()) {
      message.error("Enter vehicle registration to assign the driver.");
      return;
    }

    const payload = {
      orderId: effectiveOrderId,
      sourceLocation: form.values.sourceLocation,
      deliveryLocation: form.values.deliveryLocation,
      dispatchDate: form.values.dispatchDate,
      quantity: form.values.quantity,
      vehicleReg: form.values.vehicleReg,
      vehicleType: form.values.vehicleType,
      driverName: form.values.driverName,
      waRef: form.values.waRef,
      planStatus: form.values.planStatus,
      remarks: form.values.remarks,
    };

    setSaving(true);
    try {
      if (isEdit && dispatchId) {
        await updateDispatchPlan(dispatchId, payload);
        message.success(`Dispatch ${dispatchId} updated.`);
      } else {
        const result = await createDispatchPlan(payload);
        message.success(
          `Dispatch ${result.dispatch.id} planned for ${selectedOrder?.customer ?? "customer"}.`
        );
      }
      onSuccess?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to plan dispatch";
      setError(msg);
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card dispatch-plan-form-card dispatch-plan-form-card--full">
      <div className="dispatch-plan-form-card__head">
        <h2>
          <Icon name="invoice" size={15} /> {isEdit ? `Edit dispatch ${dispatchId ?? ""}` : "New dispatch plan"}
        </h2>
      </div>
      <div className="dispatch-plan-form-card__body">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            planDispatch().catch(() => {});
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
          {isEdit && dispatchId ? (
            <div className="field">
              <label className="field-label" htmlFor="dispatchId">
                Dispatch #
              </label>
              <input
                id="dispatchId"
                className="input dispatch-plan-readonly mono"
                value={dispatchId}
                readOnly
              />
            </div>
          ) : null}
          <div className="field">
            <label className="field-label" htmlFor="orderId">
              Sales order (SO #)
            </label>
            {isEdit ? (
              <select
                id="orderId"
                className="input"
                value={form.values.orderId}
                onChange={(e) => {
                  const order = eligibleSalesOrders.find((o) => o.id === e.target.value);
                  if (order) loadSalesOrder(order);
                  else form.setField("orderId", e.target.value);
                }}
              >
                <option value="">Select sales order</option>
                {eligibleSalesOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.id} — {o.customer}
                  </option>
                ))}
              </select>
            ) : (
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
            )}
            {isEdit ? (
              <p className="dispatch-plan-field-hint">
                The order linked to this dispatch stays selected. Only other open orders
                (scheduled / in production) can be chosen.
              </p>
            ) : null}
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
          {isEdit && form.values.product ? (
            <div className="field">
              <label className="field-label" htmlFor="product">
                Product
              </label>
              <input
                id="product"
                className="input dispatch-plan-readonly"
                value={form.values.product}
                readOnly
              />
            </div>
          ) : null}

          {!isEdit ? (
            <>
              <div className="dispatch-plan-section-title">Packaging readiness</div>
              <div className={`dispatch-plan-pkg ${packagingOk ? "ok" : "pending"}`}>
                <Icon name={packagingOk ? "check" : "alert"} size={14} />
                <span>
                  <strong>{packagingOk ? "Ready" : "Pending"}</strong> — {packagingNote}
                </span>
              </div>
            </>
          ) : null}

          <div className="dispatch-plan-section-title">Source & destination</div>
          <div className="field">
            <label className="field-label" htmlFor="sourceLocation">
              Source location (dispatch from)
            </label>
            <LocationAutocompleteInput
              id="sourceLocation"
              value={form.values.sourceLocation}
              onChange={(v) => form.setField("sourceLocation", v)}
              placeholder="Plant / warehouse — start typing for suggestions"
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="deliveryLocation">
              Destination / delivery location
            </label>
            <LocationAutocompleteInput
              id="deliveryLocation"
              value={form.values.deliveryLocation}
              onChange={(v) => form.setField("deliveryLocation", v)}
              placeholder="Customer address or site — start typing for suggestions"
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

          <div className="dispatch-plan-section-title">Assign driver</div>
          <div className="field">
            <label className="field-label" htmlFor="registeredDriver">
              Driver
            </label>
            <div className="dispatch-plan-driver-row">
              <select
                id="registeredDriver"
                className="input"
                value={selectedDriverId}
                disabled={driversLoading}
                onChange={(e) => applyDriver(e.target.value)}
              >
                <option value="">
                  {driversLoading ? "Loading drivers…" : "Select driver to assign"}
                </option>
                {drivers.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} · {d.vehicleNumber}
                  </option>
                ))}
              </select>
              <Btn
                variant="secondary"
                size="sm"
                icon="user"
                type="button"
                onClick={() => setAddDriverOpen(true)}
              >
                Add driver
              </Btn>
            </div>
            {!isEdit ? (
              <p className="dispatch-plan-field-hint">
                Optional — assign now or leave blank and use <strong>Assign driver</strong> on a
                planned dispatch later.
              </p>
            ) : null}
          </div>
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
              {saving
                ? isEdit
                  ? "Saving…"
                  : "Planning…"
                : isEdit
                  ? requireDriverAssignment
                    ? "Assign driver"
                    : "Save changes"
                  : "Plan dispatch"}
            </Btn>
            {isEdit ? (
              <p className="dispatch-plan-field-hint">
                Choose the sales order (SO-…). The dispatch number (DSP-…) is shown above — do not
                enter it here.
              </p>
            ) : null}
          </div>
        </form>
      </div>
      <AddDriverModal
        open={addDriverOpen}
        onClose={() => setAddDriverOpen(false)}
        onSaved={() => void loadDrivers()}
      />
    </div>
  );
}
