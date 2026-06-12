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
import { nextCustomerId } from "@/lib/id-generators";

const INITIAL = {
  customerName: "",
  customerCode: "",
  industryType: "",
  contactPerson: "",
  phone: "",
  email: "",
  billingAddress: "",
  dispatchAddress: "",
  preferredGrades: "",
  paymentTerms: "30",
  notes: "",
};

const INDUSTRY_LABELS: Record<string, string> = {
  paint: "Paint",
  paper: "Paper",
  cosmetic: "Cosmetic",
  detergent: "Detergent",
  other: "Other",
};

const PAYMENT_LABELS: Record<string, string> = {
  cod: "COD",
  "15": "15 days",
  "30": "30 days",
  "45": "45 days",
  "60": "60 days",
};

const PAYMENT_TO_TERMS: Record<string, string> = {
  cod: "COD",
  "15": "Net 15",
  "30": "Net 30",
  "45": "Net 45",
  "60": "Net 60",
};

function cityFromAddress(address: string): string {
  const line = address.trim().split("\n")[0] || address.trim();
  const parts = line.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return parts.slice(-2).join(", ");
  return parts[0] || "—";
}

function shortAddress(address: string, fallback: string): string {
  const text = address.trim();
  if (!text) return fallback;
  const line = text.split("\n")[0]?.trim() || text;
  return line.length > 42 ? `${line.slice(0, 39)}…` : line;
}

