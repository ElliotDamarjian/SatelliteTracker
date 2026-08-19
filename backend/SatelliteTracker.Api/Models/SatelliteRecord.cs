namespace SatelliteTracker.Api.Models;

public record SatelliteRecord(int NoradId, string Name, string Category, string Tle1, string Tle2);

public record SatelliteSummaryDto(
    int NoradId,
    string Name,
    string Category,
    double Latitude,
    double Longitude,
    double AltitudeKm,
    double SpeedKmH,
    bool IsSunlit);

public record SatelliteDetailDto(
    int NoradId,
    string Name,
    string Category,
    string Tle1,
    string Tle2,
    double Latitude,
    double Longitude,
    double AltitudeKm,
    double SpeedKmH,
    bool IsSunlit,
    DateTime TimestampUtc);
