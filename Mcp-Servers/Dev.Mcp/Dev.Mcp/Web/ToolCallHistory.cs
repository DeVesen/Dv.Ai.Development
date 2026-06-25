using System.Text.Json;

namespace Dev.Mcp.Web;

public sealed class ToolCallHistory
{
    private readonly Dictionary<string, ToolCallRecord> _pending = new();
    private readonly object _pendingLock = new();
    private readonly object _fileLock = new();
    private int _counter;
    private readonly string _logFilePath;
    private const int MaxEntries = 200;

    private static readonly JsonSerializerOptions FileJsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    public ToolCallHistory()
    {
        _logFilePath = Path.Combine(AppContext.BaseDirectory, "tool-calls.ndjson");
    }

    public string StartRecord(string tool, string source, string parameters)
    {
        var id = Interlocked.Increment(ref _counter).ToString();
        var record = new ToolCallRecord(id, DateTime.UtcNow, tool, source, parameters, 0, -1, "⟳ running…", string.Empty);
        lock (_pendingLock) { _pending[id] = record; }
        return id;
    }

    public ToolCallRecord Complete(string pendingId, string output, string consoleOutput, long durationMs)
    {
        ToolCallRecord? pending;
        lock (_pendingLock)
        {
            _pending.TryGetValue(pendingId, out pending);
            _pending.Remove(pendingId);
        }
        var preview = output.Length <= 500 ? output : output[..500];
        var completed = pending is not null
            ? pending with { OutputChars = output.Length, DurationMs = durationMs, Preview = preview, ConsoleOutput = consoleOutput }
            : new ToolCallRecord(pendingId, DateTime.UtcNow, "unknown", "unknown", "{}", output.Length, durationMs, preview, consoleOutput);
        AppendToFile(completed);
        return completed;
    }

    public ToolCallRecord Record(string tool, string source, string parameters, string output, string consoleOutput, long durationMs)
    {
        var preview = output.Length <= 500 ? output : output[..500];
        var record = new ToolCallRecord(
            Interlocked.Increment(ref _counter).ToString(),
            DateTime.UtcNow, tool, source, parameters, output.Length, durationMs, preview, consoleOutput);
        AppendToFile(record);
        return record;
    }

    public List<ToolCallRecord> GetAll()
    {
        var fileRecords = ReadFromFile();
        List<ToolCallRecord> pending;
        lock (_pendingLock) { pending = [.. _pending.Values.OrderByDescending(r => r.Timestamp)]; }
        return [.. pending.Concat(fileRecords).Take(MaxEntries)];
    }

    public void Remove(string id)
    {
        bool wasInPending;
        lock (_pendingLock) { wasInPending = _pending.Remove(id); }
        if (!wasInPending) RemoveFromFile(id);
    }

    public void Clear()
    {
        lock (_pendingLock) { _pending.Clear(); }
        try { lock (_fileLock) { File.Delete(_logFilePath); } } catch { }
    }

    private void AppendToFile(ToolCallRecord record)
    {
        try
        {
            var line = JsonSerializer.Serialize(record, FileJsonOpts) + "\n";
            lock (_fileLock) { File.AppendAllText(_logFilePath, line); }
        }
        catch { }
    }

    private List<ToolCallRecord> ReadFromFile()
    {
        if (!File.Exists(_logFilePath)) return [];
        try
        {
            string[] lines;
            lock (_fileLock) { lines = File.ReadAllLines(_logFilePath); }
            return [.. lines
                .Where(l => !string.IsNullOrWhiteSpace(l))
                .TakeLast(MaxEntries)
                .Select(l =>
                {
                    try { return JsonSerializer.Deserialize<ToolCallRecord>(l, FileJsonOpts); }
                    catch { return null; }
                })
                .Where(r => r is not null)
                .Select(r => r!)
                .OrderByDescending(r => r.Timestamp)];
        }
        catch { return []; }
    }

    private void RemoveFromFile(string id)
    {
        if (!File.Exists(_logFilePath)) return;
        try
        {
            lock (_fileLock)
            {
                var lines = File.ReadAllLines(_logFilePath);
                var filtered = lines.Where(l =>
                {
                    if (string.IsNullOrWhiteSpace(l)) return false;
                    try { return JsonSerializer.Deserialize<ToolCallRecord>(l, FileJsonOpts)?.Id != id; }
                    catch { return true; }
                }).ToArray();
                File.WriteAllLines(_logFilePath, filtered);
            }
        }
        catch { }
    }
}
