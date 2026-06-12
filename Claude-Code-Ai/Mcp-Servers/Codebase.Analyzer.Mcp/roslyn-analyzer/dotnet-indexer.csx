#!/usr/bin/env dotnet-script
// dotnet-indexer.csx
// Usage: dotnet script dotnet-indexer.csx -- <path> [<projectFilter>]
//   path: project directory, .csproj, or .sln file
//   projectFilter: optional comma-separated project names (solution mode only)
// Output: Full JSON index (ProjectIndex or SolutionIndex)

#r "nuget: Microsoft.CodeAnalysis.CSharp, 5.0.0-2.final"
#r "nuget: Microsoft.CodeAnalysis.Workspaces.MSBuild, 5.0.0-2.final"
#r "nuget: Microsoft.Build.Locator, 1.6.10"
#nullable enable

using Microsoft.Build.Locator;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.MSBuild;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Xml.Linq;

var inputPath = Args.FirstOrDefault() ?? Directory.GetCurrentDirectory();
var filterArg = Args.ElementAtOrDefault(1) ?? "";
var filterSet = string.IsNullOrWhiteSpace(filterArg)
    ? null
    : new HashSet<string>(filterArg.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries), StringComparer.OrdinalIgnoreCase);

var options = new JsonSerializerOptions
{
    WriteIndented = true,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
};

if (inputPath.EndsWith(".sln", StringComparison.OrdinalIgnoreCase))
{
    if (!File.Exists(inputPath))
    {
        Console.Error.WriteLine($"Solution not found: {inputPath}");
        Environment.Exit(1);
    }
    var slnPath = Path.GetFullPath(inputPath);
    var solutionDir = Path.GetDirectoryName(slnPath)!;
    var projects = EnumerateSolutionProjects(slnPath, filterSet);
    if (projects.Count == 0)
    {
        Console.Error.WriteLine($"No projects found in solution: {slnPath}");
        Environment.Exit(1);
    }

    var merged = BuildSolutionIndex(solutionDir, slnPath, projects);
    Console.WriteLine(JsonSerializer.Serialize(merged, options));
}
else
{
    var rootPath = inputPath;
    if (inputPath.EndsWith(".csproj", StringComparison.OrdinalIgnoreCase))
    {
        if (!File.Exists(inputPath)) { Console.Error.WriteLine($"Project not found: {inputPath}"); Environment.Exit(1); }
        rootPath = Path.GetDirectoryName(Path.GetFullPath(inputPath))!;
    }
    else if (!Directory.Exists(rootPath))
    {
        Console.Error.WriteLine($"Directory not found: {rootPath}");
        Environment.Exit(1);
    }
    else
    {
        rootPath = Path.GetFullPath(rootPath);
    }

    var index = BuildProjectIndex(rootPath, relPathBase: rootPath, projectLabel: null);
    index.ProjectReferences = ParseProjectReferences(rootPath);
    index.ExternalDependencies = ComputeExternalDependencies(index);
    Console.WriteLine(JsonSerializer.Serialize(index, options));
}

// ── Solution helpers ──────────────────────────────────────────────────────────

static ProjectIndex BuildSolutionIndex(string solutionDir, string slnPath, List<(string Name, string Directory)> projects)
{
    var merged = new ProjectIndex
    {
        GeneratedAt = DateTime.UtcNow.ToString("o"),
        ProjectRoot = solutionDir,
        SolutionPath = slnPath,
        SolutionMtime = File.GetLastWriteTimeUtc(slnPath).ToString("o"),
        Projects = projects.Select(p => p.Name).ToList(),
    };

    foreach (var (name, dir) in projects)
    {
        var partial = BuildProjectIndex(dir, relPathBase: solutionDir, projectLabel: name);
        merged.Namespaces.AddRange(partial.Namespaces.Where(n => !merged.Namespaces.Contains(n)));
        merged.Classes.AddRange(partial.Classes);
        merged.Interfaces.AddRange(partial.Interfaces);
        merged.Enums.AddRange(partial.Enums);
        merged.Records.AddRange(partial.Records);
    }

    ResolveInterfaceImplementations(merged);
    merged.DependencyGraph = BuildDependencyGraph(merged.Classes);
    merged.Summary = BuildSummary(merged);
    merged.CouplingReport = BuildCouplingReport(merged.DependencyGraph);
    merged.ArchitectureReport = BuildArchitectureReport(merged);
    return merged;
}

