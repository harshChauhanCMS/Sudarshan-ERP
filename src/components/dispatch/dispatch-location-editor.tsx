"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/erp/icons";
import { Btn } from "@/components/erp/ui";
import { adminUpdateDispatchLocation } from "@/lib/dispatch-planning-api";
import type { DispatchDetailView } from "@/lib/dispatch-planning-api";

type DispatchLocationEditorProps = {
  dispatchId: string;
  lastLocation?: DispatchDetailView["lastLocation"];
  onUpdated: () => void;
};

export function DispatchLocationEditor({
  dispatchId,
  lastLocation,
  onUpdated,
}: DispatchLocationEditorProps) {
  const [lat, setLat] = useState(lastLocation ? String(lastLocation.lat) : "");
  const [lng, setLng] = useState(lastLocation ? String(lastLocation.lng) : "");
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lastLocation) return;
    setLat(String(lastLocation.lat));
    setLng(String(lastLocation.lng));
  }, [lastLocation?.lat, lastLocation?.lng, lastLocation]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => {
        setError("Could not read your current location.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      setError("Enter valid latitude and longitude.");
      setSaving(false);
      return;
    }

    try {
      await adminUpdateDispatchLocation(dispatchId, { lat: latNum, lng: lngNum });
      setMessage("Driver location updated.");
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update location");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="dispatch-location-editor" onSubmit={handleSubmit}>
      <div className="dispatch-location-editor__head">
        <Icon name="pin" size={14} />
        <span>Update driver location (admin)</span>
      </div>
      <div className="dispatch-location-editor__grid">
        <label className="field">
          <span className="field-label">Latitude</span>
          <input
            className="input"
            type="text"
            inputMode="decimal"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="24.5854"
            required
          />
        </label>
        <label className="field">
          <span className="field-label">Longitude</span>
          <input
            className="input"
            type="text"
            inputMode="decimal"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="73.7125"
            required
          />
        </label>
      </div>
      <div className="dispatch-location-editor__actions">
        <Btn
          type="button"
          variant="secondary"
          size="sm"
          icon="pin"
          onClick={useCurrentLocation}
          disabled={locating || saving}
        >
          {locating ? "Locating…" : "Use my location"}
        </Btn>
        <Btn type="submit" variant="primary" size="sm" disabled={saving}>
          {saving ? "Saving…" : "Update location"}
        </Btn>
      </div>
      {error ? <p className="dispatch-location-editor__error">{error}</p> : null}
      {message ? <p className="dispatch-location-editor__success">{message}</p> : null}
    </form>
  );
}
