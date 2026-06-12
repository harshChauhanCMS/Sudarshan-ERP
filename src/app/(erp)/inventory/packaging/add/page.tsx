"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { message } from "antd";
import { Icon } from "@/components/erp/icons";
import { Btn, fmtNum } from "@/components/erp/ui";
import { DashHead } from "@/components/erp/dashboards";
import { useDATA } from "@/components/erp/data";
import { useEntityMutation } from "@/hooks/use-entity-mutation";
import { useFormState } from "@/components/forms";
import { nextPackagingCode } from "@/lib/id-generators";
import type { Packaging } from "@/lib/entity-types";

const INITIAL = {
  packagingType: "",
  bagCode: "",
  capacity: "",
  unit: "pcs",
  gradeCompatibility: "",
  supplier: "",
  materialType: "",
  minStock: "",
  reorderQty: "",
  notes: "",
};

const UNIT_LABELS: Record<string, string> = {
  pcs: "Nos",
  MT: "MT",
  mtr: "mtr",
};

function stockStatus(stock: number, reorder: number, minStock: number): string {
  if (minStock > 0 && stock <= minStock) return "critical";
  if (reorder > 0 && stock < reorder) return "low";
  return "ok";
}

function buildName(type: string, capacity: number | null): string {
  const trimmed = type.trim();
  if (!trimmed) return "—";
  if (capacity && capacity > 0) return `${trimmed} · ${capacity} kg`;
  return trimmed;
}

function previewLabel(pkg: Packaging): string {
  const match = pkg.name.match(/(\d+)\s*kg/i);
  if (match) return `${match[1]} kg`;
  return pkg.unit === "mtr" ? "Fabric" : "Bag";
}

function PreviewCard({
  title,
  type,
  code,
  capacity,
  material,
  supplier,
  reorder,
  unit,
}: {
  title: string;
  type: string;
  code: string;
  capacity: string;
  material: string;
  supplier: string;
  reorder: string;
  unit: string;
}) {
  const unitLabel = UNIT_LABELS[unit] ?? unit;
  return (
    <div className="pkg-master-preview">
      <h3>
        <Icon name="package" size={14} /> {title}
      </h3>
      <div className="pkg-master-preview__visual">{capacity || "—"}</div>
      <div className="pkg-master-preview__row">
        <span className="k">Type</span>
        <span className="v">{type}</span>
      </div>
      <div className="pkg-master-preview__row">
        <span className="k">Code</span>
        <span className="v">{code}</span>
      </div>
      <div className="pkg-master-preview__row">
        <span className="k">Capacity</span>
        <span className="v">{capacity ? `${capacity} kg` : "—"}</span>
      </div>
      <div className="pkg-master-preview__row">
        <span className="k">Material</span>
        <span className="v">{material}</span>
      </div>
      <div className="pkg-master-preview__row">
        <span className="k">Supplier</span>
        <span className="v">{supplier}</span>
      </div>
      <div className="pkg-master-preview__row">
        <span className="k">Reorder</span>
        <span className="v">
          {reorder ? `${fmtNum(parseFloat(reorder) || 0)} ${unitLabel}` : "—"}
        </span>
      </div>
    </div>
  );
}

