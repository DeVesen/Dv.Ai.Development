using Dev.Filesystem.Mcp.Models;

namespace Dev.Filesystem.Mcp.Services;

public sealed class GlobSearchService
{
    public IReadOnlyList<FileMatchResult> FindFile(string root, string pattern, int maxResults)
    {
        maxResults = Math.Clamp(maxResults, 1, 100);
        var globPattern = GlobMatcher.NormalizePattern(pattern);
        var results = new List<FileMatchResult>(maxResults);
        var rootPrefix = root.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;

        foreach (var file in GlobMatcher.EnumerateFiles(root))
        {
            if (!PathValidator.IsUnderRoot(file, root))
                continue;

            var relative = file.StartsWith(rootPrefix, StringComparison.OrdinalIgnoreCase)
                ? file[rootPrefix.Length..]
                : Path.GetRelativePath(root, file);

            if (!GlobMatcher.IsMatch(relative, globPattern))
                continue;

            long size;
            try
            {
                size = new FileInfo(file).Length;
            }
            catch
            {
                size = 0;
            }

            results.Add(new FileMatchResult(file, relative.Replace('\\', '/'), size));
            if (results.Count >= maxResults)
                break;
        }

        return results;
    }
}
