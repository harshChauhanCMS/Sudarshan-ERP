"use client";

import { Icon } from "@/components/erp/icons";
import { Btn, Modal } from "@/components/erp/ui";
import {
  companyLabel,
  formatVisitDateTime,
  formatVisitDurationMinutes,
  formatVisitTime12h,
  getVisitAcceptToCloseMinutes,
  getVisitClosingRemark,
  googleMapsHref,
  visitStatusBadgeClass,
  visitStatusLabel,
} from "@/lib/field-visit-display";
import type { FieldVisitView } from "@/lib/field-visit-types";

type Props = {
  visit: FieldVisitView | null;
  onClose: () => void;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="field-visit-detail-row">
      <div className="field-visit-detail-row__label">{label}</div>
      <div className="field-visit-detail-row__value">{value}</div>
    </div>
  );
}

export function FieldVisitDetailModal({ visit, onClose }: Props) {
  if (!visit) return null;

  const durationMins = getVisitAcceptToCloseMinutes(visit);
  const closingRemark = getVisitClosingRemark(visit);
  const mapsHref = googleMapsHref(visit);
  const badge = visitStatusBadgeClass(visit.status);

  return (
    <Modal
      open={Boolean(visit)}
      onClose={onClose}
      wide
      title={visit.partyName}
      sub={`${visit.visitId} · ${visit.assignedEmployeeName}`}
      footer={
        <Btn variant="secondary" size="sm" onClick={onClose}>
          Close
        </Btn>
      }
    >
      <div className="field-visit-detail">
        <div className="field-visit-detail__status-row">
          <span className={`field-activity-badge field-activity-badge--${badge}`}>
            {visitStatusLabel(visit.status)}
          </span>
          <span className="field-visit-detail__meta">
            {visit.visitType} · {visit.visitDate}
          </span>
        </div>

        <div className="field-visit-detail__grid">
          <DetailRow label="Employee" value={visit.assignedEmployeeName} />
          <DetailRow label="Company" value={companyLabel(visit.company)} />
          <DetailRow
            label="Scheduled"
            value={`${formatVisitTime12h(visit.startTime)} – ${formatVisitTime12h(visit.returnTime)}`}
          />
          <DetailRow label="Location" value={visit.locationText || "—"} />
          <DetailRow label="Purpose" value={visit.purpose || "—"} />
          <DetailRow label="Assigned by" value={visit.createdByName || visit.createdByEmail} />
        </div>

        <div className="field-visit-detail__timeline card">
          <div className="card-head">
            <div className="card-title">
              <Icon name="clock" size={14} /> Visit timeline
            </div>
          </div>
          <div className="card-body field-visit-detail__timeline-body">
            <DetailRow label="Accepted at" value={formatVisitDateTime(visit.acceptedAt)} />
            <DetailRow
              label={visit.status === "cancelled" ? "Closed at" : "Completed at"}
              value={formatVisitDateTime(visit.completedAt ?? visit.cancelledAt)}
            />
            <DetailRow
              label="Duration (accept → done)"
              value={formatVisitDurationMinutes(durationMins)}
            />
          </div>
        </div>

        {closingRemark ? (
          <div className="field-visit-detail__remark card">
            <div className="card-head">
              <div className="card-title">
                <Icon name="fileText" size={14} />
                {visit.status === "cancelled" ? "Not done — remark" : "Done — remark"}
              </div>
            </div>
            <div className="card-body">
              <p className="field-visit-detail__remark-text">{closingRemark}</p>
            </div>
          </div>
        ) : (
          <p className="field-visit-detail__no-remark">
            {visit.status === "completed" || visit.status === "cancelled"
              ? "No closing remark was provided."
              : "Remark will appear after the employee marks the visit done or not done."}
          </p>
        )}

        {mapsHref ? (
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="field-visit-detail__maps-link"
          >
            <Icon name="map" size={14} /> Open location in Google Maps
          </a>
        ) : null}
      </div>
    </Modal>
  );
}
