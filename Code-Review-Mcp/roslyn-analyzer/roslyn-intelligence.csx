#!/usr/bin/env dotnet-script
// roslyn-intelligence.csx
// Usage: dotnet script roslyn-intelligence.csx -- <rootPath> <feature>
// Features: maintainability | typegraph | cfg | all

#r "nuget: Microsoft.CodeAnalysis.CSharp, 4.9.2"

using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.FlowAnalysis;
using System.Text.Json;
using System.Text.Json.Serialization;

var rootPath = Args.ElementAtOrDefault(0) ?? Directory.GetCurrentDirectory();
var feature  = Args.ElementAtOrDefault(1) ?? "all";

var csFiles = Directory.GetFiles(rootPath, "*.cs", SearchOption.AllDirectories)
    .Where(f => !f.Contains($"{Path.DirectorySeparatorChar}obj{Path.DirectorySeparatorChar}")
             && !f.Contains($"{Path.DirectorySeparatorChar}bin{Path.DirectorySeparatorChar}")
             && !f.Contains($"{Path.DirectorySeparatorChar}Migrations{Path.DirectorySeparatorChar}")
             && !f.EndsWith(".g.cs"))
    .Take(300).ToList();

var parsedFiles = csFiles.Select(f =>
    (Path: f, RelPath: Path.GetRelativePath(rootPath, f),
     Code: File.ReadAllText(f), Tree: CSharpSyntaxTree.ParseText(File.ReadAllText(f), path: f)))
    .ToList();

var compilation = CSharpCompilation.Create("intelligence")
    .AddReferences(MetadataReference.CreateFromFile(typeof(object).Assembly.Location))
    .AddSyntaxTrees(parsedFiles.Select(f => f.Tree));

var result = new IntelligenceResult { ProjectRoot = rootPath, GeneratedAt = DateTime.UtcNow.ToString("o") };

if (feature is "maintainability" or "all") result.MaintainabilityIndex = AnalyzeMaintainability(parsedFiles, compilation);
if (feature is "typegraph" or "all")      result.TypeGraph = BuildTypeGraph(parsedFiles, compilation);
if (feature is "cfg" or "all")            result.ControlFlow = AnalyzeControlFlow(parsedFiles, compilation);

var opts = new JsonSerializerOptions { WriteIndented = true, DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull };
Console.WriteLine(JsonSerializer.Serialize(result, opts));

// ════════════════════════════════════════════════════════════════════════════
// 1. MAINTAINABILITY INDEX + LCOM
// ════════════════════════════════════════════════════════════════════════════

static List<MaintainabilityEntry> AnalyzeMaintainability(
    List<(string Path, string RelPath, string Code, SyntaxTree Tree)> files,
    CSharpCompilation compilation)
{
    var results = new List<MaintainabilityEntry>();

    foreach (var (_, relPath, code, tree) in files)
    {
        var root = tree.GetRoot();
        foreach (var cls in root.DescendantNodes().OfType<ClassDeclarationSyntax>())
        {
            var classLcom = ComputeClassLcom(cls);

            foreach (var method in cls.Members.OfType<MethodDeclarationSyntax>())
            {
                if (method.Body == null && method.ExpressionBody == null) continue;
                var loc = method.GetLocation().GetLineSpan().EndLinePosition.Line
                        - method.GetLocation().GetLineSpan().StartLinePosition.Line;
                if (loc < 2) continue;

                var cc = ComputeCC(method);
                var hv = ComputeHalstead(method);
                var mi = ComputeMI(cc, hv, loc);
                var grade = mi >= 80 ? "A" : mi >= 65 ? "B" : mi >= 50 ? "C" : mi >= 30 ? "D" : "F";

                results.Add(new MaintainabilityEntry
                {
                    File = relPath, ClassName = cls.Identifier.Text,
                    MethodName = method.Identifier.Text,
                    Line = method.GetLocation().GetLineSpan().StartLinePosition.Line + 1,
                    MaintainabilityIndexScore = mi, Grade = grade,
                    CyclomaticComplexity = cc, HalsteadVolume = (int)hv, LinesOfCode = loc,
                    Lcom = classLcom,
                    Interpretation = InterpretMI(mi, classLcom),
                });
            }
        }
    }
    return results.OrderBy(r => r.MaintainabilityIndexScore).ToList();
}

