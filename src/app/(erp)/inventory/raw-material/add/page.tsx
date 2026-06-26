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

const CATEGORY_LABELS: Record<string, string> = {
  minerals: "Minerals",
  pigments: "Pigments",
  fillers: "Fillers",
  additives: "Additives",
};

const INITIAL = {
  materialName: "",
  materialCode: "",
  grade: "",
  category: "",
  uom: "MT",
  preferredVendor: "",
  minStock: "",
  reorderLevel: "",
  storageLocation: "",
  notes: "",
};

function stockStatus(stock: number, reorder: number, minStock: number): string {
  if (minStock > 0 && stock <= minStock) return "critical";
  if (reorder > 0 && stock < reorder) return "low";
  return "ok";
}

export default function RawMaterialMasterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editCode = searchParams.get("code")?.trim() ?? "";
  const DATA = useDATA();
  const { append, update, saving, error, clearError } = useEntityMutation();
  const form = useFormState(INITIAL);

  const editing = useMemo(
    () =>
      editCode
        ? DATA.RAW_MATERIALS.find(
            (r) => r.code.toLowerCase() === editCode.toLowerCase()
          ) ?? null
        : null,
    [DATA.RAW_MATERIALS, editCode]
  );

  useEffect(() => {
    if (!editCode) return;
    if (!editing) {
      message.error(`Material "${editCode}" not found.`);
      router.replace("/inventory/raw-material");
      return;
    }
    const vendor = DATA.VENDORS.find((v) => v.name === editing.preferredVendor);
    form.setValues({
      materialName: editing.name,
      materialCode: editing.code,
      grade: editing.grade === "—" ? "" : editing.grade,
      category: editing.category ?? "",
      uom: editing.unit,
      preferredVendor: vendor?.id ?? "",
      minStock: editing.minStock != null ? String(editing.minStock) : "",
      reorderLevel: String(editing.reorder),
      storageLocation: editing.location === "—" ? "" : editing.location,
      notes: editing.notes ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once when edit target resolves
  }, [editCode, editing?.code]);

  const recentMaterials = useMemo(
    () => [...DATA.RAW_MATERIALS].slice(-6).reverse(),
    [DATA.RAW_MATERIALS]
  );

  const validate = (): string | null => {
    const name = form.values.materialName.trim();
    const code = form.values.materialCode.trim();
    if (!name) return "Material name is required.";
    if (name.length > 100) return "Material name must be at most 100 characters.";
    if (!code) return "Material code is required.";
    if (!/^[A-Za-z0-9-]+$/.test(code)) {
      return "Material code must be alphanumeric (hyphens allowed).";
    }
    if (
      DATA.RAW_MATERIALS.some(
        (r) =>
          r.code.toLowerCase() === code.toLowerCase() &&
          r.code.toLowerCase() !== editing?.code.toLowerCase()
      )
    ) {
      return "Material code already exists.";
    }
    if (!form.values.category) return "Category is required.";
    if (!form.values.uom) return "Unit of measure is required.";
    const reorder = parseFloat(form.values.reorderLevel);
    if (Number.isNaN(reorder) || reorder < 0) {
      return "Reorder level must be a number ≥ 0.";
    }
    const minStock = form.values.minStock.trim()
      ? parseFloat(form.values.minStock)
      : 0;
    if (Number.isNaN(minStock) || minStock < 0) {
      return "Minimum stock level must be a number ≥ 0.";
    }
    if (form.values.notes.length > 500) {
      return "Notes must be at most 500 characters.";
    }
    return null;
  };

  const saveMaterial = async (addAnother: boolean) => {
    clearError();
    const validationError = validate();
    if (validationError) {
      message.error(validationError);
      throw new Error(validationError);
    }

    const reorder = parseFloat(form.values.reorderLevel) || 0;
    const minStock = form.values.minStock.trim()
      ? parseFloat(form.values.minStock)
      : 0;
    const vendor = DATA.VENDORS.find((v) => v.id === form.values.preferredVendor);

    if (editing) {
      const stock = editing.stock;
      await update(
        "rawMaterials",
        editing.code,
        {
          name: form.values.materialName.trim(),
          grade: form.values.grade.trim() || "—",
          unit: form.values.uom,
          reorder,
          minStock,
          location: form.values.storageLocation.trim() || "—",
          category: form.values.category,
          preferredVendor: vendor?.name ?? "",
          notes: form.values.notes.trim(),
          status: stockStatus(stock, reorder, minStock),
        },
        "code"
      );
      message.success("Raw material updated.");
      if (!addAnother) {
        router.push("/inventory/raw-material");
      }
      return;
    }

    const stock = 0;

    await append("rawMaterials", {
      code: form.values.materialCode.trim().toUpperCase(),
      name: form.values.materialName.trim(),
      grade: form.values.grade.trim() || "—",
      stock,
      unit: form.values.uom,
      reorder,
      minStock,
      value: 0,
      location: form.values.storageLocation.trim() || "—",
      category: form.values.category,
      preferredVendor: vendor?.name ?? "",
      notes: form.values.notes.trim(),
      status: stockStatus(stock, reorder, minStock),
      trend: 0,
    });

    message.success("Raw material master saved.");

    if (addAnother) {
      form.reset({ ...INITIAL, uom: "MT" });
    } else {
      router.push("/inventory/raw-material");
    }
  };

  return (
    <>
      <DashHead
        title={editing ? "Edit Raw Material" : "Raw Material Master"}
        sub={
          editing
            ? `Update master record · ${editing.code}`
            : "Add or edit raw material master records"
        }
      >
        <Btn
          variant="secondary"
          size="sm"
          icon="menu"
          onClick={() => router.push("/inventory/raw-material")}
        >
          View list
        </Btn>
      </DashHead>

      <div className="rm-master-layout">
        <div className="card">
          <div className="card-head">
            <div className="card-title">Material details</div>
            <span className="muted" style={{ fontSize: 12 }}>* Required fields</span>
          </div>
          <div className="card-body">
            <form
              className="rm-master-form"
              onSubmit={(e) => {
                e.preventDefault();
                saveMaterial(false).catch(() => {});
              }}
            >
              <div className="rm-master-section">
                <div className="rm-master-section-title">Basic information</div>
                <div className="rm-master-row-2">
                  <div className="field">
                    <label className="field-label" htmlFor="materialName">
                      Material Name
                    </label>
                    <input
                      id="materialName"
                      className="input"
                      value={form.values.materialName}
                      onChange={(e) => form.setField("materialName", e.target.value)}
                      placeholder="e.g. Talc (Soapstone)"
                      maxLength={100}
                    />
                    <span className="rm-master-hint rm-master-hint--req">
                      Required. Max 100 characters.
                    </span>
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="materialCode">
                      Material Code
                    </label>
                    <input
                      id="materialCode"
                      className="input"
                      value={form.values.materialCode}
                      onChange={(e) =>
                        form.setField("materialCode", e.target.value.toUpperCase())
                      }
                      placeholder="e.g. TM-001"
                      readOnly={!!editing}
                      disabled={!!editing}
                    />
                    <span className="rm-master-hint rm-master-hint--req">
                      Unique code. Alphanumeric.
                    </span>
                  </div>
                </div>
                <div className="rm-master-row-2">
                  <div className="field">
                    <label className="field-label" htmlFor="grade">
                      Grade
                    </label>
                    <input
                      id="grade"
                      className="input"
                      value={form.values.grade}
                      onChange={(e) => form.setField("grade", e.target.value)}
                      placeholder="e.g. Industrial, Cosmetic"
                    />
                    <span className="rm-master-hint">
                      Optional. Product grade or specification.
                    </span>
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
                      <option value="minerals">Minerals</option>
                      <option value="pigments">Pigments</option>
                      <option value="fillers">Fillers</option>
                      <option value="additives">Additives</option>
                    </select>
                    <span className="rm-master-hint rm-master-hint--req">
                      Select a category.
                    </span>
                  </div>
                </div>
              </div>

              <div className="rm-master-section">
                <div className="rm-master-section-title">Measurement & vendor</div>
                <div className="rm-master-row-2">
                  <div className="field">
                    <label className="field-label" htmlFor="uom">
                      Unit of Measure
                    </label>
                    <select
                      id="uom"
                      className="input"
                      value={form.values.uom}
                      onChange={(e) => form.setField("uom", e.target.value)}
                    >
                      <option value="">Select unit</option>
                      <option value="MT">MT (Metric Tonne)</option>
                      <option value="KG">KG</option>
                      <option value="L">Litre</option>
                      <option value="NOS">Nos</option>
                    </select>
                    <span className="rm-master-hint rm-master-hint--req">
                      Default: MT.
                    </span>
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="preferredVendor">
                      Preferred Vendor
                    </label>
                    <select
                      id="preferredVendor"
                      className="input"
                      value={form.values.preferredVendor}
                      onChange={(e) =>
                        form.setField("preferredVendor", e.target.value)
                      }
                    >
                      <option value="">Select vendor</option>
                      {DATA.VENDORS.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                    <span className="rm-master-hint">
                      Optional. Default vendor for PO.
                    </span>
                  </div>
                </div>
              </div>

              <div className="rm-master-section">
                <div className="rm-master-section-title">Stock levels</div>
                <div className="rm-master-row-2">
                  <div className="field">
                    <label className="field-label" htmlFor="minStock">
                      Minimum Stock Level
                    </label>
                    <input
                      id="minStock"
                      className="input"
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.values.minStock}
                      onChange={(e) => form.setField("minStock", e.target.value)}
                      placeholder="0"
                    />
                    <span className="rm-master-hint">
                      Numeric. Min 0. Triggers critical alert below this.
                    </span>
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="reorderLevel">
                      Reorder Level
                    </label>
                    <input
                      id="reorderLevel"
                      className="input"
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.values.reorderLevel}
                      onChange={(e) =>
                        form.setField("reorderLevel", e.target.value)
                      }
                      placeholder="0"
                    />
                    <span className="rm-master-hint rm-master-hint--req">
                      Numeric. Min 0. Reorder alert when stock &lt; this.
                    </span>
                  </div>
                </div>
              </div>

              <div className="rm-master-section">
                <div className="rm-master-section-title">Storage & notes</div>
                <div className="field">
                  <label className="field-label" htmlFor="storageLocation">
                    Storage Location
                  </label>
                  <input
                    id="storageLocation"
                    className="input"
                    value={form.values.storageLocation}
                    onChange={(e) =>
                      form.setField("storageLocation", e.target.value)
                    }
                    placeholder="e.g. Warehouse A, Bay 3"
                  />
                  <span className="rm-master-hint">
                    Optional. Warehouse or bay reference.
                  </span>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="notes">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    className="input rm-master-textarea"
                    rows={3}
                    maxLength={500}
                    value={form.values.notes}
                    onChange={(e) => form.setField("notes", e.target.value)}
                    placeholder="Internal notes, handling instructions, etc."
                  />
                  <span className="rm-master-hint">
                    Optional. Max 500 characters.
                  </span>
                </div>
              </div>

              {error ? (
                <p style={{ color: "var(--danger)", fontSize: 12, margin: 0 }}>
                  {error}
                </p>
              ) : null}

              <div className="rm-master-actions">
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
                    onClick={() => saveMaterial(true).catch(() => {})}
                  >
                    Save &amp; Add New
                  </Btn>
                ) : null}
                <Btn
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => form.reset({ ...INITIAL, uom: "MT" })}
                >
                  Reset
                </Btn>
              </div>
            </form>
          </div>
        </div>

        <aside className="rm-master-side">
          <div className="rm-master-side__head">
            <Icon name="clock" size={14} /> Recently added materials
          </div>
          <ul className="rm-master-side__list">
            {recentMaterials.length === 0 ? (
              <li className="rm-master-side__empty">No materials yet.</li>
            ) : (
              recentMaterials.map((r) => (
                <li key={r.code}>
                  <span className="rm-master-side__code">{r.code}</span>
                  <span className="rm-master-side__name">{r.name}</span>
                  <span className="rm-master-side__meta">
                    {CATEGORY_LABELS[r.category ?? ""] ?? r.grade} · {r.unit} ·
                    Reorder: {r.reorder}
                  </span>
                </li>
              ))
            )}
          </ul>
        </aside>
      </div>
    </>
  );
}
