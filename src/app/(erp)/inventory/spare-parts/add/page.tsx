"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { message } from "antd";
import { Icon } from "@/components/erp/icons";
import { Btn } from "@/components/erp/ui";
import { DashHead } from "@/components/erp/dashboards";
import { useDATA } from "@/components/erp/data";
import { useEntityMutation } from "@/hooks/use-entity-mutation";
import { useFormState } from "@/components/forms";
import { nextSpareCode } from "@/lib/id-generators";

const INITIAL = {
  partName: "",
  partCode: "",
  machineName: "",
  category: "",
  vendor: "",
  unit: "pcs",
  standardRate: "",
  minStock: "",
  criticality: "",
  storageLocation: "",
  notes: "",
};

const MACHINES = [
  {
    id: "BM1",
    name: "Ball Mill #1",
    plant: "Plant A",
    lastMaintenance: "28 Feb 2025",
    nextScheduled: "15 Mar 2025",
  },
  {
    id: "BM2",
    name: "Ball Mill #2",
    plant: "Plant A",
    lastMaintenance: "12 Feb 2025",
    nextScheduled: "12 Mar 2025",
  },
  {
    id: "RM1",
    name: "Raymond Mill #1",
    plant: "Plant A",
    lastMaintenance: "20 Jan 2025",
    nextScheduled: "20 Mar 2025",
  },
  {
    id: "RM2",
    name: "Raymond Mill #2",
    plant: "Plant B",
    lastMaintenance: "05 Feb 2025",
    nextScheduled: "05 Apr 2025",
  },
  {
    id: "PUL2",
    name: "Pulverizer #2",
    plant: "Plant A",
    lastMaintenance: "15 Feb 2025",
    nextScheduled: "15 Mar 2025",
  },
  {
    id: "AC1",
    name: "Air Classifier AC-1",
    plant: "Plant B",
    lastMaintenance: "10 Jan 2025",
    nextScheduled: "10 Apr 2025",
  },
  {
    id: "PL1",
    name: "Packing Line PL-1",
    plant: "Plant A",
    lastMaintenance: "01 Mar 2025",
    nextScheduled: "01 Apr 2025",
  },
  {
    id: "C2",
    name: "Conveyor C-2",
    plant: "Plant B",
    lastMaintenance: "18 Feb 2025",
    nextScheduled: "18 Mar 2025",
  },
];

const CATEGORY_OPTIONS = [
  { value: "Belt", label: "Blades / Wear parts" },
  { value: "Bearing", label: "Bearings" },
  { value: "Seal", label: "Seals / Gaskets" },
  { value: "Belt", label: "Belts / Drives" },
  { value: "Filter", label: "Filters" },
  { value: "Pump", label: "Other" },
];

function stockStatus(
  stock: number,
  reorder: number,
  isCritical: boolean
): string {
  if (stock === 0) return "critical";
  if (isCritical && stock <= reorder) return "critical";
  if (stock <= reorder) return "low";
  return "ok";
}

function isCriticalPart(criticality: string): boolean {
  return criticality === "critical" || criticality === "high";
}