static List<(string Name, string Directory)> EnumerateSolutionProjects(string slnPath, HashSet<string>? filter)
{
    var fromMsBuild = TryMsBuildProjects(slnPath);
    var projects = fromMsBuild.Count > 0 ? fromMsBuild : FindAllCsprojsFromSolution(slnPath);
    if (filter is null) return projects;
    return projects.Where(p => filter.Contains(p.Name)).ToList();
}

static List<(string Name, string Directory)> TryMsBuildProjects(string slnPath)
{
    try
    {
        if (!MSBuildLocator.IsRegistered)
            MSBuildLocator.RegisterDefaults();
        using var workspace = MSBuildWorkspace.Create();
        var solution = workspace.OpenSolutionAsync(slnPath).GetAwaiter().GetResult();
        return solution.Projects
            .Where(p => !string.IsNullOrEmpty(p.FilePath))
            .Select(p => (p.Name, Path.GetDirectoryName(p.FilePath!)!))
            .Distinct()
            .ToList();
    }
    catch
    {
        return new();
    }
}

static List<(string Name, string Directory)> FindAllCsprojsFromSolution(string slnPath)
{
    var dir = Path.GetDirectoryName(slnPath)!;
    var list = new List<(string, string)>();
    foreach (var line in File.ReadAllLines(slnPath))
    {
        if (!line.TrimStart().StartsWith("Project(", StringComparison.Ordinal)) continue;

        var quotes = new List<string>();
        for (var i = 0; i < line.Length; i++)
        {
            if (line[i] != '"') continue;
            var end = line.IndexOf('"', i + 1);
            if (end <= i) continue;
            quotes.Add(line[(i + 1)..end]);
            i = end;
        }
        // Project("{type}") = "Name", "path.csproj", "{guid}"
        if (quotes.Count < 3) continue;
        var rel = quotes[2];
        if (!rel.EndsWith(".csproj", StringComparison.OrdinalIgnoreCase)) continue;
        var full = Path.GetFullPath(Path.Combine(dir, rel));
        if (!File.Exists(full)) continue;
        list.Add((Path.GetFileNameWithoutExtension(full), Path.GetDirectoryName(full)!));
    }
    return list;
}

static List<string> ParseProjectReferences(string projectDir)
{
    var csproj = Directory.GetFiles(projectDir, "*.csproj").FirstOrDefault();
    if (csproj is null) return new();
    try
    {
        var doc = XDocument.Load(csproj);
        return doc.Descendants()
            .Where(e => e.Name.LocalName == "ProjectReference")
            .Select(e => e.Attribute("Include")?.Value ?? "")
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .Select(v => v.Replace('\\', '/'))
            .ToList();
    }
    catch
    {
        return new();
    }
}

static List<string> ComputeExternalDependencies(ProjectIndex index)
{
    var known = new HashSet<string>(StringComparer.Ordinal);
    foreach (var c in index.Classes) known.Add(c.Name);
    foreach (var i in index.Interfaces) known.Add(i.Name);

    var external = new HashSet<string>(StringComparer.Ordinal);
    foreach (var cls in index.Classes)
    {
        foreach (var dep in cls.ConstructorDeps)
        {
            var clean = dep.Contains('<') ? dep[..dep.IndexOf('<')] : dep;
            if (string.IsNullOrWhiteSpace(clean) || char.IsLower(clean[0])) continue;
            if (!known.Contains(clean)) external.Add(clean);
        }
    }
    return external.OrderBy(x => x).ToList();
}

// ── Project index builder ─────────────────────────────────────────────────────

