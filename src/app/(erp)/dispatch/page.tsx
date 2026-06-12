"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { message } from "antd";
import { Icon } from "@/components/erp/icons";
import { Btn } from "@/components/erp/ui";
import { DashHead } from "@/components/erp/dashboards";
import { useDATA } from "@/components/erp/data";
import { useEntityMutation } from "@/hooks/use-entity-mutation";
import { useFormState } from "@/components/forms";
import { nextDispatchId } from "@/lib/id-generators";

type PlanStatus = "ready" | "pack" | "vehicle" | "delayed";

type AwaitingOrder = {
  id: string;
  customer: string;
  product: string;
  qty: string;
  qtyMt: number;
  requested: string;
  status: PlanStatus;
  customerFull?: string;
  sourceLocation?: string;
  deliveryLocation?: string;
  packagingNote?: string;
  packagingOk?: boolean;
};

const AWAITING_ORDERS: AwaitingOrder[] = [
  {
    id: "ORD-2025-0896",
    customer: "ITC Paperboards",
    customerFull: "ITC Paperboards & Specialty Papers Division",
    product: "Kaolin 200M / Paper",
    qty: "15 MT",
    qtyMt: 15,
    requested: "12 Mar 2025",
    status: "ready",
    sourceLocation: "Minerals Plant — Udaipur, Loading Bay 2",
    deliveryLocation: "Bhadrachalam Unit, Gate 2 — Telangana",
    packagingOk: true,
    packagingNote: "Ready — 600 bags palletised. Can load.",
  },
  {
    id: "ORD-2025-0895",
    customer: "Asian Paints Ltd",
    product: "Talc 400M / Paint",
    qty: "12 MT",
    qtyMt: 12,
    requested: "15 Mar 2025",
    status: "pack",
    packagingOk: false,
    packagingNote: "Awaiting 25 kg bags — ETA 14 Mar.",
  },
  {
    id: "ORD-2025-0892",
    customer: "Lotus Herbals",
    product: "Talc Cosmetic",
    qty: "8 MT",
    qtyMt: 8,
    requested: "13 Mar 2025",
    status: "ready",
    packagingOk: true,
    packagingNote: "Ready — laminated pouches packed.",
  },
  {
    id: "ORD-2025-0888",
    customer: "ITC Paperboards",
    product: "CaCO₃ 300M / Paper",
    qty: "20 MT",
    qtyMt: 20,
    requested: "11 Mar 2025",
    status: "vehicle",
    packagingOk: true,
    packagingNote: "Ready — palletised. Vehicle to assign.",
  },
  {
    id: "ORD-2025-0884",
    customer: "Asian Paints Ltd",
    product: "CaCO₃ 300M / Paint",
    qty: "24 MT",
    qtyMt: 24,
    requested: "14 Mar 2025",
    status: "pack",
    packagingOk: false,
    packagingNote: "HDPE bags short — vendor ETA tomorrow.",
  },
  {
    id: "ORD-2025-0882",
    customer: "Berger Paints",
    product: "Kaolin 200M / Paint",
    qty: "11 MT",
    qtyMt: 11,
    requested: "13 Mar 2025",
    status: "ready",
    packagingOk: true,
    packagingNote: "Ready — can load.",
  },
  {
    id: "ORD-2025-0879",
    customer: "Hindustan Unilever",
    product: "Detergent base",
    qty: "20 MT",
    qtyMt: 20,
    requested: "8 Mar 2025",
    status: "delayed",
    packagingOk: true,
    packagingNote: "Ready — past requested date.",
  },
];

const STATUS_LABELS: Record<PlanStatus, string> = {
  ready: "Ready",
  pack: "Packaging Pending",
  vehicle: "Vehicle Pending",
  delayed: "Delayed",
};