export default function SparePartsMasterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editCode = searchParams.get("code")?.trim() ?? "";
  const DATA = useDATA();
  const { append, update, saving, error, clearError } = useEntityMutation();
  const form = useFormState(INITIAL);

  const editing = useMemo(
    () =>
      editCode
        ? DATA.SPARE_PARTS.find(
            (p) => p.code.toLowerCase() === editCode.toLowerCase()
          ) ?? null
        : null,
    [DATA.SPARE_PARTS, editCode]
  );

  useEffect(() => {
    if (!editCode) return;
    if (!editing) {
      message.error(`Spare part "${editCode}" not found.`);
      router.replace("/inventory/spare-parts");
      return;
    }
    const vendor = DATA.VENDORS.find((v) => v.name === editing.vendor);
    form.setValues({
      partName: editing.name,
      partCode: editing.code,
      machineName: editing.machineName ?? "",
      category: editing.category,
      vendor: vendor?.id ?? "",
      unit: editing.unit,
      standardRate:
        editing.standardRate != null ? String(editing.standardRate) : "",
      minStock: String(editing.reorder),
      criticality: editing.criticality ?? (editing.critical ? "critical" : ""),
      storageLocation: editing.location === "—" ? "" : editing.location,
      notes: editing.notes ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once when edit target resolves
  }, [editCode, editing?.code]);

  const spareVendors = useMemo(() => [...DATA.VENDORS], [DATA.VENDORS]);

  const selectedMachine = useMemo(
    () => MACHINES.find((m) => m.id === form.values.machineName),
    [form.values.machineName]
  );

  const machineStats = useMemo(() => {
    if (!selectedMachine) return null;
    const linked = DATA.SPARE_PARTS.filter(
      (p) => p.machineName === selectedMachine.id
    );
    const criticalCount = linked.filter((p) => p.critical).length;
    return {
      linked: linked.length,
      critical: criticalCount,
    };
  }, [selectedMachine, DATA.SPARE_PARTS]);

  const validate = (): string | null => {
    const name = form.values.partName.trim();
    if (!name) return "Part name is required.";
    if (name.length > 120) return "Part name must be at most 120 characters.";

    let code = form.values.partCode.trim().toUpperCase();
    if (!code) {
      code = nextSpareCode(DATA.SPARE_PARTS);
    } else if (!/^[A-Za-z0-9-]+$/.test(code)) {
      return "Part code must be alphanumeric (hyphens allowed).";
    }
    if (
      DATA.SPARE_PARTS.some(
        (p) =>
          p.code.toLowerCase() === code.toLowerCase() &&
          p.code.toLowerCase() !== editing?.code.toLowerCase()
      )
    ) {
      return "Part code already exists.";
    }

    if (!form.values.category) return "Category is required.";

    const rate = form.values.standardRate.trim()
      ? parseFloat(form.values.standardRate)
      : 0;
    if (Number.isNaN(rate) || rate < 0) {
      return "Standard rate must be a number ≥ 0.";
    }

    const minStock = form.values.minStock.trim()
      ? parseFloat(form.values.minStock)
      : 0;
    if (Number.isNaN(minStock) || minStock < 0) {
      return "Minimum stock must be a number ≥ 0.";
    }

    if (form.values.notes.length > 500) {
      return "Notes must be at most 500 characters.";
    }

    return null;
  };

  const saveSparePart = async (addAnother: boolean) => {
    clearError();
    const validationError = validate();
    if (validationError) {
      message.error(validationError);
      throw new Error(validationError);
    }

    const code =
      form.values.partCode.trim().toUpperCase() ||
      nextSpareCode(DATA.SPARE_PARTS);
    const reorder = form.values.minStock.trim()
      ? parseFloat(form.values.minStock)
      : 0;
    const rate = form.values.standardRate.trim()
      ? parseFloat(form.values.standardRate)
      : 0;
    const vendor = DATA.VENDORS.find((v) => v.id === form.values.vendor);
    const critical = isCriticalPart(form.values.criticality);
    const machine = MACHINES.find((m) => m.id === form.values.machineName);

    if (editing) {
      const stock = editing.stock;
      await update(
        "spareParts",
        editing.code,
        {
          name: form.values.partName.trim(),
          vendor: vendor?.name ?? "",
          category: form.values.category,
          unit: form.values.unit,
          reorder,
          value: stock * (rate || editing.standardRate || 0),
          location: form.values.storageLocation.trim() || "—",
          status: stockStatus(stock, reorder, critical),
          critical,
          machineName: machine?.id ?? "",
          standardRate: rate,
          criticality: form.values.criticality,
          notes: form.values.notes.trim(),
        },
        "code"
      );
      message.success("Spare part updated.");
      if (!addAnother) {
        router.push("/inventory/spare-parts");
      }
      return;
    }

    const stock = 0;

    await append("spareParts", {
      code,
      name: form.values.partName.trim(),
      vendor: vendor?.name ?? "",
      category: form.values.category,
      stock,
      unit: form.values.unit,
      reorder,
      value: stock * rate,
      location: form.values.storageLocation.trim() || "—",
      status: stockStatus(stock, reorder, critical),
      trend: 0,
      critical,
      lastIssued: "—",
      machineName: machine?.id ?? "",
      standardRate: rate,
      criticality: form.values.criticality,
      notes: form.values.notes.trim(),
    });

    message.success("Spare parts master saved.");

    if (addAnother) {
      form.reset({ ...INITIAL });
    } else {
      router.push("/inventory/spare-parts");
    }
  };

  return (
    <div className="sp-master">
      <DashHead
        title={editing ? "Edit Spare Part" : "Spare Parts Master"}
        sub={
          editing
            ? `Update spare part · ${editing.code}`
            : "Create or edit machine spare parts records"
        }
      >
        <Btn
          variant="secondary"
          size="sm"
          icon="menu"
          onClick={() => router.push("/inventory/spare-parts")}
        >
          Spare parts list
        </Btn>
      </DashHead>

      <div className="sp-master-layout">
        <div className="card">
          <div className="card-head">
            <div className="card-title">Part details</div>
          </div>
          <div className="card-body">
            <form
              className="sp-master-form"
              onSubmit={(e) => {
                e.preventDefault();
                saveSparePart(false).catch(() => {});
              }}
            >
              <div className="sp-master-section">
                <div className="sp-master-section-title">Basic information</div>
                <div className="sp-master-row-2">
                  <div className="field">
                    <label className="field-label" htmlFor="partName">
                      Part name
                    </label>
                    <input
                      id="partName"
                      className="input"
                      value={form.values.partName}
                      onChange={(e) => form.setField("partName", e.target.value)}
                      placeholder="e.g. Grinder Blade Set"
                      maxLength={120}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="partCode">
                      Part code
                    </label>
                    <input
                      id="partCode"
                      className="input"
                      value={form.values.partCode}
                      onChange={(e) =>
                        form.setField("partCode", e.target.value.toUpperCase())
                      }
                      placeholder="e.g. SP-102 (auto if blank)"
                      readOnly={!!editing}
                      disabled={!!editing}
                    />
                  </div>
                </div>
                <div className="sp-master-row-2">
                  <div className="field">
                    <label className="field-label" htmlFor="machineName">
                      Machine name
                    </label>
                    <select
                      id="machineName"
                      className="input"
                      value={form.values.machineName}
                      onChange={(e) =>
                        form.setField("machineName", e.target.value)
                      }
                    >
                      <option value="">Select machine</option>
                      {MACHINES.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="category">
                      Category
                    </label>
                    <select
                      id="category"
                      className="input"
                      value={form.values.category}
                      onChange={(e) => form.setField("category", e.target.value)}
                    >
                      <option value="">Select category</option>
                      {CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt.label} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="sp-master-section">
                <div className="sp-master-section-title">Vendor & pricing</div>
                <div className="sp-master-row-2">
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
                      {spareVendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
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
                      <option value="pcs">Nos</option>
                      <option value="set">Set</option>
                      <option value="mtr">Meter</option>
                      <option value="kg">KG</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="standardRate">
                    Current standard rate (₹)
                  </label>
                  <input
                    id="standardRate"
                    className="input"
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.values.standardRate}
                    onChange={(e) =>
                      form.setField("standardRate", e.target.value)
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="sp-master-section">
                <div className="sp-master-section-title">Stock & location</div>
                <div className="sp-master-row-2">
                  <div className="field">
                    <label className="field-label" htmlFor="minStock">
                      Minimum stock
                    </label>
                    <input
                      id="minStock"
                      className="input"
                      type="number"
                      min={0}
                      value={form.values.minStock}
                      onChange={(e) => form.setField("minStock", e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="criticality">
                      Part criticality
                    </label>
                    <select
                      id="criticality"
                      className="input"
                      value={form.values.criticality}
                      onChange={(e) =>
                        form.setField("criticality", e.target.value)
                      }
                    >
                      <option value="">Select</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="storageLocation">
                    Storage rack / location
                  </label>
                  <input
                    id="storageLocation"
                    className="input"
                    value={form.values.storageLocation}
                    onChange={(e) =>
                      form.setField("storageLocation", e.target.value)
                    }
                    placeholder="e.g. Rack A3, Shelf 2"
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="notes">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    className="input sp-master-textarea"
                    rows={2}
                    value={form.values.notes}
                    onChange={(e) => form.setField("notes", e.target.value)}
                    placeholder="Installation notes, OEM part no., etc."
                    maxLength={500}
                  />
                </div>
              </div>

              {error ? (
                <p style={{ color: "var(--danger)", fontSize: 12, margin: 0 }}>
                  {error}
                </p>
              ) : null}

              <div className="sp-master-actions">
                <Btn
                  variant="primary"
                  size="sm"
                  icon="check"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? "Saving…" : editing ? "Update" : "Save"}
                </Btn>
                {!editing ? (
                  <Btn
                    variant="secondary"
                    size="sm"
                    icon="plus"
                    type="button"
                    disabled={saving}
                    onClick={() => saveSparePart(true).catch(() => {})}
                  >
                    Save &amp; add new
                  </Btn>
                ) : null}
                <Btn
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => router.push("/inventory/spare-parts")}
                >
                  Cancel
                </Btn>
              </div>
            </form>
          </div>
        </div>

        <aside className="sp-master-machine">
          <h3>
            <Icon name="factory" size={14} /> Related machine info
          </h3>
          {selectedMachine ? (
            <>
              <div className="sp-master-machine__name">{selectedMachine.name}</div>
              <div className="sp-master-machine__row">
                <span className="k">Spare parts linked</span>
                <span className="v">{machineStats?.linked ?? 0}</span>
              </div>
              <div className="sp-master-machine__row">
                <span className="k">Last maintenance</span>
                <span className="v">{selectedMachine.lastMaintenance}</span>
              </div>
              <div className="sp-master-machine__row">
                <span className="k">Next scheduled</span>
                <span className="v">{selectedMachine.nextScheduled}</span>
              </div>
              <div className="sp-master-machine__row">
                <span className="k">Critical parts</span>
                <span className="v">{machineStats?.critical ?? 0}</span>
              </div>
              <div className="sp-master-machine__row">
                <span className="k">Location</span>
                <span className="v">{selectedMachine.plant}</span>
              </div>
            </>
          ) : (
            <>
              <div className="sp-master-machine__name">Ball Mill #1</div>
              <div className="sp-master-machine__row">
                <span className="k">Spare parts linked</span>
                <span className="v">—</span>
              </div>
              <div className="sp-master-machine__row">
                <span className="k">Last maintenance</span>
                <span className="v">28 Feb 2025</span>
              </div>
              <div className="sp-master-machine__row">
                <span className="k">Next scheduled</span>
                <span className="v">15 Mar 2025</span>
              </div>
              <div className="sp-master-machine__row">
                <span className="k">Critical parts</span>
                <span className="v">—</span>
              </div>
              <div className="sp-master-machine__row">
                <span className="k">Location</span>
                <span className="v">Plant A</span>
              </div>
              <p className="sp-master-machine__hint">
                Select a machine to see linked spare parts.
              </p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
