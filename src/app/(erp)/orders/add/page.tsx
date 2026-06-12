"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { message } from "antd";
import { Icon } from "@/components/erp/icons";
import { Btn, fmtNum } from "@/components/erp/ui";
import { DashHead } from "@/components/erp/dashboards";
import { useDATA } from "@/components/erp/data";
import { useEntityMutation } from "@/hooks/use-entity-mutation";
import { useFormState } from "@/components/forms";
import { nextOrderId, formatDueDate } from "@/lib/id-generators";

const GRADE_LABELS: Record<string, string> = {
  paint: "Paint Grade",
  industrial: "Industrial",
  cosmetic: "Cosmetic",
  "325": "325 Mesh",
};

const YIELD_BY_GRADE: Record<string, number> = {
  paint: 0.95,
  industrial: 0.96,
  cosmetic: 0.94,
  "325": 0.95,
};

const PLANTS = [
  { id: "PLANT-A", name: "Plant A — Grinding Unit 1" },
  { id: "PLANT-B", name: "Plant B — Grinding Unit 2" },
  { id: "PLANT-C", name: "Plant C — Blending" },
];

const EXTRA_PACKAGING = [
  { code: "BULK", name: "Bulk (tanker)", bagSize: 0 },
  { code: "PALLET", name: "Palletised 1 MT", bagSize: 1000 },
];

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function bagSizeFromName(name: string): number {
  const match = name.match(/(\d+(?:\.\d+)?)\s*kg/i);
  if (match) return parseFloat(match[1]);
  if (/1000\s*kg|1\s*ton|1t/i.test(name)) return 1000;
  if (/500\s*kg|jumbo/i.test(name)) return 500;
  return 0;
}

function defaultBagsPerTon(bagSizeKg: number): number {
  if (!bagSizeKg || bagSizeKg <= 0) return 0;
  return Math.round(1000 / bagSizeKg);
}

function qtyInMt(quantity: number, unit: string): number {
  if (unit === "KG") return quantity / 1000;
  return quantity;
}

function buildInitial(orderNumber: string) {
  return {
    orderNumber,
    orderDate: todayIsoDate(),
    customer: "",
    material: "",
    grade: "paint",
    quantity: "12",
    unit: "MT",
    packaging: "",
    bagSize: "25",
    bagsPerTon: "40",
    palletised: "no",
    bagsPerPallet: "40",
    dispatchDate: addDaysIso(6),
    priority: "high",
    assignedUnit: "PLANT-A",
    specialInstructions: "",
  };
}

