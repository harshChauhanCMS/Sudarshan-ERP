"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { message } from "antd";
import { Icon } from "@/components/erp/icons";
import { Btn, fmtINRFull, fmtNum } from "@/components/erp/ui";
import { DashHead } from "@/components/erp/dashboards";
import { useDATA } from "@/components/erp/data";
import { usePackaging } from "@/hooks/use-packaging";
import { useSpareParts } from "@/hooks/use-spare-parts";
import { useRawMaterials } from "@/hooks/use-raw-materials";
import { useVendors } from "@/hooks/use-vendors";
import { useEntityMutation } from "@/hooks/use-entity-mutation";
import { useFormState } from "@/components/forms";
import { nextPoId, formatDisplayDate } from "@/lib/id-generators";
import type { PurchaseOrder } from "@/lib/entity-types";

type MaterialOption = {
  code: string;
  name: string;
  grade: string;
  unit: string;
  kind: string;
};

const DELIVERY_LOCATIONS: Record<string, string> = {
  "WH-A": "Warehouse A — Main",
  "WH-B": "Warehouse B",
  Plant: "Plant receiving",
};

const UNIT_LABELS: Record<string, string> = {
  MT: "MT",
  KG: "KG",
  pcs: "Nos",
  set: "Set",
  mtr: "Meter",
  kg: "KG",
  KL: "KL",
  drum: "Drum",
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatIsoDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function buildInitial(poNumber: string) {
  return {
    poNumber,
    poDate: todayIsoDate(),
    vendor: "",
    material: "",
    grade: "",
    quantity: "25",
    unit: "MT",
    rate: "20020",
    expectedDelivery: addDaysIso(9),
    deliveryLocation: "WH-A",
    notes: "",
  };
}

export default function CreatePurchaseOrderPage() {
  const router = useRouter();
  const DATA = useDATA();
  const { items: packagingItems } = usePackaging();
  const { items: spareParts } = useSpareParts();
  const { items: rawMaterials } = useRawMaterials();
  const { items: vendors } = useVendors();
  const { append, saving, error, clearError } = useEntityMutation();

  const defaultPoNumber = useMemo(
    () => nextPoId(DATA.PURCHASE_ORDERS),
    [DATA.PURCHASE_ORDERS]
  );

  const form = useFormState(buildInitial(defaultPoNumber));

  useEffect(() => {
    form.setField("poNumber", defaultPoNumber);
  }, [defaultPoNumber]);

  const materials = useMemo<MaterialOption[]>(
    () => [
      ...rawMaterials.map((r) => ({
        code: r.code,
        name: r.name,
        grade: r.grade,
        unit: r.unit,
        kind: "RM",
      })),
      ...packagingItems.map((p) => ({
        code: p.code,
        name: p.name,
        grade: "—",
        unit: p.unit,
        kind: "PKG",
      })),
      ...spareParts.map((s) => ({
        code: s.code,
        name: s.name,
        grade: "—",
        unit: s.unit,
        kind: "SP",
      })),
    ],
    [rawMaterials, packagingItems, spareParts]
  );

  const selectedMaterial = useMemo(
    () => materials.find((m) => m.code === form.values.material),
    [materials, form.values.material]
  );

  const selectedVendor = useMemo(
    () => vendors.find((v) => v.id === form.values.vendor),
    [vendors, form.values.vendor]
  );

  const orderValue = useMemo(() => {
    const qty = parseFloat(form.values.quantity) || 0;
    const rate = parseFloat(form.values.rate) || 0;
    return Math.round(qty * rate);
  }, [form.values.quantity, form.values.rate]);

  const previousRate = useMemo(() => {
    if (!selectedVendor || !selectedMaterial) return null;

    const matches = DATA.PURCHASE_ORDERS.filter(
      (po) =>
        po.vendor === selectedVendor.name &&
        po.materialCode === selectedMaterial.code &&
        typeof po.rate === "number" &&
        po.rate > 0
    );

    if (matches.length) {
      const latest = [...matches].sort((a, b) => b.date.localeCompare(a.date))[0];
      return {
        rate: latest.rate as number,
        poId: latest.id,
        date: latest.poDate ?? latest.date,
      };
    }

    const vendorMatches = DATA.PURCHASE_ORDERS.filter(
      (po) => po.vendor === selectedVendor.name
    );
    if (!vendorMatches.length) return null;

    const latest = [...vendorMatches].sort((a, b) => b.date.localeCompare(a.date))[0];
    return {
      rate: latest.rate ?? null,
      poId: latest.id,
      date: latest.poDate ?? latest.date,
    };
  }, [DATA.PURCHASE_ORDERS, selectedVendor, selectedMaterial]);

  const handleMaterialChange = (code: string) => {
    form.setField("material", code);
    const item = materials.find((m) => m.code === code);
    if (!item) return;
    if (item.grade && item.grade !== "—") {
      form.setField("grade", item.grade);
    }
    if (item.unit) {
      form.setField("unit", item.unit === "pcs" ? "pcs" : item.unit);
    }
  };

  const validate = (): string | null => {
    if (!form.values.vendor) return "Vendor is required.";
    if (!form.values.material) return "Material is required.";

    const qty = parseFloat(form.values.quantity);
    if (Number.isNaN(qty) || qty <= 0) {
      return "Quantity must be greater than 0.";
    }

    const rate = parseFloat(form.values.rate);
    if (Number.isNaN(rate) || rate < 0) {
      return "Rate must be a number ≥ 0.";
    }

    if (!form.values.expectedDelivery) {
      return "Expected delivery date is required.";
    }

    if (!form.values.deliveryLocation) {
      return "Delivery location is required.";
    }

    if (form.values.notes.length > 500) {
      return "Notes must be at most 500 characters.";
    }

    return null;
  };

  const savePO = async (draft: boolean) => {
    clearError();
    const validationError = validate();
    if (validationError) {
      message.error(validationError);
      throw new Error(validationError);
    }

    const vendor = vendors.find((v) => v.id === form.values.vendor);
    const material = materials.find((m) => m.code === form.values.material);
    const quantity = parseFloat(form.values.quantity) || 0;
    const rate = parseFloat(form.values.rate) || 0;
    const total = Math.round(quantity * rate);

    // status is server-authoritative: draft stays a draft, a submitted PO is
    // auto-verified for owner/admin or sent for verification otherwise.
    const result = await append("purchaseOrders", {
      id: form.values.poNumber || nextPoId(DATA.PURCHASE_ORDERS),
      vendor: vendor?.name ?? "",
      items: 1,
      total,
      date: formatDisplayDate(form.values.poDate),
      poDate: form.values.poDate,
      status: draft ? "draft" : "submitted",
      invoice: "awaiting",
      materialCode: material?.code,
      materialName: material?.name,
      grade: form.values.grade.trim(),
      quantity,
      unit: form.values.unit,
      rate,
      expectedDelivery: form.values.expectedDelivery,
      deliveryLocation: form.values.deliveryLocation,
      notes: form.values.notes.trim(),
    } satisfies PurchaseOrder);

    const finalStatus = (result as { item?: { status?: string } })?.item?.status;
    if (draft) {
      message.success("Purchase order saved as draft.");
    } else if (finalStatus === "pending_verification") {
      message.success("Purchase order submitted for verification.");
    } else {
      message.success("Purchase order issued.");
    }

    router.push("/procurement/po");
  };

  const resetForm = () => {
    const poNumber = nextPoId(DATA.PURCHASE_ORDERS);
    form.reset(buildInitial(poNumber));
  };

  const unitLabel = UNIT_LABELS[form.values.unit] ?? form.values.unit;

  return (
    <div className="po-create">
      <DashHead
        title="Create Purchase Order"
        sub="New purchase order — raw materials / packaging / spares"
      >
        <Btn
          variant="secondary"
          size="sm"
          icon="menu"
          onClick={() => router.push("/procurement/po")}
        >
          PO list
        </Btn>
      </DashHead>

      <div className="po-create-layout">
        <div className="card">
          <div className="card-head">
            <div className="card-title">PO details</div>
          </div>
          <div className="card-body">
            <form
              className="po-create-form"
              onSubmit={(e) => {
                e.preventDefault();
                savePO(false).catch(() => {});
              }}
            >
              <div className="po-create-section">
                <div className="po-create-section-title">Header</div>
                <div className="po-create-row-2">
                  <div className="field">
                    <label className="field-label" htmlFor="poNumber">
                      PO number
                    </label>
                    <input
                      id="poNumber"
                      className="input po-create-readonly"
                      value={form.values.poNumber}
                      readOnly
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="poDate">
                      PO date
                    </label>
                    <input
                      id="poDate"
                      className="input"
                      type="date"
                      value={form.values.poDate}
                      onChange={(e) => form.setField("poDate", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="po-create-section">
                <div className="po-create-section-title">Vendor & material</div>
                <div className="field">
                  <label className="field-label" htmlFor="vendor">
                    Vendor
                  </label>
                  <select
                    id="vendor"
                    className="input"
                    value={form.values.vendor}
                    onChange={(e) => form.setField("vendor", e.target.value)}
                  >
                    <option value="">Select vendor</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="po-create-row-2">
                  <div className="field">
                    <label className="field-label" htmlFor="material">
                      Material
                    </label>
                    <select
                      id="material"
                      className="input"
                      value={form.values.material}
                      onChange={(e) => handleMaterialChange(e.target.value)}
                    >
                      <option value="">Select material</option>
                      {materials.map((m) => (
                        <option key={m.code} value={m.code}>
                          {m.name} — {m.code}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="grade">
                      Grade
                    </label>
                    <input
                      id="grade"
                      className="input"
                      value={form.values.grade}
                      onChange={(e) => form.setField("grade", e.target.value)}
                      placeholder="e.g. Industrial"
                    />
                  </div>
                </div>
              </div>

              <div className="po-create-section">
                <div className="po-create-section-title">Quantity & rate</div>
                <div className="po-create-row-2">
                  <div className="field">
                    <label className="field-label" htmlFor="quantity">
                      Quantity
                    </label>
                    <input
                      id="quantity"
                      className="input"
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.values.quantity}
                      onChange={(e) => form.setField("quantity", e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="unit">
                      Unit
                    </label>
                    <select
                      id="unit"
                      className="input"
                      value={form.values.unit}
                      onChange={(e) => form.setField("unit", e.target.value)}
                    >
                      <option value="MT">MT</option>
                      <option value="KG">KG</option>
                      <option value="pcs">Nos</option>
                      <option value="set">Set</option>
                      <option value="mtr">Meter</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="rate">
                    Rate (₹ per unit)
                  </label>
                  <input
                    id="rate"
                    className="input"
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.values.rate}
                    onChange={(e) => form.setField("rate", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="po-create-section">
                <div className="po-create-section-title">Delivery</div>
                <div className="po-create-row-2">
                  <div className="field">
                    <label className="field-label" htmlFor="expectedDelivery">
                      Expected delivery date
                    </label>
                    <input
                      id="expectedDelivery"
                      className="input"
                      type="date"
                      value={form.values.expectedDelivery}
                      onChange={(e) =>
                        form.setField("expectedDelivery", e.target.value)
                      }
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="deliveryLocation">
                      Delivery location
                    </label>
                    <select
                      id="deliveryLocation"
                      className="input"
                      value={form.values.deliveryLocation}
                      onChange={(e) =>
                        form.setField("deliveryLocation", e.target.value)
                      }
                    >
                      <option value="">Select location</option>
                      {Object.entries(DELIVERY_LOCATIONS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="notes">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    className="input po-create-textarea"
                    rows={2}
                    value={form.values.notes}
                    onChange={(e) => form.setField("notes", e.target.value)}
                    placeholder="Special instructions, reference, etc."
                    maxLength={500}
                  />
                </div>
              </div>

              {error ? (
                <p style={{ color: "var(--danger)", fontSize: 12, margin: 0 }}>
                  {error}
                </p>
              ) : null}

              <div className="po-create-actions">
                <Btn
                  variant="secondary"
                  size="sm"
                  icon="invoice"
                  type="button"
                  disabled={saving}
                  onClick={() => savePO(true).catch(() => {})}
                >
                  Save draft
                </Btn>
                <Btn
                  variant="primary"
                  size="sm"
                  icon="check"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? "Issuing…" : "Issue PO"}
                </Btn>
                <Btn
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={resetForm}
                >
                  Reset
                </Btn>
              </div>
            </form>
          </div>
        </div>

        <aside className="po-create-side">
          <div className="po-create-calc">
            <h3>
              <Icon name="money" size={14} /> Order value
            </h3>
            <div className="po-create-calc__row">
              <span>Quantity</span>
              <span>
                {form.values.quantity || "0"} {unitLabel}
              </span>
            </div>
            <div className="po-create-calc__row">
              <span>Rate (₹/{unitLabel})</span>
              <span>{fmtNum(parseFloat(form.values.rate) || 0)}</span>
            </div>
            <div className="po-create-calc__row po-create-calc__row--total">
              <span>Order value</span>
              <span>{fmtINRFull(orderValue)}</span>
            </div>
          </div>

          <div className="po-create-ref">
            <h3>
              <Icon name="clock" size={14} /> Previous vendor rate
            </h3>
            {selectedVendor && selectedMaterial ? (
              <>
                <div className="po-create-ref__line">
                  {selectedMaterial.name} ({selectedMaterial.code}) —{" "}
                  {selectedVendor.name}
                </div>
                <div className="po-create-ref__value">
                  {previousRate?.rate
                    ? `${fmtINRFull(previousRate.rate)} / ${unitLabel}`
                    : `${fmtINRFull(parseFloat(form.values.rate) || 0)} / ${unitLabel}`}
                </div>
                <div className="po-create-ref__meta">
                  {previousRate
                    ? `Last PO: ${previousRate.poId} · ${formatIsoDate(String(previousRate.date))}`
                    : "No previous PO on record for this vendor & material."}
                </div>
              </>
            ) : (
              <>
                <div className="po-create-ref__line">
                  Select vendor and material to view reference rate.
                </div>
                <div className="po-create-ref__value">—</div>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
