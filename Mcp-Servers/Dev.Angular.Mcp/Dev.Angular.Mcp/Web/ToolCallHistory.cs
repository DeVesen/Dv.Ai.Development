namespace Dev.Angular.Mcp.Web;

public sealed class ToolCallHistory
{
    private readonly LinkedList<ToolCallRecord> _history = new();
    private readonly object _lock = new();
    private int _counter;
    private const int MaxEntries = 200;

    public ToolCallRecord Record(string tool, string parameters, string output, string consoleOutput, long durationMs)
    {
        var preview = output.Length <= 500 ? output : output[..500];
        var record = new ToolCallRecord(
            Id: Interlocked.Increment(ref _counter).ToString(),
            Timestamp: DateTime.UtcNow,
            Tool: tool,
            Params: parameters,
            OutputChars: output.Length,
            DurationMs: durationMs,
            Preview: preview,
            ConsoleOutput: consoleOutput);

        lock (_lock)
        {
            _history.AddFirst(record);
            if (_history.Count > MaxEntries)
                _history.RemoveLast();
        }

        return record;
    }

    public List<ToolCallRecord> GetAll()
    {
        lock (_lock)
        {
            return _history.ToList();
        }
    }

    public void Remove(string id)
    {
        lock (_lock)
        {
            var node = _history.First;
            while (node is not null)
            {
                if (node.Value.Id == id)
                {
                    _history.Remove(node);
                    return;
                }

                node = node.Next;
            }
        }
    }

    public void Clear()
    {
        lock (_lock)
        {
            _history.Clear();
        }
    }
}
