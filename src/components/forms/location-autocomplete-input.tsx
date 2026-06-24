"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMapsScript } from "@/lib/google-maps-loader";

type LocationAutocompleteInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

function formatPlace(place: google.maps.places.PlaceResult): string {
  return (
    place.formatted_address?.trim() ||
    place.name?.trim() ||
    ""
  );
}

export function LocationAutocompleteInput({
  id,
  value,
  onChange,
  placeholder,
  className = "input",
}: LocationAutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onChangeRef = useRef(onChange);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  onChangeRef.current = onChange;

  useEffect(() => {
    let active = true;

    void loadGoogleMapsScript()
      .then(() => {
        if (!window.google?.maps?.places) {
          throw new Error("Google Places library is not loaded");
        }
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
    if (!ready || !inputRef.current || !window.google?.maps?.places) return;

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ["formatted_address", "name", "geometry"],
      componentRestrictions: { country: "in" },
    });

    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const next = formatPlace(place);
      if (next) onChangeRef.current(next);
    });

    autocompleteRef.current = autocomplete;

    return () => {
      google.maps.event.removeListener(listener);
      autocompleteRef.current = null;
    };
  }, [ready]);

  return (
    <div className="location-autocomplete">
      <input
        id={id}
        ref={inputRef}
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        aria-describedby={loadError ? `${id}-hint` : undefined}
      />
      {loadError ? (
        <span id={`${id}-hint`} className="location-autocomplete__hint">
          Suggestions unavailable — type address manually
        </span>
      ) : null}
    </div>
  );
}
