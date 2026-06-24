"use client";

import { Icon } from "@/components/erp/icons";
import { Btn, StatusBadge } from "@/components/erp/ui";
import { DispatchLocationEditor } from "@/components/dispatch/dispatch-location-editor";
import { DispatchGoogleMap } from "@/components/dispatch/dispatch-google-map";
import { DispatchPlanChip } from "@/components/dispatch/dispatch-plan-chip";
import { DispatchQrBarcode } from "@/components/dispatch/dispatch-qr-barcode";
import type { DispatchDetailView } from "@/lib/dispatch-planning-api";

type DispatchDetailPanelProps = {
  detail: DispatchDetailView;
  lastRefreshedAt: string | null;
  onRefresh: () => void;
  onLocationUpdated: () => void;
};

function formatTimestamp(iso: string | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DispatchDetailPanel({
  detail,
  lastRefreshedAt,
  onRefresh,
  onLocationUpdated,
}: DispatchDetailPanelProps) {
  const loc = detail.lastLocation;
  const mapLabel = loc?.address ?? (loc ? `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}` : undefined);

  return (
    <div className="dispatch-detail">
      <div className="dispatch-detail-grid">
        <div className="card dispatch-detail-card">
          <div className="card-head">
            <div className="card-title">
              <Icon name="truck" size={14} /> Shipment overview
            </div>
            <div className="dispatch-detail-head-actions">
              {detail.trackingLive ? (
                <span className="dispatch-detail-live">
                  <span className="dot pulse" aria-hidden="true" />
                  Live
                </span>
              ) : null}
              <Btn variant="secondary" size="sm" icon="refresh" onClick={onRefresh}>
                Refresh
              </Btn>
            </div>
          </div>
          <div className="card-body">
            <dl className="dispatch-detail-meta">
              <div>
                <dt>Dispatch</dt>
                <dd className="mono">{detail.id}</dd>
              </div>
              <div>
                <dt>Order</dt>
                <dd className="mono">{detail.orderId}</dd>
              </div>
              <div>
                <dt>Customer</dt>
                <dd>{detail.customer}</dd>
              </div>
              <div>
                <dt>Product</dt>
                <dd>{detail.product}</dd>
              </div>
              <div>
                <dt>Loaded</dt>
                <dd>{detail.loaded}</dd>
              </div>
              <div>
                <dt>ETA</dt>
                <dd>{detail.eta}</dd>
              </div>
              <div>
                <dt>Vehicle</dt>
                <dd className="mono">{detail.vehicle}</dd>
              </div>
              <div>
                <dt>Driver</dt>
                <dd>{detail.driver}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <StatusBadge status={detail.status} />
                </dd>
              </div>
              <div>
                <dt>Plan status</dt>
                <dd>
                  <DispatchPlanChip status={detail.planStatus} />
                </dd>
              </div>
            </dl>

            <div className="dispatch-detail-route">
              <div className="dispatch-detail-route__line" aria-hidden="true">
                <span className="dot success" />
                <span className="dispatch-detail-route__dash" />
                <span className="dot primary" />
              </div>
              <div className="dispatch-detail-route__points">
                <div>
                  <div className="dispatch-detail-route__label">From</div>
                  <div className="dispatch-detail-route__value">{detail.sourceLocation}</div>
                </div>
                <div>
                  <div className="dispatch-detail-route__label">To</div>
                  <div className="dispatch-detail-route__value">{detail.deliveryLocation}</div>
                </div>
              </div>
            </div>

            <div className="dispatch-detail-progress">
              <div className="dispatch-detail-progress__head">
                <span>Journey progress</span>
                <span className="mono">{detail.progress}%</span>
              </div>
              <div className="bar">
                <span style={{ width: `${detail.progress}%` }} />
              </div>
            </div>

            {detail.driverCheckedInAt ? (
              <p className="dispatch-detail-checkin">
                <Icon name="check" size={13} /> Driver checked in{" "}
                {formatTimestamp(detail.driverCheckedInAt)}
              </p>
            ) : detail.vehicleAssigned ? (
              <p className="dispatch-detail-checkin dispatch-detail-checkin--pending">
                <Icon name="clock" size={13} /> Awaiting driver QR check-in
              </p>
            ) : (
              <p className="dispatch-detail-checkin dispatch-detail-checkin--pending">
                <Icon name="truck" size={13} /> Assign a vehicle to enable driver check-in
              </p>
            )}

            {lastRefreshedAt ? (
              <p className="dispatch-detail-refreshed">
                Last updated {formatTimestamp(lastRefreshedAt)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="card dispatch-detail-card">
          <div className="card-head">
            <div className="card-title">
              <Icon name="pin" size={14} /> Driver check-in barcode
            </div>
          </div>
          <div className="card-body">
            <DispatchQrBarcode
              dispatchId={detail.id}
              trackUrl={detail.trackUrl}
              vehicleAssigned={detail.vehicleAssigned}
            />
          </div>
        </div>
      </div>

      <div className="card dispatch-detail-map-card">
        <div className="card-head">
          <div className="card-title">
            <Icon name="map" size={14} /> Live vehicle tracking
          </div>
          {loc ? (
            <span className="dispatch-detail-map-meta">
              {loc.address ?? `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`} ·{" "}
              {formatTimestamp(loc.updatedAt)}
            </span>
          ) : null}
        </div>
        <div className="card-body flush">
          <DispatchLocationEditor
            dispatchId={detail.id}
            lastLocation={detail.lastLocation}
            onUpdated={onLocationUpdated}
          />
          <DispatchGoogleMap
            lat={loc?.lat}
            lng={loc?.lng}
            title={detail.vehicle !== "—" ? detail.vehicle : detail.id}
            subtitle={mapLabel}
            sourceLocation={detail.sourceLocation}
            deliveryLocation={detail.deliveryLocation}
            openDirectionsOnClick
          />
        </div>
      </div>
    </div>
  );
}
