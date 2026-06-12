#!/usr/bin/env dotnet-script
// roslyn-analyzer.csx
// Usage: dotnet script roslyn-analyzer.csx -- <file.cs>
// Output: JSON metadata for SOLID analysis and API validation

#r "nuget: Microsoft.CodeAnalysis.CSharp, 5.0.0-2.final"
#nullable enable

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

// Process both classes and records via TypeDeclarationSyntax
foreach (var typeDecl in root.DescendantNodes().OfType<TypeDeclarationSyntax>()
    .Where(t => t is ClassDeclarationSyntax or RecordDeclarationSyntax))
{
    var typeMeta = AnalyzeTypeDeclaration(typeDecl, semanticModel, code);
    result.Classes.Add(typeMeta);
    result.SolidViolations.AddRange(DetectSolidViolations(typeMeta));
}

// API validation issues evaluated after all classes are collected
result.ApiValidationIssues.AddRange(DetectApiValidationIssues(result.Classes));

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

static ClassMeta AnalyzeTypeDeclaration(TypeDeclarationSyntax typeDecl, SemanticModel model, string rawCode)
{
    var methods = typeDecl.Members.OfType<MethodDeclarationSyntax>().ToList();
    var explicitProperties = typeDecl.Members.OfType<PropertyDeclarationSyntax>().ToList();

    // Constructor deps: explicit ctors + record primary constructor parameters
    var ctorParams = typeDecl.Members
        .OfType<ConstructorDeclarationSyntax>()
        .SelectMany(c => c.ParameterList.Parameters)
        .Select(p => p.Type?.ToString() ?? p.Identifier.Text)
        .ToList();

    if (typeDecl is RecordDeclarationSyntax primaryRecord && primaryRecord.ParameterList != null)
    {
        ctorParams.AddRange(primaryRecord.ParameterList.Parameters
            .Select(p => p.Type?.ToString() ?? p.Identifier.Text));
    }

    // Detect new ConcreteType() instantiations
    var newExpressions = typeDecl.DescendantNodes()
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
    var switchCount = typeDecl.DescendantNodes().OfType<SwitchStatementSyntax>().Count()
                    + typeDecl.DescendantNodes().OfType<SwitchExpressionSyntax>().Count();

    // Deep nesting detection (> 3 levels)
    var deepNesting = DetectDeepNesting(typeDecl);

    // Class-level attributes (like [ApiController], [Authorize])
    var attributes = typeDecl.AttributeLists
        .SelectMany(al => al.Attributes)
        .Select(a => a.Name.ToString())
        .ToList();

    // Base types (interfaces + base class)
    var baseTypes = typeDecl.BaseList?.Types.Select(t => t.Type.ToString()).ToList() ?? new();

    // Async methods
    var asyncMethods = methods.Where(m => m.Modifiers.Any(mod => mod.Text == "async")).Select(m => m.Identifier.Text).ToList();

    // .Result/.Wait() usage (deadlock risk)
    var resultWaitUsages = typeDecl.DescendantNodes()
        .OfType<MemberAccessExpressionSyntax>()
        .Where(m => m.Name.Identifier.Text is "Result" or "Wait" or "GetAwaiter")
        .Select(m => m.GetLocation().GetLineSpan().StartLinePosition.Line + 1)
        .ToList();

    // Hardcoded connection strings / secrets heuristic
    var hardcodedSecrets = typeDecl.DescendantNodes()
        .OfType<LiteralExpressionSyntax>()
        .Where(l => l.Token.ValueText.Contains("Server=") || l.Token.ValueText.Contains("password=") || l.Token.ValueText.Contains("apikey"))
        .Select(l => l.GetLocation().GetLineSpan().StartLinePosition.Line + 1)
        .ToList();

    // Property annotations (DataAnnotations for validation — classes and records)
    var propertyAnnotations = ExtractPropertyAnnotations(typeDecl);

    // Method-level annotations (HTTP verbs + parameters for api-validation)
    var httpVerbs = new HashSet<string> { "HttpPost", "HttpPut", "HttpPatch", "HttpGet", "HttpDelete" };
    var methodAnnotations = methods.Select(m => new MethodAnnotation
    {
        MethodName = m.Identifier.Text,
        Line = m.GetLocation().GetLineSpan().StartLinePosition.Line + 1,
        HttpVerb = m.AttributeLists.SelectMany(al => al.Attributes)
            .Select(a => a.Name.ToString())
            .FirstOrDefault(a => httpVerbs.Contains(a)),
        Parameters = m.ParameterList.Parameters
            .Where(p => !new HashSet<string> { "CancellationToken", "ClaimsPrincipal", "HttpContext" }
                .Contains(p.Type?.ToString() ?? ""))
            .Select(p => new MethodParameter
            {
                Name = p.Identifier.Text,
                Type = p.Type?.ToString() ?? "unknown",
                Annotations = p.AttributeLists.SelectMany(al => al.Attributes)
                    .Select(a => a.Name.ToString()).ToList()
            }).ToList()
    }).ToList();

    var typeName = typeDecl switch
    {
        ClassDeclarationSyntax c => c.Identifier.Text,
        RecordDeclarationSyntax r => r.Identifier.Text,
        _ => "Unknown"
    };

    var propertyCount = typeDecl is RecordDeclarationSyntax rd
        ? (rd.ParameterList?.Parameters.Count ?? 0) + explicitProperties.Count
        : explicitProperties.Count;

    return new ClassMeta
    {
        Name = typeName,
        IsRecord = typeDecl is RecordDeclarationSyntax,
        LineStart = typeDecl.GetLocation().GetLineSpan().StartLinePosition.Line + 1,
        MethodCount = methods.Count,
        PropertyCount = propertyCount,
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
        IsAbstract = typeDecl.Modifiers.Any(m => m.Text == "abstract"),
        IsSealed = typeDecl.Modifiers.Any(m => m.Text == "sealed"),
        IsPartial = typeDecl.Modifiers.Any(m => m.Text == "partial"),
        PropertyAnnotations = propertyAnnotations,
        MethodAnnotations = methodAnnotations,
    };
}

