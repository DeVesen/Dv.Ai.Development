#!/usr/bin/env dotnet-script
// roslyn-analyzer.csx
// Usage: dotnet script roslyn-analyzer.csx -- <file.cs>
// Output: JSON metadata for SOLID analysis

#r "nuget: Microsoft.CodeAnalysis.CSharp, 4.9.2"

using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using System.Text.Json;
using System.Text.Json.Serialization;

var filePath = Args.FirstOrDefault();
if (string.IsNullOrEmpty(filePath) || !File.Exists(filePath))
{
    Console.Error.WriteLine($"File not found: {filePath}");
    Environment.Exit(1);
}

var code = File.ReadAllText(filePath);
var tree = CSharpSyntaxTree.ParseText(code);
var root = tree.GetRoot();

// ── Compile for semantic model ────────────────────────────────────────────────
var compilation = CSharpCompilation.Create("analysis")
    .AddReferences(MetadataReference.CreateFromFile(typeof(object).Assembly.Location))
    .AddSyntaxTrees(tree);

var semanticModel = compilation.GetSemanticModel(tree);

// ── Collect metadata ──────────────────────────────────────────────────────────
var result = new AnalysisResult { Filename = filePath };

foreach (var classDecl in root.DescendantNodes().OfType<ClassDeclarationSyntax>())
{
    var classMeta = AnalyzeClass(classDecl, semanticModel, code);
    result.Classes.Add(classMeta);
    result.SolidViolations.AddRange(DetectSolidViolations(classDecl, classMeta, semanticModel));
}

foreach (var ifaceDecl in root.DescendantNodes().OfType<InterfaceDeclarationSyntax>())
{
    result.Interfaces.Add(AnalyzeInterface(ifaceDecl));
}

result.Usings = root.DescendantNodes()
    .OfType<UsingDirectiveSyntax>()
    .Select(u => u.Name?.ToString() ?? "")
    .Where(u => !string.IsNullOrEmpty(u))
    .ToList();

result.Metrics = ComputeMetrics(result);

var options = new JsonSerializerOptions { WriteIndented = true, DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull };
Console.WriteLine(JsonSerializer.Serialize(result, options));

// ── Analysis Functions ────────────────────────────────────────────────────────

static ClassMeta AnalyzeClass(ClassDeclarationSyntax classDecl, SemanticModel model, string rawCode)
{
    var methods = classDecl.Members.OfType<MethodDeclarationSyntax>().ToList();
    var properties = classDecl.Members.OfType<PropertyDeclarationSyntax>().ToList();
    var ctorParams = classDecl.Members
        .OfType<ConstructorDeclarationSyntax>()
        .SelectMany(c => c.ParameterList.Parameters)
        .Select(p => p.Type?.ToString() ?? p.Identifier.Text)
        .ToList();

    // Detect new ConcreteType() instantiations
    var newExpressions = classDecl.DescendantNodes()
        .OfType<ObjectCreationExpressionSyntax>()
        .Select(n => new NewExpression
        {
            TypeName = n.Type.ToString(),
            Line = n.GetLocation().GetLineSpan().StartLinePosition.Line + 1
        })
        .Where(n => char.IsUpper(n.TypeName[0]))
        .ToList();

    // Long methods (> 25 lines)
    var longMethods = methods
        .Select(m => new { Name = m.Identifier.Text, Lines = m.GetLocation().GetLineSpan().EndLinePosition.Line - m.GetLocation().GetLineSpan().StartLinePosition.Line })
        .Where(m => m.Lines > 25)
        .Select(m => new LongMethod { Name = m.Name, Lines = m.Lines })
        .ToList();

    // Switch statement count (OCP indicator)
    var switchCount = classDecl.DescendantNodes().OfType<SwitchStatementSyntax>().Count()
                    + classDecl.DescendantNodes().OfType<SwitchExpressionSyntax>().Count();

    // Deep nesting detection (> 3 levels)
    var deepNesting = DetectDeepNesting(classDecl);

    // Attributes (like [ApiController], [Authorize], [HttpGet])
    var attributes = classDecl.AttributeLists
        .SelectMany(al => al.Attributes)
        .Select(a => a.Name.ToString())
        .ToList();

    // Base types (interfaces + base class)
    var baseTypes = classDecl.BaseList?.Types.Select(t => t.Type.ToString()).ToList() ?? new();

    // Is async-aware: has async methods
    var asyncMethods = methods.Where(m => m.Modifiers.Any(mod => mod.Text == "async")).Select(m => m.Identifier.Text).ToList();

    // Result/Wait usage (deadlock risk)
    var resultWaitUsages = classDecl.DescendantNodes()
        .OfType<MemberAccessExpressionSyntax>()
        .Where(m => m.Name.Identifier.Text is "Result" or "Wait" or "GetAwaiter")
        .Select(m => m.GetLocation().GetLineSpan().StartLinePosition.Line + 1)
        .ToList();

    // Hardcoded connection strings / secrets heuristic
    var hardcodedSecrets = classDecl.DescendantNodes()
        .OfType<LiteralExpressionSyntax>()
        .Where(l => l.Token.ValueText.Contains("Server=") || l.Token.ValueText.Contains("password=") || l.Token.ValueText.Contains("apikey"))
        .Select(l => l.GetLocation().GetLineSpan().StartLinePosition.Line + 1)
        .ToList();

    return new ClassMeta
    {
        Name = classDecl.Identifier.Text,
        LineStart = classDecl.GetLocation().GetLineSpan().StartLinePosition.Line + 1,
        MethodCount = methods.Count,
        PropertyCount = properties.Count,
        ConstructorDeps = ctorParams,
        NewExpressions = newExpressions,
        LongMethods = longMethods,
        SwitchCount = switchCount,
        DeepNestingLines = deepNesting,
        Attributes = attributes,
        BaseTypes = baseTypes,
        AsyncMethods = asyncMethods,
        ResultWaitLines = resultWaitUsages,
        HardcodedSecretLines = hardcodedSecrets,
        IsAbstract = classDecl.Modifiers.Any(m => m.Text == "abstract"),
        IsSealed = classDecl.Modifiers.Any(m => m.Text == "sealed"),
        IsPartial = classDecl.Modifiers.Any(m => m.Text == "partial"),
    };
}

