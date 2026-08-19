# Satellite Tracker

Real-time satellite tracking on a 3D globe. TLE data from CelesTrak → SGP4
propagation in an ASP.NET Core API → CesiumJS globe in Next.js.

## Features

- Live-tracked satellite groups: ISS/stations, Starlink, GPS, weather
- Search by name or NORAD ID
- Click a satellite for its info panel: position, speed, altitude, sunlit/eclipse status
- Track a satellite (camera follows smoothly) with its ground-track orbit path drawn
- "What's Overhead" — satellites currently visible from your location (geolocation or manual lat/lon)
- Upcoming pass predictions per satellite, classified as visible / daylight / eclipsed
- Compare up to 3 satellites' orbital elements side by side
- Real-time position smoothing (satellites glide between polls instead of jumping)

## Stack

- **Backend**: ASP.NET Core (`backend/SatelliteTracker.Api`) — fetches TLEs
  from CelesTrak, propagates positions with [SGP.NET](https://github.com/parzivail/SGP.NET),
  exposes `/api/satellites` and related endpoints.
- **Frontend**: Next.js + TypeScript + Tailwind (`frontend`) — renders the
  globe with [Resium](https://github.com/reearth/resium) (React bindings for
  CesiumJS), polls the backend, and shows a satellite info panel.

## Requirements

- [.NET 10 SDK](https://dotnet.microsoft.com/download) (LTS)
- [Node.js](https://nodejs.org) 20+

## Running locally

**Backend** (serves on `http://localhost:5243`):

```
cd backend/SatelliteTracker.Api
dotnet run
```

**Frontend** (serves on `http://localhost:3100` — pinned to a non-default
port since 3000 is often already in use by other local projects):

```
cd frontend
npm install
npm run dev
```

Then open http://localhost:3100. You should see Earth with the current ISS
group (ISS, POISK, CSS, etc.) — click a satellite for its info panel, then
"Track Satellite" to have the camera follow it. Use the group dropdown to
switch to Starlink, GPS, or Weather satellites.

## Configuration

**Frontend** (`frontend/.env.local`, gitignored):

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:5243
NEXT_PUBLIC_CESIUM_ION_TOKEN=            # optional but recommended — see below
```

`NEXT_PUBLIC_CESIUM_ION_TOKEN` unlocks Bing-quality world imagery and removes
Cesium's default-token nag banner. Get a free one at
[ion.cesium.com/tokens](https://ion.cesium.com/tokens). Both vars are baked
into the client bundle at *build* time, so they must be set before `npm run
build` runs, not just at runtime.

**Backend** (`FrontendOrigins` config key / env var):

Comma-separated list of allowed CORS origins, e.g.
`https://my-app.vercel.app`. Falls back to `http://localhost:3100` for local
dev. ASP.NET Core maps environment variables onto configuration keys
automatically, so setting a `FrontendOrigins` env var on the host is enough —
no code change needed.

## Notes

- TLE data is cached server-side per group (2 hours, matching CelesTrak's own
  update cadence — they rate-limit repeat requests for the same group).
  Positions are recomputed from the cached TLE on every request.
- Cesium's static assets (workers, textures, widget CSS) are copied into
  `frontend/public/cesium` by a `postinstall` script — no bundler plugin
  required, so it works with both Turbopack and webpack.
- Satellite illumination/eclipse and pass visibility use a simplified
  cylindrical Earth-shadow model — accurate to within about a minute of the
  true terminator crossing, the same approximation most simple trackers use.

## Not built

- Time travel (see satellite positions at an arbitrary past/future time) —
  intentionally dropped from the original plan.
