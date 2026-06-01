using System.Collections.Concurrent;
using System.Text;
using Generic.Rtk.Models;

namespace Generic.Rtk.Streaming;

public sealed class FilterCallHistory
{
    private readonly LinkedList<FilterCallRecord> _history = new();
    private readonly ConcurrentDictionary<string, StringBuilder> _streamAccumulators = new();
    private readonly object _lock = new();
    private const int MaxEntries = 20;

    public void Record(FilterCallRecord entry)
    {
        lock (_lock)
        {
            _history.AddLast(entry);
            if (_history.Count > MaxEntries)
                _history.RemoveFirst();
        }
    }

    public List<FilterCallRecord> GetLast(int count)
    {
        lock (_lock)
        {
            return _history.Reverse().Take(count).ToList();
        }
    }

    public FilterCallRecord? GetById(string id)
    {
        lock (_lock)
        {
            return _history.FirstOrDefault(e => e.Id == id);
        }
    }

    public void Clear()
    {
        lock (_lock)
        {
            _history.Clear();
        }
        _streamAccumulators.Clear();
    }

    public void AccumulateStreamInput(string sessionId, string chunk)
    {
        _streamAccumulators.AddOrUpdate(
            sessionId,
            new StringBuilder(chunk),
            (_, existing) => existing.Append(chunk));
    }

    public void RecordStream(string sessionId, string toolType, string outputValue)
    {
        if (_streamAccumulators.TryRemove(sessionId, out var inputBuilder))
        {
            Record(new FilterCallRecord(DateTime.UtcNow, toolType, inputBuilder.ToString(), outputValue));
        }
    }
}
