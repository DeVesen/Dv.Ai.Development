using System.Text.RegularExpressions;
using Dev.WindowsService.Mcp.Models;

namespace Dev.WindowsService.Mcp.Services;

/// <summary>
/// Handles find_dotnet_endpoint, find_di_registration (C#), and update_imports.
/// </summary>
public sealed class DotnetDiscoveryService
{
    private readonly ContentSearchService _content;

    public DotnetDiscoveryService(ContentSearchService content)
    {
        _content = content;
    }

    // ── find_dotnet_endpoint ──────────────────────────────────────────────────

    public FindDotnetEndpointResult FindEndpoints(string root, string routeOrAction, int max = 20)
    {
        var escaped = Regex.Escape(routeOrAction);
        var httpAttrPattern = $@"\[Http(?:Get|Post|Put|Delete|Patch)\s*(?:\(""{escaped}[^""]*""\))?\]|{escaped}";
        var matches = _content.FindByContent(root, httpAttrPattern, "*.cs", max + 20);

        var endpoints = new List<DotnetEndpointMatch>();
        var seenLines = new HashSet<string>();

        foreach (var m in matches)
        {
            if (endpoints.Count >= max) break;

            string? httpMethod = null;
            string? routeTemplate = null;

            var httpMatch = Regex.Match(m.Match, @"\[Http(Get|Post|Put|Delete|Patch)(?:\(""([^""]*)""\))?\]", RegexOptions.IgnoreCase);
            if (httpMatch.Success)
            {
                httpMethod = httpMatch.Groups[1].Value.ToUpperInvariant();
                routeTemplate = httpMatch.Groups[2].Success ? httpMatch.Groups[2].Value : null;
            }

            var routeMatch = Regex.Match(m.Match, @"\[Route\(""([^""]*)""\)\]");
            if (routeMatch.Success) routeTemplate = routeMatch.Groups[1].Value;

            var controller = ExtractControllerName(m.File);
            var action = ExtractActionName(m.Match);

            var key = $"{m.File}:{m.Line}";
            if (!seenLines.Add(key)) continue;

            endpoints.Add(new DotnetEndpointMatch(controller, action, httpMethod, routeTemplate, m.File, m.Line));
        }

        return new FindDotnetEndpointResult(endpoints, matches.Count > max);
    }

    // ── find_di_registration (C#) ─────────────────────────────────────────────

    public FindDiRegistrationResult FindDiRegistrations(string root, string serviceName, int max = 20)
    {
        var escaped = Regex.Escape(serviceName);
        var pattern = $@"Add(?:Singleton|Scoped|Transient|Hosted|Options)\s*<[^>]*{escaped}[^>]*>|services\.\w+\s*\(\s*typeof\s*\([^)]*{escaped}[^)]*\)";
        var matches = _content.FindByContent(root, pattern, "*.cs", max + 5);

        var nameMatches = _content.FindByContent(root, escaped, "*.cs", max + 5);
        var allMatches = matches.Concat(nameMatches.Where(m => IsRegistrationLine(m.Match)))
            .GroupBy(m => $"{m.File}:{m.Line}").Select(g => g.First())
            .Take(max + 5).ToList();

        var regs = allMatches.Take(max).Select(m =>
        {
            var lifetime = ExtractLifetime(m.Match);
            return new DiRegistrationMatch(serviceName, lifetime, m.File, m.Line, m.Match.Trim());
        }).ToList();

        return new FindDiRegistrationResult(regs, allMatches.Count > max);
    }

    // ── update_imports ────────────────────────────────────────────────────────

    public UpdateImportsResult UpdateImports(
        string? filePath, string? directory,
        string? symbol, string oldPath, string newPath, string language)
    {
        var filesToProcess = new List<string>();

        if (filePath is not null && File.Exists(filePath))
        {
            filesToProcess.Add(filePath);
        }
        else if (directory is not null && Directory.Exists(directory))
        {
            var exts = language switch
            {
                "typescript" => new[] { "*.ts", "*.tsx" },
                "csharp" => new[] { "*.cs" },
                _ => new[] { "*.ts", "*.tsx", "*.cs" },
            };
            foreach (var ext in exts)
                filesToProcess.AddRange(Directory.GetFiles(directory, ext, SearchOption.AllDirectories));
        }

        var changes = new List<ImportChange>();
        var filesUpdated = 0;

        foreach (var file in filesToProcess)
        {
            var ext = Path.GetExtension(file).ToLowerInvariant();
            var isTs = ext is ".ts" or ".tsx";
            var isCs = ext == ".cs";

            if (language == "typescript" && !isTs) continue;
            if (language == "csharp" && !isCs) continue;

            string content;
            try { content = File.ReadAllText(file); }
            catch { continue; }

            string updated;
            if (isTs)
            {
                var escapedOld = Regex.Escape(oldPath);
                updated = Regex.Replace(content,
                    $@"(from\s+['""]){escapedOld}(['""])",
                    m => m.Groups[1].Value + newPath + m.Groups[2].Value);

                updated = Regex.Replace(updated,
                    $@"(import\s*\(\s*['""]){escapedOld}(['""])",
                    m => m.Groups[1].Value + newPath + m.Groups[2].Value);
            }
            else // C#
            {
                var escapedOld = Regex.Escape(oldPath);
                updated = Regex.Replace(content,
                    $@"(using\s+){escapedOld}(\s*;)",
                    m => m.Groups[1].Value + newPath + m.Groups[2].Value);
            }

            if (updated == content) continue;

            try { File.WriteAllText(file, updated); }
            catch { continue; }

            filesUpdated++;

            var originalLines = content.Split('\n');
            var updatedLines = updated.Split('\n');
            for (var i = 0; i < Math.Min(originalLines.Length, updatedLines.Length); i++)
            {
                if (originalLines[i] != updatedLines[i])
                    changes.Add(new ImportChange(file, i + 1, originalLines[i].Trim(), updatedLines[i].Trim()));
            }
        }

        return new UpdateImportsResult(true, filesUpdated, changes, null);
    }

    // ── helpers ────────────────────────────────────────────────────────────────

    private static string? ExtractControllerName(string filePath)
    {
        var name = Path.GetFileNameWithoutExtension(filePath);
        return name.EndsWith("Controller", StringComparison.OrdinalIgnoreCase)
            ? name[..^"Controller".Length]
            : name;
    }

    private static string? ExtractActionName(string line)
    {
        var m = Regex.Match(line, @"(?:public|private|protected)\s+(?:async\s+)?(?:Task<[^>]+>|IActionResult|\w+)\s+(\w+)\s*\(");
        return m.Success ? m.Groups[1].Value : null;
    }

    private static string? ExtractLifetime(string line)
    {
        if (line.Contains("AddSingleton", StringComparison.OrdinalIgnoreCase)) return "Singleton";
        if (line.Contains("AddScoped", StringComparison.OrdinalIgnoreCase)) return "Scoped";
        if (line.Contains("AddTransient", StringComparison.OrdinalIgnoreCase)) return "Transient";
        if (line.Contains("AddHostedService", StringComparison.OrdinalIgnoreCase)) return "Hosted";
        return null;
    }

    private static bool IsRegistrationLine(string line) =>
        line.Contains("AddSingleton", StringComparison.OrdinalIgnoreCase)
        || line.Contains("AddScoped", StringComparison.OrdinalIgnoreCase)
        || line.Contains("AddTransient", StringComparison.OrdinalIgnoreCase)
        || line.Contains("AddHostedService", StringComparison.OrdinalIgnoreCase)
        || line.Contains("services.Add", StringComparison.OrdinalIgnoreCase);
}
