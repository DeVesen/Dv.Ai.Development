using System.Text.RegularExpressions;
using Dev.Mcp.Models;

namespace Dev.Mcp.Services;

/// <summary>
/// Handles slice_test_targets: derives Angular spec globs and .NET test filters
/// from a list of changed file paths.
/// </summary>
public sealed class SliceTestTargetsService
{
    public SliceTestTargetsResult Slice(IReadOnlyList<string> changedFilePaths, string stack)
    {
        var tsFiles = changedFilePaths.Where(f =>
            f.EndsWith(".ts", StringComparison.OrdinalIgnoreCase) ||
            f.EndsWith(".html", StringComparison.OrdinalIgnoreCase)).ToList();

        var csFiles = changedFilePaths.Where(f =>
            f.EndsWith(".cs", StringComparison.OrdinalIgnoreCase)).ToList();

        var doAngular = stack == "angular" || (stack == "auto" && tsFiles.Count > 0);
        var doDotnet = stack == "dotnet" || (stack == "auto" && csFiles.Count > 0);

        AngularTestSlice? angular = doAngular ? BuildAngularSlice(tsFiles) : null;
        DotnetTestSlice? dotnet = doDotnet ? BuildDotnetSlice(csFiles) : null;

        return new SliceTestTargetsResult(angular, dotnet);
    }

    // ── Angular ────────────────────────────────────────────────────────────────

    private static AngularTestSlice BuildAngularSlice(IEnumerable<string> tsFiles)
    {
        var globs = new List<string>();

        foreach (var f in tsFiles)
        {
            if (f.EndsWith(".spec.ts", StringComparison.OrdinalIgnoreCase)) continue;

            var dir = Path.GetDirectoryName(f)?.Replace('\\', '/') ?? string.Empty;
            var baseName = Path.GetFileNameWithoutExtension(f);
            if (baseName.EndsWith(".html", StringComparison.OrdinalIgnoreCase))
                baseName = Path.GetFileNameWithoutExtension(baseName);

            var specPath = Path.Combine(
                Path.GetDirectoryName(f) ?? string.Empty,
                baseName + ".spec.ts");

            if (File.Exists(specPath))
            {
                var specGlob = (dir + "/" + baseName + ".spec.ts").TrimStart('/');
                if (!globs.Contains(specGlob)) globs.Add(specGlob);
            }
            else
            {
                var folderGlob = (dir + "/**/*.spec.ts").TrimStart('/');
                if (!globs.Contains(folderGlob)) globs.Add(folderGlob);
            }
        }

        if (globs.Count == 0)
            return new AngularTestSlice([], string.Empty);

        var ngTestArgs = string.Join(" ", globs.Select(g => $"--include={g}"));
        return new AngularTestSlice(globs, ngTestArgs);
    }

    // ── .NET ───────────────────────────────────────────────────────────────────

    private static DotnetTestSlice BuildDotnetSlice(IEnumerable<string> csFiles)
    {
        var classNames = new List<string>();
        string? testProjectPath = null;

        foreach (var f in csFiles)
        {
            var className = ExtractClassName(f);
            if (className is not null && !classNames.Contains(className))
                classNames.Add(className);

            if (testProjectPath is null)
                testProjectPath = FindTestProject(Path.GetDirectoryName(f) ?? string.Empty);
        }

        var filter = classNames.Count > 0
            ? string.Join("|", classNames.Select(c => $"FullyQualifiedName~{c}"))
            : null;

        return new DotnetTestSlice(testProjectPath, filter);
    }

    private static string? ExtractClassName(string filePath)
    {
        try
        {
            var text = File.ReadAllText(filePath);
            var m = Regex.Match(text, @"(?:public|internal)\s+(?:sealed\s+|abstract\s+)?(?:class|record)\s+(\w+)");
            return m.Success ? m.Groups[1].Value : null;
        }
        catch { return null; }
    }

    private static string? FindTestProject(string startDir)
    {
        var dir = startDir;
        for (var i = 0; i < 10; i++)
        {
            if (string.IsNullOrEmpty(dir)) break;
            var parent = Directory.GetParent(dir)?.FullName;
            if (parent is null) break;

            foreach (var csproj in Directory.GetFiles(parent, "*.csproj", SearchOption.AllDirectories))
            {
                var name = Path.GetFileNameWithoutExtension(csproj);
                if (name.EndsWith("Tests", StringComparison.OrdinalIgnoreCase) ||
                    name.EndsWith("Test", StringComparison.OrdinalIgnoreCase))
                    return csproj;
            }

            dir = parent;
        }
        return null;
    }
}
