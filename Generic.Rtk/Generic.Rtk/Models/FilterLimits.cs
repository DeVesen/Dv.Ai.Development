namespace Generic.Rtk.Models;

public sealed record FilterLimits(
    int MaxRawLength = 5_000_000,
    int MaxChunkLength = 256_000,
    int MaxSessionCharacters = 5_000_000,
    int MaxRawFilteredLength = 2_000_000,
    int MaxConcurrentSessions = 1024,
    TimeSpan SessionTtl = default)
{
    public TimeSpan SessionTtl { get; init; } = SessionTtl == default ? TimeSpan.FromMinutes(30) : SessionTtl;
}
