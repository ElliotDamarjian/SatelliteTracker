"use client";

import { useEffect, useState } from "react";
import LocationPicker from "@/components/LocationPicker";
import type { ObserverLocationState } from "@/hooks/useObserverLocation";
import { fetchSatellitePasses, type PassVisibility, type SatellitePass } from "@/lib/api";

const MIN_ELEVATION_DEG = 10;
const HOURS_AHEAD = 72;

// "visible" is the one worth highlighting — satellite sunlit and the sky
// dark enough to actually see it with the naked eye. The other two happen
// too (satellite passes overhead constantly) but aren't watchable.
const VISIBILITY_LABELS: Record<PassVisibility, string> = {
  visible: "👁 Visible",
  daylight: "☀️ Daylight",
  eclipsed: "🌑 Eclipsed",
};

type PassPredictionsProps = {
  noradId: number;
  observerLocation: ObserverLocationState;
};

function formatPassTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function PassPredictions({ noradId, observerLocation }: PassPredictionsProps) {
  const [open, setOpen] = useState(false);
  const [passes, setPasses] = useState<SatellitePass[]>([]);
  // Which (satellite, location) the current `passes` were fetched for, so
  // "loading" can be derived by comparing instead of set synchronously in
  // the effect below.
  const [passesKey, setPassesKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { location, locating, error: locationError, detectLocation, setManualLocation, clearLocation } =
    observerLocation;

  const currentKey = location ? `${noradId}:${location.lat.toFixed(4)}:${location.lon.toFixed(4)}` : null;
  const loading = open && location != null && passesKey !== currentKey;

  useEffect(() => {
    if (!open || location == null) return;
    const key = `${noradId}:${location.lat.toFixed(4)}:${location.lon.toFixed(4)}`;

    let cancelled = false;
    fetchSatellitePasses(noradId, location.lat, location.lon, MIN_ELEVATION_DEG, HOURS_AHEAD)
      .then((data) => {
        if (cancelled) return;
        setPasses(data);
        setPassesKey(key);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load passes");
        setPassesKey(key);
      });

    return () => {
      cancelled = true;
    };
  }, [open, location, noradId]);

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <button
        onClick={() => {
          const willOpen = !open;
          setOpen(willOpen);
          if (willOpen && location == null && !locating && locationError == null) {
            detectLocation();
          }
        }}
        className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-white/70 hover:text-white"
      >
        Upcoming Passes
        <span>{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div className="mt-2">
          <LocationPicker
            location={location}
            locating={locating}
            error={locationError}
            detectLocation={detectLocation}
            setManualLocation={setManualLocation}
            clearLocation={clearLocation}
          />

          {location && (
            <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
              {loading && <p className="text-xs text-white/50">Calculating passes…</p>}
              {!loading && error && <p className="text-xs text-red-400">{error}</p>}
              {!loading && !error && passes.length === 0 && (
                <p className="text-xs text-white/50">
                  No passes above {MIN_ELEVATION_DEG}° in the next {HOURS_AHEAD / 24} days.
                </p>
              )}
              {!loading &&
                !error &&
                passes.map((pass) => (
                  <div
                    key={pass.startUtc}
                    className={`rounded px-1 py-1 text-xs hover:bg-white/5 ${
                      pass.visibility === "visible" ? "bg-emerald-400/10" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white/80">{formatPassTime(pass.startUtc)}</span>
                      <span
                        className={pass.visibility === "visible" ? "text-emerald-300" : "text-white/40"}
                      >
                        {VISIBILITY_LABELS[pass.visibility]}
                      </span>
                    </div>
                    <div className="text-white/50">
                      {Math.round(pass.durationMinutes)} min · max {pass.maxElevationDeg.toFixed(0)}°
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
