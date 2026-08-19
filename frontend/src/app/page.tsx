"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import ComparisonTray from "@/components/ComparisonTray";
import GroupFilter from "@/components/GroupFilter";
import SatelliteInfoPanel from "@/components/SatelliteInfoPanel";
import { useObserverLocation } from "@/hooks/useObserverLocation";
import {
  fetchSatelliteGroups,
  fetchSatelliteOrbit,
  fetchSatellites,
  type OrbitPoint,
  type SatelliteSummary,
} from "@/lib/api";

// Cesium touches `window` at import time, so the globe must never render on the server.
const Globe = dynamic(() => import("@/components/Globe"), { ssr: false });

const POLL_INTERVAL_MS = 10_000;
const DEFAULT_GROUP = "stations";
const MAX_COMPARE = 3;

export default function Home() {
  const [groups, setGroups] = useState<string[]>([DEFAULT_GROUP]);
  const [selectedGroup, setSelectedGroup] = useState(DEFAULT_GROUP);
  const [satellites, setSatellites] = useState<SatelliteSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [trackedId, setTrackedId] = useState<number | null>(null);
  const [orbitPoints, setOrbitPoints] = useState<OrbitPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const observerLocation = useObserverLocation();

  useEffect(() => {
    fetchSatelliteGroups()
      .then((fetched) => setGroups(fetched.length > 0 ? fetched : [DEFAULT_GROUP]))
      .catch(() => setGroups([DEFAULT_GROUP]));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetchSatellites(selectedGroup)
        .then((data) => {
          if (!cancelled) {
            setSatellites(data);
            setError(null);
          }
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load satellites");
        });
    };

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedGroup]);

  useEffect(() => {
    if (selectedId == null) return;

    let cancelled = false;
    fetchSatelliteOrbit(selectedId)
      .then((orbit) => {
        if (!cancelled) setOrbitPoints(orbit.points);
      })
      .catch(() => {
        if (!cancelled) setOrbitPoints([]);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const selectedSatellite = useMemo(
    () => satellites.find((s) => s.noradId === selectedId) ?? null,
    [satellites, selectedId],
  );

  // Deselecting shouldn't require clearing orbitPoints synchronously in an
  // effect — just stop rendering the stale ring once nothing is selected.
  const effectiveOrbitPoints = selectedId == null ? [] : orbitPoints;

  const handleSelect = useCallback((noradId: number | null) => {
    setSelectedId(noradId);
  }, []);

  const handleGroupChange = useCallback((group: string) => {
    setSelectedGroup(group);
    setSelectedId(null);
    setTrackedId(null);
  }, []);

  const handleSearchSelect = useCallback((satellite: SatelliteSummary) => {
    setSelectedGroup(satellite.category);
    setSelectedId(satellite.noradId);
    setTrackedId(null);
  }, []);

  const handleAddToCompare = useCallback((noradId: number) => {
    setCompareIds((prev) => (prev.includes(noradId) || prev.length >= MAX_COMPARE ? prev : [...prev, noradId]));
  }, []);

  const handleRemoveFromCompare = useCallback((noradId: number) => {
    setCompareIds((prev) => prev.filter((id) => id !== noradId));
  }, []);

  const handleClearCompare = useCallback(() => setCompareIds([]), []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <Globe
        satellites={satellites}
        selectedId={selectedId}
        trackedId={trackedId}
        orbitPoints={effectiveOrbitPoints}
        orbitCategory={selectedSatellite?.category ?? null}
        onSelect={handleSelect}
      />

      <GroupFilter
        groups={groups}
        selectedGroup={selectedGroup}
        onChange={handleGroupChange}
        satelliteCount={satellites.length}
        onSearchSelect={handleSearchSelect}
        observerLocation={observerLocation}
      />

      <SatelliteInfoPanel
        satellite={selectedSatellite}
        isTracking={trackedId === selectedSatellite?.noradId}
        isComparing={selectedSatellite != null && compareIds.includes(selectedSatellite.noradId)}
        compareFull={compareIds.length >= MAX_COMPARE}
        observerLocation={observerLocation}
        onTrack={() => selectedSatellite && setTrackedId(selectedSatellite.noradId)}
        onStopTracking={() => setTrackedId(null)}
        onAddToCompare={() => selectedSatellite && handleAddToCompare(selectedSatellite.noradId)}
        onRemoveFromCompare={() => selectedSatellite && handleRemoveFromCompare(selectedSatellite.noradId)}
        onClose={() => setSelectedId(null)}
      />

      <ComparisonTray noradIds={compareIds} onRemove={handleRemoveFromCompare} onClear={handleClearCompare} />

      {error && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 rounded bg-red-600/90 px-3 py-1.5 text-sm text-white">
          {error}
        </div>
      )}
    </div>
  );
}