export default function CreateCustomerOrderPage() {
  const router = useRouter();
  const DATA = useDATA();
  const { append, saving, error, clearError } = useEntityMutation();

  const defaultOrderNumber = useMemo(
    () => nextOrderId(DATA.ORDERS),
    [DATA.ORDERS]
  );

  const form = useFormState(buildInitial(defaultOrderNumber));

  useEffect(() => {
    form.setField("orderNumber", defaultOrderNumber);
  }, [defaultOrderNumber]);

  const packagingOptions = useMemo(
    () => [
      ...DATA.PACKAGING.map((p) => ({
        code: p.code,
        name: p.name,
        bagSize: bagSizeFromName(p.name),
      })),
      ...EXTRA_PACKAGING,
    ],
    [DATA.PACKAGING]
  );

  const selectedMaterial = useMemo(
    () => DATA.RAW_MATERIALS.find((m) => m.code === form.values.material),
    [DATA.RAW_MATERIALS, form.values.material]
  );

  const selectedPackaging = useMemo(
    () => packagingOptions.find((p) => p.code === form.values.packaging),
    [packagingOptions, form.values.packaging]
  );

  const calc = useMemo(() => {
    const quantity = parseFloat(form.values.quantity) || 0;
    const qtyMt = qtyInMt(quantity, form.values.unit);
    const bagSize = parseFloat(form.values.bagSize) || 0;
    const bagsPerTon = parseInt(form.values.bagsPerTon, 10) || 0;
    const isBulk = form.values.packaging === "BULK";
    const bagsRequired = isBulk || !bagsPerTon ? 0 : Math.ceil(qtyMt * bagsPerTon);
    const bagsPerPallet = parseInt(form.values.bagsPerPallet, 10) || 0;
    const palletised = form.values.palletised === "yes";
    const pallets =
      palletised && bagsPerPallet > 0
        ? Math.ceil(bagsRequired / bagsPerPallet)
        : 0;

    const yieldPct = YIELD_BY_GRADE[form.values.grade] ?? 0.95;
    const rawInputMt = qtyMt > 0 ? qtyMt / yieldPct : 0;
    const additivesKg = qtyMt > 0 ? Math.round(qtyMt * 2.1) : 0;

    const ratePerMt = 74000;
    const orderValue = Math.round(qtyMt * ratePerMt);

    return {
      qtyMt,
      bagSize,
      bagsPerTon,
      bagsRequired,
      pallets,
      palletised,
      rawInputMt,
      additivesKg,
      yieldPct,
      orderValue,
      packagingLabel: selectedPackaging?.name ?? "—",
    };
  }, [form.values, selectedPackaging]);

  const handlePackagingChange = (code: string) => {
    form.setField("packaging", code);
    const pkg = packagingOptions.find((p) => p.code === code);
    if (!pkg) return;
    if (pkg.bagSize > 0) {
      form.setField("bagSize", String(pkg.bagSize));
      form.setField("bagsPerTon", String(defaultBagsPerTon(pkg.bagSize)));
    } else if (code === "BULK") {
      form.setField("bagSize", "");
      form.setField("bagsPerTon", "0");
    }
  };

  const handleBagSizeChange = (bagSize: string) => {
    form.setField("bagSize", bagSize);
    const size = parseFloat(bagSize);
    if (size > 0) {
      form.setField("bagsPerTon", String(defaultBagsPerTon(size)));
    }
  };

  const validate = (): string | null => {
    if (!form.values.customer) return "Customer is required.";
    if (!form.values.material) return "Material is required.";
    if (!form.values.grade) return "Grade is required.";

    const quantity = parseFloat(form.values.quantity);
    if (Number.isNaN(quantity) || quantity <= 0) {
      return "Quantity must be greater than 0.";
    }

    if (!form.values.packaging) return "Packaging / bag type is required.";
    if (!form.values.dispatchDate) return "Requested dispatch date is required.";
    if (!form.values.assignedUnit) return "Assigned unit / plant is required.";

    if (form.values.specialInstructions.length > 500) {
      return "Special instructions must be at most 500 characters.";
    }

    return null;
  };

  const saveOrder = async (asDraft: boolean) => {
    clearError();
    const validationError = validate();
    if (validationError) {
      message.error(validationError);
      throw new Error(validationError);
    }

    const customer = DATA.CUSTOMERS.find((c) => c.id === form.values.customer);
    const material = DATA.RAW_MATERIALS.find((m) => m.code === form.values.material);
    const gradeLabel = GRADE_LABELS[form.values.grade] ?? form.values.grade;
    const quantity = parseFloat(form.values.quantity) || 0;
    const qtyMt = qtyInMt(quantity, form.values.unit);
    const bagSize = parseFloat(form.values.bagSize) || 0;
    const bagsPerTon = parseInt(form.values.bagsPerTon, 10) || 0;
    const palletised = form.values.palletised === "yes";

    await append("orders", {
      id: form.values.orderNumber || nextOrderId(DATA.ORDERS),
      customer: customer?.name ?? "",
      product: material ? `${material.name} · ${gradeLabel}` : gradeLabel,
      qty: `${quantity} ${form.values.unit}`,
      value: calc.orderValue,
      due: formatDueDate(form.values.dispatchDate),
      status: asDraft ? "scheduled" : "in-production",
      progress: asDraft ? 0 : 10,
      orderDate: form.values.orderDate,
      materialCode: material?.code,
      grade: form.values.grade,
      quantity,
      unit: form.values.unit,
      packaging: selectedPackaging?.name ?? form.values.packaging,
      bagSize: bagSize || undefined,
      bagsPerTon: bagsPerTon || undefined,
      bagsRequired: calc.bagsRequired || undefined,
      palletised,
      bagsPerPallet: palletised
        ? parseInt(form.values.bagsPerPallet, 10) || undefined
        : undefined,
      dispatchDate: form.values.dispatchDate,
      priority: form.values.priority,
      assignedUnit: form.values.assignedUnit,
      specialInstructions: form.values.specialInstructions.trim(),
    });

    message.success(
      asDraft ? "Customer order saved as draft." : "Customer order confirmed."
    );
    router.push("/orders");
  };

  return (
    <div className="cust-order-create">
      <DashHead
        title="Create Customer Order"
        sub="New sales order — material, grade, packaging & dispatch"
      >
        <Btn
          variant="secondary"
          size="sm"
          icon="menu"
          onClick={() => router.push("/orders")}
        >
          Order list
        </Btn>
      </DashHead>

      <div className="cust-order-create-layout">
        <div className="card">
          <div className="card-head">
            <div className="card-title">Order details</div>
          </div>
          <div className="card-body">
            <form
              className="cust-order-create-form"
              onSubmit={(e) => {
                e.preventDefault();
                saveOrder(false).catch(() => {});
              }}
            >
              <div className="cust-order-create-section">
                <div className="cust-order-create-section-title">Header</div>
                <div className="cust-order-create-row-2">
                  <div className="field">
                    <label className="field-label" htmlFor="orderNumber">
                      Order number
                    </label>
                    <input
                      id="orderNumber"
                      className="input cust-order-create-readonly"
                      value={form.values.orderNumber}
                      readOnly
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="orderDate">
                      Order date
                    </label>
                    <input
                      id="orderDate"
                      className="input"
                      type="date"
                      value={form.values.orderDate}
                      onChange={(e) => form.setField("orderDate", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="cust-order-create-section">
                <div className="cust-order-create-section-title">
                  Customer & material
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="customer">
                    Customer
                  </label>
                  <select
                    id="customer"
                    className="input"
                    value={form.values.customer}
                    onChange={(e) => form.setField("customer", e.target.value)}
                  >
                    <option value="">Select customer</option>
                    {DATA.CUSTOMERS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="cust-order-create-row-2">
                  <div className="field">
                    <label className="field-label" htmlFor="material">
                      Material
                    </label>
                    <select
                      id="material"
                      className="input"
                      value={form.values.material}
                      onChange={(e) => form.setField("material", e.target.value)}
                    >
                      <option value="">Select material</option>
                      {DATA.RAW_MATERIALS.map((m) => (
                        <option key={m.code} value={m.code}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="grade">
                      Grade
                    </label>
                    <select
                      id="grade"
                      className="input"
                      value={form.values.grade}
                      onChange={(e) => form.setField("grade", e.target.value)}
                    >
                      <option value="">Select grade</option>
                      <option value="paint">Paint Grade</option>
                      <option value="industrial">Industrial</option>
                      <option value="cosmetic">Cosmetic</option>
                      <option value="325">325 Mesh</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="cust-order-create-section">
                <div className="cust-order-create-section-title">
                  Quantity & packaging (auto bag calculation)
                </div>
                <div className="cust-order-create-row-2">
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
                    </select>
                  </div>
                </div>
                <div className="cust-order-create-row-2">
                  <div className="field">
                    <label className="field-label" htmlFor="packaging">
                      Packaging / bag type
                    </label>
                    <select
                      id="packaging"
                      className="input"
                      value={form.values.packaging}
                      onChange={(e) => handlePackagingChange(e.target.value)}
                    >
                      <option value="">Select packaging</option>
                      {packagingOptions.map((p) => (
                        <option key={p.code} value={p.code}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <span className="cust-order-create-hint">
                      Links to packaging inventory and bag auto-calculation by grade
                      + size.
                    </span>
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="bagSize">
                      Bag size (kg)
                    </label>
                    <select
                      id="bagSize"
                      className="input"
                      value={form.values.bagSize}
                      onChange={(e) => handleBagSizeChange(e.target.value)}
                      disabled={form.values.packaging === "BULK"}
                    >
                      <option value="">—</option>
                      <option value="25">25 kg</option>
                      <option value="50">50 kg</option>
                      <option value="500">500 kg (jumbo)</option>
                      <option value="1000">1,000 kg (1 ton)</option>
                    </select>
                    <span className="cust-order-create-hint">
                      Used for bags-per-ton conversion. 1 MT = 40 × 25 kg, 20 × 50
                      kg, etc.
                    </span>
                  </div>
                </div>
                <div className="cust-order-create-row-2">
                  <div className="field">
                    <label className="field-label" htmlFor="bagsPerTon">
                      Bags per ton (conversion)
                    </label>
                    <input
                      id="bagsPerTon"
                      className="input"
                      type="number"
                      min={0}
                      step={1}
                      value={form.values.bagsPerTon}
                      onChange={(e) =>
                        form.setField("bagsPerTon", e.target.value)
                      }
                      disabled={form.values.packaging === "BULK"}
                    />
                    <span className="cust-order-create-hint">
                      From conversion table for this grade + bag size. Override if
                      needed.
                    </span>
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="estBagsRequired">
                      Estimated bags required
                    </label>
                    <input
                      id="estBagsRequired"
                      className="input cust-order-create-readonly cust-order-create-highlight"
                      value={
                        calc.bagsRequired > 0
                          ? `${fmtNum(calc.bagsRequired)} bags`
                          : form.values.packaging === "BULK"
                            ? "Bulk — N/A"
                            : "—"
                      }
                      readOnly
                    />
                    <span className="cust-order-create-hint">
                      Quantity (MT) × Bags per ton. Drives bag auto-calculation on
                      production completion.
                    </span>
                  </div>
                </div>
                <div className="cust-order-create-row-2">
                  <div className="field">
                    <label className="field-label" htmlFor="palletised">
                      Palletised
                    </label>
                    <select
                      id="palletised"
                      className="input"
                      value={form.values.palletised}
                      onChange={(e) =>
                        form.setField("palletised", e.target.value)
                      }
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="bagsPerPallet">
                      Bags per pallet (if palletised)
                    </label>
                    <input
                      id="bagsPerPallet"
                      className="input"
                      type="number"
                      min={1}
                      step={1}
                      value={form.values.bagsPerPallet}
                      onChange={(e) =>
                        form.setField("bagsPerPallet", e.target.value)
                      }
                      disabled={form.values.palletised !== "yes"}
                    />
                    <span className="cust-order-create-hint">
                      Optional. Estimated pallets = bags required ÷ bags per pallet.
                    </span>
                  </div>
                </div>

                <div className="cust-order-create-pack-calc">
                  <div className="cust-order-create-pack-calc__title">
                    <Icon name="money" size={13} /> Auto bag calculation preview
                  </div>
                  <div className="cust-order-create-pack-calc__row">
                    <span className="k">Order quantity</span>
                    <span className="v">
                      {calc.qtyMt.toFixed(2)} MT
                    </span>
                  </div>
                  <div className="cust-order-create-pack-calc__row">
                    <span className="k">Bag size</span>
                    <span className="v">
                      {calc.bagSize ? `${calc.bagSize} kg` : "—"}
                    </span>
                  </div>
                  <div className="cust-order-create-pack-calc__row">
                    <span className="k">Bags per ton</span>
                    <span className="v">{calc.bagsPerTon || "—"}</span>
                  </div>
                  <div className="cust-order-create-pack-calc__row">
                    <span className="k">Bags required</span>
                    <span className="v">
                      {calc.bagsRequired > 0 ? fmtNum(calc.bagsRequired) : "—"}
                    </span>
                  </div>
                  <div className="cust-order-create-pack-calc__formula">
                    {calc.bagsRequired > 0
                      ? `${calc.qtyMt.toFixed(2)} MT × ${calc.bagsPerTon} bags/ton = ${fmtNum(calc.bagsRequired)} bags. On production completion, this will be deducted from packaging stock (grade + bag type).`
                      : "Select packaging and quantity to preview bag calculation."}
                  </div>
                </div>
              </div>

              <div className="cust-order-create-section">
                <div className="cust-order-create-section-title">
                  Dispatch & assignment
                </div>
                <div className="cust-order-create-row-2">
                  <div className="field">
                    <label className="field-label" htmlFor="dispatchDate">
                      Requested dispatch date
                    </label>
                    <input
                      id="dispatchDate"
                      className="input"
                      type="date"
                      value={form.values.dispatchDate}
                      onChange={(e) =>
                        form.setField("dispatchDate", e.target.value)
                      }
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="priority">
                      Priority
                    </label>
                    <select
                      id="priority"
                      className="input"
                      value={form.values.priority}
                      onChange={(e) => form.setField("priority", e.target.value)}
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="assignedUnit">
                    Assigned unit / plant
                  </label>
                  <select
                    id="assignedUnit"
                    className="input"
                    value={form.values.assignedUnit}
                    onChange={(e) =>
                      form.setField("assignedUnit", e.target.value)
                    }
                  >
                    <option value="">Select unit</option>
                    {PLANTS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="specialInstructions">
                    Special instructions
                  </label>
                  <textarea
                    id="specialInstructions"
                    className="input cust-order-create-textarea"
                    rows={3}
                    value={form.values.specialInstructions}
                    onChange={(e) =>
                      form.setField("specialInstructions", e.target.value)
                    }
                    placeholder="Delivery slot, GRN reference, quality notes, etc."
                    maxLength={500}
                  />
                </div>
              </div>

              {error ? (
                <p style={{ color: "var(--danger)", fontSize: 12, margin: 0 }}>
                  {error}
                </p>
              ) : null}

              <div className="cust-order-create-actions">
                <Btn
                  variant="secondary"
                  size="sm"
                  icon="invoice"
                  type="button"
                  disabled={saving}
                  onClick={() => saveOrder(true).catch(() => {})}
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
                  {saving ? "Confirming…" : "Confirm order"}
                </Btn>
              </div>
            </form>
          </div>
        </div>

        <aside className="cust-order-create-side">
          <div className="cust-order-create-est cust-order-create-est--raw">
            <h3>
              <Icon name="box" size={14} /> Estimated raw material requirement
            </h3>
            <div className="cust-order-create-est__row">
              <span className="mat">
                {selectedMaterial
                  ? `${selectedMaterial.name} (input)`
                  : "Material (input)"}
              </span>
              <span className="qty">
                {calc.rawInputMt > 0
                  ? `${calc.rawInputMt.toFixed(1)} MT`
                  : "—"}
              </span>
            </div>
            <div className="cust-order-create-est__row">
              <span className="mat">Additives / flow aid</span>
              <span className="qty">
                {calc.additivesKg > 0 ? `~${fmtNum(calc.additivesKg)} kg` : "—"}
              </span>
            </div>
            <div className="cust-order-create-est__note">
              Based on {Math.round(calc.yieldPct * 100)}% yield for{" "}
              {GRADE_LABELS[form.values.grade] ?? "selected grade"}
            </div>
          </div>

          <div className="cust-order-create-est cust-order-create-est--pack">
            <h3>
              <Icon name="money" size={14} /> Estimated packaging (auto bag
              calculation)
            </h3>
            <div className="cust-order-create-est__row">
              <span className="mat">Bag type</span>
              <span className="qty">{calc.packagingLabel}</span>
            </div>
            <div className="cust-order-create-est__row">
              <span className="mat">Bags per ton</span>
              <span className="qty">{calc.bagsPerTon || "—"}</span>
            </div>
            <div className="cust-order-create-est__row">
              <span className="mat">Bags required</span>
              <span className="qty">
                {calc.bagsRequired > 0
                  ? `${fmtNum(calc.bagsRequired)} nos`
                  : "—"}
              </span>
            </div>
            <div className="cust-order-create-est__row">
              <span className="mat">
                Pallets
                {calc.palletised && form.values.bagsPerPallet
                  ? ` (if ${form.values.bagsPerPallet} bags/pallet)`
                  : ""}
              </span>
              <span className="qty">
                {calc.pallets > 0 ? fmtNum(calc.pallets) : "—"}
              </span>
            </div>
            <div className="cust-order-create-est__note">
              {calc.bagsRequired > 0
                ? `${calc.qtyMt.toFixed(0)} MT × ${calc.bagsPerTon} = ${fmtNum(calc.bagsRequired)} bags. Matches Bag Auto-Calculation by grade + size.`
                : "Select packaging to preview bag requirements."}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
