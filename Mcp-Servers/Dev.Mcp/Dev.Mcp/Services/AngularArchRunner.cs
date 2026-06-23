using System.Text.RegularExpressions;
using Dev.Mcp.Models;

namespace Dev.Mcp.Services;

public sealed partial class AngularArchRunner
{
    private static readonly string[] ExcludedFolders = ["node_modules", "dist", ".angular"];

    public AngularArchResult Analyze(string projectPath)
    {
        if (string.IsNullOrWhiteSpace(projectPath))
            return ErrorResult("project_path is required.");
        if (!Directory.Exists(projectPath))
            return ErrorResult($"project_path does not exist: {projectPath}");

        var fullPath = Path.GetFullPath(projectPath);
        var tsFiles = CollectTsFiles(fullPath);

        var misplaced = new List<MisplacedEntry>();
        var httpInFeature = new List<HttpInFeatureServiceEntry>();
        var namingViolations = new List<NamingViolationEntry>();

        foreach (var file in tsFiles)
        {
            var normalizedPath = file.Replace('\\', '/');
            string content;
            try { content = File.ReadAllText(file); }
            catch { continue; }

            var classNames = ClassDeclarationRegex()
                .Matches(content)
                .Select(m => m.Groups[1].Value)
                .ToList();

            // Rule 1: *ApiService classes must live under src/app/core/api/
            foreach (var cls in classNames.Where(c => c.EndsWith("ApiService", StringComparison.Ordinal)))
            {
                if (!normalizedPath.Contains("/core/api/", StringComparison.Ordinal))
                    misplaced.Add(new MisplacedEntry { Class = cls, Path = normalizedPath });
            }

            var injectedTypes = GetInjectedTypes(content);

            // Rule 2: files under core/api/ may only inject HttpClient
            if (normalizedPath.Contains("/core/api/", StringComparison.Ordinal))
            {
                foreach (var injected in injectedTypes.Where(t => t != "HttpClient"))
                {
                    var className = classNames.FirstOrDefault() ?? Path.GetFileNameWithoutExtension(file);
                    namingViolations.Add(new NamingViolationEntry
                    {
                        File = normalizedPath,
                        Issue = $"{className} injects {injected} — violates HTTP-only contract",
                    });
                }
            }

            // Rule 3: files under features/<name>/services/ must not inject HttpClient directly
            if (IsFeatureServicesPath(normalizedPath) && injectedTypes.Contains("HttpClient"))
            {
                var className = classNames.FirstOrDefault() ?? Path.GetFileNameWithoutExtension(file);
                httpInFeature.Add(new HttpInFeatureServiceEntry { Class = className, Path = normalizedPath });
            }
        }

        return new AngularArchResult
        {
            Summary = new AngularArchSummary
            {
                FilesScanned = tsFiles.Count,
                Violations = misplaced.Count + httpInFeature.Count + namingViolations.Count,
            },
            Misplaced = [.. misplaced],
            HttpInFeatureService = [.. httpInFeature],
            NamingViolations = [.. namingViolations],
        };
    }

    private static List<string> CollectTsFiles(string root)
    {
        var files = new List<string>();
        try
        {
            foreach (var file in Directory.EnumerateFiles(root, "*.ts", SearchOption.AllDirectories))
            {
                var normalized = file.Replace('\\', '/');
                if (ExcludedFolders.Any(ex => normalized.Contains($"/{ex}/", StringComparison.OrdinalIgnoreCase)))
                    continue;
                files.Add(file);
            }
        }
        catch { /* ignore permission errors on individual directories */ }
        return files;
    }

    private static HashSet<string> GetInjectedTypes(string content)
    {
        var types = new HashSet<string>(StringComparer.Ordinal);

        // Functional injection (Angular 14+): inject(TypeName)
        foreach (Match m in FunctionalInjectRegex().Matches(content))
            types.Add(m.Groups[1].Value);

        // Constructor injection: scan constructor(...) block with depth counter for nested parens
        var constructorIdx = content.IndexOf("constructor(", StringComparison.Ordinal);
        if (constructorIdx < 0)
            constructorIdx = content.IndexOf("constructor (", StringComparison.Ordinal);

        if (constructorIdx >= 0)
        {
            var openParen = content.IndexOf('(', constructorIdx);
            if (openParen >= 0)
            {
                var depth = 1;
                var end = openParen + 1;
                while (end < content.Length && depth > 0)
                {
                    if (content[end] == '(') depth++;
                    else if (content[end] == ')') depth--;
                    end++;
                }
                var ctorParams = content[(openParen + 1)..(end - 1)];
                foreach (Match m in TypeAnnotationRegex().Matches(ctorParams))
                    types.Add(m.Groups[1].Value);
            }
        }

        return types;
    }

    private static bool IsFeatureServicesPath(string normalizedPath)
        => FeatureServicesPathRegex().IsMatch(normalizedPath);

    private static AngularArchResult ErrorResult(string message) => new()
    {
        Summary = new AngularArchSummary(),
        Misplaced = [],
        HttpInFeatureService = [],
        NamingViolations = [],
        Error = message,
    };

    // Matches class declarations, e.g. "class AuthApiService"
    [GeneratedRegex(@"class\s+(\w+)")]
    private static partial Regex ClassDeclarationRegex();

    // Matches functional inject() calls, e.g. "inject(HttpClient)", "inject(Router)"
    [GeneratedRegex(@"\binject\s*\(\s*([A-Z]\w+)\s*\)")]
    private static partial Regex FunctionalInjectRegex();

    // Matches type annotations in constructor params, e.g. ": HttpClient"
    [GeneratedRegex(@":\s*([A-Z]\w+)")]
    private static partial Regex TypeAnnotationRegex();

    // Matches features/<name>/services/ with exactly one wildcard level
    [GeneratedRegex(@"/features/[^/]+/services/")]
    private static partial Regex FeatureServicesPathRegex();
}
