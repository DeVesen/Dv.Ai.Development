namespace Generic.Rtk.Models;

/// <summary>
/// Compact aggregate stats for the originating tool. Optional fields are omitted in JSON when null.
/// </summary>
public sealed class FilterSummary
{
    public string? Status { get; set; }

    public int? Errors { get; set; }
    public int? Warnings { get; set; }
    public int? Passed { get; set; }
    public int? Failed { get; set; }
    public int? Skipped { get; set; }
    public int? TotalTests { get; set; }
    public int? Total { get; set; }

    public int? Chunks { get; set; }
    public string? Time { get; set; }
    public string? Duration { get; set; }
}
