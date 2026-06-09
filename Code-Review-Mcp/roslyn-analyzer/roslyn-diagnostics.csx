#!/usr/bin/env dotnet-script

// roslyn-diagnostics.csx
// Usage: dotnet script roslyn-diagnostics.csx -- <path> <severity>
//
// CONTRACT (keep in sync with src/features/diagnostics-types.ts):
//   CLI args:  <path> <severity??"error">
//   stdout JSON (PascalCase): { "Diagnostics": [{ "Code", "Message", "File", "Line", "Column", "Severity" }],
//                              "Error"?: string }
//   On any failure: { "Diagnostics": [], "Error": "..." } and Exit 0.

#r "nuget: Microsoft.CodeAnalysis.CSharp, 5.0.0-2.final"
#r "nuget: Microsoft.CodeAnalysis.Workspaces.MSBuild, 5.0.0-2.final"
#r "nuget: Microsoft.Build.Locator, 1.6.10"
#nullable enable

using Microsoft.Build.Locator;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.MSBuild;
using System.Text.Json;
using System.Text.Json.Serialization;

try
{
    var inputPath = Args.ElementAtOrDefault(0) ?? "";
    var severityFilter = Args.ElementAtOrDefault(1) ?? "error";

    if (string.IsNullOrWhiteSpace(inputPath))
        return Emit(new DiagnosticsResult { Error = "path is required" });

    var fullInput = Path.GetFullPath(inputPath);
    if (!File.Exists(fullInput) && !Directory.Exists(fullInput))
        return Emit(new DiagnosticsResult { Error = $"Path not found: {fullInput}" });

    string? fileScope = null;
    string? csprojPath;

    if (fullInput.EndsWith(".csproj", StringComparison.OrdinalIgnoreCase))
        csprojPath = fullInput;
    else if (fullInput.EndsWith(".cs", StringComparison.OrdinalIgnoreCase))
    {
        fileScope = fullInput;
        csprojPath = FindCsproj(Path.GetDirectoryName(fullInput)!);
    }
    else if (fullInput.EndsWith(".sln", StringComparison.OrdinalIgnoreCase))
        csprojPath = FindCsprojFromSolution(fullInput);
    else if (Directory.Exists(fullInput))
        csprojPath = FindCsproj(fullInput);
    else
        return Emit(new DiagnosticsResult { Error = $"Unsupported path type: {fullInput}" });

    if (csprojPath is null)
        return Emit(new DiagnosticsResult { Error = $"No .csproj found for: {fullInput}" });

    var projectRoot = Path.GetDirectoryName(csprojPath)!;
    var compilation = await TryMsBuildCompilationAsync(csprojPath)
        ?? BuildAdHocCompilation(projectRoot);

    if (compilation is null)
        return Emit(new DiagnosticsResult { Error = $"Could not compile project: {csprojPath}" });

    var diagnostics = compilation.GetDiagnostics()
        .Where(d => !d.IsSuppressed && d.Location.IsInSource)
        .Select(d => MapDiagnostic(d, projectRoot))
        .Where(d => PassesSeverity(d.Severity, severityFilter))
        .ToList();

    if (fileScope is not null)
    {
        var normScope = NormalizePath(fileScope);
        diagnostics = diagnostics
            .Where(d => NormalizePath(Path.Combine(projectRoot, d.File)) == normScope
                     || NormalizePath(d.File) == normScope)
            .ToList();
    }

    diagnostics = diagnostics
        .OrderBy(d => SeverityRank(d.Severity))
        .ThenBy(d => d.File, StringComparer.Ordinal)
        .ThenBy(d => d.Line)
        .ThenBy(d => d.Column)
        .ToList();

    return Emit(new DiagnosticsResult { Diagnostics = diagnostics });
}
catch (Exception ex)
{
    return Emit(new DiagnosticsResult { Error = ex.Message });
}

static async Task<Compilation?> TryMsBuildCompilationAsync(string csprojPath)
{
    try
    {
        if (!MSBuildLocator.IsRegistered)
        {
            var instances = MSBuildLocator.QueryVisualStudioInstances().ToArray();
            if (instances.Length == 0) return null;
            MSBuildLocator.RegisterInstance(instances.OrderByDescending(i => i.Version).First());
        }

        using var workspace = MSBuildWorkspace.Create();
        var project = await workspace.OpenProjectAsync(csprojPath);
        return await project.GetCompilationAsync();
    }
    catch
    {
        return null;
    }
}