static int ComputeCC(MethodDeclarationSyntax method)
{
    int cc = 1;
    foreach (var n in method.DescendantNodes())
    {
        cc += n switch
        {
            IfStatementSyntax => 1,
            ConditionalExpressionSyntax => 1,
            ForStatementSyntax => 1,
            ForEachStatementSyntax => 1,
            WhileStatementSyntax => 1,
            DoStatementSyntax => 1,
            CaseSwitchLabelSyntax => 1,
            CatchClauseSyntax => 1,
            SwitchExpressionArmSyntax => 1,
            BinaryExpressionSyntax b when b.OperatorToken.Text is "&&" or "||" or "??" => 1,
            _ => 0
        };
    }
    return cc;
}

static double ComputeHalstead(MethodDeclarationSyntax method)
{
    var operators = new HashSet<string>();
    var operands  = new HashSet<string>();
    int N1 = 0, N2 = 0;

    foreach (var token in method.DescendantTokens())
    {
        var k = token.Kind();
        if (k is SyntaxKind.PlusToken or SyntaxKind.MinusToken or SyntaxKind.AsteriskToken
            or SyntaxKind.SlashToken or SyntaxKind.EqualsToken or SyntaxKind.EqualsEqualsToken
            or SyntaxKind.IfKeyword or SyntaxKind.ForKeyword or SyntaxKind.WhileKeyword
            or SyntaxKind.ReturnKeyword or SyntaxKind.NewKeyword or SyntaxKind.ThrowKeyword
            or SyntaxKind.AmpersandAmpersandToken or SyntaxKind.BarBarToken or SyntaxKind.ExclamationToken)
        { operators.Add(token.Text); N1++; }
        else if (k is SyntaxKind.IdentifierToken or SyntaxKind.NumericLiteralToken
            or SyntaxKind.StringLiteralToken or SyntaxKind.TrueKeyword or SyntaxKind.FalseKeyword or SyntaxKind.NullKeyword)
        { operands.Add(token.Text); N2++; }
    }

    int n = operators.Count + operands.Count;
    int N = N1 + N2;
    return n > 0 && N > 0 ? N * Math.Log2(n) : 0;
}

static int ComputeMI(int cc, double hv, int loc)
{
    if (hv <= 0 || loc <= 0) return 100;
    var raw = 171 - 5.2 * Math.Log(hv) - 0.23 * cc - 16.2 * Math.Log(loc);
    return (int)Math.Max(0, Math.Min(100, raw * 100.0 / 171));
}

static double ComputeClassLcom(ClassDeclarationSyntax cls)
{
    var methods = cls.Members.OfType<MethodDeclarationSyntax>().ToList();
    var fields  = cls.Members.OfType<FieldDeclarationSyntax>()
        .SelectMany(f => f.Declaration.Variables.Select(v => v.Identifier.Text)).ToHashSet();
    if (methods.Count < 2 || fields.Count == 0) return 0;

    var methodFields = methods.ToDictionary(
        m => m.Identifier.Text,
        m => fields.Where(f => m.DescendantTokens().Any(t => t.Text == f)).ToHashSet()
    );

    int shared = 0, total = 0;
    var names = methods.Select(m => m.Identifier.Text).ToList();
    for (int i = 0; i < names.Count; i++)
    for (int j = i + 1; j < names.Count; j++)
    {
        total++;
        if (methodFields[names[i]].Overlaps(methodFields[names[j]])) shared++;
    }
    return total > 0 ? Math.Round(1.0 - (double)shared / total, 2) : 0;
}

