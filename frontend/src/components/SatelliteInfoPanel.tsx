"use client";

import { colorForCategory } from "@/lib/categoryColors";
import PassPredictions from "@/components/PassPredictions";
import type { ObserverLocationState } from "@/hooks/useObserverLocation";
import type { SatelliteSummary } from "@/lib/api";

type SatelliteInfoPanelProps = {
  satellite: SatelliteSummary | null;
  isTracking: boolean;
  isComparing: boolean;
  compareFull: boolean;
  observerLocation: ObserverLocationState;
  onTrack: () => void;
  onStopTracking: () => void;
  onAddToCompare: () => void;
  onRemoveFromCompare: () => void;
  onClose: () => void;
};

export default function SatelliteInfoPanel({
  satellite,
  isTracking,
  isComparing,
  compareFull,
  observerLocation,
  onTrack,
  onStopTracking,
  onAddToCompare,
  onRemoveFromCompare,
  onClose,
}: SatelliteInfoPanelProps) {
  if (!satellite) return null;

  const accentColor = colorForCategory(satellite.category);

  return (
    <div
      className="pointer-events-auto absolute right-4 top-4 w-72 overflow-hidden rounded-lg border border-white/10 bg-black/70 text-white shadow-xl backdrop-blur"
      style={{ borderTop: `3px solid ${accentColor}` }}
    >
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide">{satellite.name}</h2>
          <button onClick={onClose} aria-label="Close" className="text-white/50 hover:text-white">
            ✕
          </button>
        </div>

        <dl className="grid grid-cols-2 gap-y-1 text-sm">
          <dt className="text-white/50">NORAD ID</dt>
          <dd className="text-right font-mono">{satellite.noradId}</dd>

          <dt className="text-white/50">Category</dt>
          <dd className="flex items-center justify-end gap-1.5 text-right capitalize">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: accentColor }}
            />
            {satellite.category}
          </dd>

          <dt className="text-white/50">Altitude</dt>
          <dd className="text-right">{satellite.altitudeKm.toFixed(0)} km</dd>

          <dt className="text-white/50">Speed</dt>
          <dd className="text-right">{satellite.speedKmH.toFixed(0)} km/h</dd>

          <dt className="text-white/50">Illumination</dt>
          <dd className="text-right">
            {satellite.isSunlit ? (
              <span className="text-amber-300">☀️ Sunlit</span>
            ) : (
              <span className="text-white/40">🌑 In Shadow</span>
            )}
          </dd>

          <dt className="text-white/50">Latitude</dt>
          <dd className="text-right">{satellite.latitude.toFixed(2)}°</dd>

          <dt className="text-white/50">Longitude</dt>
          <dd className="text-right">{satellite.longitude.toFixed(2)}°</dd>
        </dl>

        <div className="mt-3 flex gap-2">
          <button
            onClick={isTracking ? onStopTracking : onTrack}
            className="flex-1 rounded bg-cyan-500 py-1.5 text-sm font-medium text-black hover:bg-cyan-400"
          >
            {isTracking ? "Stop Tracking" : "Track Satellite"}
          </button>
          <button
            onClick={isComparing ? onRemoveFromCompare : onAddToCompare}
            disabled={!isComparing && compareFull}
            title={!isComparing && compareFull ? "Comparison tray is full (max 3)" : undefined}
            className="flex-1 rounded border border-white/20 py-1.5 text-sm font-medium hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            {isComparing ? "− Compare" : "+ Compare"}
          </button>
        </div>

        <PassPredictions noradId={satellite.noradId} observerLocation={observerLocation} />
      </div>
    </div>
  );
}
