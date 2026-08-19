namespace SatelliteTracker.Api.Models;

public record OverheadSatelliteDto(
    int NoradId,
    string Name,
    string Category,
    double AzimuthDeg,
    double ElevationDeg,
    double RangeKm,
    double Latitude,
    double Longitude,
    double AltitudeKm,
    bool IsSunlit);
