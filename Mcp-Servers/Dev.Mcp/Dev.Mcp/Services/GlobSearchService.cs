using Dev.Mcp.Models;

namespace Dev.Mcp.Services;

public sealed class GlobSearchService
{
    public SearchResult<FileMatchResult> FindFile(string root, string pattern, int maxResults)
    {
        maxResults = Math.Clamp(maxResults, 1, 100);
        var globPattern = GlobMatcher.NormalizePattern(pattern);
        var results = new List<FileMatchResult>(maxResults);
        var rootPrefix = root.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;
        var filesScanned = 0;
        var truncated = false;

        foreach (var file in GlobMatcher.EnumerateFiles(root))
        {
            if (!PathValidator.IsUnderRoot(file, root)) continue;
            filesScanned++;

            var relative = file.StartsWith(rootPrefix, StringComparison.OrdinalIgnoreCase)
                ? file[rootPrefix.Length..]
                : Path.GetRelativePath(root, file);

            if (!GlobMatcher.IsMatch(relative, globPattern)) continue;

            long size;
            try { size = new FileInfo(file).Length; }
            catch { size = 0; }

            results.Add(new FileMatchResult(file, relative.Replace('\\', '/'), size));
            if (results.Count >= maxResults) { truncated = true; break; }
        }

        return new SearchResult<FileMatchResult>(results, SearchMeta.Build(truncated, filesScanned, maxResults));
    }
}