static ProjectIndex BuildProjectIndex(string projectDir, string relPathBase, string? projectLabel)
{
    var csFiles = Directory
        .GetFiles(projectDir, "*.cs", SearchOption.AllDirectories)
        .Where(f => !f.Contains(Path.DirectorySeparatorChar + "obj" + Path.DirectorySeparatorChar)
                 && !f.Contains(Path.DirectorySeparatorChar + "bin" + Path.DirectorySeparatorChar)
                 && !f.Contains(Path.DirectorySeparatorChar + "Migrations" + Path.DirectorySeparatorChar)
                 && !f.EndsWith(".g.cs")
                 && !f.EndsWith(".Designer.cs"))
        .Take(400)
        .ToList();

    var parsedFiles = csFiles
        .Select(f => (Path: f, Tree: CSharpSyntaxTree.ParseText(File.ReadAllText(f), path: f)))
        .ToList();

    var compilation = CSharpCompilation.Create("indexer")
        .AddReferences(MetadataReference.CreateFromFile(typeof(object).Assembly.Location))
        .AddSyntaxTrees(parsedFiles.Select(f => f.Tree));

    var index = new ProjectIndex { GeneratedAt = DateTime.UtcNow.ToString("o"), ProjectRoot = projectDir };

    foreach (var (filePath, tree) in parsedFiles)
    {
        var relPath = Path.GetRelativePath(relPathBase, filePath).Replace('\\', '/');
        var root = tree.GetRoot();
        var model = compilation.GetSemanticModel(tree);

        foreach (var ns in root.DescendantNodes().OfType<NamespaceDeclarationSyntax>()
            .Concat<SyntaxNode>(root.DescendantNodes().OfType<FileScopedNamespaceDeclarationSyntax>()))
        {
            var nsName = ns is NamespaceDeclarationSyntax n ? n.Name.ToString() : ((FileScopedNamespaceDeclarationSyntax)ns).Name.ToString();
            if (!index.Namespaces.Contains(nsName)) index.Namespaces.Add(nsName);
        }

        foreach (var cls in root.DescendantNodes().OfType<ClassDeclarationSyntax>())
        {
            var entry = BuildClassEntry(cls, relPath, model);
            entry.Project = projectLabel;
            index.Classes.Add(entry);
        }

        foreach (var iface in root.DescendantNodes().OfType<InterfaceDeclarationSyntax>())
        {
            var entry = BuildInterfaceEntry(iface, relPath);
            entry.Project = projectLabel;
            index.Interfaces.Add(entry);
        }

        foreach (var enumDecl in root.DescendantNodes().OfType<EnumDeclarationSyntax>())
        {
            index.Enums.Add(new EnumEntry
            {
                Name = enumDecl.Identifier.Text,
                File = relPath,
                Line = enumDecl.GetLocation().GetLineSpan().StartLinePosition.Line + 1,
                Values = enumDecl.Members.Select(m => m.Identifier.Text).ToList(),
                Namespace = GetNamespace(enumDecl),
                Project = projectLabel,
            });
        }

        foreach (var record in root.DescendantNodes().OfType<RecordDeclarationSyntax>())
        {
            index.Records.Add(new RecordEntry
            {
                Name = record.Identifier.Text,
                File = relPath,
                Line = record.GetLocation().GetLineSpan().StartLinePosition.Line + 1,
                Properties = record.ParameterList?.Parameters.Select(p => $"{p.Type} {p.Identifier.Text}").ToList() ?? new(),
                IsPositional = record.ParameterList?.Parameters.Count > 0,
                Namespace = GetNamespace(record),
                Project = projectLabel,
            });
        }
    }

    ResolveInterfaceImplementations(index);
    index.DependencyGraph = BuildDependencyGraph(index.Classes);
    index.Summary = BuildSummary(index);
    index.CouplingReport = BuildCouplingReport(index.DependencyGraph);
    index.ArchitectureReport = BuildArchitectureReport(index);
    return index;
}

static void ResolveInterfaceImplementations(ProjectIndex index)
{
    foreach (var cls in index.Classes)
    {
        foreach (var iface in index.Interfaces)
        {
            if (cls.ImplementedInterfaces.Contains(iface.Name) && !iface.ImplementedBy.Contains(cls.Name))
                iface.ImplementedBy.Add(cls.Name);
        }
    }
}

// ── Builder Functions ─────────────────────────────────────────────────────────