export default function CustomerMasterPage() {
  const router = useRouter();
  const DATA = useDATA();
  const { append, saving, error, clearError } = useEntityMutation();
  const form = useFormState(INITIAL);

  const preview = useMemo(
    () => ({
      name: form.values.customerName.trim() || "Customer name",
      code: form.values.customerCode.trim().toUpperCase() || "Auto code",
      industry:
        INDUSTRY_LABELS[form.values.industryType] ||
        (form.values.industryType ? form.values.industryType : "—"),
      contact: form.values.contactPerson.trim() || "—",
      phone: form.values.phone.trim() || "—",
      payment: PAYMENT_LABELS[form.values.paymentTerms] ?? "—",
      grades: form.values.preferredGrades.trim() || "—",
      billing: shortAddress(form.values.billingAddress, "—"),
      dispatch: form.values.dispatchAddress.trim()
        ? shortAddress(form.values.dispatchAddress, "As per order")
        : form.values.billingAddress.trim()
          ? "Same as billing"
          : "As per order",
    }),
    [form.values]
  );

  const validate = (): string | null => {
    const name = form.values.customerName.trim();
    if (!name) return "Customer name is required.";
    if (name.length > 120) return "Customer name must be at most 120 characters.";

    let code = form.values.customerCode.trim().toUpperCase();
    if (!code) {
      code = nextCustomerId(DATA.CUSTOMERS);
    } else if (!/^[A-Za-z0-9-]+$/.test(code)) {
      return "Customer code must be alphanumeric (hyphens allowed).";
    }
    if (DATA.CUSTOMERS.some((c) => c.id.toLowerCase() === code.toLowerCase())) {
      return "Customer code already exists.";
    }

    if (form.values.email.trim()) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.values.email.trim());
      if (!emailOk) return "Enter a valid email address.";
    }

    if (form.values.notes.length > 500) {
      return "Notes must be at most 500 characters.";
    }

    return null;
  };

  const saveCustomer = async (addAnother: boolean) => {
    clearError();
    const validationError = validate();
    if (validationError) {
      message.error(validationError);
      throw new Error(validationError);
    }

    const code =
      form.values.customerCode.trim().toUpperCase() ||
      nextCustomerId(DATA.CUSTOMERS);
    const billingAddress = form.values.billingAddress.trim();
    const dispatchAddress = form.values.dispatchAddress.trim();
    const paymentTerms = form.values.paymentTerms;

    await append("customers", {
      id: code,
      name: form.values.customerName.trim(),
      city: cityFromAddress(billingAddress),
      orders: 0,
      ytd: 0,
      terms: PAYMENT_TO_TERMS[paymentTerms] ?? "Net 30",
      status: "active",
      contact: form.values.contactPerson.trim(),
      phone: form.values.phone.trim(),
      email: form.values.email.trim(),
      industryType: form.values.industryType,
      billingAddress,
      dispatchAddress,
      preferredGrades: form.values.preferredGrades.trim(),
      paymentTerms,
      notes: form.values.notes.trim(),
    });

    message.success("Customer master saved.");

    if (addAnother) {
      form.reset({ ...INITIAL });
    } else {
      router.push("/customers");
    }
  };

  return (
    <div className="cust-master">
      <DashHead title="Customer Master" sub="Create or edit customer records">
        <Btn
          variant="secondary"
          size="sm"
          icon="menu"
          onClick={() => router.push("/customers")}
        >
          Customer list
        </Btn>
      </DashHead>

      <div className="cust-master-layout">
        <div className="card">
          <div className="card-head">
            <div className="card-title">Customer details</div>
          </div>
          <div className="card-body">
            <form
              className="cust-master-form"
              onSubmit={(e) => {
                e.preventDefault();
                saveCustomer(false).catch(() => {});
              }}
            >
              <div className="cust-master-section">
                <div className="cust-master-section-title">Basic information</div>
                <div className="cust-master-row-2">
                  <div className="field">
                    <label className="field-label" htmlFor="customerName">
                      Customer name
                    </label>
                    <input
                      id="customerName"
                      className="input"
                      value={form.values.customerName}
                      onChange={(e) =>
                        form.setField("customerName", e.target.value)
                      }
                      placeholder="e.g. Asian Paints Ltd"
                      maxLength={120}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="customerCode">
                      Customer code
                    </label>
                    <input
                      id="customerCode"
                      className="input"
                      value={form.values.customerCode}
                      onChange={(e) =>
                        form.setField("customerCode", e.target.value.toUpperCase())
                      }
                      placeholder="e.g. C-007 (auto if blank)"
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="industryType">
                    Industry type
                  </label>
                  <select
                    id="industryType"
                    className="input"
                    value={form.values.industryType}
                    onChange={(e) =>
                      form.setField("industryType", e.target.value)
                    }
                  >
                    <option value="">Select industry</option>
                    <option value="paint">Paint</option>
                    <option value="paper">Paper</option>
                    <option value="cosmetic">Cosmetic</option>
                    <option value="detergent">Detergent</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="cust-master-section">
                <div className="cust-master-section-title">Contact</div>
                <div className="cust-master-row-2">
                  <div className="field">
                    <label className="field-label" htmlFor="contactPerson">
                      Contact person
                    </label>
                    <input
                      id="contactPerson"
                      className="input"
                      value={form.values.contactPerson}
                      onChange={(e) =>
                        form.setField("contactPerson", e.target.value)
                      }
                      placeholder="e.g. Procurement Manager"
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
                      onChange={(e) => form.setField("phone", e.target.value)}
                      placeholder="e.g. 022-XXXX XXXX"
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
                    onChange={(e) => form.setField("email", e.target.value)}
                    placeholder="e.g. procurement@company.com"
                  />
                </div>
              </div>

              <div className="cust-master-section">
                <div className="cust-master-section-title">Addresses</div>
                <div className="field">
                  <label className="field-label" htmlFor="billingAddress">
                    Billing address
                  </label>
                  <textarea
                    id="billingAddress"
                    className="input cust-master-textarea"
                    rows={2}
                    value={form.values.billingAddress}
                    onChange={(e) =>
                      form.setField("billingAddress", e.target.value)
                    }
                    placeholder="Street, city, state, PIN"
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="dispatchAddress">
                    Dispatch address
                  </label>
                  <textarea
                    id="dispatchAddress"
                    className="input cust-master-textarea"
                    rows={2}
                    value={form.values.dispatchAddress}
                    onChange={(e) =>
                      form.setField("dispatchAddress", e.target.value)
                    }
                    placeholder="Same as billing or different delivery address"
                  />
                </div>
              </div>

              <div className="cust-master-section">
                <div className="cust-master-section-title">Terms & notes</div>
                <div className="field">
                  <label className="field-label" htmlFor="preferredGrades">
                    Preferred material grades
                  </label>
                  <input
                    id="preferredGrades"
                    className="input"
                    value={form.values.preferredGrades}
                    onChange={(e) =>
                      form.setField("preferredGrades", e.target.value)
                    }
                    placeholder="e.g. Industrial, Paint Grade, Cosmetic"
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="paymentTerms">
                    Payment terms
                  </label>
                  <select
                    id="paymentTerms"
                    className="input"
                    value={form.values.paymentTerms}
                    onChange={(e) =>
                      form.setField("paymentTerms", e.target.value)
                    }
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
                  <label className="field-label" htmlFor="notes">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    className="input cust-master-textarea"
                    rows={2}
                    value={form.values.notes}
                    onChange={(e) => form.setField("notes", e.target.value)}
                    placeholder="Credit limit, special instructions, etc."
                    maxLength={500}
                  />
                </div>
              </div>

              {error ? (
                <p style={{ color: "var(--danger)", fontSize: 12, margin: 0 }}>
                  {error}
                </p>
              ) : null}

              <div className="cust-master-actions">
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
                  onClick={() => saveCustomer(true).catch(() => {})}
                >
                  Save &amp; add new
                </Btn>
                <Btn
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => router.push("/customers")}
                >
                  Cancel
                </Btn>
              </div>
            </form>
          </div>
        </div>

        <aside className="cust-master-profile">
          <h3>
            <Icon name="badge" size={14} /> Customer profile preview
          </h3>
          <div className="cust-master-profile__name">{preview.name}</div>
          <div className="cust-master-profile__code">{preview.code}</div>
          <div className="cust-master-profile__row">
            <span className="k">Industry</span>
            <span className="v">{preview.industry}</span>
          </div>
          <div className="cust-master-profile__row">
            <span className="k">Contact</span>
            <span className="v">{preview.contact}</span>
          </div>
          <div className="cust-master-profile__row">
            <span className="k">Phone</span>
            <span className="v">{preview.phone}</span>
          </div>
          <div className="cust-master-profile__row">
            <span className="k">Payment terms</span>
            <span className="v">{preview.payment}</span>
          </div>
          <div className="cust-master-profile__row">
            <span className="k">Preferred grades</span>
            <span className="v">{preview.grades}</span>
          </div>
          <div className="cust-master-profile__row">
            <span className="k">Billing</span>
            <span className="v">{preview.billing}</span>
          </div>
          <div className="cust-master-profile__row">
            <span className="k">Dispatch</span>
            <span className="v">{preview.dispatch}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
