"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { message } from "antd";
import { Icon } from "@/components/erp/icons";
import { Btn, fmtINR } from "@/components/erp/ui";
import { DashHead } from "@/components/erp/dashboards";
import { useVendors } from "@/hooks/use-vendors";
import { useEntityMutation } from "@/hooks/use-entity-mutation";
import { useFormState } from "@/components/forms";

export type VendorFormValues = {
  vendorName: string;
  vendorCode: string;
  contactPerson: string;
  phone: string;
  email: string;
  gst: string;
  address: string;
  materialsSupplied: string;
  paymentTerms: string;
  leadTime: string;
  status: string;
};

const INITIAL: VendorFormValues = {
  vendorName: "",
  vendorCode: "",
  contactPerson: "",
  phone: "",
  email: "",
  gst: "",
  address: "",
  materialsSupplied: "",
  paymentTerms: "30",
  leadTime: "7",
  status: "active",
};

const PAYMENT_LABELS: Record<string, string> = {
  cod: "COD",
  "15": "15 days",
  "30": "30 days",
  "45": "45 days",
  "60": "60 days",
};

function renderStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(empty);
}

type VendorSnapshot = { rating: number; poCount: number; ytd: number };

type VendorFormProps =
  | { mode: "create" }
  | {
      mode: "edit" | "view";
      vendorId: string;
      initialValues: VendorFormValues;
      snapshot: VendorSnapshot;
    };

