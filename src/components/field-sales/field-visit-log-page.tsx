"use client";

import { useState } from "react";
import { message } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { Icon } from "@/components/erp/icons";
import { Btn } from "@/components/erp/ui";
import { DashHead } from "@/components/erp/dashboards";
import { FieldVisitCreateForm } from "@/components/field-sales/field-visit-create-form";
import { FieldVisitDetailModal } from "@/components/field-sales/field-visit-detail-modal";
import { useFieldVisits } from "@/hooks/use-field-visits";
import { useSessionUser } from "@/hooks/use-session-user";
import {
  formatVisitDurationMinutes,
  getVisitAcceptToCloseMinutes,
  visitStatusBadgeClass,
  visitStatusLabel,
} from "@/lib/field-visit-display";
import type { FieldVisitView } from "@/lib/field-visit-types";

export function FieldVisitLogPage() {
  const { user } = useSessionUser();
  const { visits, canCreate, loading, error, saving, reload, updateVisit } = useFieldVisits();
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [viewVisit, setViewVisit] = useState<FieldVisitView | null>(null);

  const handleRefresh = async () => {
    await reload();
    message.success("Refreshed");
  };

  const myEmail = user?.email?.trim().toLowerCase();
  const myVisits = visits.filter(
    (v) => v.assignedEmployeeEmail === myEmail || v.assignedEmployeeId === user?.employeeId
  );
  const displayVisits = canCreate ? visits : myVisits;

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
        <Btn
          variant="secondary"
          size="sm"
          icon={loading ? undefined : "refresh"}
          disabled={loading}
          onClick={() => void handleRefresh()}
        >
          {loading ? <LoadingOutlined spin /> : null} {loading ? "Refreshing…" : "Refresh"}
        </Btn>
      </DashHead>

      <FieldVisitDetailModal visit={viewVisit} onClose={() => setViewVisit(null)} />

      {loading ? <p style={{ color: "var(--fg-muted)", fontSize: 14 }}>Loading…</p> : null}
      {error ? <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p> : null}

      <div className="field-visit-log-page">
        <div className="field-visit-log-layout">
          {canCreate ? (
            <div className="field-beat-card field-visit-log-form-card">
              <div className="field-beat-card__head">New field visit</div>
              <div className="field-visit-log-form-body">
                <FieldVisitCreateForm onSuccess={() => void reload()} />
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
                          className={`field-activity-badge field-activity-badge--${visitStatusBadgeClass(visit.status)}`}
                        >
                          {visitStatusLabel(visit.status)}
                        </span>
                      </div>
                      <p className="field-visit-log-recent-item__meta">
                        {visit.assignedEmployeeName} · {visit.visitDate} · {visit.locationText || "—"}
                      </p>
                      {getVisitAcceptToCloseMinutes(visit) != null ? (
                        <p className="field-visit-log-recent-item__meta">
                          Duration: {formatVisitDurationMinutes(getVisitAcceptToCloseMinutes(visit))}
                        </p>
                      ) : null}
                      <div className="dispatch-plan-row-actions" style={{ marginTop: 8 }}>
                        <Btn
                          size="sm"
                          variant="secondary"
                          icon="eye"
                          onClick={() => setViewVisit(visit)}
                        >
                          View
                        </Btn>
                        {isMine && visit.status === "pending" && !visit.selfInitiated ? (
                          <Btn size="sm" variant="primary" onClick={() => void handleAccept(visit.id)} disabled={saving}>
                            Accept
                          </Btn>
                        ) : null}
                        {isMine && (visit.status === "accepted" || visit.status === "in-progress") ? (
                          <Btn size="sm" variant="primary" onClick={() => void handleComplete(visit.id)} disabled={saving}>
                            Mark complete
                          </Btn>
                        ) : null}
                        {isMine &&
                        (visit.status === "pending" ||
                          visit.status === "accepted" ||
                          visit.status === "in-progress") ? (
                          <Btn
                            size="sm"
                            variant="secondary"
                            onClick={() => setCancelId(visit.id)}
                            disabled={saving}
                          >
                            Cancel
                          </Btn>
                        ) : null}
                      </div>
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
