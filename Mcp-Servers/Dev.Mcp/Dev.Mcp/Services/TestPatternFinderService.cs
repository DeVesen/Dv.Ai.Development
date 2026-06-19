using Dev.Mcp.Models;

namespace Dev.Mcp.Services;

public sealed class TestPatternFinderService
{
    private const int SnippetLines = 40;

    public TestPatternResult FindTestPattern(string root, string kind, string? referenceFilePath = null, int maxResults = 3)
    {
        var normalizedRoot = Path.GetFullPath(root.Trim());
        var glob = kind == "angular-spec" ? "*.spec.ts" : "*.cs";

        var candidates = EnumerateFiles(normalizedRoot, glob)
            .Where(f => MatchesKind(f, kind))
            .ToList();

        string? refDir = null;
        if (!string.IsNullOrWhiteSpace(referenceFilePath))
        {
            try { refDir = Path.GetDirectoryName(Path.GetFullPath(referenceFilePath.Trim())); }
            catch { /* ignore invalid path */ }
        }

        var ranked = refDir != null
            ? candidates.OrderBy(f => FolderDistance(Path.GetDirectoryName(f) ?? string.Empty, refDir)).ThenBy(f => f)
            : candidates.OrderBy(f => f);

        var patterns = ranked.Take(Math.Max(1, maxResults)).Select(f => new TestPatternMatch(
            FilePath: f,
            Snippet: ReadFirstLines(f, SnippetLines),
            SimilarityReason: BuildSimilarityReason(f, refDir, normalizedRoot)
        )).ToList();

        return new TestPatternResult(patterns);
    }

    private static IEnumerable<string> EnumerateFiles(string root, string glob)
    {
        try { return Directory.EnumerateFiles(root, glob, SearchOption.AllDirectories); }
        catch { return []; }
    }

    private static bool MatchesKind(string filePath, string kind)
    {
        var name = Path.GetFileName(filePath);
        return kind == "angular-spec"
            ? name.EndsWith(".spec.ts", StringComparison.OrdinalIgnoreCase)
            : (name.EndsWith("Tests.cs", StringComparison.OrdinalIgnoreCase) || name.EndsWith("Test.cs", StringComparison.OrdinalIgnoreCase));
    }

    private static string ReadFirstLines(string filePath, int count)
    {
        try
        {
            var lines = File.ReadLines(filePath).Take(count).ToArray();
            return string.Join('\n', lines);
        }
        catch { return string.Empty; }
    }

    private static int FolderDistance(string dir1, string dir2)
    {
        var sep = Path.DirectorySeparatorChar;
        var p1 = dir1.Split(sep, StringSplitOptions.RemoveEmptyEntries);
        var p2 = dir2.Split(sep, StringSplitOptions.RemoveEmptyEntries);
        var common = 0;
        while (common < p1.Length && common < p2.Length
               && string.Equals(p1[common], p2[common], StringComparison.OrdinalIgnoreCase))
            common++;
        return (p1.Length - common) + (p2.Length - common);
    }

    private static string BuildSimilarityReason(string filePath, string? refDir, string root)
    {
        if (refDir == null) return "found in search root";
        var fileDir = Path.GetDirectoryName(filePath) ?? string.Empty;
        var distance = FolderDistance(fileDir, refDir);
        if (distance == 0) return "same folder";
        if (distance <= 2) return "nearby folder";
        var relative = Path.GetRelativePath(root, fileDir);
        return $"test area: {relative}";
    }
}
