using System.Text.RegularExpressions;

namespace Dev.Mcp.Services;

internal static class GlobMatcher
{
    private static readonly HashSet<string> SkipDirectories = new(StringComparer.OrdinalIgnoreCase)
    {
        ".git", ".svn", "bin", "obj", "node_modules", ".vs", "dist", "coverage"
    };

    public static IEnumerable<string> EnumerateFiles(string root)
    {
        var stack = new Stack<string>();
        stack.Push(root);

        while (stack.Count > 0)
        {
            var current = stack.Pop();

            IEnumerable<string> dirs;
            try { dirs = Directory.EnumerateDirectories(current); }
            catch (UnauthorizedAccessException) { continue; }

            foreach (var dir in dirs)
            {
                var name = Path.GetFileName(dir);
                if (!SkipDirectories.Contains(name))
                    stack.Push(dir);
            }

            IEnumerable<string> files;
            try { files = Directory.EnumerateFiles(current); }
            catch (UnauthorizedAccessException) { continue; }

            foreach (var file in files)
                yield return file;
        }
    }

    public static string NormalizePattern(string pattern)
    {
        var trimmed = pattern.Trim().Replace('\\', '/');
        if (!trimmed.Contains('*', StringComparison.Ordinal) && !trimmed.Contains('?', StringComparison.Ordinal))
            return $"**/{trimmed}";
        return trimmed;
    }

    public static bool IsMatch(string relativePath, string globPattern)
    {
        var normalizedPath = relativePath.Replace('\\', '/');
        var normalizedPattern = globPattern.Replace('\\', '/');
        var regex = "^" + Regex.Escape(normalizedPattern)
            .Replace("\\*\\*", ".*")
            .Replace("\\*", "[^/]*")
            .Replace("\\?", ".") + "$";
        return Regex.IsMatch(normalizedPath, regex, RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    }
}
