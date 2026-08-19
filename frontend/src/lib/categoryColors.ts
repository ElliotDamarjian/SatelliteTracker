// Shared category → color mapping so the globe points, info panel accent,
// and group picker all agree on what each satellite category looks like.
export const CATEGORY_COLORS: Record<string, string> = {
  stations: "#fbbf24", // amber — ISS and friends, kept eye-catching since it's the star attraction
  starlink: "#38bdf8", // sky blue
  gps: "#4ade80", // green
  weather: "#f472b6", // pink
};

export const DEFAULT_CATEGORY_COLOR = "#a5b4fc"; // indigo, for any future/unmapped group

export function colorForCategory(category: string): string {
  return CATEGORY_COLORS[category] ?? DEFAULT_CATEGORY_COLOR;
}