static List<PropertyAnnotation> ExtractPropertyAnnotations(TypeDeclarationSyntax typeDecl)
{
    var result = new List<PropertyAnnotation>();

    // Explicit properties (both classes and records)
    foreach (var prop in typeDecl.Members.OfType<PropertyDeclarationSyntax>())
    {
        var annotations = prop.AttributeLists
            .SelectMany(al => al.Attributes)
            .Select(a => a.ToString())
            .ToList();
        result.Add(new PropertyAnnotation
        {
            PropertyName = prop.Identifier.Text,
            Type = prop.Type.ToString(),
            Annotations = annotations
        });
    }

    // Record primary constructor parameters (positional record properties)
    if (typeDecl is RecordDeclarationSyntax recordDecl && recordDecl.ParameterList != null)
    {
        foreach (var param in recordDecl.ParameterList.Parameters)
        {
            var annotations = param.AttributeLists
                .SelectMany(al => al.Attributes)
                .Select(a => a.ToString())
                .ToList();
            result.Add(new PropertyAnnotation
            {
                PropertyName = param.Identifier.Text,
                Type = param.Type?.ToString() ?? "unknown",
                Annotations = annotations,
                IsPrimaryConstructorParam = true
            });
        }
    }

    return result;
}

static List<ApiValidationIssue> DetectApiValidationIssues(List<ClassMeta> classes)
{
    var issues = new List<ApiValidationIssue>();
    var dtoSuffixes = new HashSet<string> { "Request", "Dto", "Model", "Command", "Body", "Input", "Payload" };
    var writeMethods = new HashSet<string> { "HttpPost", "HttpPut", "HttpPatch" };

    foreach (var cls in classes)
    {
        bool isController = cls.Attributes.Any(a => a.Contains("ApiController") || a.Contains("Controller"))
                         || cls.Name.EndsWith("Controller");
        bool isDto = dtoSuffixes.Any(s => cls.Name.EndsWith(s));

        if (isController)
        {
            var writeActions = cls.MethodAnnotations
                .Where(m => m.HttpVerb != null && writeMethods.Contains(m.HttpVerb))
                .ToList();

            foreach (var action in writeActions)
            {
                // Exclude [FromQuery]/[FromRoute]/[FromServices] params — they don't bind to the request body
                // and therefore don't require DataAnnotations on the DTO type
                var bodyBindingExclusions = new HashSet<string> { "FromQuery", "FromRoute", "FromServices" };
                var complexParams = action.Parameters
                    .Where(p => p.Type.Length > 0 && char.IsUpper(p.Type[0])
                             && !new HashSet<string> { "IFormFile", "Stream", "Guid", "string", "int" }.Contains(p.Type)
                             && !p.Annotations.Any(a => bodyBindingExclusions.Contains(a)))
                    .ToList();

                foreach (var param in complexParams)
                {
                    bool looksLikeDto = dtoSuffixes.Any(s => param.Type.EndsWith(s));
                    issues.Add(new ApiValidationIssue
                    {
                        ClassName = cls.Name,
                        MethodName = action.MethodName,
                        Line = action.Line,
                        IssueType = "unvalidated-parameter",
                        Severity = looksLikeDto ? "critical" : "warning",
                        Description = $"[{action.HttpVerb}] {action.MethodName}: parameter '{param.Name}' ({param.Type}) — verify DTO has DataAnnotations ([Required], [StringLength], etc.)",
                        Evidence = $"{action.HttpVerb} {action.MethodName}({param.Type} {param.Name})"
                    });
                }
            }

            if (writeActions.Count > 0)
            {
                int withComplexParams = writeActions.Count(a => a.Parameters.Any(p =>
                    p.Type.Length > 0 && char.IsUpper(p.Type[0]) &&
                    !new HashSet<string> { "IFormFile", "Stream", "Guid", "string", "int" }.Contains(p.Type)));

                if (withComplexParams > 0)
                    issues.Add(new ApiValidationIssue
                    {
                        ClassName = cls.Name,
                        MethodName = null,
                        Line = cls.LineStart,
                        IssueType = "controller-no-validation",
                        Severity = "warning",
                        Description = $"Summary: {writeActions.Count} POST/PUT/PATCH endpoint(s), {withComplexParams} with DTO parameters — check DataAnnotations on all DTOs.",
                        Evidence = $"{cls.Name}: {writeActions.Count} write endpoints"
                    });
            }
        }

        if (isDto && cls.PropertyAnnotations.Count > 0)
        {
            var unannotatedProps = cls.PropertyAnnotations
                .Where(p => p.Annotations.Count == 0)
                .ToList();

            if (unannotatedProps.Count > 0)
            {
                issues.Add(new ApiValidationIssue
                {
                    ClassName = cls.Name,
                    MethodName = null,
                    Line = cls.LineStart,
                    IssueType = "missing-dto-annotations",
                    Severity = unannotatedProps.Count == cls.PropertyAnnotations.Count ? "critical" : "warning",
                    Description = $"DTO '{cls.Name}' ({(cls.IsRecord ? "record" : "class")}): {unannotatedProps.Count}/{cls.PropertyAnnotations.Count} properties have no DataAnnotations.",
                    Evidence = $"Unannotated: {string.Join(", ", unannotatedProps.Take(5).Select(p => $"{p.Type} {p.PropertyName}"))}"
                });
            }
        }
    }

    return issues;
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

static List<int> DetectDeepNesting(TypeDeclarationSyntax typeDecl)
{
    var lines = new List<int>();
    foreach (var method in typeDecl.Members.OfType<MethodDeclarationSyntax>())
    {
        int maxDepth = 0;
        int currentDepth = 0;
        foreach (var node in method.DescendantNodes())
        {
            if (node is IfStatementSyntax or ForStatementSyntax or ForEachStatementSyntax or WhileStatementSyntax or SwitchStatementSyntax)
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

static List<SolidViolation> DetectSolidViolations(ClassMeta meta)
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

    // DIP: new ConcreteService() — expanded allowlist to reduce false positives
    foreach (var newExpr in meta.NewExpressions)
    {
        var ignoredPrefixes = new[]
        {
            // Collections & generics
            "List<", "Dictionary<", "HashSet<", "Queue<", "Stack<", "LinkedList<", "ConcurrentDictionary<",
            // Value types & helpers
            "StringBuilder", "DateTime", "DateTimeOffset", "TimeSpan", "Guid", "Uri", "Version",
            // Streams & IO
            "MemoryStream", "FileStream", "StreamReader", "StreamWriter", "BinaryReader", "BinaryWriter", "StringWriter", "StringReader",
            // Threading & async
            "CancellationTokenSource", "SemaphoreSlim", "TaskCompletionSource",
            // Framework primitives
            "Stopwatch", "Regex", "Random", "EventArgs",
            // ASP.NET Core action results
            "ObjectResult", "OkResult", "BadRequestResult", "NotFoundResult", "JsonResult",
            // Standard exception types (explicit)
            "Exception", "NotImplementedException", "ArgumentException", "ArgumentNullException",
            "InvalidOperationException", "NotSupportedException", "ApplicationException",
            "KeyNotFoundException", "FormatException", "OverflowException",
        };
        // Generic rule: anything ending with "Exception" is BCL/framework, not a DIP violation
        bool isIgnored = ignoredPrefixes.Any(t => newExpr.TypeName.StartsWith(t))
                      || newExpr.TypeName.EndsWith("Exception");
        if (!isIgnored)
            violations.Add(new SolidViolation { Principle = "DIP", Severity = "warning", ClassName = meta.Name, Line = newExpr.Line, Description = $"Direct instantiation of \"{newExpr.TypeName}\" violates DIP. Register in DI container and inject via constructor.", Evidence = $"new {newExpr.TypeName}()" });
    }

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
        TotalApiValidationIssues = result.ApiValidationIssues.Count,
        CriticalApiValidationIssues = result.ApiValidationIssues.Count(v => v.Severity == "critical"),
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
    public List<ApiValidationIssue> ApiValidationIssues { get; set; } = new();
    public Metrics Metrics { get; set; } = new();
}

class ClassMeta
{
    public string Name { get; set; } = "";
    public bool IsRecord { get; set; }
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
    public List<PropertyAnnotation> PropertyAnnotations { get; set; } = new();
    public List<MethodAnnotation> MethodAnnotations { get; set; } = new();
}

class PropertyAnnotation
{
    public string PropertyName { get; set; } = "";
    public string Type { get; set; } = "";
    public List<string> Annotations { get; set; } = new();
    public bool IsPrimaryConstructorParam { get; set; }
}

class MethodAnnotation
{
    public string MethodName { get; set; } = "";
    public int Line { get; set; }
    public string? HttpVerb { get; set; }
    public List<MethodParameter> Parameters { get; set; } = new();
}

class MethodParameter
{
    public string Name { get; set; } = "";
    public string Type { get; set; } = "";
    public List<string> Annotations { get; set; } = new();
}

class ApiValidationIssue
{
    public string ClassName { get; set; } = "";
    public string? MethodName { get; set; }
    public int Line { get; set; }
    public string IssueType { get; set; } = "";
    public string Severity { get; set; } = "";
    public string Description { get; set; } = "";
    public string Evidence { get; set; } = "";
}

class InterfaceMeta { public string Name { get; set; } = ""; public int LineStart { get; set; } public int MethodCount { get; set; } public int PropertyCount { get; set; } }
class NewExpression { public string TypeName { get; set; } = ""; public int Line { get; set; } }
class LongMethod { public string Name { get; set; } = ""; public int Lines { get; set; } }
class SolidViolation { public string Principle { get; set; } = ""; public string Severity { get; set; } = ""; public string ClassName { get; set; } = ""; public int Line { get; set; } public string Description { get; set; } = ""; public string Evidence { get; set; } = ""; }
class Metrics { public int TotalClasses { get; set; } public int TotalInterfaces { get; set; } public int TotalUsings { get; set; } public double AvgMethodsPerClass { get; set; } public int MaxMethodsInClass { get; set; } public int TotalSolidViolations { get; set; } public int CriticalViolations { get; set; } public int TotalApiValidationIssues { get; set; } public int CriticalApiValidationIssues { get; set; } }
