using SatelliteTracker.Api.Models;
using SGPdotNET.CoordinateSystem;
using SGPdotNET.Observation;
using SGPdotNET.Propagation.Bodies;
using SGPdotNET.Util;

namespace SatelliteTracker.Api.Services;

// Wraps SGP.NET to turn a TLE into a current lat/lon/altitude/speed fix.
public class PropagationService
{
    private const double EarthRadiusKm = 6371.0;

    // Standard "dark enough to see a satellite" threshold (civil twilight),
    // same convention used by tools like Heavens-Above for pass visibility.
    private const double DarkSkySunElevationDeg = -6.0;

    private readonly ILogger<PropagationService> _logger;

    public PropagationService(ILogger<PropagationService> logger)
    {
        _logger = logger;
    }

    // Simplified cylindrical Earth-shadow model: a satellite is eclipsed if
    // it's on the night side of Earth's center (angle to the sun > 90°) and
    // within a cylinder the width of Earth extending away from the sun. This
    // ignores the sun's finite angular size (no separate umbra/penumbra), but
    // is accurate to well within a minute of the true entry/exit time — the
    // same approximation most simple satellite trackers use.
    private static bool IsSunlit(EciCoordinate satelliteEci, EciCoordinate sunEci)
    {
        var satPos = satelliteEci.Position;
        var sunPos = sunEci.Position;

        var cosAngle = satPos.Dot(sunPos) / (satPos.Length * sunPos.Length);
        cosAngle = Math.Clamp(cosAngle, -1.0, 1.0);
        var angle = Math.Acos(cosAngle);

        if (angle < Math.PI / 2)
            return true;

        var shadowRadiusKm = satPos.Length * Math.Sin(angle);
        return shadowRadiusKm > EarthRadiusKm;
    }

    public SatelliteDetailDto GetCurrentPosition(SatelliteRecord record)
    {
        var satellite = new Satellite(record.Name, record.Tle1, record.Tle2);
        var timestamp = DateTime.UtcNow;
        var eci = satellite.Predict(timestamp);
        var geo = eci.ToGeodetic();
        var speedKmH = eci.Velocity.Length * 3600.0;
        var isSunlit = IsSunlit(eci, Sun.Predict(timestamp));

        return new SatelliteDetailDto(
            record.NoradId,
            record.Name,
            record.Category,
            record.Tle1,
            record.Tle2,
            geo.Latitude.Degrees,
            geo.Longitude.Degrees,
            geo.Altitude,
            speedKmH,
            isSunlit,
            timestamp);
    }

    public SatelliteSummaryDto GetCurrentSummary(SatelliteRecord record)
    {
        var detail = GetCurrentPosition(record);
        return new SatelliteSummaryDto(
            detail.NoradId,
            detail.Name,
            detail.Category,
            detail.Latitude,
            detail.Longitude,
            detail.AltitudeKm,
            detail.SpeedKmH,
            detail.IsSunlit);
    }

    // SGP4 throws for a small number of real-world TLEs (typically decayed or
    // otherwise degenerate orbital elements — e.g. old debris) rather than
    // returning a bad-but-valid position. That's a per-satellite data problem,
    // not a request-level failure, so callers building a list should skip the
    // one bad entry instead of the whole list blowing up. Single-satellite
    // lookups (GetById, orbit) intentionally don't use this — if the one
    // satellite you asked for can't be propagated, that IS the answer.
    public SatelliteSummaryDto? TryGetCurrentSummary(SatelliteRecord record)
    {
        try
        {
            return GetCurrentSummary(record);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to propagate satellite {NoradId} ({Name}); skipping", record.NoradId, record.Name);
            return null;
        }
    }

    // Traces one full revolution starting now, so the polyline forms a closed
    // ring showing the satellite's current ground track around the Earth.
    public SatelliteOrbitDto GetOrbitPath(SatelliteRecord record, int sampleCount = 90)
    {
        var satellite = new Satellite(record.Name, record.Tle1, record.Tle2);
        var periodMinutes = satellite.Orbit.Period;
        var now = DateTime.UtcNow;

        var points = new List<OrbitPointDto>(sampleCount + 1);
        for (var i = 0; i <= sampleCount; i++)
        {
            var timestamp = now.AddMinutes(periodMinutes * i / sampleCount);
            var geo = satellite.Predict(timestamp).ToGeodetic();
            points.Add(new OrbitPointDto(geo.Latitude.Degrees, geo.Longitude.Degrees, geo.Altitude, timestamp));
        }

        return new SatelliteOrbitDto(record.NoradId, periodMinutes, points);
    }