export default function PackagingMasterPage() {
  const router = useRouter();
  const DATA = useDATA();
  const { append, saving, error, clearError } = useEntityMutation();
  const form = useFormState(INITIAL);

  const packagingVendors = useMemo(() => {
    const packaging = DATA.VENDORS.filter((v) => v.category === "Packaging");
    const rest = DATA.VENDORS.filter((v) => v.category !== "Packaging");
    return [...packaging, ...rest];
  }, [DATA.VENDORS]);

  const sampleItems = useMemo(
    () =>
      DATA.PACKAGING.filter((p) => p.name.toLowerCase().includes("bag")).slice(
        0,
        2
      ),
    [DATA.PACKAGING]
  );

  const livePreview = useMemo(() => {
    const supplierName =
      DATA.VENDORS.find((v) => v.id === form.values.supplier)?.name ?? "—";
    return {
      title: form.values.capacity.trim()
        ? `Preview — ${form.values.capacity.trim()} kg bag`
        : "Live preview",
      type: form.values.packagingType.trim() || "—",
      code: form.values.bagCode.trim().toUpperCase() || "—",
      capacity: form.values.capacity.trim() || "—",
      material: form.values.materialType || "—",
      supplier: supplierName,
      reorder: form.values.reorderQty,
      unit: form.values.unit,
    };
  }, [form.values, DATA.VENDORS]);

  const validate = (): string | null => {
    const type = form.values.packagingType.trim();
    if (!type) return "Packaging type is required.";
    if (type.length > 120) return "Packaging type must be at most 120 characters.";

    let code = form.values.bagCode.trim().toUpperCase();
    if (!code) {
      code = nextPackagingCode(DATA.PACKAGING);
    } else if (!/^[A-Za-z0-9-]+$/.test(code)) {
      return "Bag code must be alphanumeric (hyphens allowed).";
    }
    if (
      DATA.PACKAGING.some((p) => p.code.toLowerCase() === code.toLowerCase())
    ) {
      return "Bag code already exists.";
    }

    if (form.values.capacity.trim()) {
      const capacity = parseFloat(form.values.capacity);
      if (Number.isNaN(capacity) || capacity < 0) {
        return "Capacity must be a number ≥ 0.";
      }
    }

    const minStock = form.values.minStock.trim()
      ? parseFloat(form.values.minStock)
      : 0;
    if (Number.isNaN(minStock) || minStock < 0) {
      return "Minimum stock must be a number ≥ 0.";
    }

    const reorder = form.values.reorderQty.trim()
      ? parseFloat(form.values.reorderQty)
      : 0;
    if (Number.isNaN(reorder) || reorder < 0) {
      return "Reorder quantity must be a number ≥ 0.";
    }

    if (form.values.notes.length > 500) {
      return "Notes must be at most 500 characters.";
    }

    return null;
  };

  const savePackaging = async (addAnother: boolean) => {
    clearError();
    const validationError = validate();
    if (validationError) {
      message.error(validationError);
      throw new Error(validationError);
    }

    const code =
      form.values.bagCode.trim().toUpperCase() ||
      nextPackagingCode(DATA.PACKAGING);
    const capacity = form.values.capacity.trim()
      ? parseFloat(form.values.capacity)
      : undefined;
    const minStock = form.values.minStock.trim()
      ? parseFloat(form.values.minStock)
      : 0;
    const reorder = form.values.reorderQty.trim()
      ? parseFloat(form.values.reorderQty)
      : 0;
    const stock = 0;
    const supplier = DATA.VENDORS.find((v) => v.id === form.values.supplier);

    await append("packaging", {
      code,
      name: buildName(form.values.packagingType, capacity ?? null),
      stock,
      unit: form.values.unit,
      reorder,
      minStock,
      capacity,
      gradeCompatibility: form.values.gradeCompatibility.trim(),
      supplier: supplier?.name ?? "",
      materialType: form.values.materialType,
      notes: form.values.notes.trim(),
      status: stockStatus(stock, reorder, minStock),
      trend: 0,
    });

    message.success("Packaging master saved.");

    if (addAnother) {
      form.reset({ ...INITIAL });
    } else {
      router.push("/inventory/packaging");
    }
  };

  return (
    <div className="pkg-master">
      <DashHead
        title="Packaging Master"
        sub="Create or edit packaging bag master records"
      >
        <Btn
          variant="secondary"
          size="sm"
          icon="menu"
          onClick={() => router.push("/inventory/packaging")}
        >
          Packaging list
        </Btn>
      </DashHead>

      <div className="pkg-master-layout">
        <div className="card">
          <div className="card-head">
            <div className="card-title">Packaging details</div>
          </div>
          <div className="card-body">
            <form
              className="pkg-master-form"
              onSubmit={(e) => {
                e.preventDefault();
                savePackaging(false).catch(() => {});
              }}
            >
              <div className="pkg-master-section">
                <div className="pkg-master-section-title">Basic information</div>
                <div className="pkg-master-row-2">
                  <div className="field">
                    <label className="field-label" htmlFor="packagingType">
                      Packaging type
                    </label>
                    <input
                      id="packagingType"
                      className="input"
                      value={form.values.packagingType}
                      onChange={(e) =>
                        form.setField("packagingType", e.target.value)
                      }
                      placeholder="e.g. HDPE Valve Bag"
                      maxLength={120}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="bagCode">
                      Bag code
                    </label>
                    <input
                      id="bagCode"
                      className="input"
                      value={form.values.bagCode}
                      onChange={(e) =>
                        form.setField("bagCode", e.target.value.toUpperCase())
                      }
                      placeholder="e.g. PB-001 (auto if blank)"
                    />
                  </div>
                </div>
                <div className="pkg-master-row-2">
                  <div className="field">
                    <label className="field-label" htmlFor="capacity">
                      Capacity (kg)
                    </label>
                    <input
                      id="capacity"
                      className="input"
                      type="number"
                      min={0}
                      step={0.1}
                      value={form.values.capacity}
                      onChange={(e) => form.setField("capacity", e.target.value)}
                      placeholder="e.g. 25"
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
                      <option value="pcs">Nos</option>
                      <option value="MT">MT</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="gradeCompatibility">
                    Grade compatibility
                  </label>
                  <input
                    id="gradeCompatibility"
                    className="input"
                    value={form.values.gradeCompatibility}
                    onChange={(e) =>
                      form.setField("gradeCompatibility", e.target.value)
                    }
                    placeholder="e.g. Industrial, Cosmetic, Food grade"
                  />
                </div>
              </div>

              <div className="pkg-master-section">
                <div className="pkg-master-section-title">Supplier & material</div>
                <div className="pkg-master-row-2">
                  <div className="field">
                    <label className="field-label" htmlFor="supplier">
                      Supplier
                    </label>
                    <select
                      id="supplier"
                      className="input"
                      value={form.values.supplier}
                      onChange={(e) => form.setField("supplier", e.target.value)}
                    >
                      <option value="">Select supplier</option>
                      {packagingVendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="materialType">
                      Material type
                    </label>
                    <select
                      id="materialType"
                      className="input"
                      value={form.values.materialType}
                      onChange={(e) =>
                        form.setField("materialType", e.target.value)
                      }
                    >
                      <option value="">Select type</option>
                      <option value="HDPE">HDPE</option>
                      <option value="LDPE">LDPE</option>
                      <option value="PP Woven">PP Woven</option>
                      <option value="Laminated">Laminated</option>
                      <option value="Paper">Paper</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pkg-master-section">
                <div className="pkg-master-section-title">Stock levels</div>
                <div className="pkg-master-row-2">
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
                    <label className="field-label" htmlFor="reorderQty">
                      Reorder quantity
                    </label>
                    <input
                      id="reorderQty"
                      className="input"
                      type="number"
                      min={0}
                      value={form.values.reorderQty}
                      onChange={(e) =>
                        form.setField("reorderQty", e.target.value)
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="notes">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    className="input pkg-master-textarea"
                    rows={2}
                    value={form.values.notes}
                    onChange={(e) => form.setField("notes", e.target.value)}
                    placeholder="Handling, storage, or special instructions"
                    maxLength={500}
                  />
                </div>
              </div>

              {error ? (
                <p style={{ color: "var(--danger)", fontSize: 12, margin: 0 }}>
                  {error}
                </p>
              ) : null}

              <div className="pkg-master-actions">
                <Btn
                  variant="primary"
                  size="sm"
                  icon="check"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save"}
                </Btn>
                <Btn
                  variant="secondary"
                  size="sm"
                  icon="plus"
                  type="button"
                  disabled={saving}
                  onClick={() => savePackaging(true).catch(() => {})}
                >
                  Save &amp; add new
                </Btn>
                <Btn
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => router.push("/inventory/packaging")}
                >
                  Cancel
                </Btn>
              </div>
            </form>
          </div>
        </div>

        <aside className="pkg-master-side">
          <PreviewCard {...livePreview} />
          {sampleItems.map((item) => (
            <PreviewCard
              key={item.code}
              title={`Sample — ${previewLabel(item)}`}
              type={item.name.split("·")[0]?.trim() || item.name}
              code={item.code}
              capacity={previewLabel(item).replace(" kg", "")}
              material={
                item.name.includes("PP")
                  ? "PP Woven"
                  : item.name.includes("BOPP")
                    ? "Laminated"
                    : "HDPE"
              }
              supplier={
                DATA.VENDORS.find((v) => v.category === "Packaging")?.name ??
                "—"
              }
              reorder={String(item.reorder)}
              unit={item.unit}
            />
          ))}
        </aside>
      </div>
    </div>
  );
}