export function VendorForm(props: VendorFormProps) {
  const router = useRouter();
  const { items: vendors } = useVendors();
  const { createVendor, updateVendor, saving, error, clearError } = useEntityMutation();
  const isEdit = props.mode === "edit";
  const isView = props.mode === "view";
  const form = useFormState<VendorFormValues>(
    props.mode !== "create" ? props.initialValues : INITIAL,
  );

  const previewMaterials = useMemo(() => {
    const text = form.values.materialsSupplied.trim();
    if (!text) return "Enter materials supplied to preview";
    const items = text
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4);
    return items.length ? items.join(", ") : text;
  }, [form.values.materialsSupplied]);

  const validate = (): string | null => {
    const name = form.values.vendorName.trim();
    if (!name) return "Vendor name is required.";
    if (name.length > 120) return "Vendor name must be at most 120 characters.";

    if (!isEdit) {
      const code = form.values.vendorCode.trim().toUpperCase();
      if (code) {
        if (!/^[A-Za-z0-9-]+$/.test(code)) {
          return "Vendor code must be alphanumeric (hyphens allowed).";
        }
        if (vendors.some((v) => v.id.toLowerCase() === code.toLowerCase())) {
          return "Vendor code already exists.";
        }
      }
    }

    if (form.values.email.trim()) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.values.email.trim());
      if (!emailOk) return "Enter a valid email address.";
    }

    const leadTime = parseInt(form.values.leadTime, 10);
    if (Number.isNaN(leadTime) || leadTime < 1 || leadTime > 90) {
      return "Lead time must be between 1 and 90 days.";
    }

    return null;
  };

  const listHref = "/procurement/vendors";
  const cancelHref = props.mode !== "create" ? `${listHref}/${props.vendorId}` : listHref;

  const saveVendor = async (addAnother: boolean) => {
    if (isView) return;
    clearError();
    const validationError = validate();
    if (validationError) {
      message.error(validationError);
      throw new Error(validationError);
    }

    // city/category are derived server-side from address/materialsSupplied.
    const payload = {
      name: form.values.vendorName.trim(),
      contactPerson: form.values.contactPerson.trim(),
      phone: form.values.phone.trim(),
      email: form.values.email.trim(),
      gstin: form.values.gst.trim(),
      address: form.values.address.trim(),
      materialsSupplied: form.values.materialsSupplied.trim(),
      paymentTerms: form.values.paymentTerms,
      leadTime: parseInt(form.values.leadTime, 10) || 7,
      status: form.values.status,
    };

    if (isEdit) {
      await updateVendor(props.vendorId, payload);
      message.success("Vendor updated.");
      router.push(`${listHref}/${props.vendorId}`);
      return;
    }

    // vendor code is auto-allocated server-side when left blank.
    await createVendor({ id: form.values.vendorCode.trim().toUpperCase(), ...payload });
    message.success("Vendor master saved.");

    if (addAnother) {
      form.reset({ ...INITIAL });
    } else {
      router.push(listHref);
    }
  };

  const snapshot: VendorSnapshot =
    props.mode !== "create" ? props.snapshot : { rating: 0, poCount: 0, ytd: 0 };

  const title = isView
    ? form.values.vendorName || "Vendor"
    : isEdit
      ? "Edit Vendor"
      : "Vendor Master";
  const sub = isView
    ? props.vendorId
    : isEdit
      ? `Update vendor record — ${props.vendorId}`
      : "Create or edit vendor records";

  return (
    <div className="vendor-master">
      <DashHead title={title} sub={sub}>
        <Btn
          variant="secondary"
          size="sm"
          icon="menu"
          onClick={() => router.push(listHref)}
        >
          Vendor list
        </Btn>
        {isView ? (
          <Btn
            variant="primary"
            size="sm"
            icon="edit"
            onClick={() => router.push(`${listHref}/${props.vendorId}/edit`)}
          >
            Edit vendor
          </Btn>
        ) : null}
      </DashHead>

      <div className="vendor-master-layout">
        <div className="card">
          <div className="card-head">
            <div className="card-title">Vendor details</div>
          </div>
          <div className="card-body">
            <form
              className="vendor-master-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (isView) return;
                saveVendor(false).catch(() => {});
              }}
            >
              <div className="vendor-master-section">
                <div className="vendor-master-section-title">Basic information</div>
                <div className="vendor-master-row-2">
                  <div className="field">
                    <label className="field-label" htmlFor="vendorName">
                      Vendor name
                    </label>
                    <input
                      id="vendorName"
                      className="input"
                      value={form.values.vendorName}
                      disabled={isView}
                      onChange={(e) => form.setField("vendorName", e.target.value)}
                      placeholder="e.g. Minerals & Chemicals Ltd"
                      maxLength={120}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="vendorCode">
                      Vendor code
                    </label>
                    <input
                      id="vendorCode"
                      className="input"
                      value={form.values.vendorCode}
                      disabled={isEdit || isView}
                      onChange={(e) =>
                        form.setField("vendorCode", e.target.value.toUpperCase())
                      }
                      placeholder="e.g. V-001 (auto if blank)"
                      title={isEdit ? "Vendor code cannot be changed" : undefined}
                    />
                  </div>
                </div>
              </div>

              <div className="vendor-master-section">
                <div className="vendor-master-section-title">Contact</div>
                <div className="vendor-master-row-2">
                  <div className="field">
                    <label className="field-label" htmlFor="contactPerson">
                      Contact person
                    </label>
                    <input
                      id="contactPerson"
                      className="input"
                      value={form.values.contactPerson}
                      disabled={isView}
                      onChange={(e) => form.setField("contactPerson", e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="phone">
                      Phone
                    </label>
                    <input
                      id="phone"
                      className="input"
                      value={form.values.phone}
                      disabled={isView}
                      onChange={(e) => form.setField("phone", e.target.value)}
                      placeholder="e.g. 98765 43210"
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    className="input"
                    type="email"
                    value={form.values.email}
                    disabled={isView}
                    onChange={(e) => form.setField("email", e.target.value)}
                    placeholder="e.g. procurement@vendor.com"
                  />
                </div>
              </div>

              <div className="vendor-master-section">
                <div className="vendor-master-section-title">Tax & address</div>
                <div className="field">
                  <label className="field-label" htmlFor="gst">
                    GST / Tax ID
                  </label>
                  <input
                    id="gst"
                    className="input"
                    value={form.values.gst}
                    disabled={isView}
                    onChange={(e) => form.setField("gst", e.target.value.toUpperCase())}
                    placeholder="e.g. 24AABCT1234A1Z5"
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="address">
                    Address
                  </label>
                  <textarea
                    id="address"
                    className="input vendor-master-textarea"
                    rows={3}
                    value={form.values.address}
                    disabled={isView}
                    onChange={(e) => form.setField("address", e.target.value)}
                    placeholder="Full address — street, city, state, PIN"
                  />
                </div>
              </div>

              <div className="vendor-master-section">
                <div className="vendor-master-section-title">Supply & terms</div>
                <div className="field">
                  <label className="field-label" htmlFor="materialsSupplied">
                    Materials supplied
                  </label>
                  <textarea
                    id="materialsSupplied"
                    className="input vendor-master-textarea"
                    rows={2}
                    value={form.values.materialsSupplied}
                    disabled={isView}
                    onChange={(e) =>
                      form.setField("materialsSupplied", e.target.value)
                    }
                    placeholder="e.g. Talc, Calcium Carbonate, Kaolin Clay, Barytes"
                  />
                </div>
                <div className="vendor-master-row-2">
                  <div className="field">
                    <label className="field-label" htmlFor="paymentTerms">
                      Payment terms
                    </label>
                    <select
                      id="paymentTerms"
                      className="input"
                      value={form.values.paymentTerms}
                      disabled={isView}
                      onChange={(e) => form.setField("paymentTerms", e.target.value)}
                    >
                      <option value="">Select terms</option>
                      <option value="cod">COD</option>
                      <option value="15">15 days</option>
                      <option value="30">30 days</option>
                      <option value="45">45 days</option>
                      <option value="60">60 days</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="leadTime">
                      Lead time (days)
                    </label>
                    <input
                      id="leadTime"
                      className="input"
                      type="number"
                      min={1}
                      max={90}
                      value={form.values.leadTime}
                      disabled={isView}
                      onChange={(e) => form.setField("leadTime", e.target.value)}
                      placeholder="e.g. 7"
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="status">
                    Status
                  </label>
                  <select
                    id="status"
                    className="input"
                    value={form.values.status}
                    disabled={isView}
                    onChange={(e) => form.setField("status", e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {error ? (
                <p style={{ color: "var(--danger)", fontSize: 12, margin: 0 }}>
                  {error}
                </p>
              ) : null}

              {!isView ? (
                <div className="vendor-master-actions">
                  <Btn
                    variant="primary"
                    size="sm"
                    icon="check"
                    type="submit"
                    disabled={saving}
                  >
                    {saving ? "Saving…" : isEdit ? "Save changes" : "Save"}
                  </Btn>
                  {!isEdit ? (
                    <Btn
                      variant="secondary"
                      size="sm"
                      icon="plus"
                      type="button"
                      disabled={saving}
                      onClick={() => saveVendor(true).catch(() => {})}
                    >
                      Save &amp; add new
                    </Btn>
                  ) : null}
                  <Btn
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => router.push(cancelHref)}
                  >
                    Cancel
                  </Btn>
                </div>
              ) : null}
            </form>
          </div>
        </div>

        <aside className="vendor-master-side">
          <div className="vendor-master-rating">
            <h3>
              <Icon name="money" size={14} /> Vendor rating
            </h3>
            <div className="vendor-master-rating__stars">{renderStars(snapshot.rating)}</div>
            <div className="vendor-master-rating__value">
              {snapshot.rating > 0 ? snapshot.rating.toFixed(1) : "Not yet rated"}
            </div>
            <div className="vendor-master-rating__label">
              {isEdit || isView
                ? "Rating updates after completed orders"
                : "New vendor · rating starts after the first completed order"}
            </div>
          </div>

          <div className="vendor-master-snapshot">
            <h3>
              <Icon name="chart" size={14} /> Past supply snapshot
            </h3>
            <div className="vendor-master-snapshot__row">
              <span>Orders (last 12 months)</span>
              <span className="val">{snapshot.poCount}</span>
            </div>
            <div className="vendor-master-snapshot__row">
              <span>Total value</span>
              <span className="val">{fmtINR(snapshot.ytd)}</span>
            </div>
            <div className="vendor-master-snapshot__row">
              <span>On-time delivery</span>
              <span className="val">—</span>
            </div>
            <div className="vendor-master-snapshot__row">
              <span>Pending POs</span>
              <span className="val">0</span>
            </div>
            <div className="vendor-master-snapshot__row">
              <span>Payment terms</span>
              <span className="val">
                {PAYMENT_LABELS[form.values.paymentTerms] ?? "—"}
              </span>
            </div>
            <div className="vendor-master-snapshot__materials">
              Top materials: {previewMaterials}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
