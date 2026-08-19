namespace SatelliteTracker.Api.Models;

public record OrbitPointDto(double Latitude, double Longitude, double AltitudeKm, DateTime TimestampUtc);

public record SatelliteOrbitDto(int NoradId, double PeriodMinutes, IReadOnlyList<OrbitPointDto> Points);
