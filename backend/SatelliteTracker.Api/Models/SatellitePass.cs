namespace SatelliteTracker.Api.Models;

// Visibility is classified at the pass's peak moment:
//   "visible"  — satellite is sunlit and the observer's sky is dark enough to see it
//   "daylight" — satellite is sunlit but the observer's sky is too bright
//   "eclipsed" — satellite is in Earth's shadow, invisible regardless of sky darkness
public record SatellitePassDto(
    DateTime StartUtc,
    DateTime EndUtc,
    DateTime MaxElevationTimeUtc,
    double MaxElevationDeg,
    double DurationMinutes,
    string Visibility);