static string InterpretMI(int mi, double lcom) =>
    (mi >= 80 ? "✅ Highly maintainable" : mi >= 65 ? "🟢 Good" : mi >= 50 ? "🟡 Moderate" : mi >= 30 ? "🟠 Low" : "🔴 Very hard to maintain")
    + (lcom >= 0.7 ? " | 🔴 Very low cohesion" : lcom >= 0.5 ? " | 🟠 Low cohesion" : lcom >= 0.3 ? " | 🟡 Moderate cohesion" : " | ✅ Good cohesion");

// ════════════════════════════════════════════════════════════════════════════
// 2. TYPE GRAPH
// ════════════════════════════════════════════════════════════════════════════

static TypeGraphResult BuildTypeGraph(
    List<(string Path, string RelPath, string Code, SyntaxTree Tree)> files,
    CSharpCompilation compilation)
{
    var nodes = new List<TypeNodeEntry>();
    var edges = new List<TypeEdgeEntry>();
    var idMap = new Dictionary<string, string>();
    int nodeCount = 0;

    string GetId(string name)
    {
        if (!idMap.TryGetValue(name, out var id)) idMap[name] = id = $"n{nodeCount++}";
        return id;
    }
    void AddEdge(string from, string to, string rel, string file, int line)
    {
        if (!string.IsNullOrEmpty(from) && !string.IsNullOrEmpty(to) && from != to)
            edges.Add(new TypeEdgeEntry { From = GetId(from), To = GetId(to), Relation = rel, File = file, Line = line });
    }

    foreach (var (_, relPath, _, tree) in files)
    {
        var root = tree.GetRoot();
        var model = compilation.GetSemanticModel(tree);

        // Classes
        foreach (var cls in root.DescendantNodes().OfType<ClassDeclarationSyntax>())
        {
            var name = cls.Identifier.Text;
            var attrs = cls.AttributeLists.SelectMany(al => al.Attributes).Select(a => a.Name.ToString()).ToList();
            var layer = attrs.Any(a => a.Contains("Controller")) ? "Controller"
                      : attrs.Any(a => a.Contains("ApiController")) ? "Controller"
                      : name.EndsWith("Service") ? "Service"
                      : name.EndsWith("Repository") || name.EndsWith("Repo") ? "Repository"
                      : name.EndsWith("Handler") ? "Handler"
                      : name.EndsWith("Validator") ? "Validator"
                      : "Other";

            nodes.Add(new TypeNodeEntry
            {
                Id = GetId(name), Name = name, Kind = "class", File = relPath,
                Line = cls.GetLocation().GetLineSpan().StartLinePosition.Line + 1,
                IsPublic = cls.Modifiers.Any(m => m.Text == "public"),
                IsAbstract = cls.Modifiers.Any(m => m.Text == "abstract"),
                Layer = layer,
                GenericParams = cls.TypeParameterList?.Parameters.Select(p => p.Identifier.Text).ToList() ?? new(),
            });

            // Inheritance
            foreach (var baseType in cls.BaseList?.Types ?? Enumerable.Empty<BaseTypeSyntax>())
            {
                var bName = baseType.Type.ToString().Split('<')[0];
                var rel = bName.StartsWith("I") && char.IsUpper(bName.Length > 1 ? bName[1] : ' ') ? "implements" : "extends";
                AddEdge(name, bName, rel, relPath, cls.GetLocation().GetLineSpan().StartLinePosition.Line + 1);
            }

            // Constructor dependencies
            foreach (var ctor in cls.Members.OfType<ConstructorDeclarationSyntax>())
            foreach (var param in ctor.ParameterList.Parameters)
            {
                var typeName = param.Type?.ToString().Split('<')[0] ?? "";
                if (typeName.Length > 0 && char.IsUpper(typeName[0]))
                    AddEdge(name, typeName, "injects", relPath, ctor.GetLocation().GetLineSpan().StartLinePosition.Line + 1);
            }

            // Method return types
            foreach (var method in cls.Members.OfType<MethodDeclarationSyntax>())
            {
                var ret = method.ReturnType.ToString();
                // Strip Task<>, IEnumerable<>, etc to get core type
                var core = System.Text.RegularExpressions.Regex.Match(ret, @"<([A-Z]\w+)>").Groups[1].Value;
                if (string.IsNullOrEmpty(core)) core = ret.Split('<')[0].TrimEnd('?', '[', ']');
                if (core.Length > 0 && char.IsUpper(core[0]) && core != name)
                    AddEdge(name, core, "returns", relPath, method.GetLocation().GetLineSpan().StartLinePosition.Line + 1);

                // Parameter types
                foreach (var param in method.ParameterList.Parameters)
                {
                    var pt = param.Type?.ToString().Split('<')[0].TrimEnd('?') ?? "";
                    if (pt.Length > 0 && char.IsUpper(pt[0]) && pt != name)
                        AddEdge(name, pt, "parameter", relPath, method.GetLocation().GetLineSpan().StartLinePosition.Line + 1);
                }
            }

            // Field/Property types
            foreach (var field in cls.Members.OfType<FieldDeclarationSyntax>())
            {
                var t = field.Declaration.Type.ToString().Split('<')[0].TrimEnd('?');
                if (t.Length > 0 && char.IsUpper(t[0])) AddEdge(name, t, "uses", relPath, field.GetLocation().GetLineSpan().StartLinePosition.Line + 1);
            }
        }

        // Interfaces
        foreach (var iface in root.DescendantNodes().OfType<InterfaceDeclarationSyntax>())
        {
            var name = iface.Identifier.Text;
            nodes.Add(new TypeNodeEntry
            {
                Id = GetId(name), Name = name, Kind = "interface", File = relPath,
                Line = iface.GetLocation().GetLineSpan().StartLinePosition.Line + 1,
                IsPublic = iface.Modifiers.Any(m => m.Text == "public"),
                MethodCount = iface.Members.OfType<MethodDeclarationSyntax>().Count(),
            });
            foreach (var ext in iface.BaseList?.Types ?? Enumerable.Empty<BaseTypeSyntax>())
                AddEdge(name, ext.Type.ToString().Split('<')[0], "extends", relPath, iface.GetLocation().GetLineSpan().StartLinePosition.Line + 1);
        }

        // Enums
        foreach (var en in root.DescendantNodes().OfType<EnumDeclarationSyntax>())
            nodes.Add(new TypeNodeEntry { Id = GetId(en.Identifier.Text), Name = en.Identifier.Text, Kind = "enum", File = relPath, Line = en.GetLocation().GetLineSpan().StartLinePosition.Line + 1, IsPublic = en.Modifiers.Any(m => m.Text == "public") });

        // Records
        foreach (var rec in root.DescendantNodes().OfType<RecordDeclarationSyntax>())
            nodes.Add(new TypeNodeEntry { Id = GetId(rec.Identifier.Text), Name = rec.Identifier.Text, Kind = "record", File = relPath, Line = rec.GetLocation().GetLineSpan().StartLinePosition.Line + 1, IsPublic = rec.Modifiers.Any(m => m.Text == "public") });
    }

    // Cycles
    var cycles = DetectCycles(nodes, edges);

    // Orphans (exported types never referenced)
    var referenced = new HashSet<string>(edges.SelectMany(e => new[] { e.From, e.To }));
    var orphans = nodes.Where(n => !referenced.Contains(n.Id) && n.IsPublic && n.Kind != "enum").Select(n => n.Name).ToList();

    // Most connected
    var connCount = edges.GroupBy(e => e.To).ToDictionary(g => g.Key, g => g.Count());
    var mostConnected = connCount.OrderByDescending(kv => kv.Value).Take(10)
        .Select(kv => new ConnectionEntry { Name = nodes.FirstOrDefault(n => n.Id == kv.Key)?.Name ?? kv.Key, Count = kv.Value }).ToList();

    // Layer violations
    var layerViolations = DetectLayerViolations(nodes, edges);

    return new TypeGraphResult { Nodes = nodes, Edges = edges, Cycles = cycles, OrphanTypes = orphans, MostConnected = mostConnected, LayerViolations = layerViolations };
}

