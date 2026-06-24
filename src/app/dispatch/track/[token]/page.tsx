"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DispatchTrackPanel } from "@/components/dispatch/dispatch-track-panel";
import {
  DispatchDriverCheckin,
  readDispatchDriverSession,
} from "@/components/dispatch/dispatch-driver-checkin";
import { useDispatchTrack } from "@/hooks/use-dispatch-track";
import { shareDispatchTrackLocation } from "@/lib/dispatch-planning-api";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default function DispatchTrackPage({ params }: PageProps) {
  const { token: rawToken } = use(params);
  const token = useMemo(() => decodeURIComponent(rawToken), [rawToken]);
  const { data, loading, error, reload } = useDispatchTrack(token);

  const [sessionReady, setSessionReady] = useState(false);
  const [driverSessionToken, setDriverSessionToken] = useState<string | null>(null);
  const [driverName, setDriverName] = useState<string | null>(null);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const autoShareStartedRef = useRef(false);

  useEffect(() => {
    const saved = readDispatchDriverSession(token);
    if (saved) setDriverSessionToken(saved);
    setSessionReady(true);
  }, [token]);

  const isAuthenticated = Boolean(driverSessionToken);
  const showDriverGate =
    sessionReady &&
    Boolean(data && !isAuthenticated && (!data.vehicleAssigned || data.active));
  const showTrack = sessionReady && Boolean(data && isAuthenticated);

  const shareLocation = useCallback(async () => {
    if (!driverSessionToken) return false;
    if (!navigator.geolocation) {
      setShareError("Geolocation is not supported on this device.");
      return false;
    }

    setSharingLocation(true);
    setShareError(null);

    return new Promise<boolean>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const result = await shareDispatchTrackLocation(
              token,
              {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
              },
              driverSessionToken
            );
            setShareMessage(
              result.status === "in-transit"
                ? "Location captured. Dispatch is now in transit."
                : "Location captured successfully."
            );
            void reload(true);
            resolve(true);
          } catch (e) {
            setShareError(e instanceof Error ? e.message : "Failed to capture location");
            resolve(false);
          } finally {
            setSharingLocation(false);
          }
        },
        () => {
          setShareError("Location permission denied. Enable GPS to continue.");
          setSharingLocation(false);
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );
    });
  }, [driverSessionToken, reload, token]);

  useEffect(() => {
    if (!showTrack || !data?.active || !driverSessionToken) return;
    if (autoShareStartedRef.current) return;
    if (data.driverCheckedInAt && data.lastLocation) return;

    autoShareStartedRef.current = true;
    void shareLocation();
  }, [showTrack, data?.active, data?.driverCheckedInAt, data?.lastLocation, driverSessionToken, shareLocation]);

  return (
    <main className={showTrack || showDriverGate ? undefined : "dispatch-track-page"}>
      {loading && !data ? (
        <p className="dispatch-track-page__status">Loading dispatch…</p>
      ) : null}
      {error ? <p className="dispatch-track-page__error">{error}</p> : null}

      {showDriverGate ? (
        <DispatchDriverCheckin
          token={token}
          track={data!}
          onAuthenticated={({ driverSessionToken: session, driverName: name }) => {
            autoShareStartedRef.current = false;
            setDriverSessionToken(session);
            setDriverName(name);
            setShareMessage("Getting your location…");
          }}
        />
      ) : null}

      {showTrack ? (
        <div className="dispatch-track-page dispatch-track-page--logged-in">
          {driverName ? (
            <p className="dispatch-track-page__welcome">
              Signed in as <strong>{driverName}</strong>
            </p>
          ) : null}
          {sharingLocation ? (
            <p className="dispatch-track-page__status">Getting your location…</p>
          ) : null}
          <DispatchTrackPanel
            track={data!}
            shareMessage={shareMessage}
            locating={sharingLocation}
          />
          {shareError ? <p className="dispatch-track-page__error">{shareError}</p> : null}
        </div>
      ) : null}

      {sessionReady && data && !data.active && !isAuthenticated ? (
        <p className="dispatch-track-page__status">This dispatch is no longer active.</p>
      ) : null}
    </main>
  );
}
