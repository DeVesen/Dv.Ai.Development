namespace Dev.Dotnet.Mcp.Web;

public sealed record ToolCallRecord(
    string Id,
    DateTime Timestamp,
    string Tool,
    string Params,
    int OutputChars,
    long DurationMs,
    string Preview,
    string ConsoleOutput);