static List<List<string>> DetectCycles(List<TypeNodeEntry> nodes, List<TypeEdgeEntry> edges)
{
    var adj = edges.Where(e => e.Relation is "extends" or "implements" or "injects")
        .GroupBy(e => e.From).ToDictionary(g => g.Key, g => g.Select(e => e.To).ToList());
    var idToName = nodes.ToDictionary(n => n.Id, n => n.Name);
    var visited = new HashSet<string>(); var inStack = new HashSet<string>();
    var cycles = new List<List<string>>();

    void Dfs(string node, List<string> path)
    {
        if (inStack.Contains(node)) { var idx = path.IndexOf(node); if (idx >= 0) cycles.Add(path[idx..].Select(id => idToName.GetValueOrDefault(id, id)).ToList()); return; }
        if (visited.Contains(node)) return;
        visited.Add(node); inStack.Add(node);
        foreach (var next in adj.GetValueOrDefault(node, new())) Dfs(next, new List<string>(path) { node });
        inStack.Remove(node);
    }
    foreach (var n in adj.Keys) Dfs(n, new());
    return cycles.Take(20).ToList();
}

static List<string> DetectLayerViolations(List<TypeNodeEntry> nodes, List<TypeEdgeEntry> edges)
{
    var violations = new List<string>();
    var nodeMap = nodes.ToDictionary(n => n.Id, n => n);
    foreach (var edge in edges.Where(e => e.Relation is "injects" or "uses"))
    {
        if (!nodeMap.TryGetValue(edge.From, out var from) || !nodeMap.TryGetValue(edge.To, out var to)) continue;
        // Controller → Repository (skip Service)
        if (from.Layer == "Controller" && to.Layer == "Repository")
            violations.Add($"{from.Name} (Controller) directly depends on {to.Name} (Repository) — missing Service layer");
        // Repository → Service (inverted)
        if (from.Layer == "Repository" && to.Layer == "Service")
            violations.Add($"{from.Name} (Repository) depends on {to.Name} (Service) — inverted dependency");
    }
    return violations;
}

