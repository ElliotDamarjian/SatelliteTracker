const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5243";

export type SatelliteSummary = {
  noradId: number;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  altitudeKm: number;
  speedKmH: number;
  isSunlit: boolean;
};

export type OrbitPoint = {
  latitude: number;
  longitude: number;
  altitudeKm: number;
  timestampUtc: string;
};

export type SatelliteOrbit = {
  noradId: number;
  periodMinutes: number;
  points: OrbitPoint[];
};

export async function fetchSatellites(group?: string): Promise<SatelliteSummary[]> {
  const url = new URL("/api/satellites", API_BASE_URL);
  if (group) url.searchParams.set("group", group);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch satellites: ${res.status}`);
  return res.json();
}

export async function fetchSatelliteGroups(): Promise<string[]> {
  const res = await fetch(new URL("/api/satellites/groups", API_BASE_URL), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch groups: ${res.status}`);
  return res.json();
}

export async function searchSatellites(query: string): Promise<SatelliteSummary[]> {
  const url = new URL("/api/satellites/search", API_BASE_URL);
  url.searchParams.set("q", query);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to search satellites: ${res.status}`);
  return res.json();
}

export async function fetchSatelliteOrbit(noradId: number): Promise<SatelliteOrbit> {
  const res = await fetch(new URL(`/api/satellites/${noradId}/orbit`, API_BASE_URL), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch orbit for ${noradId}: ${res.status}`);
  return res.json();
}

export type OverheadSatellite = SatelliteSummary & {
  azimuthDeg: number;
  elevationDeg: number;
  rangeKm: number;
};

export async function fetchOverhead(
  lat: number,
  lon: number,
  minElevationDeg = 10,
): Promise<OverheadSatellite[]> {
  const url = new URL("/api/satellites/overhead", API_BASE_URL);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("minElevation", String(minElevationDeg));

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch overhead satellites: ${res.status}`);
  return res.json();
}

export type PassVisibility = "visible" | "daylight" | "eclipsed";

export type SatellitePass = {
  startUtc: string;
  endUtc: string;
  maxElevationTimeUtc: string;
  maxElevationDeg: number;
  durationMinutes: number;
  visibility: PassVisibility;
};

export async function fetchSatellitePasses(
  noradId: number,
  lat: number,
  lon: number,
  minElevationDeg = 10,
  hours = 72,
): Promise<SatellitePass[]> {
  const url = new URL(`/api/satellites/${noradId}/passes`, API_BASE_URL);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("minElevation", String(minElevationDeg));
  url.searchParams.set("hours", String(hours));

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch passes for ${noradId}: ${res.status}`);
  return res.json();
}

export type OrbitalElements = {
  noradId: number;
  name: string;
  category: string;
  periodMinutes: number;
  inclinationDeg: number;
  eccentricity: number;
  perigeeKm: number;
  apogeeKm: number;
  currentAltitudeKm: number;
  currentSpeedKmH: number;
};

export async function fetchOrbitalElements(noradId: number): Promise<OrbitalElements> {
  const res = await fetch(new URL(`/api/satellites/${noradId}/elements`, API_BASE_URL), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch orbital elements for ${noradId}: ${res.status}`);
  return res.json();
}
