"use client";

import { useState } from "react";
import type { ObserverLocationState } from "@/hooks/useObserverLocation";

type LocationPickerProps = Pick<
  ObserverLocationState,
  "location" | "locating" | "error" | "detectLocation" | "setManualLocation" | "clearLocation"
>;

export default function LocationPicker({
  location,
  locating,
  error,
  detectLocation,
  setManualLocation,
  clearLocation,
}: LocationPickerProps) {
  const [manualLat, setManualLat] = useState("");
  const [manualLon, setManualLon] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  if (location) {
    return (
      <div className="flex items-center justify-between text-xs text-white/60">
        <span>
          📍 {location.lat.toFixed(2)}°, {location.lon.toFixed(2)}°
        </span>
        <button onClick={clearLocation} className="text-cyan-400 hover:underline">
          Change
        </button>
      </div>
    );
  }

  const handleManualSubmit = () => {
    const lat = Number(manualLat);
    const lon = Number(manualLon);
    if (Number.isNaN(lat) || Number.isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setFormError("Enter a valid latitude (-90 to 90) and longitude (-180 to 180).");
      return;
    }
    setFormError(null);
    setManualLocation(lat, lon);
  };

  return (
    <div className="space-y-2">
      {locating && <p className="text-xs text-white/60">Detecting your location…</p>}
      {(error || formError) && <p className="text-xs text-red-400">{error ?? formError}</p>}
      <button
        onClick={detectLocation}
        className="w-full rounded bg-cyan-500 py-1 text-xs font-medium text-black hover:bg-cyan-400"
      >
        Use my location
      </button>
      <div className="flex gap-2">
        <input
          type="number"
          placeholder="Latitude"
          value={manualLat}
          onChange={(e) => setManualLat(e.target.value)}
          className="w-1/2 rounded border border-white/20 bg-black/50 px-2 py-1 text-xs"
        />
        <input
          type="number"
          placeholder="Longitude"
          value={manualLon}
          onChange={(e) => setManualLon(e.target.value)}
          className="w-1/2 rounded border border-white/20 bg-black/50 px-2 py-1 text-xs"
        />
      </div>
      <button
        onClick={handleManualSubmit}
        className="w-full rounded border border-white/20 py-1 text-xs hover:bg-white/10"
      >
        Use these coordinates
      </button>
    </div>
  );
}
