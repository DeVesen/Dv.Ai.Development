namespace Generic.Rtk.Models;

public sealed class FilterDiagnostic
{
    public required string Message { get; init; }
    public string? File { get; init; }
    public int? Line { get; init; }
    public int? Column { get; init; }
    public string? Code { get; init; }
    public required FilterSeverity Severity { get; init; }
    public string? Source { get; init; }
    public string? StackTrace { get; init; }
    public string? RawLine { get; init; }
}
