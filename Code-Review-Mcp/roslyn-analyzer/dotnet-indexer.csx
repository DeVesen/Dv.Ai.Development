#!/usr/bin/env dotnet-script
// dotnet-indexer.csx
// Usage: dotnet script dotnet-indexer.csx -- <solutionOrProjectRoot>
// Output: Full JSON index of the .NET project

#r "nuget: Microsoft.CodeAnalysis.CSharp, 5.0.0-2.final"
#nullable enable

using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using System.Text.Json;
using System.Text.Json.Serialization;

var rootPath = Args.FirstOrDefault() ?? Directory.GetCurrentDirectory();
if (!Directory.Exists(rootPath))
{
    Console.Error.WriteLine($"Directory not found: {rootPath}");
    Environment.Exit(1);
}

// ── Scan all .cs files ────────────────────────────────────────────────────────
var csFiles = Directory
    .GetFiles(rootPath, "*.cs", SearchOption.AllDirectories)
    .Where(f => !f.Contains(Path.DirectorySeparatorChar + "obj" + Path.DirectorySeparatorChar)
             && !f.Contains(Path.DirectorySeparatorChar + "bin" + Path.DirectorySeparatorChar)
             && !f.Contains(Path.DirectorySeparatorChar + "Migrations" + Path.DirectorySeparatorChar)
             && !f.EndsWith(".g.cs")
             && !f.EndsWith(".Designer.cs"))
    .Take(400)
    .ToList();

// ── Parse all files ───────────────────────────────────────────────────────────
var parsedFiles = csFiles
    .Select(f => (Path: f, Tree: CSharpSyntaxTree.ParseText(File.ReadAllText(f), path: f)))
    .ToList();

var compilation = CSharpCompilation.Create("indexer")
    .AddReferences(MetadataReference.CreateFromFile(typeof(object).Assembly.Location))
    .AddSyntaxTrees(parsedFiles.Select(f => f.Tree));

// ── Build Index ───────────────────────────────────────────────────────────────
var index = new ProjectIndex { GeneratedAt = DateTime.UtcNow.ToString("o"), ProjectRoot = rootPath };

foreach (var (filePath, tree) in parsedFiles)
{
    var relPath = Path.GetRelativePath(rootPath, filePath);
    var root = tree.GetRoot();
    var model = compilation.GetSemanticModel(tree);

    // ── Namespaces
    foreach (var ns in root.DescendantNodes().OfType<NamespaceDeclarationSyntax>()
        .Concat<SyntaxNode>(root.DescendantNodes().OfType<FileScopedNamespaceDeclarationSyntax>()))
    {
        var nsName = ns is NamespaceDeclarationSyntax n ? n.Name.ToString() : ((FileScopedNamespaceDeclarationSyntax)ns).Name.ToString();
        if (!index.Namespaces.Contains(nsName)) index.Namespaces.Add(nsName);
    }

    // ── Classes
    foreach (var cls in root.DescendantNodes().OfType<ClassDeclarationSyntax>())
    {
        index.Classes.Add(BuildClassEntry(cls, relPath, model));
    }

    // ── Interfaces
    foreach (var iface in root.DescendantNodes().OfType<InterfaceDeclarationSyntax>())
    {
        index.Interfaces.Add(BuildInterfaceEntry(iface, relPath));
    }

    // ── Enums
    foreach (var enumDecl in root.DescendantNodes().OfType<EnumDeclarationSyntax>())
    {
        index.Enums.Add(new EnumEntry
        {
            Name = enumDecl.Identifier.Text,
            File = relPath,
            Line = enumDecl.GetLocation().GetLineSpan().StartLinePosition.Line + 1,
            Values = enumDecl.Members.Select(m => m.Identifier.Text).ToList(),
            Namespace = GetNamespace(enumDecl),
        });
    }

    // ── Records
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
        });
    }
}

// ── Post-pass: resolve interface implementations ──────────────────────────────
foreach (var cls in index.Classes)
{
    foreach (var iface in index.Interfaces)
    {
        if (cls.ImplementedInterfaces.Contains(iface.Name) && !iface.ImplementedBy.Contains(cls.Name))
            iface.ImplementedBy.Add(cls.Name);
    }
}

// ── Build dependency graph ────────────────────────────────────────────────────
index.DependencyGraph = BuildDependencyGraph(index.Classes);

// ── Compute reports ───────────────────────────────────────────────────────────
index.Summary = BuildSummary(index);
index.CouplingReport = BuildCouplingReport(index.DependencyGraph);
index.ArchitectureReport = BuildArchitectureReport(index);

