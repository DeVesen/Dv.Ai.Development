using System.Text;
using Build.Log.Filter.Models;

namespace Build.Log.Filter.Filtering;

public sealed class OutputFilterService
{
    private readonly IReadOnlyDictionary<ToolType, IToolOutputParser> _parsers;
    private readonly OutputNormalizer _normalizer;

    public OutputFilterService(IEnumerable<IToolOutputParser> parsers, OutputNormalizer normalizer)
    {
        _normalizer = normalizer;
        _parsers = parsers.ToDictionary(p => p.ToolType);
    }

    public FilterResult Filter(string raw, ToolType toolType, FilterLimits limits)
    {
        if (raw.Length > limits.MaxRawLength)
        {
            return new FilterResult
            {
                Summary = new FilterSummary { Status = "Failed" },
                Errors =
                [
                    new FilterDiagnostic
                    {
                        Message = $"Input length {raw.Length} exceeds MaxRawLength {limits.MaxRawLength}.",
                        Severity = FilterSeverity.Error,
                    },
                ],
            };
        }

        var normalized = _normalizer.Normalize(raw);
        if (!_parsers.TryGetValue(toolType, out var parser))
            throw new InvalidOperationException($"No parser registered for {toolType}.");

        var result = parser.Parse(normalized, limits);

        result.RawFiltered = TrimRawFiltered(result.RawFiltered, limits.MaxRawFilteredLength);
        return result;
    }

    private static string TrimRawFiltered(string raw, int maxLen)
    {
        if (raw.Length <= maxLen) return raw;
        var sb = new StringBuilder(maxLen + 64);
        sb.Append(raw.AsSpan(0, maxLen));
        sb.AppendLine();
        sb.AppendLine($"… truncated raw_filtered to {maxLen} characters …");
        return sb.ToString();
    }
}
