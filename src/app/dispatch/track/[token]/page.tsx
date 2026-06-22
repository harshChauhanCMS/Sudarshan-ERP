"use client";

import { use, useMemo, useState } from "react";
import { DispatchTrackPanel } from "@/components/dispatch/dispatch-track-panel";
import { useDispatchTrack } from "@/hooks/use-dispatch-track";
import { shareDispatchTrackLocation } from "@/lib/dispatch-planning-api";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default function DispatchTrackPage({ params }: PageProps) {
  const { token: rawToken } = use(params);
  const token = useMemo(() => decodeURIComponent(rawToken), [rawToken]);
  const { data, loading, error, reload } = useDispatchTrack(token);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const shareMyLocation = () => {
    if (!navigator.geolocation) {
      setShareMessage("Geolocation is not supported on this device.");
      return;
    }
    setSharingLocation(true);
    setShareMessage(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await shareDispatchTrackLocation(token, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
          setShareMessage("Location shared. Tracking page will refresh shortly.");
          await reload(true);
        } catch (e) {
          setShareMessage(e instanceof Error ? e.message : "Failed to share location");
        } finally {
          setSharingLocation(false);
        }
      },
      () => {
        setShareMessage("Location permission denied. Enable GPS to share your position.");
        setSharingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  return (
    <main className="dispatch-track-page">
      {loading && !data ? (
        <p className="dispatch-track-page__status">Loading dispatch tracking…</p>
      ) : null}
      {error ? <p className="dispatch-track-page__error">{error}</p> : null}
      {data ? (
        <DispatchTrackPanel
          track={data}
          showShareLocation
          onShareLocation={shareMyLocation}
          sharingLocation={sharingLocation}
          shareMessage={shareMessage}
        />
      ) : null}
    </main>
  );
}
