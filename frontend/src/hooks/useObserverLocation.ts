"use client";

import { useCallback, useState } from "react";

export type ObserverLocation = { lat: number; lon: number };

// Shared across features that need "where is the user" (What's Overhead,
// pass predictions, ...) so location is only set once per session instead
// of prompting separately in each feature.
export function useObserverLocation() {
  const [location, setLocation] = useState<ObserverLocation | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Geolocation's permission prompt should be tied to an explicit user
  // gesture, so this should only ever be called from onClick handlers.
  const detectLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation isn't available in this browser — enter coordinates manually.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setError(err.message || "Couldn't get your location — enter coordinates manually.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }, []);

  const setManualLocation = useCallback((lat: number, lon: number) => {
    setLocation({ lat, lon });
    setError(null);
  }, []);

  const clearLocation = useCallback(() => {
    setLocation(null);
    setError(null);
  }, []);

  return { location, locating, error, detectLocation, setManualLocation, clearLocation };
}

export type ObserverLocationState = ReturnType<typeof useObserverLocation>;
