using Dev.Mcp.Models;

namespace Dev.Mcp.Services;

public sealed class RawFileReadService
{
    private const int MaxLines = 2000;

    public FileRawResult ReadRaw(string filePath, int? lineStart, int? lineEnd)
    {
        var allLines = File.ReadAllLines(filePath);
        var totalLines = allLines.Length;

        var start = Math.Max(1, lineStart ?? 1);
        var end = lineEnd.HasValue
            ? Math.Min(totalLines, lineEnd.Value)
            : Math.Min(totalLines, start + MaxLines - 1);

        if (end - start + 1 > MaxLines) end = start + MaxLines - 1;
        if (start > totalLines) start = totalLines;
        if (end < start) end = start;

        var lines = allLines[(start - 1)..end];
        return new FileRawResult(lines, totalLines, start, end);
    }
}
