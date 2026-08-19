"use client";

import { useEffect, useState } from "react";
import { colorForCategory } from "@/lib/categoryColors";
import { searchSatellites, type SatelliteSummary } from "@/lib/api";

type SearchBoxProps = {
  onSelect: (satellite: SatelliteSummary) => void;
};

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

export default function SearchBox({ onSelect }: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SatelliteSummary[]>([]);
  // The query `results` was fetched for, so "loading" can be derived by
  // comparing it to the live query instead of tracked as its own state set
  // synchronously in the effect below.
  const [resultsQuery, setResultsQuery] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) return;

    let cancelled = false;
    const handle = setTimeout(() => {
      searchSatellites(trimmed)
        .then((matches) => {
          if (cancelled) return;
          setResults(matches);
          setResultsQuery(trimmed);
        })
        .catch(() => {
          if (cancelled) return;
          setResults([]);
          setResultsQuery(trimmed);
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  const trimmedQuery = query.trim();
  const showDropdown = open && trimmedQuery.length >= MIN_QUERY_LENGTH;
  const loading = showDropdown && resultsQuery !== trimmedQuery;

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search satellites…"
        className="w-44 rounded border border-white/20 bg-black/50 px-2 py-1 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-cyan-400"
      />

      {showDropdown && (
        <div className="absolute left-0 top-full z-10 mt-1 max-h-72 w-64 overflow-y-auto rounded-lg border border-white/10 bg-black/90 shadow-xl backdrop-blur">
          {loading && <div className="px-3 py-2 text-xs text-white/50">Searching…</div>}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2 text-xs text-white/50">No matches</div>
          )}
          {!loading &&
            results.map((sat) => (
              <button
                key={sat.noradId}
                onClick={() => {
                  onSelect(sat);
                  setQuery(sat.name);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-white hover:bg-white/10"
              >
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: colorForCategory(sat.category) }}
                />
                <span className="truncate">{sat.name}</span>
                <span className="ml-auto shrink-0 text-xs text-white/40">{sat.noradId}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
