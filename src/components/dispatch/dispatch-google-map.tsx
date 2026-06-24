"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/erp/icons";
import {
  googleMapsDirectionsUrl,
  googleMapsPlaceUrl,
  loadGoogleMapsScript,
} from "@/lib/google-maps-loader";

const DEFAULT_CENTER = { lat: 24.5854, lng: 73.7125 };
const DEFAULT_ZOOM = 6;
const VEHICLE_ZOOM = 13;

const ROUTE_POLYLINE = {
  strokeColor: "#1d4ed8",
  strokeWeight: 5,
  strokeOpacity: 0.9,
};

type DispatchGoogleMapProps = {
  lat?: number;
  lng?: number;
  title?: string;
  subtitle?: string;
  sourceLocation?: string;
  deliveryLocation?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  /** Tap/click map to open Google Maps directions (source → delivery). */
  openDirectionsOnClick?: boolean;
};

export function DispatchGoogleMap({
  lat,
  lng,
  title,
  subtitle,
  sourceLocation,
  deliveryLocation,
  emptyTitle = "No GPS ping yet",
  emptyMessage = "Map updates automatically after the driver shares location.",
  openDirectionsOnClick = true,
}: DispatchGoogleMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const mapClickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const hasCoords =
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  const source = sourceLocation?.trim() ?? "";
  const destination = deliveryLocation?.trim() ?? "";
  const hasRoute = Boolean(source && destination);
  const directionsUrl = hasRoute ? googleMapsDirectionsUrl(source, destination) : null;

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

    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }

    const placeVehicleMarker = (position: google.maps.LatLngLiteral) => {
      const marker = new google.maps.Marker({
        position,
        map,
        title: title ?? "Vehicle location",
        zIndex: 10,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: "#2563eb",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
      });

      if (title || subtitle) {
        const content = [
          title ? `<strong>${title}</strong>` : "",
          subtitle ? `<span style="color:#64748b">${subtitle}</span>` : "",
        ]
          .filter(Boolean)
          .join("<br/>");

        marker.addListener("click", () => {
          infoWindowRef.current?.setContent(
            `<div style="font-family:system-ui,sans-serif;font-size:13px;line-height:1.45">${content}</div>`
          );
          infoWindowRef.current?.open({ anchor: marker, map });
        });
      }

      markerRef.current = marker;
      return marker;
    };

    if (hasRoute) {
      const directionsService = new google.maps.DirectionsService();
      const directionsRenderer = new google.maps.DirectionsRenderer({
        map,
        suppressMarkers: false,
        preserveViewport: false,
        polylineOptions: ROUTE_POLYLINE,
      });
      directionsRendererRef.current = directionsRenderer;

      directionsService.route(
        {
          origin: source,
          destination,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status !== google.maps.DirectionsStatus.OK || !result) {
            if (hasCoords) {
              const position = { lat: lat!, lng: lng! };
              map.setCenter(position);
              map.setZoom(VEHICLE_ZOOM);
              placeVehicleMarker(position);
            } else {
              map.setCenter(DEFAULT_CENTER);
              map.setZoom(DEFAULT_ZOOM);
            }
            return;
          }

          directionsRenderer.setDirections(result);

          if (hasCoords) {
            const position = { lat: lat!, lng: lng! };
            placeVehicleMarker(position);
            const routeBounds = result.routes[0]?.bounds;
            if (routeBounds) {
              const bounds = new google.maps.LatLngBounds();
              bounds.union(routeBounds);
              bounds.extend(position);
              map.fitBounds(bounds, 56);
            }
          }
        }
      );
      return;
    }

    if (hasCoords) {
      const position = { lat: lat!, lng: lng! };
      map.setCenter(position);
      map.setZoom(VEHICLE_ZOOM);
      placeVehicleMarker(position);
      return;
    }

    map.setCenter(DEFAULT_CENTER);
    map.setZoom(DEFAULT_ZOOM);
  }, [ready, hasCoords, lat, lng, title, subtitle, hasRoute, source, destination]);

  useEffect(() => {
    if (!ready || !mapRef.current || !window.google?.maps) return;

    if (mapClickListenerRef.current) {
      google.maps.event.removeListener(mapClickListenerRef.current);
      mapClickListenerRef.current = null;
    }

    const map = mapRef.current;
    map.setOptions({ draggableCursor: hasRoute && openDirectionsOnClick ? "pointer" : undefined });

    if (!hasRoute || !openDirectionsOnClick || !directionsUrl) return;

    mapClickListenerRef.current = map.addListener("click", () => {
      window.open(directionsUrl, "_blank", "noopener,noreferrer");
    });

    return () => {
      if (mapClickListenerRef.current) {
        google.maps.event.removeListener(mapClickListenerRef.current);
        mapClickListenerRef.current = null;
      }
    };
  }, [ready, hasRoute, openDirectionsOnClick, directionsUrl]);

  if (loadError) {
    return (
      <div className="dispatch-detail-map-empty">
        <Icon name="pin" size={28} />
        <p>Map unavailable</p>
        <span>{loadError}</span>
      </div>
    );
  }

  if (!hasCoords && !hasRoute) {
    return (
      <div className="dispatch-detail-map-empty">
        <Icon name="pin" size={28} />
        <p>{emptyTitle}</p>
        <span>{emptyMessage}</span>
      </div>
    );
  }

  const externalUrl = directionsUrl ?? (hasCoords ? googleMapsPlaceUrl(lat!, lng!) : null);

  return (
    <div className="dispatch-google-map">
      {!ready ? (
        <div
          className="dispatch-detail-map-empty dispatch-google-map__loading"
          aria-hidden={ready}
        >
          <p>Loading Google Maps…</p>
        </div>
      ) : null}

      <div
        ref={mapContainerRef}
        className={`dispatch-detail-map${hasRoute && openDirectionsOnClick ? " dispatch-detail-map--clickable" : ""}`}
        role={hasRoute && openDirectionsOnClick ? "button" : undefined}
        aria-label={
          hasRoute && openDirectionsOnClick
            ? "Route map. Tap to open directions in Google Maps."
            : "Dispatch route map"
        }
      />

      {hasRoute ? (
        <p className="dispatch-google-map__hint">
          Blue line: plant → delivery. Tap the map to open turn-by-turn directions in Google Maps.
        </p>
      ) : null}

      {externalUrl ? (
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="dispatch-google-map__link"
        >
          Open directions in Google Maps
        </a>
      ) : null}
    </div>
  );
}
