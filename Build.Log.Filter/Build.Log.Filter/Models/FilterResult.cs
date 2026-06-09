namespace Build.Log.Filter.Models;

public sealed class FilterResult
{
    public FilterSummary Summary { get; init; } = new();
    public List<FilterDiagnostic> Errors { get; init; } = [];
    public List<FilterDiagnostic> Warnings { get; init; } = [];
    public string RawFiltered { get; set; } = "";
}
