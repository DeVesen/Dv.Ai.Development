namespace Dev.Mcp.Models;

public sealed record FileMatchResult(string Path, string Relative, long SizeBytes);

public sealed record ContentMatchResult(string File, int Line, string Match);

public sealed record ImplementationMatchResult(string ClassName, string File, int Line);

public sealed record SignatureEntry(string Type, string Access, string Signature, int Line);

public sealed record MethodReadResult(string Signature, string Body, int StartLine, int EndLine);

public sealed record ClassPropertySummary(string Name, string Type, string Access);

public sealed record ClassMethodSummary(
    string Name,
    string ReturnType,
    IReadOnlyList<string> Params,
    int Line);

public sealed record ClassSummaryResult(
    string ClassName,
    string? BaseClass,
    IReadOnlyList<string> Interfaces,
    IReadOnlyList<ClassPropertySummary> Properties,
    IReadOnlyList<ClassMethodSummary> Methods);

public sealed record FileRawResult(string[] Lines, int TotalLines, int LineStart, int LineEnd);

public sealed record DirectoryEntry(string Name, string Type, string Path, long? SizeBytes, IReadOnlyList<DirectoryEntry>? Children);

public sealed record TestPatternMatch(string FilePath, string Snippet, string SimilarityReason);

public sealed record TestPatternResult(IReadOnlyList<TestPatternMatch> Patterns);

public record SearchMeta(bool Truncated, string Reason, int FilesScanned, string? Hint)
{
    public static SearchMeta Build(bool truncated, int filesScanned, int maxResults) =>
        new(truncated,
            truncated ? "max_results_reached" : "none",
            filesScanned,
            truncated ? $"Results capped at {maxResults}. Increase max_results or narrow root." : null);
}

public record SearchResult<T>(IReadOnlyList<T> Results, SearchMeta Meta);