static Compilation? BuildAdHocCompilation(string projectRoot)
{
    try
    {
        var csFiles = Directory
            .GetFiles(projectRoot, "*.cs", SearchOption.AllDirectories)
            .Where(f => !f.Contains($"{Path.DirectorySeparatorChar}obj{Path.DirectorySeparatorChar}")
                     && !f.Contains($"{Path.DirectorySeparatorChar}bin{Path.DirectorySeparatorChar}")
                     && !f.EndsWith(".g.cs")
                     && !f.EndsWith(".Designer.cs"))
            .ToList();

        if (csFiles.Count == 0) return null;

        var trees = csFiles
            .Select(f => CSharpSyntaxTree.ParseText(File.ReadAllText(f), path: f))
            .ToList();

        var tpaRefs = ((string?)AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES") ?? "")
            .Split(Path.PathSeparator)
            .Where(p => p.EndsWith(".dll", StringComparison.OrdinalIgnoreCase) && File.Exists(p))
            .Select(p => MetadataReference.CreateFromFile(p));

        return CSharpCompilation.Create("DiagnosticsAdHoc")
            .AddReferences(tpaRefs)
            .AddSyntaxTrees(trees);
    }
    catch
    {
        return null;
    }
}

static string? FindCsproj(string dir)
{
    var current = dir;
    for (var i = 0; i < 20 && !string.IsNullOrEmpty(current); i++)
    {
        if (!Directory.Exists(current)) break;
        var csprojs = Directory.GetFiles(current, "*.csproj", SearchOption.TopDirectoryOnly)
            .Where(p => !p.Contains("obj", StringComparison.Ordinal))
            .OrderBy(p => p, StringComparer.Ordinal)
            .ToList();
        if (csprojs.Count > 0)
            return csprojs[0];
        current = Directory.GetParent(current)?.FullName ?? "";
    }
    return null;
}

static string? FindCsprojFromSolution(string slnPath)
{
    var dir = Path.GetDirectoryName(slnPath)!;
    foreach (var line in File.ReadAllLines(slnPath))
    {
        if (!line.TrimStart().StartsWith("Project(", StringComparison.Ordinal)) continue;
        var start = line.IndexOf('"') + 1;
        var end = line.IndexOf('"', start);
        if (start <= 0 || end <= start) continue;
        var rel = line[start..end];
        if (!rel.EndsWith(".csproj", StringComparison.OrdinalIgnoreCase)) continue;
        var full = Path.GetFullPath(Path.Combine(dir, rel));
        if (File.Exists(full)) return full;
    }
    return FindCsproj(dir);
}

static DiagnosticEntry MapDiagnostic(Diagnostic d, string projectRoot)
{
    var span = d.Location.GetLineSpan();
    var filePath = span.Path;
    var relative = string.IsNullOrEmpty(filePath)
        ? ""
        : Path.GetRelativePath(projectRoot, filePath).Replace('\\', '/');

    return new DiagnosticEntry
    {
        Code = d.Id,
        Message = d.GetMessage(),
        File = relative,
        Line = span.StartLinePosition.Line + 1,
        Column = span.StartLinePosition.Character + 1,
        Severity = MapSeverity(d.Severity),
    };
}

static string MapSeverity(DiagnosticSeverity s) => s switch
{
    DiagnosticSeverity.Error => "error",
    DiagnosticSeverity.Warning => "warning",
    DiagnosticSeverity.Info => "info",
    _ => "hint",
};

static bool PassesSeverity(string severity, string filter) => filter switch
{
    "all" => true,
    "warning" => severity is "error" or "warning",
    _ => severity == "error",
};

static int SeverityRank(string s) => s switch
{
    "error" => 0,
    "warning" => 1,
    "info" => 2,
    _ => 3,
};

static string NormalizePath(string p) => Path.GetFullPath(p).Replace('\\', '/');

static int Emit(DiagnosticsResult result)
{
    var options = new JsonSerializerOptions
    {
        PropertyNamingPolicy = null,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        WriteIndented = false,
    };
    Console.WriteLine(JsonSerializer.Serialize(result, options));
    return 0;
}

class DiagnosticsResult
{
    public List<DiagnosticEntry> Diagnostics { get; set; } = new();

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Error { get; set; }
}

class DiagnosticEntry
{
    public string Code { get; set; } = "";
    public string Message { get; set; } = "";
    public string File { get; set; } = "";
    public int Line { get; set; }
    public int Column { get; set; }
    public string Severity { get; set; } = "error";
}
