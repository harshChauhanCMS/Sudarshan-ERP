let mapsScriptPromise: Promise<void> | null = null;

export function getGoogleMapsApiKey(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
}

function mapsScriptUrl(apiKey: string): string {
  const params = new URLSearchParams({
    key: apiKey,
    libraries: "places",
  });
  return `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
}

export function loadGoogleMapsScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();
  if (mapsScriptPromise) return mapsScriptPromise;

  mapsScriptPromise = new Promise((resolve, reject) => {
    const apiKey = getGoogleMapsApiKey();
    if (!apiKey) {
      reject(new Error("Google Maps API key is not configured"));
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-maps="true"]',
    );
    if (existing) {
      const onReady = () => {
        if (window.google?.maps) resolve();
        else reject(new Error("Failed to load Google Maps"));
      };
      existing.addEventListener("load", onReady);
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Google Maps")),
      );
      if (window.google?.maps) onReady();
      return;
    }

    const script = document.createElement("script");
    script.src = mapsScriptUrl(apiKey);
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = "true";
    script.onload = () => {
      if (window.google?.maps) resolve();
      else reject(new Error("Failed to load Google Maps"));
    };
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });

  return mapsScriptPromise;
}

export function googleMapsDirectionsUrl(
  origin: string,
  destination: string,
  waypoints?: string,
): string {
  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
  });
  if (waypoints) params.set("waypoints", waypoints);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function googleMapsPlaceUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
