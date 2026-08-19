using Microsoft.AspNetCore.Mvc;
using SatelliteTracker.Api.Services;

namespace SatelliteTracker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SatellitesController : ControllerBase
{
    private readonly TleCacheService _tleCache;
    private readonly PropagationService _propagation;

    public SatellitesController(TleCacheService tleCache, PropagationService propagation)
    {
        _tleCache = tleCache;
        _propagation = propagation;
    }

    // GET /api/satellites?group=stations
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? group, CancellationToken ct)
    {
        var records = await _tleCache.GetAllAsync(ct);

        if (!string.IsNullOrWhiteSpace(group))
            records = records.Where(r => r.Category.Equals(group, StringComparison.OrdinalIgnoreCase)).ToList();

        var summaries = records.Select(_propagation.TryGetCurrentSummary).Where(s => s is not null);
        return Ok(summaries);
    }

    // GET /api/satellites/groups
    [HttpGet("groups")]
    public IActionResult GetGroups()
    {
        return Ok(_tleCache.GroupNames);
    }

    // GET /api/satellites/search?q=iss
    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string? q, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(q))
            return Ok(Array.Empty<object>());

        var matches = await _tleCache.SearchAsync(q.Trim(), limit: 15, ct);
        return Ok(matches.Select(_propagation.TryGetCurrentSummary).Where(s => s is not null));
    }

    // GET /api/satellites/overhead?lat=40.7&lon=-74&alt=0&minElevation=10
    [HttpGet("overhead")]
    public async Task<IActionResult> GetOverhead(
        [FromQuery] double lat,
        [FromQuery] double lon,
        [FromQuery] double alt = 0,
        [FromQuery] double minElevation = 10,
        CancellationToken ct = default)
    {
        if (lat is < -90 or > 90)
            return BadRequest("lat must be between -90 and 90.");
        if (lon is < -180 or > 180)
            return BadRequest("lon must be between -180 and 180.");

        var records = await _tleCache.GetAllAsync(ct);
        var overhead = _propagation.GetOverhead(records, lat, lon, alt, minElevation);
        return Ok(overhead);
    }

    // GET /api/satellites/25544
    [HttpGet("{noradId:int}")]
    public async Task<IActionResult> GetById(int noradId, CancellationToken ct)
    {
        var record = await _tleCache.GetByIdAsync(noradId, ct);
        if (record is null)
            return NotFound();

        return Ok(_propagation.GetCurrentPosition(record));
    }

    // GET /api/satellites/25544/orbit
    [HttpGet("{noradId:int}/orbit")]
    public async Task<IActionResult> GetOrbit(int noradId, CancellationToken ct)
    {
        var record = await _tleCache.GetByIdAsync(noradId, ct);
        if (record is null)
            return NotFound();

        return Ok(_propagation.GetOrbitPath(record));
    }

    // GET /api/satellites/25544/passes?lat=40.7&lon=-74&alt=0&minElevation=10&hours=72
    [HttpGet("{noradId:int}/passes")]
    public async Task<IActionResult> GetPasses(
        int noradId,
        [FromQuery] double lat,
        [FromQuery] double lon,
        [FromQuery] double alt = 0,
        [FromQuery] double minElevation = 10,
        [FromQuery] int hours = 72,
        CancellationToken ct = default)
    {
        if (lat is < -90 or > 90)
            return BadRequest("lat must be between -90 and 90.");
        if (lon is < -180 or > 180)
            return BadRequest("lon must be between -180 and 180.");
        if (hours is < 1 or > 240)
            return BadRequest("hours must be between 1 and 240.");

        var record = await _tleCache.GetByIdAsync(noradId, ct);
        if (record is null)
            return NotFound();

        var passes = _propagation.GetUpcomingPasses(record, lat, lon, alt, minElevation, hours);
        return Ok(passes);
    }

    // GET /api/satellites/25544/elements
    [HttpGet("{noradId:int}/elements")]
    public async Task<IActionResult> GetElements(int noradId, CancellationToken ct)
    {
        var record = await _tleCache.GetByIdAsync(noradId, ct);
        if (record is null)
            return NotFound();

        return Ok(_propagation.GetOrbitalElements(record));
    }
}
