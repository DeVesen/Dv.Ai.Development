using Dev.Mcp.Models;

namespace Dev.Mcp.Services;

/// <summary>
/// Analyses the impact of renaming a file: finds importers, spec files and .csproj references.
/// </summary>
public sealed class ImpactAnalysisService
{
    private readonly ContentSearchService _contentSearch;
    private readonly GlobSearchService _globSearch;

    public ImpactAnalysisService(ContentSearchService contentSearch, GlobSearchService globSearch)
    {
        _contentSearch = contentSearch;
        _globSearch = globSearch;
    }

    public RenameImpact Analyse(string filePath)
    {
        var repoRoot = FindRepoRoot(filePath);
        var baseName = Path.GetFileNameWithoutExtension(filePath);
        var ext = Path.GetExtension(filePath).ToLowerInvariant();

        // ── importers ──────────────────────────────────────────────────────────
        var importers = new List<string>();
        if (ext is ".ts" or ".tsx" or ".js" or ".jsx")
        {
            var tsPattern = $@"from\s+['""][^'""]*{System.Text.RegularExpressions.Regex.Escape(baseName)}['""]";
            var tsMatches = _contentSearch.FindByContent(repoRoot, tsPattern, "*.ts", 50);
            importers.AddRange(tsMatches.Select(m => m.File).Distinct());

            var indexPattern = $@"export\s+.*from\s+['""][^'""]*{System.Text.RegularExpressions.Regex.Escape(baseName)}['""]";
            var indexMatches = _contentSearch.FindByContent(repoRoot, indexPattern, "*.ts", 50);
            importers.AddRange(indexMatches.Select(m => m.File).Distinct());
        }
        else if (ext is ".cs")
        {
            var csPattern = System.Text.RegularExpressions.Regex.Escape(baseName);
            var csMatches = _contentSearch.FindByContent(repoRoot, csPattern, "*.cs", 50);
            importers.AddRange(csMatches.Select(m => m.File).Where(f => f != filePath).Distinct());
        }

        importers = importers.Where(f => f != filePath).Distinct().ToList();

        // ── spec refs ──────────────────────────────────────────────────────────
        var specRefs = new List<string>();
        var specFiles = _globSearch.FindFile(repoRoot, $"{baseName}.spec.ts", 10);
        specRefs.AddRange(specFiles.Select(f => f.Path));

        var testFiles = _globSearch.FindFile(repoRoot, $"{baseName}Test*.cs", 10);
        specRefs.AddRange(testFiles.Select(f => f.Path));
        var testFiles2 = _globSearch.FindFile(repoRoot, $"{baseName}Tests.cs", 10);
        specRefs.AddRange(testFiles2.Select(f => f.Path));
        specRefs = specRefs.Distinct().ToList();

        // ── csproj refs ────────────────────────────────────────────────────────
        var csprojRefs = new List<string>();
        if (ext is ".cs" or ".html" or ".ts")
        {
            var fileName = Path.GetFileName(filePath);
            var csprojMatches = _contentSearch.FindByContent(repoRoot,
                System.Text.RegularExpressions.Regex.Escape(fileName), "*.csproj", 20);
            csprojRefs.AddRange(csprojMatches.Select(m => m.File).Distinct());
        }

        return new RenameImpact(importers, specRefs, csprojRefs);
    }

    private static string FindRepoRoot(string startPath)
    {
        var dir = File.Exists(startPath) ? Path.GetDirectoryName(startPath)! : startPath;
        var current = dir;
        for (var i = 0; i < 12; i++)
        {
            if (current is null) break;
            if (Directory.Exists(Path.Combine(current, ".git")))
                return current;
            var parent = Directory.GetParent(current)?.FullName;
            if (parent is null || parent == current) break;
            current = parent;
        }
        return dir;
    }
}