var options = new JsonSerializerOptions
{
    WriteIndented = true,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
};
Console.WriteLine(JsonSerializer.Serialize(index, options));

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

    // Detect layer
    var layer = DetectLayer(cls.Identifier.Text, attributes);

    // Detect DI violations
    var dipViolations = cls.DescendantNodes()
        .OfType<ObjectCreationExpressionSyntax>()
        .Select(n => new DipViolation
        {
            TypeName = n.Type.ToString(),
            Line = n.GetLocation().GetLineSpan().StartLinePosition.Line + 1
        })
        .Where(v => char.IsUpper(v.TypeName[0]) && !IsAllowedNew(v.TypeName))
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
        graph[cls.Name] = new DependencyNode { DependsOn = cls.ConstructorDeps, UsedBy = new(), File = cls.File };
    }
    foreach (var (name, node) in graph)
    {
        foreach (var dep in node.DependsOn)
        {
            var cleanDep = dep.Contains('<') ? dep[..dep.IndexOf('<')] : dep;
            if (graph.TryGetValue(cleanDep, out var depNode) && !depNode.UsedBy.Contains(name))
                depNode.UsedBy.Add(name);
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

    // Controller → Repository directly (should go through Service)
    foreach (var ctrl in index.Classes.Where(c => c.Layer == "Controller"))
    {
        var repoDepends = ctrl.ConstructorDeps.Where(d => index.Classes.Any(c => c.Name == d && c.Layer == "Repository")).ToList();
        foreach (var dep in repoDepends)
            layerViolations.Add($"{ctrl.Name} directly depends on Repository {dep} (missing Service layer)");
    }

    // Interface without implementation
    var orphanInterfaces = index.Interfaces.Where(i => i.ImplementedBy.Count == 0).Select(i => i.Name).ToList();

    // Classes that are > 500 lines (estimated)
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
class ClassEntry { public string Name{get;set;}=""; public string File{get;set;}=""; public int Line{get;set;} public string Namespace{get;set;}=""; public string Layer{get;set;}=""; public bool IsAbstract{get;set;} public bool IsSealed{get;set;} public bool IsPartial{get;set;} public bool IsGeneric{get;set;} public List<string> Attributes{get;set;}=new(); public List<string> ImplementedInterfaces{get;set;}=new(); public string? BaseClass{get;set;} public List<string> ConstructorDeps{get;set;}=new(); public List<MethodEntry> PublicMethods{get;set;}=new(); public List<string> Properties{get;set;}=new(); public List<DipViolation> DipViolations{get;set;}=new(); public List<string> AsyncMethods{get;set;}=new(); public List<int> ResultWaitLines{get;set;}=new(); public List<LongMethod> LongMethods{get;set;}=new(); public int MethodCount{get;set;} public int PropertyCount{get;set;} public int SwitchCount{get;set;} }
class InterfaceEntry { public string Name{get;set;}=""; public string File{get;set;}=""; public int Line{get;set;} public string Namespace{get;set;}=""; public List<string> Methods{get;set;}=new(); public List<string> Properties{get;set;}=new(); public List<string> ExtendedInterfaces{get;set;}=new(); public List<string> ImplementedBy{get;set;}=new(); public int MethodCount{get;set;} }
class EnumEntry { public string Name{get;set;}=""; public string File{get;set;}=""; public int Line{get;set;} public string Namespace{get;set;}=""; public List<string> Values{get;set;}=new(); }
class RecordEntry { public string Name{get;set;}=""; public string File{get;set;}=""; public int Line{get;set;} public string Namespace{get;set;}=""; public List<string> Properties{get;set;}=new(); public bool IsPositional{get;set;} }
class MethodEntry { public string Name{get;set;}=""; public string ReturnType{get;set;}=""; public bool IsAsync{get;set;} public bool HasCancellationToken{get;set;} public int ParamCount{get;set;} public int Lines{get;set;} }
class LongMethod { public string Name{get;set;}=""; public int Lines{get;set;} public bool IsAsync{get;set;} public string ReturnType{get;set;}=""; }
class DipViolation { public string TypeName{get;set;}=""; public int Line{get;set;} }
class DependencyNode { public List<string> DependsOn{get;set;}=new(); public List<string> UsedBy{get;set;}=new(); public string File{get;set;}=""; }
class CouplingReport { public List<CouplingEntry> MostDepended{get;set;}=new(); public List<CouplingEntry> MostDepending{get;set;}=new(); public List<string> CircularRiskPairs{get;set;}=new(); }
class CouplingEntry { public string Name{get;set;}=""; public int Count{get;set;} }
class ArchitectureReport { public List<string> LayerViolations{get;set;}=new(); public List<string> OrphanInterfaces{get;set;}=new(); public List<string> GodClassCandidates{get;set;}=new(); public List<string> InterfaceWithSingleImpl{get;set;}=new(); }
