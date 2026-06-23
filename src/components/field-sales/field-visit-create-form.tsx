"use client";

import { useEffect, useState } from "react";
import { message } from "antd";
import { Icon } from "@/components/erp/icons";
import { Btn } from "@/components/erp/ui";
import {
  defaultFieldVisitForm,
  FIELD_VISIT_COMPANY_OPTIONS,
  FIELD_VISIT_TYPES,
  type FieldVisitFormState,
  type FieldVisitType,
} from "@/lib/field-visit-form";

type EmployeeOption = { employeeId: string; fullName: string; workLocationType?: string };

type Props = {
  onSuccess?: () => void;
  onCancel?: () => void;
  submitLabel?: string;
  showCancel?: boolean;
};

export function FieldVisitCreateForm({
  onSuccess,
  onCancel,
  submitLabel = "Assign visit & notify employee",
  showCancel = false,
}: Props) {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [form, setForm] = useState<FieldVisitFormState>(defaultFieldVisitForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/hrms/employees")
      .then((r) => r.json())
      .then((json) => {
        const rows = (json.data ?? []) as EmployeeOption[];
        const list = Array.isArray(rows)
          ? rows.filter((e) => e.employeeId && e.fullName)
          : [];
        setEmployees(list);
        if (list[0]) {
          setForm((f) =>
            f.assignedEmployeeId ? f : { ...f, assignedEmployeeId: list[0].employeeId },
          );
        }
      })
      .catch(() => {});
  }, []);

  const selectedEmployee = employees.find((e) => e.employeeId === form.assignedEmployeeId);

  const createVisit = async () => {
    if (!form.assignedEmployeeId || !form.partyName.trim()) {
      message.error("Select an employee and enter party name.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/field-sales/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      message.success("Visit assigned. Employee notified with full details.");
      setForm((f) => ({
        ...defaultFieldVisitForm(),
        assignedEmployeeId: f.assignedEmployeeId,
        company: f.company,
        visitDate: f.visitDate,
        startTime: f.startTime,
        returnTime: f.returnTime,
      }));
      onSuccess?.();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to create visit");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="field-visit-create-form">
      <label className="field">
        <span className="field-label">Employee name</span>
        <select
          className="input"
          value={form.assignedEmployeeId}
          onChange={(e) => setForm((f) => ({ ...f, assignedEmployeeId: e.target.value }))}
          disabled={saving}
        >
          {employees.length === 0 ? (
            <option value="">Loading employees…</option>
          ) : (
            employees.map((emp) => (
              <option key={emp.employeeId} value={emp.employeeId}>
                {emp.fullName}
                {emp.workLocationType ? ` · ${emp.workLocationType}` : ""}
              </option>
            ))
          )}
        </select>
      </label>

      {selectedEmployee ? (
        <p style={{ margin: "-6px 0 0", fontSize: 12, color: "var(--fg-muted)" }}>
          ID: {selectedEmployee.employeeId}
        </p>
      ) : null}

      <label className="field">
        <span className="field-label">Current company</span>
        <select
          className="input"
          value={form.company}
          onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
          disabled={saving}
        >
          {FIELD_VISIT_COMPANY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label className="field">
          <span className="field-label">Date</span>
          <input
            className="input"
            type="date"
            value={form.visitDate}
            onChange={(e) => setForm((f) => ({ ...f, visitDate: e.target.value }))}
            disabled={saving}
          />
        </label>
        <label className="field">
          <span className="field-label">Visit type</span>
          <select
            className="input"
            value={form.visitType}
            onChange={(e) =>
              setForm((f) => ({ ...f, visitType: e.target.value as FieldVisitType }))
            }
            disabled={saving}
          >
            {FIELD_VISIT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="field field-visit-log-full">
        <span className="field-label">Party name</span>
        <input
          className="input"
          value={form.partyName}
          onChange={(e) => setForm((f) => ({ ...f, partyName: e.target.value }))}
          placeholder="Customer / vendor / contact name"
          disabled={saving}
        />
      </label>

      <label className="field field-visit-log-full">
        <span className="field-label">Location</span>
        <input
          className="input"
          value={form.locationText}
          onChange={(e) => setForm((f) => ({ ...f, locationText: e.target.value }))}
          placeholder="Address or area (e.g. Kota, Industrial Area)"
          disabled={saving}
        />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label className="field">
          <span className="field-label">Start time</span>
          <input
            className="input"
            type="time"
            value={form.startTime}
            onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
            disabled={saving}
          />
        </label>
        <label className="field">
          <span className="field-label">Expected return time</span>
          <input
            className="input"
            type="time"
            value={form.returnTime}
            onChange={(e) => setForm((f) => ({ ...f, returnTime: e.target.value }))}
            disabled={saving}
          />
        </label>
      </div>

      <label className="field field-visit-log-full">
        <span className="field-label">Purpose of visit</span>
        <input
          className="input"
          value={form.purpose}
          onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
          placeholder="e.g. Follow-up on order, rate discussion, sample delivery"
          disabled={saving}
        />
      </label>

      <label className="field field-visit-log-full">
        <span className="field-label">Notes</span>
        <textarea
          className="input dispatch-plan-textarea"
          rows={3}
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Any additional notes..."
          disabled={saving}
        />
      </label>

      <div className="field-visit-log-gps-note">
        <Icon name="pin" size={14} />
        <div>
          <div className="field-visit-log-gps-note__title">Location capture</div>
          <p>
            When the assigned employee taps <strong>Accept</strong> on mobile or web, their GPS
            location is captured (with permission). You can also enter the visit location above.
          </p>
        </div>
      </div>

      <div className="field-visit-log-actions">
        {showCancel ? (
          <Btn variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
            Cancel
          </Btn>
        ) : null}
        <Btn variant="primary" size="sm" icon="pin" onClick={() => void createVisit()} disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </Btn>
      </div>
    </div>
  );
}