static ClassEntry BuildClassEntry(ClassDeclarationSyntax cls, string relPath, SemanticModel model)
{
    var methods = cls.Members.OfType<MethodDeclarationSyntax>().ToList();
    var props = cls.Members.OfType<PropertyDeclarationSyntax>().ToList();
    var ctorParams = cls.Members.OfType<ConstructorDeclarationSyntax>()
        .SelectMany(c => c.ParameterList.Parameters)
        .Select(p => p.Type?.ToString() ?? p.Identifier.Text)
        .ToList();

    var attributes = cls.AttributeLists.SelectMany(al => al.Attributes).Select(a => a.Name.ToString()).ToList();
    var baseTypes = cls.BaseList?.Types.Select(t => t.Type.ToString()).ToList() ?? new();
    var interfaces = baseTypes.Where(t => t.StartsWith("I") && char.IsUpper(t.Length > 1 ? t[1] : ' ')).ToList();
    var baseClass = baseTypes.Except(interfaces).FirstOrDefault();

    var layer = DetectLayer(cls.Identifier.Text, attributes);

    var dipViolations = cls.DescendantNodes()
        .OfType<ObjectCreationExpressionSyntax>()
        .Select(n => new DipViolation
        {
            TypeName = n.Type.ToString(),
            Line = n.GetLocation().GetLineSpan().StartLinePosition.Line + 1
        })
        .Where(v => v.TypeName.Length > 0 && char.IsUpper(v.TypeName[0]) && !IsAllowedNew(v.TypeName))
        .ToList();

    var asyncMethods = methods.Where(m => m.Modifiers.Any(mod => mod.Text == "async"))
        .Select(m => m.Identifier.Text).ToList();

    var resultWaitLines = cls.DescendantNodes()
        .OfType<MemberAccessExpressionSyntax>()
        .Where(m => m.Name.Identifier.Text is "Result" or "Wait")
        .Select(m => m.GetLocation().GetLineSpan().StartLinePosition.Line + 1)
        .ToList();

    var longMethods = methods
        .Select(m => new LongMethod
        {
            Name = m.Identifier.Text,
            Lines = m.GetLocation().GetLineSpan().EndLinePosition.Line - m.GetLocation().GetLineSpan().StartLinePosition.Line,
            IsAsync = m.Modifiers.Any(mod => mod.Text == "async"),
            ReturnType = m.ReturnType.ToString(),
        })
        .Where(m => m.Lines > 25)
        .ToList();

    return new ClassEntry
    {
        Name = cls.Identifier.Text,
        File = relPath,
        Line = cls.GetLocation().GetLineSpan().StartLinePosition.Line + 1,
        Namespace = GetNamespace(cls),
        Layer = layer,
        IsAbstract = cls.Modifiers.Any(m => m.Text == "abstract"),
        IsSealed = cls.Modifiers.Any(m => m.Text == "sealed"),
        IsPartial = cls.Modifiers.Any(m => m.Text == "partial"),
        IsGeneric = cls.TypeParameterList?.Parameters.Count > 0,
        Attributes = attributes,
        ImplementedInterfaces = interfaces,
        BaseClass = baseClass,
        ConstructorDeps = ctorParams,
        PublicMethods = methods.Where(m => m.Modifiers.Any(mod => mod.Text == "public"))
            .Select(m => new MethodEntry
            {
                Name = m.Identifier.Text,
                ReturnType = m.ReturnType.ToString(),
                IsAsync = m.Modifiers.Any(mod => mod.Text == "async"),
                HasCancellationToken = m.ParameterList.Parameters.Any(p => p.Type?.ToString().Contains("CancellationToken") == true),
                ParamCount = m.ParameterList.Parameters.Count,
                Lines = m.GetLocation().GetLineSpan().EndLinePosition.Line - m.GetLocation().GetLineSpan().StartLinePosition.Line,
            }).ToList(),
        Properties = props.Select(p => $"{p.Type} {p.Identifier.Text}").Take(20).ToList(),
        DipViolations = dipViolations,
        AsyncMethods = asyncMethods,
        ResultWaitLines = resultWaitLines,
        LongMethods = longMethods,
        MethodCount = methods.Count,
        PropertyCount = props.Count,
        SwitchCount = cls.DescendantNodes().OfType<SwitchStatementSyntax>().Count()
            + cls.DescendantNodes().OfType<SwitchExpressionSyntax>().Count(),
    };
}

