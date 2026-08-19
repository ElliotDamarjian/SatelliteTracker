"use client";

import { useEffect, useState } from "react";
import { colorForCategory } from "@/lib/categoryColors";
import { fetchOrbitalElements, type OrbitalElements } from "@/lib/api";

const POLL_INTERVAL_MS = 15_000;

type ComparisonTrayProps = {
  noradIds: number[];
  onRemove: (noradId: number) => void;
  onClear: () => void;
};

type Row = { label: string; format: (e: OrbitalElements) => string };

function formatDuration(minutes: number): string {
  return minutes < 120 ? `${minutes.toFixed(0)} min` : `${(minutes / 60).toFixed(1)} hr`;
}

const ROWS: Row[] = [
  { label: "Category", format: (e) => e.category },
  { label: "Altitude", format: (e) => `${e.currentAltitudeKm.toFixed(0)} km` },
  { label: "Speed", format: (e) => `${e.currentSpeedKmH.toFixed(0)} km/h` },
  { label: "Orbital period", format: (e) => formatDuration(e.periodMinutes) },
  { label: "Inclination", format: (e) => `${e.inclinationDeg.toFixed(1)}°` },
  { label: "Eccentricity", format: (e) => e.eccentricity.toFixed(4) },
  { label: "Perigee", format: (e) => `${e.perigeeKm.toFixed(0)} km` },
  { label: "Apogee", format: (e) => `${e.apogeeKm.toFixed(0)} km` },
];

export default function ComparisonTray({ noradIds, onRemove, onClear }: ComparisonTrayProps) {
  const [elementsById, setElementsById] = useState<Record<number, OrbitalElements>>({});
  const [errorIds, setErrorIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (noradIds.length === 0) return;

    let cancelled = false;
    const load = () => {
      for (const id of noradIds) {
        fetchOrbitalElements(id)
          .then((data) => {
            if (cancelled) return;
            setElementsById((prev) => ({ ...prev, [id]: data }));
            setErrorIds((prev) => {
              if (!prev.has(id)) return prev;
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          })
          .catch(() => {
            if (cancelled) return;
            setErrorIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
          });
      }
    };

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [noradIds]);

  if (noradIds.length === 0) return null;

  return (
    <div className="pointer-events-auto absolute bottom-4 left-1/2 w-[min(92vw,640px)] -translate-x-1/2 rounded-lg border border-white/10 bg-black/80 p-3 text-white shadow-xl backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-white/70">Compare Satellites</span>
        <button onClick={onClear} className="text-xs text-white/50 hover:text-white">
          Clear all
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="w-28 text-left font-normal text-white/40" />
              {noradIds.map((id) => {
                const el = elementsById[id];
                return (
                  <th key={id} className="px-2 pb-1 text-left font-normal">
                    <div className="flex items-center gap-1.5">
                      {el && (
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: colorForCategory(el.category) }}
                        />
                      )}
                      <span className="truncate">{el?.name ?? `#${id}`}</span>
                      <button
                        onClick={() => onRemove(id)}
                        aria-label={`Remove ${el?.name ?? id} from comparison`}
                        className="ml-auto shrink-0 text-white/40 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label} className="border-t border-white/5">
                <td className="py-1 text-white/50">{row.label}</td>
                {noradIds.map((id) => {
                  const el = elementsById[id];
                  return (
                    <td key={id} className="px-2 py-1 capitalize">
                      {errorIds.has(id) ? "—" : el ? row.format(el) : "…"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
