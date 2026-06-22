"use client";

import { useMemo } from "react";
import { Icon } from "@/components/erp/icons";
import { StatusBadge } from "@/components/erp/ui";
import type { DispatchTrackView } from "@/lib/dispatch-planning-api";

type DispatchTrackPanelProps = {
  track: DispatchTrackView;
  showShareLocation?: boolean;
  onShareLocation?: () => void;
  sharingLocation?: boolean;
  shareMessage?: string | null;
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

function mapEmbedUrl(lat: number, lng: number): string {
  const pad = 0.08;
  const bbox = [lng - pad, lat - pad, lng + pad, lat + pad].join("%2C");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
}

export function DispatchTrackPanel({
  track,
  showShareLocation = false,
  onShareLocation,
  sharingLocation = false,
  shareMessage = null,
}: DispatchTrackPanelProps) {
  const loc = track.lastLocation;
  const mapUrl = useMemo(
    () => (loc ? mapEmbedUrl(loc.lat, loc.lng) : null),
    [loc]
  );

  return (
    <div className="dispatch-track">
      <header className="dispatch-track__hero">
        <div>
          <p className="dispatch-track__eyebrow">Dispatch tracking</p>
          <h1 className="dispatch-track__title mono">{track.id}</h1>
          <p className="dispatch-track__sub">
            {track.vehicle} · {track.loaded} · {track.customer}
          </p>
        </div>
        <StatusBadge status={track.status} />
      </header>

      <div className="dispatch-track-grid">
        <section className="dispatch-track-card">
          <h2>Route & locations</h2>
          <dl className="dispatch-track-meta">
            <div>
              <dt>From</dt>
              <dd>{track.sourceLocation}</dd>
            </div>
            <div>
              <dt>To</dt>
              <dd>{track.deliveryLocation}</dd>
            </div>
            <div>
              <dt>Route</dt>
              <dd>{track.route}</dd>
            </div>
            <div>
              <dt>Driver</dt>
              <dd>{track.driver}</dd>
            </div>
            <div>
              <dt>Product</dt>
              <dd>{track.product}</dd>
            </div>
            <div>
              <dt>ETA</dt>
              <dd>{track.eta}</dd>
            </div>
          </dl>

          <div className="dispatch-detail-progress">
            <div className="dispatch-detail-progress__head">
              <span>Journey progress</span>
              <span className="mono">{track.progress}%</span>
            </div>
            <div className="bar">
              <span style={{ width: `${track.progress}%` }} />
            </div>
          </div>
        </section>

        <section className="dispatch-track-card">
          <h2>Current location</h2>
          {loc ? (
            <dl className="dispatch-track-location">
              <div>
                <dt>Coordinates</dt>
                <dd className="mono">
                  {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                </dd>
              </div>
              {loc.address ? (
                <div>
                  <dt>Address</dt>
                  <dd>{loc.address}</dd>
                </div>
              ) : null}
              {(loc.city || loc.state) ? (
                <div>
                  <dt>Area</dt>
                  <dd>
                    {[loc.city, loc.state].filter(Boolean).join(", ")}
                  </dd>
                </div>
              ) : null}
              {typeof loc.accuracy === "number" ? (
                <div>
                  <dt>Accuracy</dt>
                  <dd>±{Math.round(loc.accuracy)} m</dd>
                </div>
              ) : null}
              <div>
                <dt>Last ping</dt>
                <dd>{formatTimestamp(loc.updatedAt)}</dd>
              </div>
              {track.driverCheckedInAt ? (
                <div>
                  <dt>Checked in</dt>
                  <dd>{formatTimestamp(track.driverCheckedInAt)}</dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <div className="dispatch-track-location-empty">
              <Icon name="pin" size={22} />
              <p>No live location yet</p>
              <span>Location appears after the driver shares GPS from this link.</span>
            </div>
          )}

          {showShareLocation && track.active ? (
            <div className="dispatch-track-share">
              <button
                type="button"
                className="btn primary dispatch-track-share__btn"
                onClick={onShareLocation}
                disabled={sharingLocation}
              >
                <Icon name="pin" size={14} />
                {sharingLocation ? "Sharing location…" : "Share my location"}
              </button>
              {shareMessage ? (
                <p className="dispatch-track-share__msg">{shareMessage}</p>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>

      <section className="dispatch-track-card dispatch-track-map-card">
        <div className="dispatch-track-map-head">
          <h2>Map</h2>
          {loc ? (
            <span>{formatTimestamp(loc.updatedAt)}</span>
          ) : null}
        </div>
        {mapUrl ? (
          <iframe
            title={`Map for ${track.id}`}
            src={mapUrl}
            className="dispatch-detail-map"
            loading="lazy"
          />
        ) : (
          <div className="dispatch-detail-map-empty">
            <Icon name="map" size={28} />
            <p>Map will appear here once location is available</p>
          </div>
        )}
      </section>
    </div>
  );
}