static InterfaceEntry BuildInterfaceEntry(InterfaceDeclarationSyntax iface, string relPath)
{
    return new InterfaceEntry
    {
        Name = iface.Identifier.Text,
        File = relPath,
        Line = iface.GetLocation().GetLineSpan().StartLinePosition.Line + 1,
        Namespace = GetNamespace(iface),
        Methods = iface.Members.OfType<MethodDeclarationSyntax>()
            .Select(m => $"{m.ReturnType} {m.Identifier.Text}({m.ParameterList.Parameters.Count} params)").ToList(),
        Properties = iface.Members.OfType<PropertyDeclarationSyntax>()
            .Select(p => $"{p.Type} {p.Identifier.Text}").ToList(),
        ExtendedInterfaces = iface.BaseList?.Types.Select(t => t.Type.ToString()).ToList() ?? new(),
        ImplementedBy = new(),
        MethodCount = iface.Members.OfType<MethodDeclarationSyntax>().Count(),
    };
}

static Dictionary<string, DependencyNode> BuildDependencyGraph(List<ClassEntry> classes)
{
    var graph = new Dictionary<string, DependencyNode>();
    foreach (var cls in classes)
    {
        var key = cls.Project is null ? cls.Name : $"{cls.Project}.{cls.Name}";
        graph[key] = new DependencyNode { DependsOn = cls.ConstructorDeps, UsedBy = new(), File = cls.File };
    }
    foreach (var (name, node) in graph.ToList())
    {
        foreach (var dep in node.DependsOn)
        {
            var cleanDep = dep.Contains('<') ? dep[..dep.IndexOf('<')] : dep;
            var matchKey = graph.Keys.FirstOrDefault(k => k.EndsWith("." + cleanDep) || k == cleanDep);
            if (matchKey is not null && !graph[matchKey].UsedBy.Contains(name))
                graph[matchKey].UsedBy.Add(name);
        }
    }
    return graph;
}

static ProjectSummary BuildSummary(ProjectIndex index)
{
    var controllers = index.Classes.Where(c => c.Layer == "Controller").ToList();
    var services = index.Classes.Where(c => c.Layer == "Service").ToList();
    var repos = index.Classes.Where(c => c.Layer == "Repository").ToList();

    return new ProjectSummary
    {
        TotalFiles = index.Classes.Select(c => c.File).Distinct().Count(),
        TotalClasses = index.Classes.Count,
        TotalInterfaces = index.Interfaces.Count,
        TotalEnums = index.Enums.Count,
        TotalRecords = index.Records.Count,
        ControllerCount = controllers.Count,
        ServiceCount = services.Count,
        RepositoryCount = repos.Count,
        AbstractClasses = index.Classes.Count(c => c.IsAbstract),
        GenericClasses = index.Classes.Count(c => c.IsGeneric),
        TotalAsyncMethods = index.Classes.Sum(c => c.AsyncMethods.Count),
        ClassesWithResultWait = index.Classes.Count(c => c.ResultWaitLines.Count > 0),
        ClassesWithDipViolations = index.Classes.Count(c => c.DipViolations.Count > 0),
        TotalSwitchStatements = index.Classes.Sum(c => c.SwitchCount),
        InterfacesWithoutImplementation = index.Interfaces.Count(i => i.ImplementedBy.Count == 0),
        UniqueNamespaces = index.Namespaces.Count,
    };
}