// ════════════════════════════════════════════════════════════════════════════
// 3. CONTROL FLOW + UNREACHABLE CODE
// ════════════════════════════════════════════════════════════════════════════

static List<CfgEntry> AnalyzeControlFlow(
    List<(string Path, string RelPath, string Code, SyntaxTree Tree)> files,
    CSharpCompilation compilation)
{
    var results = new List<CfgEntry>();

    foreach (var (_, relPath, code, tree) in files)
    {
        var root = tree.GetRoot();
        var model = compilation.GetSemanticModel(tree);
        var lines = code.Split('\n');

        foreach (var cls in root.DescendantNodes().OfType<ClassDeclarationSyntax>())
        foreach (var method in cls.Members.OfType<MethodDeclarationSyntax>()
            .Where(m => m.Body != null))
        {
            var entry = AnalyzeMethod(method, cls.Identifier.Text, relPath, lines, model);
            if (entry.UnreachableBlocks.Any() || entry.MissingReturnPaths.Any()
             || entry.AlwaysTrueConditions.Any() || entry.InfiniteLoopRisks.Any())
                results.Add(entry);
        }
    }
    return results;
}

static CfgEntry AnalyzeMethod(MethodDeclarationSyntax method, string className, string file, string[] lines, SemanticModel model)
{
    var entry = new CfgEntry
    {
        File = file, ClassName = className,
        MethodName = method.Identifier.Text,
        Line = method.GetLocation().GetLineSpan().StartLinePosition.Line + 1,
        UnreachableBlocks = new(), MissingReturnPaths = new(),
        AlwaysTrueConditions = new(), InfiniteLoopRisks = new(),
    };

    var body = method.Body!;
    var stmts = body.Statements.ToList();

    // 1. Unreachable code after return/throw/break/continue
    for (int i = 0; i < stmts.Count - 1; i++)
    {
        var s = stmts[i];
        if (s is ReturnStatementSyntax or ThrowStatementSyntax or BreakStatementSyntax or ContinueStatementSyntax)
        {
            var next = stmts[i + 1];
            var ln = next.GetLocation().GetLineSpan().StartLinePosition.Line + 1;
            entry.UnreachableBlocks.Add(new UnreachableBlock
            {
                Line = ln,
                Code = lines.ElementAtOrDefault(ln - 1)?.Trim() ?? "",
                Reason = $"Unreachable — preceded by {s.GetType().Name.Replace("StatementSyntax", "").ToLower()} statement",
            });
        }
    }

    // 2. Always-true / always-false conditions
    foreach (var ifStmt in body.DescendantNodes().OfType<IfStatementSyntax>())
    {
        var cond = ifStmt.Condition;
        var ln = ifStmt.GetLocation().GetLineSpan().StartLinePosition.Line + 1;

        if (cond is LiteralExpressionSyntax lit)
        {
            if (lit.Token.IsKind(SyntaxKind.TrueKeyword))
                entry.AlwaysTrueConditions.Add(new AlwaysTrueCondition { Line = ln, Code = cond.ToString(), Reason = "Condition is literal 'true'" });
            if (lit.Token.IsKind(SyntaxKind.FalseKeyword))
                entry.AlwaysTrueConditions.Add(new AlwaysTrueCondition { Line = ln, Code = cond.ToString(), Reason = "Condition is literal 'false' — then-branch is unreachable" });
        }

        // x == x
        if (cond is BinaryExpressionSyntax bin && bin.OperatorToken.Text is "==" or "===" or "!=" or "!==" &&
            bin.Left.ToString() == bin.Right.ToString())
            entry.AlwaysTrueConditions.Add(new AlwaysTrueCondition { Line = ln, Code = cond.ToString(), Reason = $"Comparing expression to itself: {bin.Left} {bin.OperatorToken.Text} {bin.Right}" });
    }

    // 3. Missing return paths
    var retType = method.ReturnType.ToString();
    bool isVoid = retType is "void" or "Task" or "ValueTask";
    if (!isVoid)
    {
        foreach (var ifStmt in body.DescendantNodes().OfType<IfStatementSyntax>()
            .Where(i => i.Else == null))
        {
            var thenHasReturn = ifStmt.Statement.DescendantNodes().OfType<ReturnStatementSyntax>().Any();
            if (thenHasReturn)
            {
                var lastStmt = stmts.LastOrDefault();
                if (lastStmt is not ReturnStatementSyntax && lastStmt is not ThrowStatementSyntax)
                {
                    var ln = ifStmt.GetLocation().GetLineSpan().StartLinePosition.Line + 1;
                    entry.MissingReturnPaths.Add(new MissingReturnPath
                    {
                        Path = $"if ({ifStmt.Condition.ToString().Truncate(40)}) → else/fallthrough",
                        Line = ln,
                        Suggestion = $"Add explicit return {(retType.Contains("Task") ? "await Task.CompletedTask" : "value")} or throw in the fallthrough path",
                    });
                }
            }
        }
    }

    // 4. Infinite loop risks
    foreach (var whileStmt in body.DescendantNodes().OfType<WhileStatementSyntax>())
    {
        if (whileStmt.Condition is LiteralExpressionSyntax wlit && wlit.Token.IsKind(SyntaxKind.TrueKeyword))
        {
            var hasBreak = whileStmt.Statement.DescendantNodes().OfType<BreakStatementSyntax>().Any();
            if (!hasBreak)
                entry.InfiniteLoopRisks.Add(new InfiniteLoopRisk
                {
                    Line = whileStmt.GetLocation().GetLineSpan().StartLinePosition.Line + 1,
                    LoopType = "while(true)",
                    Reason = "while(true) with no break statement — potential infinite loop",
                });
        }
    }

    foreach (var forStmt in body.DescendantNodes().OfType<ForStatementSyntax>()
        .Where(f => f.Incrementors.Count == 0))
        entry.InfiniteLoopRisks.Add(new InfiniteLoopRisk
        {
            Line = forStmt.GetLocation().GetLineSpan().StartLinePosition.Line + 1,
            LoopType = "for",
            Reason = "for loop with no incrementor — counter never advances",
        });

    // Async void (fire-and-forget risk)
    if (method.Modifiers.Any(m => m.Text == "async") && method.ReturnType.ToString() == "void")
        entry.InfiniteLoopRisks.Add(new InfiniteLoopRisk
        {
            Line = method.GetLocation().GetLineSpan().StartLinePosition.Line + 1,
            LoopType = "async void",
            Reason = "async void method — exceptions are unobservable and can crash the process",
        });

    return entry;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
static class StringExtensions
{
    public static string Truncate(this string s, int max) => s.Length <= max ? s : s[..max] + "…";
}

// ── Data Models ───────────────────────────────────────────────────────────────
class IntelligenceResult { public string ProjectRoot{get;set;}="" public string GeneratedAt{get;set;}="" public List<MaintainabilityEntry>? MaintainabilityIndex{get;set;} public TypeGraphResult? TypeGraph{get;set;} public List<CfgEntry>? ControlFlow{get;set;} }
class MaintainabilityEntry { public string File{get;set;}="" public string ClassName{get;set;}="" public string MethodName{get;set;}="" public int Line{get;set;} public int MaintainabilityIndexScore{get;set;} public string Grade{get;set;}="" public int CyclomaticComplexity{get;set;} public int HalsteadVolume{get;set;} public int LinesOfCode{get;set;} public double Lcom{get;set;} public string Interpretation{get;set;}="" }
class TypeGraphResult { public List<TypeNodeEntry> Nodes{get;set;}=new(); public List<TypeEdgeEntry> Edges{get;set;}=new(); public List<List<string>> Cycles{get;set;}=new(); public List<string> OrphanTypes{get;set;}=new(); public List<ConnectionEntry> MostConnected{get;set;}=new(); public List<string> LayerViolations{get;set;}=new(); }
class TypeNodeEntry { public string Id{get;set;}="" public string Name{get;set;}="" public string Kind{get;set;}="" public string File{get;set;}="" public int Line{get;set;} public bool IsPublic{get;set;} public bool IsAbstract{get;set;} public string Layer{get;set;}="" public List<string> GenericParams{get;set;}=new(); public int MethodCount{get;set;} }
class TypeEdgeEntry { public string From{get;set;}="" public string To{get;set;}="" public string Relation{get;set;}="" public string File{get;set;}="" public int Line{get;set;} }
class ConnectionEntry { public string Name{get;set;}="" public int Count{get;set;} }
class CfgEntry { public string File{get;set;}="" public string ClassName{get;set;}="" public string MethodName{get;set;}="" public int Line{get;set;} public List<UnreachableBlock> UnreachableBlocks{get;set;}=new(); public List<MissingReturnPath> MissingReturnPaths{get;set;}=new(); public List<AlwaysTrueCondition> AlwaysTrueConditions{get;set;}=new(); public List<InfiniteLoopRisk> InfiniteLoopRisks{get;set;}=new(); }
class UnreachableBlock { public int Line{get;set;} public string Code{get;set;}="" public string Reason{get;set;}="" }
class MissingReturnPath { public string Path{get;set;}="" public int Line{get;set;} public string Suggestion{get;set;}="" }
class AlwaysTrueCondition { public int Line{get;set;} public string Code{get;set;}="" public string Reason{get;set;}="" }
class InfiniteLoopRisk { public int Line{get;set;} public string LoopType{get;set;}="" public string Reason{get;set;}="" }
