"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/erp/icons";
import { loadGoogleMapsScript } from "@/lib/google-maps-loader";

export type FieldMapEmployee = {
  employeeId: string;
  label: string;
  city: string;
  lat: number;
  lng: number;
  color: string;
  initials: string;
};

const DEFAULT_CENTER = { lat: 24.5854, lng: 73.7125 };
const DEFAULT_ZOOM = 6;

type Props = {
  employees: FieldMapEmployee[];
};

export function FieldEmployeeGoogleMap({ employees }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void loadGoogleMapsScript()
      .then(() => {
        if (active) setReady(true);
      })
      .catch((err: Error) => {
        if (active) setLoadError(err.message);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapContainerRef.current || !window.google?.maps) return;

    if (!mapRef.current) {
      mapRef.current = new google.maps.Map(mapContainerRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        gestureHandling: "greedy",
      });
      infoWindowRef.current = new google.maps.InfoWindow();
    }

    const map = mapRef.current;
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    if (employees.length === 0) {
      map.setCenter(DEFAULT_CENTER);
      map.setZoom(DEFAULT_ZOOM);
      return;
    }

    const bounds = new google.maps.LatLngBounds();

    employees.forEach((rep) => {
      const position = { lat: rep.lat, lng: rep.lng };
      bounds.extend(position);

      const marker = new google.maps.Marker({
        position,
        map,
        title: `${rep.label} · ${rep.city}`,
        label: {
          text: rep.initials,
          color: "#ffffff",
          fontWeight: "700",
          fontSize: "11px",
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 17,
          fillColor: rep.color,
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
      });

      marker.addListener("click", () => {
        infoWindowRef.current?.setContent(
          `<div style="font-family:system-ui,sans-serif;font-size:13px;line-height:1.45">
            <strong>${rep.label}</strong><br/>
            <span style="color:#64748b">${rep.city}</span>
          </div>`,
        );
        infoWindowRef.current?.open({ anchor: marker, map });
      });

      markersRef.current.push(marker);
    });

    if (employees.length === 1) {
      const center = bounds.getCenter();
      if (center) map.setCenter({ lat: center.lat(), lng: center.lng() });
      map.setZoom(12);
      return;
    }

    map.fitBounds(bounds, 56);
  }, [ready, employees]);

  if (loadError) {
    return (
      <div className="dispatch-detail-map-empty field-activity-map-canvas">
        <Icon name="pin" size={28} />
        <p>Map unavailable</p>
        <span>{loadError}</span>
      </div>
    );
  }

  return (
    <div className="field-activity-map-canvas" style={{ position: "relative", minHeight: 360 }}>
      {!ready ? (
        <div className="dispatch-detail-map-empty" style={{ position: "absolute", inset: 0, zIndex: 2 }}>
          <p>Loading map…</p>
        </div>
      ) : null}

      <div ref={mapContainerRef} style={{ width: "100%", height: "100%", minHeight: 360 }} />

      {ready && employees.length === 0 ? (
        <div
          className="dispatch-detail-map-empty"
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(255,255,255,0.72)",
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          <Icon name="pin" size={28} />
          <p>No GPS locations yet</p>
          <span>Onsite/field employees appear here after punch-in with location.</span>
        </div>
      ) : null}
    </div>
  );
}
