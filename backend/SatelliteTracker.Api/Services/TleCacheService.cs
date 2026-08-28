using SatelliteTracker.Api.Models;

namespace SatelliteTracker.Api.Services;

// Fetches TLE data from CelesTrak for a small set of satellite groups and
// caches it in memory. Each group is tracked independently: CelesTrak only
// updates a given group every 2 hours and returns 403 with a "data has not
// updated" message if you re-request it sooner, so groups must not all
// share one clock — one group being rate-limited shouldn't nuke the others,
// and a group with no data yet should retry sooner than a healthy one.
public class TleCacheService
{
    private static readonly IReadOnlyDictionary<string, string> Groups = new Dictionary<string, string>
    {
        ["stations"] = "stations",
        ["starlink"] = "starlink",
        ["gps"] = "gps-ops",
        ["weather"] = "weather",
    };

    private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(2);
    private static readonly TimeSpan RetryIntervalWhenEmpty = TimeSpan.FromMinutes(2);

    private readonly HttpClient _http;
    private readonly ILogger<TleCacheService> _logger;
    private readonly SemaphoreSlim _refreshLock = new(1, 1);

    private readonly Dictionary<string, List<SatelliteRecord>> _cacheByCategory = new();
    private readonly Dictionary<string, DateTime> _lastAttemptByCategory = new();

    public TleCacheService(HttpClient http, ILogger<TleCacheService> logger)
    {
        _http = http;
        _logger = logger;
    }

    public IEnumerable<string> GroupNames => Groups.Keys;

    public async Task<IReadOnlyList<SatelliteRecord>> GetAllAsync(CancellationToken ct = default)
    {
        await RefreshStaleGroupsAsync(ct);
        return _cacheByCategory.Values.SelectMany(records => records).ToList();
    }

    public async Task<SatelliteRecord?> GetByIdAsync(int noradId, CancellationToken ct = default)
    {
        await RefreshStaleGroupsAsync(ct);
        return _cacheByCategory.Values.SelectMany(records => records).FirstOrDefault(s => s.NoradId == noradId);
    }

    // Searches across every cached category, regardless of which group the frontend currently has selected.
    public async Task<IReadOnlyList<SatelliteRecord>> SearchAsync(string query, int limit, CancellationToken ct = default)
    {
        await RefreshStaleGroupsAsync(ct);
        return _cacheByCategory.Values
            .SelectMany(records => records)
            .Where(r => r.Name.Contains(query, StringComparison.OrdinalIgnoreCase) || r.NoradId.ToString() == query)
            .Take(limit)
            .ToList();
    }

    private async Task RefreshStaleGroupsAsync(CancellationToken ct)
    {
        var staleCategories = Groups.Keys.Where(IsStale).ToList();
        if (staleCategories.Count == 0)
            return;

        await _refreshLock.WaitAsync(ct);
        try
        {
            // In parallel, not sequential — otherwise one slow/unresponsive
            // category delays every other category behind it in line.
            var refreshTasks = staleCategories.Where(IsStale).Select(category => RefreshOneAsync(category, ct));
            await Task.WhenAll(refreshTasks);
        }
        finally
        {
            _refreshLock.Release();
        }
    }

    private async Task RefreshOneAsync(string category, CancellationToken ct)
    {
        _lastAttemptByCategory[category] = DateTime.UtcNow;
        try
        {
            _cacheByCategory[category] = await FetchGroupAsync(category, Groups[category], ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to refresh TLE group {Category}; keeping previous data if any", category);
        }
    }

    private bool IsStale(string category)
    {
        if (!_lastAttemptByCategory.TryGetValue(category, out var lastAttempt))
            return true;

        var hasData = _cacheByCategory.TryGetValue(category, out var data) && data.Count > 0;
        var interval = hasData ? CacheDuration : RetryIntervalWhenEmpty;
        return DateTime.UtcNow - lastAttempt >= interval;
    }

    private async Task<List<SatelliteRecord>> FetchGroupAsync(string category, string groupParam, CancellationToken ct)
    {
        var url = $"https://celestrak.org/NORAD/elements/gp.php?GROUP={groupParam}&FORMAT=TLE";
        var text = await _http.GetStringAsync(url, ct);
        return ParseTle(text, category);
    }

    private static List<SatelliteRecord> ParseTle(string text, string category)
    {
        var lines = text.Split('\n')
            .Select(l => l.TrimEnd('\r'))
            .Where(l => l.Length > 0)
            .ToArray();

        var records = new List<SatelliteRecord>();
        for (var i = 0; i + 2 < lines.Length; i += 3)
        {
            var name = lines[i].Trim();
            var tle1 = lines[i + 1];
            var tle2 = lines[i + 2];

            if (!tle1.StartsWith("1 ") || !tle2.StartsWith("2 "))
                continue;

            if (!int.TryParse(tle1.AsSpan(2, 5), out var noradId))
                continue;

            records.Add(new SatelliteRecord(noradId, name, category, tle1, tle2));
        }

        return records;
    }
}