static CouplingReport BuildCouplingReport(Dictionary<string, DependencyNode> graph)
{
    var mostDepended = graph.Select(kv => new { Name = kv.Key, Count = kv.Value.UsedBy.Count })
        .OrderByDescending(x => x.Count).Take(10)
        .Select(x => new CouplingEntry { Name = x.Name, Count = x.Count }).ToList();

    var mostDepending = graph.Select(kv => new { Name = kv.Key, Count = kv.Value.DependsOn.Count })
        .OrderByDescending(x => x.Count).Take(10)
        .Select(x => new CouplingEntry { Name = x.Name, Count = x.Count }).ToList();

    var circular = new List<string>();
    foreach (var (name, node) in graph)
    {
        foreach (var dep in node.DependsOn)
        {
            if (graph.TryGetValue(dep, out var depNode) && depNode.DependsOn.Contains(name))
            {
                var pair = string.Join(" ↔ ", new[] { name, dep }.OrderBy(x => x));
                if (!circular.Contains(pair)) circular.Add(pair);
            }
        }
    }

    return new CouplingReport { MostDepended = mostDepended, MostDepending = mostDepending, CircularRiskPairs = circular };
}

static ArchitectureReport BuildArchitectureReport(ProjectIndex index)
{
    var layerViolations = new List<string>();

    foreach (var ctrl in index.Classes.Where(c => c.Layer == "Controller"))
    {
        var repoDepends = ctrl.ConstructorDeps.Where(d => index.Classes.Any(c => c.Name == d && c.Layer == "Repository")).ToList();
        foreach (var dep in repoDepends)
            layerViolations.Add($"{ctrl.Name} directly depends on Repository {dep} (missing Service layer)");
    }

    var orphanInterfaces = index.Interfaces.Where(i => i.ImplementedBy.Count == 0).Select(i => i.Name).ToList();
    var godClasses = index.Classes.Where(c => c.MethodCount > 20).Select(c => c.Name).ToList();

    return new ArchitectureReport
    {
        LayerViolations = layerViolations,
        OrphanInterfaces = orphanInterfaces,
        GodClassCandidates = godClasses,
        InterfaceWithSingleImpl = index.Interfaces.Where(i => i.ImplementedBy.Count == 1)
            .Select(i => $"{i.Name} → only {i.ImplementedBy[0]}").ToList(),
    };
}

static string DetectLayer(string className, List<string> attributes)
{
    if (attributes.Any(a => a.Contains("ApiController") || a.Contains("Controller")) || className.EndsWith("Controller")) return "Controller";
    if (className.EndsWith("Service") || className.EndsWith("Manager")) return "Service";
    if (className.EndsWith("Repository") || className.EndsWith("Repo")) return "Repository";
    if (className.EndsWith("Handler")) return "Handler";
    if (className.EndsWith("Middleware")) return "Middleware";
    if (className.EndsWith("Factory")) return "Factory";
    if (className.EndsWith("Validator")) return "Validator";
    if (className.EndsWith("Mapper") || className.EndsWith("Profile")) return "Mapper";
    return "Other";
}

static string GetNamespace(SyntaxNode node)
{
    var ns = node.Ancestors().OfType<NamespaceDeclarationSyntax>().FirstOrDefault()?.Name.ToString()
          ?? node.Ancestors().OfType<FileScopedNamespaceDeclarationSyntax>().FirstOrDefault()?.Name.ToString()
          ?? "";
    return ns;
}

static bool IsAllowedNew(string typeName) =>
    new[] { "List<", "Dictionary<", "HashSet<", "StringBuilder", "DateTime", "DateTimeOffset",
            "TimeSpan", "Guid", "Exception", "ArgumentException", "InvalidOperationException",
            "NotImplementedException", "HttpRequestMessage", "CancellationTokenSource" }
    .Any(t => typeName.StartsWith(t));

// ── Data Models ───────────────────────────────────────────────────────────────
class ProjectIndex
{
    public string GeneratedAt { get; set; } = "";
    public string ProjectRoot { get; set; } = "";
    public string? SolutionPath { get; set; }
    public string? SolutionMtime { get; set; }
    public List<string>? Projects { get; set; }
    public List<string>? ProjectReferences { get; set; }
    public List<string>? ExternalDependencies { get; set; }
    public ProjectSummary? Summary { get; set; }
    public List<string> Namespaces { get; set; } = new();
    public List<ClassEntry> Classes { get; set; } = new();
    public List<InterfaceEntry> Interfaces { get; set; } = new();
    public List<EnumEntry> Enums { get; set; } = new();
    public List<RecordEntry> Records { get; set; } = new();
    public Dictionary<string, DependencyNode> DependencyGraph { get; set; } = new();
    public CouplingReport? CouplingReport { get; set; }
    public ArchitectureReport? ArchitectureReport { get; set; }
}