function PlanChip({ status }: { status: PlanStatus }) {
  return (
    <span className={`dispatch-plan-chip dispatch-plan-chip--${status}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildInitial(order: AwaitingOrder) {
  return {
    orderId: order.id,
    customer: order.customerFull ?? order.customer,
    sourceLocation: order.sourceLocation ?? "Minerals Plant — Udaipur, Loading Bay 2",
    deliveryLocation: order.deliveryLocation ?? "",
    dispatchDate: todayIsoDate(),
    quantity: String(order.qtyMt),
    vehicleReg: "",
    vehicleType: "32ft",
    driverName: "",
    waRef: "",
    status: order.status === "pack" ? "pack" : order.status === "vehicle" ? "vehicle" : order.status === "delayed" ? "delayed" : "ready",
    remarks: "",
  };
}

export default function DispatchPlanningPage() {
  const router = useRouter();
  const DATA = useDATA();
  const { append, saving, error, clearError } = useEntityMutation();

  const defaultOrder = AWAITING_ORDERS[0];
  const form = useFormState(buildInitial(defaultOrder));

  const selectedOrder = useMemo(
    () => AWAITING_ORDERS.find((o) => o.id === form.values.orderId) ?? defaultOrder,
    [form.values.orderId]
  );

  const packagingOk = selectedOrder.packagingOk !== false;
  const packagingNote =
    selectedOrder.packagingNote ??
    (packagingOk ? "Ready — can load." : "Awaiting packing.");

  const stats = useMemo(() => {
    const ready = AWAITING_ORDERS.filter((o) => o.status === "ready").length;
    const pack = AWAITING_ORDERS.filter((o) => o.status === "pack").length;
    const vehicle = AWAITING_ORDERS.filter((o) => o.status === "vehicle").length;
    const delayed = AWAITING_ORDERS.filter((o) => o.status === "delayed").length;
    return { ready, pack, vehicle, delayed };
  }, []);

  const companyLabel = useMemo(() => {
    const co = DATA.COMPANIES[0];
    if (!co) return "Sudarshan Minerals and Industries — Udaipur";
    return `${co.name} — ${co.plant?.split(",")[0] ?? co.plant}`;
  }, [DATA.COMPANIES]);

  const loadOrder = (order: AwaitingOrder) => {
    const next = buildInitial(order);
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
    form.setField("status", next.status);
    form.setField("remarks", next.remarks);
  };

  const planDispatch = async () => {
    clearError();
    if (!form.values.orderId) {
      message.error("Select an order.");
      return;
    }
    if (!form.values.deliveryLocation.trim()) {
      message.error("Delivery location is required.");
      return;
    }

    const dispatchId = nextDispatchId(DATA.DISPATCHES);
    const route = `${form.values.sourceLocation.split(",")[0] ?? "Plant"} → ${form.values.deliveryLocation.split(",")[0] ?? "Customer"}`;

    await append("dispatches", {
      id: dispatchId,
      vehicle: form.values.vehicleReg || "—",
      driver: form.values.driverName || "—",
      customer: selectedOrder.customer,
      route,
      loaded: `${form.values.quantity} MT`,
      eta: form.values.dispatchDate,
      progress: 0,
      status: form.values.vehicleReg ? "loading" : "loading",
      lastUpdate: "just now",
    });

    message.success(`Dispatch ${dispatchId} planned for ${selectedOrder.customer}.`);
  };

  return (
    <div className="dispatch-plan">
      <DashHead
        title="Dispatch Planning"
        sub="Plan shipments, assign vehicles — driver app not mandatory"
      >
        <Btn
          variant="secondary"
          size="sm"
          icon="menu"
          onClick={() => router.push("/dashboard/dispatch")}
        >
          Dispatch dashboard
        </Btn>
      </DashHead>

      <div className="dispatch-plan-stats">
        <div className="dispatch-plan-stat dispatch-plan-stat--ready">
          <div className="dispatch-plan-stat__label">Ready</div>
          <div className="dispatch-plan-stat__value success">{stats.ready}</div>
          <div className="dispatch-plan-stat__sub">Packaged & ready to load</div>
        </div>
        <div className="dispatch-plan-stat dispatch-plan-stat--pack">
          <div className="dispatch-plan-stat__label">Packaging Pending</div>
          <div className="dispatch-plan-stat__value warning">{stats.pack}</div>
          <div className="dispatch-plan-stat__sub">Awaiting packing</div>
        </div>
        <div className="dispatch-plan-stat dispatch-plan-stat--vehicle">
          <div className="dispatch-plan-stat__label">Vehicle Pending</div>
          <div className="dispatch-plan-stat__value accent">{stats.vehicle}</div>
          <div className="dispatch-plan-stat__sub">Vehicle to assign</div>
        </div>
        <div className="dispatch-plan-stat dispatch-plan-stat--delayed">
          <div className="dispatch-plan-stat__label">Delayed</div>
          <div className="dispatch-plan-stat__value danger">{stats.delayed}</div>
          <div className="dispatch-plan-stat__sub">Past requested date</div>
        </div>
      </div>

      <div className="dispatch-plan-layout">
        <div className="dispatch-plan-form-card">
          <div className="dispatch-plan-form-card__head">
            <h2>
              <Icon name="invoice" size={15} /> New dispatch plan
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
              <div className="field">
                <label className="field-label" htmlFor="orderId">
                  Order
                </label>
                <select
                  id="orderId"
                  className="input"
                  value={form.values.orderId}
                  onChange={(e) => {
                    const order = AWAITING_ORDERS.find((o) => o.id === e.target.value);
                    if (order) loadOrder(order);
                  }}
                >
                  <option value="">Select order</option>
                  {AWAITING_ORDERS.map((o) => (
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
              <div
                className={`dispatch-plan-pkg ${packagingOk ? "ok" : "pending"}`}
              >
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

              <div className="dispatch-plan-section-title">
                Planned via WhatsApp (optional)
              </div>
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
                  value={form.values.status}
                  onChange={(e) => form.setField("status", e.target.value)}
                >
                  <option value="ready">Ready</option>
                  <option value="pack">Packaging Pending</option>
                  <option value="vehicle">Vehicle Pending</option>
                  <option value="delayed">Delayed</option>
                </select>
                <span className="dispatch-plan-chip-hint">
                  Chips:{" "}
                  <PlanChip status="ready" />{" "}
                  <PlanChip status="pack" />{" "}
                  <PlanChip status="vehicle" />{" "}
                  <PlanChip status="delayed" />
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
                <strong>Note:</strong> Driver app is not mandatory. Dispatch can be
                planned and tracked via phone/WhatsApp; vehicle and driver can be
                captured here or at gate.
              </div>

              {error ? (
                <p style={{ color: "var(--danger)", fontSize: 12, margin: "0.75rem 0 0" }}>
                  {error}
                </p>
              ) : null}

              <div className="dispatch-plan-actions">
                <Btn
                  variant="primary"
                  size="sm"
                  icon="truck"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? "Planning…" : "Plan dispatch"}
                </Btn>
                <Btn
                  variant="secondary"
                  size="sm"
                  icon="truck"
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    form.setField("status", "vehicle");
                    if (!form.values.vehicleReg) {
                      message.info("Enter vehicle registration to assign.");
                    }
                  }}
                >
                  Assign vehicle
                </Btn>
              </div>
            </form>
          </div>
        </div>

        <div className="card dispatch-plan-table-card">
          <div className="card-head">
            <div className="card-title">
              <Icon name="clock" size={14} /> Orders awaiting dispatch planning
            </div>
          </div>
          <div className="card-body flush">
            <div className="dispatch-plan-table-wrap">
              <table className="dispatch-plan-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Requested</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {AWAITING_ORDERS.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.id}</strong>
                      </td>
                      <td>{row.customer}</td>
                      <td>{row.product}</td>
                      <td>{row.qty}</td>
                      <td>{row.requested}</td>
                      <td>
                        <PlanChip status={row.status} />
                      </td>
                      <td>
                        <div className="dispatch-plan-row-actions">
                          {row.status !== "vehicle" && row.status !== "delayed" ? (
                            <Btn
                              variant="primary"
                              size="sm"
                              onClick={() => loadOrder(row)}
                            >
                              Plan
                            </Btn>
                          ) : null}
                          <Btn
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              loadOrder(row);
                              form.setField("status", "vehicle");
                            }}
                          >
                            Assign vehicle
                          </Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