    // Which of the given satellites are currently above minElevationDeg as
    // seen from a ground location — i.e. actually visible overhead right now.
    public IReadOnlyList<OverheadSatelliteDto> GetOverhead(
        IEnumerable<SatelliteRecord> records,
        double observerLat,
        double observerLon,
        double observerAltKm,
        double minElevationDeg)
    {
        var groundStation = new GroundStation(
            new GeodeticCoordinate(Angle.FromDegrees(observerLat), Angle.FromDegrees(observerLon), observerAltKm));
        var now = DateTime.UtcNow;
        var sunEci = Sun.Predict(now);

        var results = new List<OverheadSatelliteDto>();
        foreach (var record in records)
        {
            TopocentricObservation observation;
            SGPdotNET.CoordinateSystem.GeodeticCoordinate geo;
            bool isSunlit;
            try
            {
                var satellite = new Satellite(record.Name, record.Tle1, record.Tle2);
                var eci = satellite.Predict(now);
                observation = groundStation.Observe(eci, now);
                geo = eci.ToGeodetic();
                isSunlit = IsSunlit(eci, sunEci);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to propagate satellite {NoradId} ({Name}); skipping", record.NoradId, record.Name);
                continue;
            }

            if (observation.Elevation.Degrees < minElevationDeg)
                continue;

            results.Add(new OverheadSatelliteDto(
                record.NoradId,
                record.Name,
                record.Category,
                observation.Azimuth.Degrees,
                observation.Elevation.Degrees,
                observation.Range,
                geo.Latitude.Degrees,
                geo.Longitude.Degrees,
                geo.Altitude,
                isSunlit));
        }

        return results.OrderByDescending(r => r.ElevationDeg).ToList();
    }

    // Upcoming windows where this satellite rises above minElevationDeg as
    // seen from a ground location, scanning from now out to hoursAhead.
    public IReadOnlyList<SatellitePassDto> GetUpcomingPasses(
        SatelliteRecord record,
        double observerLat,
        double observerLon,
        double observerAltKm,
        double minElevationDeg,
        int hoursAhead)
    {
        var groundStation = new GroundStation(
            new GeodeticCoordinate(Angle.FromDegrees(observerLat), Angle.FromDegrees(observerLon), observerAltKm));
        var satellite = new Satellite(record.Name, record.Tle1, record.Tle2);

        var start = DateTime.UtcNow;
        var end = start.AddHours(hoursAhead);

        // 30s scan step reliably catches passes even a few minutes long
        // without being slow enough to matter for a multi-day window.
        var periods = groundStation.Observe(
            satellite, start, end, TimeSpan.FromSeconds(30), Angle.FromDegrees(minElevationDeg));

        return periods
            .Select(p =>
            {
                var satEciAtMax = satellite.Predict(p.MaxElevationTime);
                var sunEciAtMax = Sun.Predict(p.MaxElevationTime);
                var sunlit = IsSunlit(satEciAtMax, sunEciAtMax);
                var sunElevationDeg = groundStation.Observe(sunEciAtMax, p.MaxElevationTime).Elevation.Degrees;
                var skyIsDark = sunElevationDeg < DarkSkySunElevationDeg;

                var visibility = !sunlit ? "eclipsed" : skyIsDark ? "visible" : "daylight";

                return new SatellitePassDto(
                    p.Start,
                    p.End,
                    p.MaxElevationTime,
                    p.MaxElevation.Degrees,
                    (p.End - p.Start).TotalMinutes,
                    visibility);
            })
            .ToList();
    }

    // The orbit's shape (period, inclination, eccentricity, perigee/apogee)
    // rather than a single position fix — what "satellite comparison" needs.
    public OrbitalElementsDto GetOrbitalElements(SatelliteRecord record)
    {
        var satellite = new Satellite(record.Name, record.Tle1, record.Tle2);
        var now = DateTime.UtcNow;
        var eci = satellite.Predict(now);
        var speedKmH = eci.Velocity.Length * 3600.0;
        var orbit = satellite.Orbit;

        return new OrbitalElementsDto(
            record.NoradId,
            record.Name,
            record.Category,
            orbit.Period,
            orbit.Inclination.Degrees,
            orbit.Eccentricity,
            orbit.Perigee,
            orbit.Apogee,
            eci.ToGeodetic().Altitude,
            speedKmH);
    }
}
