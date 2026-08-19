"use client";

import { useEffect, useState } from "react";
import { colorForCategory } from "@/lib/categoryColors";
import LocationPicker from "@/components/LocationPicker";
import type { ObserverLocationState } from "@/hooks/useObserverLocation";
import { fetchOverhead, type OverheadSatellite } from "@/lib/api";

const POLL_INTERVAL_MS = 15_000;
const MIN_ELEVATION_DEG = 10;
const COMPASS_DIRECTIONS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];

function azimuthToCompass(azimuthDeg: number): string {
  const index = Math.round(azimuthDeg / 22.5) % COMPASS_DIRECTIONS.length;
  return COMPASS_DIRECTIONS[index];
}

type OverheadPanelProps = {
  observerLocation: ObserverLocationState;
  onSelect: (satellite: OverheadSatellite) => void;
};

export default function OverheadPanel({ observerLocation, onSelect }: OverheadPanelProps) {
  const [open, setOpen] = useState(false);
  const [satellites, setSatellites] = useState<OverheadSatellite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { location, locating, error: locationError, detectLocation, setManualLocation, clearLocation } =
    observerLocation;

  useEffect(() => {
    if (!open || location == null) return;

    let cancelled = false;
    const load = () => {
      fetchOverhead(location.lat, location.lon, MIN_ELEVATION_DEG)
        .then((data) => {
          if (!cancelled) {
            setSatellites(data);
            setError(null);
          }
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load overhead satellites");
        });
    };

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [open, location]);

  return (
    <div className="relative">
      <button
        onClick={() => {
          const willOpen = !open;
          setOpen(willOpen);
          if (willOpen && location == null && !locating && locationError == null) {
            detectLocation();
          }
        }}
        className="rounded border border-white/20 bg-black/50 px-2 py-1 text-sm hover:bg-white/10"
      >
        📡 Overhead
      </button>

      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 w-80 rounded-lg border border-white/10 bg-black/90 p-3 text-white shadow-xl backdrop-blur">
          <div className="mb-2">
            <LocationPicker
              location={location}
              locating={locating}
              error={locationError}
              detectLocation={detectLocation}
              setManualLocation={setManualLocation}
              clearLocation={clearLocation}
            />
          </div>

          {location && (
            <div className="max-h-72 overflow-y-auto">
              {error && <p className="px-1 py-2 text-xs text-red-400">{error}</p>}
              {!error && satellites.length === 0 && (
                <p className="px-1 py-2 text-xs text-white/50">
                  Nothing above {MIN_ELEVATION_DEG}° right now — check back shortly.
                </p>
              )}
              {satellites.map((sat) => (
                <button
                  key={sat.noradId}
                  onClick={() => onSelect(sat)}
                  className="flex w-full items-center gap-2 rounded px-1 py-1.5 text-left text-sm hover:bg-white/10"
                >
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: colorForCategory(sat.category) }}
                  />
                  <span className="flex-1 truncate">{sat.name}</span>
                  <span title={sat.isSunlit ? "Sunlit" : "In Earth's shadow"} className="shrink-0">
                    {sat.isSunlit ? "☀️" : "🌑"}
                  </span>
                  <span className="shrink-0 text-xs text-white/50">
                    {sat.elevationDeg.toFixed(0)}° {azimuthToCompass(sat.azimuthDeg)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
