using System.Text.RegularExpressions;
using Dev.WindowsService.Mcp.Models;

namespace Dev.WindowsService.Mcp.Services;

public sealed class ContentSearchService
{
    public IReadOnlyList<ContentMatchResult> FindByContent(
        string root, string pattern, string? fileGlob, int maxResults)
    {
        maxResults = Math.Clamp(maxResults, 1, 100);
        var regex = BuildRegex(pattern);
        var fileFilter = string.IsNullOrWhiteSpace(fileGlob) ? null : GlobMatcher.NormalizePattern(fileGlob);
        var results = new List<ContentMatchResult>(maxResults);
        var rootPrefix = root.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;

        foreach (var file in GlobMatcher.EnumerateFiles(root))
        {
            if (!PathValidator.IsUnderRoot(file, root)) continue;

            var ext = Path.GetExtension(file);
            if (ext is not (".cs" or ".ts" or ".tsx" or ".js" or ".jsx" or ".json" or ".md" or ".xml" or ".html" or ".css" or ".scss"))
                continue;

            if (fileFilter is not null)
            {
                var relative = file.StartsWith(rootPrefix, StringComparison.OrdinalIgnoreCase)
                    ? file[rootPrefix.Length..]
                    : Path.GetRelativePath(root, file);
                if (!GlobMatcher.IsMatch(relative.Replace('\\', '/'), fileFilter)) continue;
            }

            string[] lines;
            try { lines = File.ReadAllLines(file); }
            catch { continue; }

            for (var i = 0; i < lines.Length; i++)
            {
                var line = lines[i];
                if (!regex.IsMatch(line)) continue;

                var match = regex.Match(line).Value;
                if (string.IsNullOrEmpty(match)) match = line.Trim();

                results.Add(new ContentMatchResult(file, i + 1, match));
                if (results.Count >= maxResults) return results;
            }
        }

        return results;
    }

    private static Regex BuildRegex(string pattern)
    {
        try { return new Regex(pattern, RegexOptions.CultureInvariant); }
        catch { return new Regex(Regex.Escape(pattern), RegexOptions.CultureInvariant); }
    }
}
