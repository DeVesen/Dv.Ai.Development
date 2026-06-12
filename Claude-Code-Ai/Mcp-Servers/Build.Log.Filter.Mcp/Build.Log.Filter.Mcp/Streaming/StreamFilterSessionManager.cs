using System.Collections.Concurrent;
using System.Text;
using Build.Log.Filter.Mcp.Filtering;
using Build.Log.Filter.Mcp.Models;

namespace Build.Log.Filter.Mcp.Streaming;

public interface IClock
{
    DateTimeOffset UtcNow { get; }
}

public sealed class SystemClock : IClock
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}

internal sealed class StreamSession
{
    public ToolType ToolType { get; init; }
    public StringBuilder Completed { get; } = new();
    public string Pending { get; set; } = "";
    public DateTimeOffset LastAccessUtc { get; set; }
    public int CharacterCount { get; set; }
}

public sealed class StreamFilterSessionManager
{
    private readonly ConcurrentDictionary<string, StreamSession> _sessions = new();
    private readonly IClock _clock;
    private readonly FilterLimits _limits;

    public StreamFilterSessionManager(IClock clock, FilterLimits? limits = null)
    {
        _clock = clock;
        _limits = limits ?? new FilterLimits();
    }

    public FilterResult AppendAndFilter(
        string sessionId,
        ToolType toolType,
        string chunk,
        bool isFinal,
        OutputFilterService filterService)
    {
        if (chunk.Length > _limits.MaxChunkLength)
        {
            return new FilterResult
            {
                Summary = new FilterSummary { Status = "Failed" },
                Errors =
                [
                    new FilterDiagnostic
                    {
                        Message = $"Chunk length exceeds MaxChunkLength {_limits.MaxChunkLength}.",
                        Severity = FilterSeverity.Error,
                    },
                ],
            };
        }

        var session = _sessions.GetOrAdd(sessionId, _ => new StreamSession { ToolType = toolType, LastAccessUtc = _clock.UtcNow });

        if (session.ToolType != toolType)
        {
            return new FilterResult
            {
                Summary = new FilterSummary { Status = "Failed" },
                Errors =
                [
                    new FilterDiagnostic
                    {
                        Message = $"Session {sessionId} was started with {session.ToolType}, but chunk used {toolType}.",
                        Severity = FilterSeverity.Error,
                    },
                ],
            };
        }

        if (_sessions.Count > _limits.MaxConcurrentSessions && !_sessions.ContainsKey(sessionId))
        {
            return new FilterResult
            {
                Summary = new FilterSummary { Status = "Failed" },
                Errors =
                [
                    new FilterDiagnostic
                    {
                        Message = $"Too many concurrent sessions (max {_limits.MaxConcurrentSessions}).",
                        Severity = FilterSeverity.Error,
                    },
                ],
            };
        }

        session.LastAccessUtc = _clock.UtcNow;

        var toAppend = session.Pending + chunk;
        var lastBreak = toAppend.LastIndexOf('\n');
        string completedPart;
        string pending;

        if (lastBreak >= 0)
        {
            completedPart = toAppend[..lastBreak];
            pending = toAppend[(lastBreak + 1)..];
        }
        else
        {
            completedPart = "";
            pending = toAppend;
        }

        if (completedPart.Length > 0)
        {
            if (session.CharacterCount + completedPart.Length > _limits.MaxSessionCharacters)
            {
                return OverLimit(sessionId);
            }

            session.Completed.Append(completedPart).Append('\n');
            session.CharacterCount += completedPart.Length + 1;
        }

        if (isFinal)
        {
            if (pending.Length > 0)
            {
                if (session.CharacterCount + pending.Length > _limits.MaxSessionCharacters)
                {
                    return OverLimit(sessionId);
                }

                session.Completed.AppendLine(pending);
                session.CharacterCount += pending.Length + 1;
            }

            pending = "";
        }

        session.Pending = pending;

        TtlCleanup();

        var fullText = session.Completed.ToString();
        var result = filterService.Filter(fullText, toolType, _limits);

        if (isFinal)
        {
            _sessions.TryRemove(sessionId, out _);
        }

        return result;

        FilterResult OverLimit(string sid)
        {
            _sessions.TryRemove(sid, out _);
            return new FilterResult
            {
                Summary = new FilterSummary { Status = "Failed" },
                Errors =
                [
                    new FilterDiagnostic
                    {
                        Message = "Session buffer exceeded MaxSessionCharacters; session cleared.",
                        Severity = FilterSeverity.Error,
                    },
                ],
            };
        }
    }

    public void TtlCleanup()
    {
        var cutoff = _clock.UtcNow - _limits.SessionTtl;
        foreach (var kv in _sessions)
        {
            if (kv.Value.LastAccessUtc < cutoff)
            {
                _sessions.TryRemove(kv.Key, out _);
            }
        }
    }
}
