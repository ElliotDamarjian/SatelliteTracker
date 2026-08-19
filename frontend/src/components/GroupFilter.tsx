"use client";

import { colorForCategory } from "@/lib/categoryColors";
import SearchBox from "@/components/SearchBox";
import OverheadPanel from "@/components/OverheadPanel";
import type { ObserverLocationState } from "@/hooks/useObserverLocation";
import type { SatelliteSummary } from "@/lib/api";

type GroupFilterProps = {
  groups: string[];
  selectedGroup: string;
  onChange: (group: string) => void;
  satelliteCount: number;
  onSearchSelect: (satellite: SatelliteSummary) => void;
  observerLocation: ObserverLocationState;
};

export default function GroupFilter({
  groups,
  selectedGroup,
  onChange,
  satelliteCount,
  onSearchSelect,
  observerLocation,
}: GroupFilterProps) {
  return (
    <div className="pointer-events-auto absolute left-4 top-4 flex items-center gap-3 rounded-lg border border-white/10 bg-black/70 px-3 py-2 text-white shadow-xl backdrop-blur">
      <span className="text-sm font-semibold uppercase tracking-wide">🛰️ Satellite Tracker</span>

      <SearchBox onSelect={onSearchSelect} />
      <OverheadPanel observerLocation={observerLocation} onSelect={onSearchSelect} />

      <span
        className="inline-block h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: colorForCategory(selectedGroup) }}
      />
      <select
        value={selectedGroup}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-white/20 bg-black/50 px-2 py-1 text-sm capitalize"
      >
        {groups.map((group) => (
          <option key={group} value={group} className="bg-black capitalize">
            {group}
          </option>
        ))}
      </select>
      <span className="text-xs text-white/50">{satelliteCount} tracked</span>
    </div>
  );
}