static InterfaceMeta AnalyzeInterface(InterfaceDeclarationSyntax ifaceDecl)
{
    return new InterfaceMeta
    {
        Name = ifaceDecl.Identifier.Text,
        LineStart = ifaceDecl.GetLocation().GetLineSpan().StartLinePosition.Line + 1,
        MethodCount = ifaceDecl.Members.OfType<MethodDeclarationSyntax>().Count(),
        PropertyCount = ifaceDecl.Members.OfType<PropertyDeclarationSyntax>().Count(),
    };
}

static List<int> DetectDeepNesting(ClassDeclarationSyntax classDecl)
{
    var lines = new List<int>();
    foreach (var method in classDecl.Members.OfType<MethodDeclarationSyntax>())
    {
        int maxDepth = 0;
        int currentDepth = 0;
        foreach (var node in method.DescendantNodes())
        {
            if (node is IfStatementSyntax or ForStatementSyntax or ForeachStatementSyntax or WhileStatementSyntax or SwitchStatementSyntax)
                currentDepth++;
            else if (node is BlockSyntax)
                currentDepth = Math.Max(0, currentDepth - 1);
            maxDepth = Math.Max(maxDepth, currentDepth);
        }
        if (maxDepth > 3)
            lines.Add(method.GetLocation().GetLineSpan().StartLinePosition.Line + 1);
    }
    return lines;
}