class ProjectSummary { public int TotalFiles{get;set;} public int TotalClasses{get;set;} public int TotalInterfaces{get;set;} public int TotalEnums{get;set;} public int TotalRecords{get;set;} public int ControllerCount{get;set;} public int ServiceCount{get;set;} public int RepositoryCount{get;set;} public int AbstractClasses{get;set;} public int GenericClasses{get;set;} public int TotalAsyncMethods{get;set;} public int ClassesWithResultWait{get;set;} public int ClassesWithDipViolations{get;set;} public int TotalSwitchStatements{get;set;} public int InterfacesWithoutImplementation{get;set;} public int UniqueNamespaces{get;set;} }
class ClassEntry { public string Name{get;set;}=""; public string File{get;set;}=""; public int Line{get;set;} public string Namespace{get;set;}=""; public string Layer{get;set;}=""; public bool IsAbstract{get;set;} public bool IsSealed{get;set;} public bool IsPartial{get;set;} public bool IsGeneric{get;set;} public List<string> Attributes{get;set;}=new(); public List<string> ImplementedInterfaces{get;set;}=new(); public string? BaseClass{get;set;} public List<string> ConstructorDeps{get;set;}=new(); public List<MethodEntry> PublicMethods{get;set;}=new(); public List<string> Properties{get;set;}=new(); public List<DipViolation> DipViolations{get;set;}=new(); public List<string> AsyncMethods{get;set;}=new(); public List<int> ResultWaitLines{get;set;}=new(); public List<LongMethod> LongMethods{get;set;}=new(); public int MethodCount{get;set;} public int PropertyCount{get;set;} public int SwitchCount{get;set;} public string? Project{get;set;} }
class InterfaceEntry { public string Name{get;set;}=""; public string File{get;set;}=""; public int Line{get;set;} public string Namespace{get;set;}=""; public List<string> Methods{get;set;}=new(); public List<string> Properties{get;set;}=new(); public List<string> ExtendedInterfaces{get;set;}=new(); public List<string> ImplementedBy{get;set;}=new(); public int MethodCount{get;set;} public string? Project{get;set;} }
class EnumEntry { public string Name{get;set;}=""; public string File{get;set;}=""; public int Line{get;set;} public string Namespace{get;set;}=""; public List<string> Values{get;set;}=new(); public string? Project{get;set;} }
class RecordEntry { public string Name{get;set;}=""; public string File{get;set;}=""; public int Line{get;set;} public string Namespace{get;set;}=""; public List<string> Properties{get;set;}=new(); public bool IsPositional{get;set;} public string? Project{get;set;} }
class MethodEntry { public string Name{get;set;}=""; public string ReturnType{get;set;}=""; public bool IsAsync{get;set;} public bool HasCancellationToken{get;set;} public int ParamCount{get;set;} public int Lines{get;set;} }
class LongMethod { public string Name{get;set;}=""; public int Lines{get;set;} public bool IsAsync{get;set;} public string ReturnType{get;set;}=""; }
class DipViolation { public string TypeName{get;set;}=""; public int Line{get;set;} }
class DependencyNode { public List<string> DependsOn{get;set;}=new(); public List<string> UsedBy{get;set;}=new(); public string File{get;set;}=""; }
class CouplingReport { public List<CouplingEntry> MostDepended{get;set;}=new(); public List<CouplingEntry> MostDepending{get;set;}=new(); public List<string> CircularRiskPairs{get;set;}=new(); }
class CouplingEntry { public string Name{get;set;}=""; public int Count{get;set;} }
class ArchitectureReport { public List<string> LayerViolations{get;set;}=new(); public List<string> OrphanInterfaces{get;set;}=new(); public List<string> GodClassCandidates{get;set;}=new(); public List<string> InterfaceWithSingleImpl{get;set;}=new(); }
