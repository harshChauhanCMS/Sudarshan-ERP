"use client";

import { useEffect, useState } from "react";
import { message } from "antd";
import { Icon } from "@/components/erp/icons";
import { Btn } from "@/components/erp/ui";
import { DashHead } from "@/components/erp/dashboards";
import { useFieldVisits } from "@/hooks/use-field-visits";
import { useSessionUser } from "@/hooks/use-session-user";
import { FIELD_VISIT_TYPES, type FieldVisitType } from "@/lib/field-visit-types";

const COMPANY_OPTIONS = [
  { value: "smi", label: "Sudarshan Minerals & Industries (Udaipur)" },
  { value: "smic", label: "Sudarshan Microns" },
];

type EmployeeOption = { employeeId: string; fullName: string; workLocationType?: string };

function statusLabel(status: string) {
  return status.replace(/-/g, " ").toUpperCase();
}

export function FieldVisitLogPage() {
  const { user } = useSessionUser();
  const { visits, canCreate, loading, error, saving, reload, updateVisit } = useFieldVisits();
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const [form, setForm] = useState({
    assignedEmployeeId: "",
    company: "smi",
    visitDate: new Date().toISOString().slice(0, 10),
    visitType: "Customer" as FieldVisitType,
    partyName: "",
    locationText: "",
    startTime: "09:00",
    returnTime: "17:00",
    purpose: "",
    notes: "",
  });

  useEffect(() => {
    if (!canCreate) return;
    fetch("/api/hrms/employees")
      .then((r) => r.json())
      .then((json) => {
        const rows = (json.data ?? []) as EmployeeOption[];
        const list = Array.isArray(rows)
          ? rows.filter((e) => e.employeeId && e.fullName)
          : [];
        setEmployees(list);
        if (list[0] && !form.assignedEmployeeId) {
          setForm((f) => ({ ...f, assignedEmployeeId: list[0].employeeId }));
        }
      })
      .catch(() => {});
  }, [canCreate, form.assignedEmployeeId]);

  const myEmail = user?.email?.trim().toLowerCase();
  const myVisits = visits.filter(
    (v) => v.assignedEmployeeEmail === myEmail || v.assignedEmployeeId === user?.employeeId
  );
  const displayVisits = canCreate ? visits : myVisits;

  const createVisit = async () => {
    if (!form.assignedEmployeeId || !form.partyName.trim()) {
      message.error("Assign an employee and enter party name.");
      return;
    }
    try {
      const res = await fetch("/api/field-sales/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      message.success("Visit created and employee notified.");
      setForm((f) => ({ ...f, partyName: "", purpose: "", notes: "", locationText: "" }));
      await reload();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to create visit");
    }
  };

  const getLocation = (): Promise<{ lat: number; lng: number; accuracy?: number } | null> =>
    new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 12000 }
      );
    });

  const handleAccept = async (id: string) => {
    try {
      const location = await getLocation();
      await updateVisit(id, "accept", location ? { location } : undefined);
      message.success("Visit accepted.");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to accept");
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await updateVisit(id, "complete");
      message.success("Visit marked complete. Owner notified.");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to complete");
    }
  };

  const handleCancel = async () => {
    if (!cancelId || !cancelReason.trim()) {
      message.error("Enter a cancellation reason.");
      return;
    }
    try {
      await updateVisit(cancelId, "cancel", { reason: cancelReason.trim() });
      message.success("Visit cancelled. Owner notified.");
      setCancelId(null);
      setCancelReason("");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to cancel");
    }
  };

  return (
    <>
      <DashHead
        title="Field Visit Log"
        sub={
          canCreate
            ? "Schedule visits for employees — they receive a notification to accept"
            : "Your assigned field visits — accept, complete, or cancel"
        }
      >
        <Btn variant="secondary" size="sm" icon="refresh" onClick={() => void reload()}>
          Refresh
        </Btn>
      </DashHead>

      {loading ? <p style={{ color: "var(--fg-muted)", fontSize: 14 }}>Loading…</p> : null}
      {error ? <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p> : null}

      <div className="field-visit-log-page">
        <div className="field-visit-log-layout">
          {canCreate ? (
            <div className="field-beat-card field-visit-log-form-card">
              <div className="field-beat-card__head">New field visit (owner)</div>
              <div className="field-visit-log-form-body">
                <label className="field">
                  <span className="field-label">Assign employee</span>
                  <select
                    className="input"
                    value={form.assignedEmployeeId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, assignedEmployeeId: e.target.value }))
                    }
                  >
                    {employees.map((emp) => (
                      <option key={emp.employeeId} value={emp.employeeId}>
                        {emp.fullName} ({emp.employeeId})
                        {emp.workLocationType ? ` · ${emp.workLocationType}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Company</span>
                  <select
                    className="input"
                    value={form.company}
                    onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  >
                    {COMPANY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Visit date</span>
                  <input
                    className="input"
                    type="date"
                    value={form.visitDate}
                    onChange={(e) => setForm((f) => ({ ...f, visitDate: e.target.value }))}
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
                  >
                    {FIELD_VISIT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field field-visit-log-full">
                  <span className="field-label">Party name</span>
                  <input
                    className="input"
                    value={form.partyName}
                    onChange={(e) => setForm((f) => ({ ...f, partyName: e.target.value }))}
                    placeholder="Customer / vendor / contact"
                  />
                </label>
                <label className="field field-visit-log-full">
                  <span className="field-label">Location</span>
                  <input
                    className="input"
                    value={form.locationText}
                    onChange={(e) => setForm((f) => ({ ...f, locationText: e.target.value }))}
                    placeholder="Address or area"
                  />
                </label>
                <label className="field">
                  <span className="field-label">Start time</span>
                  <input
                    className="input"
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Expected return</span>
                  <input
                    className="input"
                    type="time"
                    value={form.returnTime}
                    onChange={(e) => setForm((f) => ({ ...f, returnTime: e.target.value }))}
                  />
                </label>
                <label className="field field-visit-log-full">
                  <span className="field-label">Purpose</span>
                  <input
                    className="input"
                    value={form.purpose}
                    onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
                  />
                </label>
                <div className="field-visit-log-actions">
                  <Btn variant="primary" onClick={() => void createVisit()} disabled={saving}>
                    Create visit & notify employee
                  </Btn>
                </div>
              </div>
            </div>
          ) : null}

          <div className="field-beat-card field-visit-log-recent-card">
            <div className="field-beat-card__head">
              {canCreate ? "All visits" : "My assigned visits"}
            </div>
            <div className="field-visit-log-recent-body">
              {displayVisits.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--fg-muted)" }}>No visits yet.</p>
              ) : (
                displayVisits.map((visit) => {
                  const isMine =
                    visit.assignedEmployeeEmail === myEmail ||
                    visit.assignedEmployeeId === user?.employeeId;
                  return (
                    <div key={visit.id} className="field-visit-log-recent-item">
                      <div className="field-visit-log-recent-item__top">
                        <span className="field-visit-log-recent-item__party">{visit.partyName}</span>
                        <span
                          className={`field-visit-log-type field-visit-log-type--${visit.visitType.toLowerCase()}`}
                        >
                          {statusLabel(visit.status)}
                        </span>
                      </div>
                      <p className="field-visit-log-recent-item__meta">
                        {visit.assignedEmployeeName} · {visit.visitDate} · {visit.locationText || "—"}
                      </p>
                      {visit.cancelReason ? (
                        <p className="field-visit-log-recent-item__meta" style={{ color: "var(--danger)" }}>
                          Cancelled: {visit.cancelReason}
                        </p>
                      ) : null}
                      {isMine && visit.status === "pending" ? (
                        <div className="dispatch-plan-row-actions" style={{ marginTop: 8 }}>
                          <Btn size="sm" variant="primary" onClick={() => void handleAccept(visit.id)} disabled={saving}>
                            Accept
                          </Btn>
                          <Btn
                            size="sm"
                            variant="secondary"
                            onClick={() => setCancelId(visit.id)}
                            disabled={saving}
                          >
                            Cancel
                          </Btn>
                        </div>
                      ) : null}
                      {isMine && (visit.status === "accepted" || visit.status === "in-progress") ? (
                        <div className="dispatch-plan-row-actions" style={{ marginTop: 8 }}>
                          <Btn size="sm" variant="primary" onClick={() => void handleComplete(visit.id)} disabled={saving}>
                            Mark complete
                          </Btn>
                          <Btn
                            size="sm"
                            variant="secondary"
                            onClick={() => setCancelId(visit.id)}
                            disabled={saving}
                          >
                            Cancel
                          </Btn>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {cancelId ? (
        <div className="card" style={{ marginTop: "1rem", padding: "1rem" }}>
          <div className="card-title" style={{ marginBottom: "0.75rem" }}>
            <Icon name="alert" size={14} /> Cancel visit
          </div>
          <label className="field">
            <span className="field-label">Reason for cancellation</span>
            <textarea
              className="input dispatch-plan-textarea"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Required — owner will be notified"
            />
          </label>
          <div className="dispatch-plan-row-actions" style={{ marginTop: 8 }}>
            <Btn variant="secondary" size="sm" onClick={() => { setCancelId(null); setCancelReason(""); }}>
              Back
            </Btn>
            <Btn variant="primary" size="sm" onClick={() => void handleCancel()} disabled={saving}>
              Confirm cancel
            </Btn>
          </div>
        </div>
      ) : null}
    </>
  );
}