static List<SolidViolation> DetectSolidViolations(ClassDeclarationSyntax classDecl, ClassMeta meta, SemanticModel model)
{
    var violations = new List<SolidViolation>();

    // SRP: too many methods
    if (meta.MethodCount > 10)
        violations.Add(new SolidViolation { Principle = "SRP", Severity = meta.MethodCount > 20 ? "critical" : "warning", ClassName = meta.Name, Line = meta.LineStart, Description = $"Class has {meta.MethodCount} methods – likely handles multiple responsibilities.", Evidence = $"MethodCount={meta.MethodCount}" });

    // SRP: Controller with direct DB or business logic
    bool isController = meta.Attributes.Any(a => a.Contains("ApiController") || a.Contains("Controller")) || meta.Name.EndsWith("Controller");
    bool hasDbContext = meta.ConstructorDeps.Any(d => d.Contains("DbContext") || d.Contains("Repository"));
    if (isController && hasDbContext)
        violations.Add(new SolidViolation { Principle = "SRP", Severity = "warning", ClassName = meta.Name, Line = meta.LineStart, Description = "Controller directly depends on DbContext/Repository. Move to a Service layer.", Evidence = $"Deps: {string.Join(", ", meta.ConstructorDeps)}" });

    // DIP: new ConcreteService() in class body
    foreach (var newExpr in meta.NewExpressions)
    {
        var ignoredTypes = new[] { "List<", "Dictionary<", "StringBuilder", "DateTime", "Exception", "NotImplementedException", "ArgumentException" };
        if (!ignoredTypes.Any(t => newExpr.TypeName.StartsWith(t)))
            violations.Add(new SolidViolation { Principle = "DIP", Severity = "warning", ClassName = meta.Name, Line = newExpr.Line, Description = $"Direct instantiation of \"{newExpr.TypeName}\" violates DIP. Register in DI container and inject via constructor.", Evidence = $"new {newExpr.TypeName}()" });
    }

    // ISP: Interface with > 7 members
    // (checked at interface level, but flag implementing class)
    // OCP: Multiple switch statements
    if (meta.SwitchCount >= 2)
        violations.Add(new SolidViolation { Principle = "OCP", Severity = "suggestion", ClassName = meta.Name, Line = meta.LineStart, Description = $"{meta.SwitchCount} switch statements — consider Strategy pattern to avoid modifying this class for new types.", Evidence = $"SwitchCount={meta.SwitchCount}" });

    // Performance: .Result / .Wait() deadlock risk
    foreach (var line in meta.ResultWaitLines)
        violations.Add(new SolidViolation { Principle = "SRP", Severity = "critical", ClassName = meta.Name, Line = line, Description = ".Result / .Wait() on async code risks deadlocks in ASP.NET. Use await instead.", Evidence = $"Line {line}" });

    // Security: hardcoded secrets
    foreach (var line in meta.HardcodedSecretLines)
        violations.Add(new SolidViolation { Principle = "SRP", Severity = "critical", ClassName = meta.Name, Line = line, Description = "Possible hardcoded secret or connection string. Use environment variables or IConfiguration.", Evidence = $"Line {line}" });

    return violations;
}

static Metrics ComputeMetrics(AnalysisResult result)
{
    var totalMethods = result.Classes.Sum(c => c.MethodCount);
    return new Metrics
    {
        TotalClasses = result.Classes.Count,
        TotalInterfaces = result.Interfaces.Count,
        TotalUsings = result.Usings.Count,
        AvgMethodsPerClass = result.Classes.Count > 0 ? (double)totalMethods / result.Classes.Count : 0,
        MaxMethodsInClass = result.Classes.Count > 0 ? result.Classes.Max(c => c.MethodCount) : 0,
        TotalSolidViolations = result.SolidViolations.Count,
        CriticalViolations = result.SolidViolations.Count(v => v.Severity == "critical"),
    };
}

// ── Data Models ───────────────────────────────────────────────────────────────

class AnalysisResult
{
    public string Filename { get; set; } = "";
    public List<ClassMeta> Classes { get; set; } = new();
    public List<InterfaceMeta> Interfaces { get; set; } = new();
    public List<string> Usings { get; set; } = new();
    public List<SolidViolation> SolidViolations { get; set; } = new();
    public Metrics? Metrics { get; set; }
}

class ClassMeta
{
    public string Name { get; set; } = "";
    public int LineStart { get; set; }
    public int MethodCount { get; set; }
    public int PropertyCount { get; set; }
    public List<string> ConstructorDeps { get; set; } = new();
    public List<NewExpression> NewExpressions { get; set; } = new();
    public List<LongMethod> LongMethods { get; set; } = new();
    public int SwitchCount { get; set; }
    public List<int> DeepNestingLines { get; set; } = new();
    public List<string> Attributes { get; set; } = new();
    public List<string> BaseTypes { get; set; } = new();
    public List<string> AsyncMethods { get; set; } = new();
    public List<int> ResultWaitLines { get; set; } = new();
    public List<int> HardcodedSecretLines { get; set; } = new();
    public bool IsAbstract { get; set; }
    public bool IsSealed { get; set; }
    public bool IsPartial { get; set; }
}

class InterfaceMeta { public string Name { get; set; } = ""; public int LineStart { get; set; }; public int MethodCount { get; set; }; public int PropertyCount { get; set; }; }
class NewExpression { public string TypeName { get; set; } = ""; public int Line { get; set; }; }
class LongMethod { public string Name { get; set; } = ""; public int Lines { get; set; }; }
class SolidViolation { public string Principle { get; set; } = ""; public string Severity { get; set; } = ""; public string ClassName { get; set; } = ""; public int Line { get; set; }; public string Description { get; set; } = ""; public string Evidence { get; set; } = ""; }
class Metrics { public int TotalClasses { get; set; }; public int TotalInterfaces { get; set; }; public int TotalUsings { get; set; }; public double AvgMethodsPerClass { get; set; }; public int MaxMethodsInClass { get; set; }; public int TotalSolidViolations { get; set; }; public int CriticalViolations { get; set; }; }
