namespace SatelliteTracker.Api.Models;

public record OrbitalElementsDto(
    int NoradId,
    string Name,
    string Category,
    double PeriodMinutes,
    double InclinationDeg,
    double Eccentricity,
    double PerigeeKm,
    double ApogeeKm,
    double CurrentAltitudeKm,
    double CurrentSpeedKmH);
