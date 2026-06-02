#!/usr/bin/env dotnet-script
// roslyn-split.csx
// Usage: dotnet script roslyn-split.csx -- <rootPath> [targetClass]

#r "nuget: Microsoft.CodeAnalysis.CSharp, 4.9.2"

using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using System.Text.Json;
using System.Text.Json.Serialization;

var rootPath    = Args.ElementAtOrDefault(0) ?? Directory.GetCurrentDirectory();
var targetClass = Args.ElementAtOrDefault(1);

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

var results = new List<ClassSplitResult>();

foreach (var (_, relPath, code, tree) in parsedFiles)
{
    var root = tree.GetRoot();
    foreach (var cls in root.DescendantNodes().OfType<ClassDeclarationSyntax>())
    {
        var name = cls.Identifier.Text;
        if (targetClass != null && !name.Contains(targetClass, StringComparison.OrdinalIgnoreCase)) continue;

        var methods = cls.Members.OfType<MethodDeclarationSyntax>()
            .Where(m => !new[] { "Dispose", "Finalize" }.Contains(m.Identifier.Text))
            .ToList();

        if (methods.Count < 3) continue;

        var analysis = AnalyzeClass(cls, methods, relPath, code);
        if (targetClass != null || analysis.ShouldSplit)
            results.Add(analysis);
    }
}

results = results.OrderBy(r => new[] { "critical","high","medium","low","none" }
    .ToList().IndexOf(r.SplitUrgency)).ToList();

var opts = new JsonSerializerOptions { WriteIndented = true, DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull };
Console.WriteLine(JsonSerializer.Serialize(results, opts));

// ── Analysis ──────────────────────────────────────────────────────────────────

static ClassSplitResult AnalyzeClass(ClassDeclarationSyntax cls, List<MethodDeclarationSyntax> methods, string relPath, string code)
{
    var className = cls.Identifier.Text;

    // 1. Collect fields
    var fields = CollectFields(cls);

    // 2. Field Access Map
    var fieldMap = BuildFieldAccessMap(cls, fields, methods);

    // 3. Constructor dependencies
    var deps = CollectDeps(cls);
    var depUsage = BuildDepUsage(cls, deps, methods);

    // 4. Internal call graph
    var callGraph = BuildCallGraph(cls, methods);

    // 5. LCOM
    var lcom = ComputeLcom(methods, fieldMap);

    // 6. Clusters (Union-Find)
    var clusters = FindClusters(methods, fieldMap, depUsage, callGraph);

    // 7. Annotate cluster ownership on fields
    AnnotateFieldClusters(fieldMap, clusters);

    // 8. Dependency groups
    var depGroups = BuildDepGroups(depUsage, clusters);

    // 9. Split suggestions
    var suggestions = GenerateSuggestions(className, clusters, fieldMap, depGroups, methods);

    // 10. Urgency
    var (shouldSplit, urgency) = ComputeUrgency(lcom, clusters, methods.Count);

    return new ClassSplitResult
    {
        File = relPath, ClassName = className,
        Line = cls.GetLocation().GetLineSpan().StartLinePosition.Line + 1,
        Lcom = lcom, MethodClusters = clusters, FieldAccessMap = fieldMap,
        DependencyGroups = depGroups, SplitSuggestions = suggestions,
        ShouldSplit = shouldSplit, SplitUrgency = urgency,
    };
}

// ── Field Collection ──────────────────────────────────────────────────────────

static List<FieldInfo> CollectFields(ClassDeclarationSyntax cls)
{
    var fields = new List<FieldInfo>();
    foreach (var field in cls.Members.OfType<FieldDeclarationSyntax>())
        foreach (var v in field.Declaration.Variables)
            fields.Add(new FieldInfo { Name = v.Identifier.Text, TypeName = field.Declaration.Type.ToString(), IsInjected = false });

    foreach (var prop in cls.Members.OfType<PropertyDeclarationSyntax>())
        fields.Add(new FieldInfo { Name = prop.Identifier.Text, TypeName = prop.Type.ToString(), IsInjected = false });

    foreach (var ctor in cls.Members.OfType<ConstructorDeclarationSyntax>())
        foreach (var param in ctor.ParameterList.Parameters)
            fields.Add(new FieldInfo { Name = param.Identifier.Text, TypeName = param.Type?.ToString() ?? "", IsInjected = true });

    return fields.DistinctBy(f => f.Name).ToList();
}

static Dictionary<string, string> CollectDeps(ClassDeclarationSyntax cls)
{
    var deps = new Dictionary<string, string>();
    foreach (var ctor in cls.Members.OfType<ConstructorDeclarationSyntax>())
        foreach (var param in ctor.ParameterList.Parameters)
        {
            var typeName = param.Type?.ToString() ?? "";
            if (typeName.Length > 0 && char.IsUpper(typeName[0]))
                deps[param.Identifier.Text] = typeName;
        }
    return deps;
}

// ── Field Access Map ──────────────────────────────────────────────────────────

static List<FieldAccessEntry> BuildFieldAccessMap(ClassDeclarationSyntax cls, List<FieldInfo> fields, List<MethodDeclarationSyntax> methods)
{
    var map = fields.Select(f => new FieldAccessEntry { FieldName = f.Name, TypeName = f.TypeName, ReadByMethods = new(), WrittenByMethods = new(), ExclusiveToCluster = null }).ToList();
    var fieldNames = new HashSet<string>(fields.Select(f => f.Name));

    foreach (var method in methods)
    {
        var mName = method.Identifier.Text;
        if (method.Body == null) continue;

        foreach (var access in method.Body.DescendantNodes().OfType<MemberAccessExpressionSyntax>())
        {
            var isThis = access.Expression is ThisExpressionSyntax || access.Expression is IdentifierNameSyntax { Identifier.Text: var v } && fieldNames.Contains(v);
            if (!isThis && !(access.Expression is IdentifierNameSyntax)) continue;

            var propName = access.Name.Identifier.Text;
            var entry = map.FirstOrDefault(e => e.FieldName == propName);
            if (entry == null) continue;

            var parent = access.Parent;
            if (parent is AssignmentExpressionSyntax ae && ae.Left == access)
            { if (!entry.WrittenByMethods.Contains(mName)) entry.WrittenByMethods.Add(mName); }
            else
            { if (!entry.ReadByMethods.Contains(mName)) entry.ReadByMethods.Add(mName); }
        }
    }

    return map.Where(e => e.ReadByMethods.Count + e.WrittenByMethods.Count > 0).ToList();
}

static Dictionary<string, HashSet<string>> BuildDepUsage(ClassDeclarationSyntax cls, Dictionary<string, string> deps, List<MethodDeclarationSyntax> methods)
{
    var usage = deps.ToDictionary(kv => kv.Key, _ => new HashSet<string>());
    foreach (var method in methods)
    {
        if (method.Body == null) continue;
        var mName = method.Identifier.Text;
        foreach (var inv in method.Body.DescendantNodes().OfType<InvocationExpressionSyntax>())
        {
            if (inv.Expression is MemberAccessExpressionSyntax ma)
            {
                var objName = ma.Expression switch
                {
                    ThisExpressionSyntax => null,
                    IdentifierNameSyntax id => id.Identifier.Text,
                    _ => null
                };
                if (objName != null && usage.ContainsKey(objName)) usage[objName].Add(mName);
                // Also check field access (this._repo.Method())
                if (ma.Expression is MemberAccessExpressionSyntax innerMa && innerMa.Expression is ThisExpressionSyntax)
                {
                    var fieldName = innerMa.Name.Identifier.Text;
                    if (usage.ContainsKey(fieldName)) usage[fieldName].Add(mName);
                }
            }
        }
    }
    return usage;
}

// ── Call Graph ────────────────────────────────────────────────────────────────

static Dictionary<string, HashSet<string>> BuildCallGraph(ClassDeclarationSyntax cls, List<MethodDeclarationSyntax> methods)
{
    var methodNames = new HashSet<string>(methods.Select(m => m.Identifier.Text));
    var graph = methods.ToDictionary(m => m.Identifier.Text, _ => new HashSet<string>());

    foreach (var method in methods)
    {
        if (method.Body == null) continue;
        var caller = method.Identifier.Text;
        foreach (var inv in method.Body.DescendantNodes().OfType<InvocationExpressionSyntax>())
        {
            string? callee = inv.Expression switch
            {
                IdentifierNameSyntax id when methodNames.Contains(id.Identifier.Text) => id.Identifier.Text,
                MemberAccessExpressionSyntax ma when ma.Expression is ThisExpressionSyntax && methodNames.Contains(ma.Name.Identifier.Text) => ma.Name.Identifier.Text,
                _ => null
            };
            if (callee != null) graph[caller].Add(callee);
        }
    }
    return graph;
}

// ── LCOM ──────────────────────────────────────────────────────────────────────

static LcomResult ComputeLcom(List<MethodDeclarationSyntax> methods, List<FieldAccessEntry> fieldMap)
{
    var n = methods.Count;
    if (n < 2) return new LcomResult { Score = 0, MethodCount = n, FieldCount = fieldMap.Count, SharedFieldPairs = 0, Interpretation = "Too few methods" };

    int shared = 0, total = 0;
    var names = methods.Select(m => m.Identifier.Text).ToList();
    for (int i = 0; i < n; i++)
    for (int j = i + 1; j < n; j++)
    {
        total++;
        var aFields = fieldMap.Where(f => f.ReadByMethods.Contains(names[i]) || f.WrittenByMethods.Contains(names[i])).Select(f => f.FieldName).ToHashSet();
        var bFields = fieldMap.Where(f => f.ReadByMethods.Contains(names[j]) || f.WrittenByMethods.Contains(names[j])).Select(f => f.FieldName).ToHashSet();
        if (aFields.Overlaps(bFields)) shared++;
    }

    var score = total > 0 ? 1.0 - (double)shared / total : 0;
    var interpretation = score switch
    {
        < 0.3 => "✅ High cohesion — class is well-focused",
        < 0.5 => "⚠️ Moderate cohesion — review responsibilities",
        < 0.7 => "⚠️ Low cohesion — multiple concerns detected",
        _     => "🔴 Very low cohesion — split strongly recommended",
    };
    return new LcomResult { Score = Math.Round(score, 2), MethodCount = n, FieldCount = fieldMap.Count, SharedFieldPairs = shared, Interpretation = interpretation };
}

// ── Clusters (Union-Find) ─────────────────────────────────────────────────────

static List<MethodCluster> FindClusters(List<MethodDeclarationSyntax> methods, List<FieldAccessEntry> fieldMap, Dictionary<string, HashSet<string>> depUsage, Dictionary<string, HashSet<string>> callGraph)
{
    var names = methods.Select(m => m.Identifier.Text).ToList();
    var parent = names.ToDictionary(n => n, n => n);

    string Find(string x) { if (parent[x] != x) parent[x] = Find(parent[x]); return parent[x]; }
    void Union(string a, string b) { var ra = Find(a); var rb = Find(b); if (ra != rb) parent[ra] = rb; }

    // Connect via shared fields
    foreach (var f in fieldMap)
    {
        var users = f.ReadByMethods.Concat(f.WrittenByMethods).Where(names.Contains).ToList();
        for (int i = 0; i < users.Count - 1; i++) Union(users[i], users[i + 1]);
    }
    // Connect via shared deps
    foreach (var (_, methodSet) in depUsage)
    {
        var users = methodSet.Where(names.Contains).ToList();
        for (int i = 0; i < users.Count - 1; i++) Union(users[i], users[i + 1]);
    }
    // Connect via call graph
    foreach (var (caller, callees) in callGraph)
        foreach (var callee in callees)
            if (names.Contains(caller) && names.Contains(callee)) Union(caller, callee);

    var groups = names.GroupBy(Find)
        .Select((g, idx) => {
            var members = g.ToList();
            var sharedFields = fieldMap.Where(f => members.Any(m => f.ReadByMethods.Contains(m) || f.WrittenByMethods.Contains(m))).Select(f => f.FieldName).Distinct().ToList();
            var sharedDeps = depUsage.Where(kv => members.Any(m => kv.Value.Contains(m))).Select(kv => kv.Key).ToList();
            return new MethodCluster { ClusterId = idx, Methods = members, SharedFields = sharedFields, SharedDependencies = sharedDeps, SuggestedName = SuggestName(members, sharedDeps) };
        }).ToList();

    return groups;
}

static string SuggestName(List<string> methods, List<string> deps)
{
    var words = methods.SelectMany(m => System.Text.RegularExpressions.Regex.Split(m, @"(?=[A-Z])"))
        .Where(w => w.Length > 3).GroupBy(w => w.ToLower()).OrderByDescending(g => g.Count()).Select(g => g.Key).ToList();
    if (words.Any()) return char.ToUpper(words[0][0]) + words[0][1..] + "Service";
    if (deps.Any()) return deps[0].Replace("Repository", "").Replace("Service", "") + "Service";
    return "ExtractedService";
}

static void AnnotateFieldClusters(List<FieldAccessEntry> fieldMap, List<MethodCluster> clusters)
{
    foreach (var f in fieldMap)
    {
        var users = new HashSet<string>(f.ReadByMethods.Concat(f.WrittenByMethods));
        var owning = clusters.Where(c => c.Methods.Any(m => users.Contains(m))).Select(c => c.ClusterId).Distinct().ToList();
        f.ExclusiveToCluster = owning.Count == 1 ? owning[0] : (int?)null;
    }
}

static List<DependencyGroup> BuildDepGroups(Dictionary<string, HashSet<string>> depUsage, List<MethodCluster> clusters)
{
    return depUsage.Where(kv => kv.Value.Count > 0).Select(kv => {
        var owner = clusters.OrderByDescending(c => c.Methods.Count(m => kv.Value.Contains(m))).FirstOrDefault();
        return new DependencyGroup { Dependency = kv.Key, UsedByMethods = kv.Value.ToList(), SuggestedOwner = owner?.SuggestedName ?? "Unknown" };
    }).ToList();
}

static List<SplitSuggestion> GenerateSuggestions(string originalName, List<MethodCluster> clusters, List<FieldAccessEntry> fieldMap, List<DependencyGroup> depGroups, List<MethodDeclarationSyntax> methods)
{
    if (clusters.Count <= 1) return new();
    var lineMap = methods.ToDictionary(m => m.Identifier.Text, m => m.GetLocation().GetLineSpan().EndLinePosition.Line - m.GetLocation().GetLineSpan().StartLinePosition.Line);

    return clusters.Select((c, idx) => {
        var fields = fieldMap.Where(f => f.ExclusiveToCluster == c.ClusterId).Select(f => f.FieldName).ToList();
        var deps = depGroups.Where(d => d.SuggestedOwner == c.SuggestedName).Select(d => d.Dependency).ToList();
        var lines = c.Methods.Sum(m => lineMap.GetValueOrDefault(m, 10)) + 20;
        var verbs = new HashSet<string>(c.Methods.SelectMany(m => new[] { "get","set","load","save","create","update","delete","send","validate","handle","process","compute","export" }.Where(v => m.StartsWith(v, StringComparison.OrdinalIgnoreCase))));
        return new SplitSuggestion
        {
            NewClassName = idx == 0 ? originalName : c.SuggestedName,
            Responsibility = $"{string.Join("/", verbs.Take(3).DefaultIfEmpty("Handle"))} {string.Join(", ", deps.Take(2).DefaultIfEmpty("core"))} operations",
            Methods = c.Methods, Fields = fields, Dependencies = deps,
            Reasoning = BuildReason(c, fieldMap, idx == 0, originalName),
            EstimatedLines = lines,
        };
    }).ToList();
}

static string BuildReason(MethodCluster c, List<FieldAccessEntry> fieldMap, bool isOriginal, string originalName)
{
    var parts = new List<string>();
    if (c.SharedFields.Any()) parts.Add($"Methods share fields: {string.Join(", ", c.SharedFields.Take(3))}");
    if (c.SharedDependencies.Any()) parts.Add($"Methods share dependencies: {string.Join(", ", c.SharedDependencies.Take(3))}");
    if (isOriginal) parts.Add($"Retains core {originalName} identity");
    return parts.Any() ? string.Join(". ", parts) : "Methods form a natural functional group";
}

static (bool ShouldSplit, string SplitUrgency) ComputeUrgency(LcomResult lcom, List<MethodCluster> clusters, int methodCount)
{
    if (clusters.Count <= 1 && lcom.Score < 0.4) return (false, "none");
    if (clusters.Count >= 4 || (lcom.Score >= 0.7 && methodCount > 10)) return (true, "critical");
    if (clusters.Count >= 3 || lcom.Score >= 0.6) return (true, "high");
    if (clusters.Count >= 2 || lcom.Score >= 0.45) return (true, "medium");
    return (false, "low");
}

// ── Data Models ───────────────────────────────────────────────────────────────
class ClassSplitResult { public string File{get;set;}="" public string ClassName{get;set;}="" public int Line{get;set;} public LcomResult Lcom{get;set;}=new(); public List<MethodCluster> MethodClusters{get;set;}=new(); public List<FieldAccessEntry> FieldAccessMap{get;set;}=new(); public List<DependencyGroup> DependencyGroups{get;set;}=new(); public List<SplitSuggestion> SplitSuggestions{get;set;}=new(); public bool ShouldSplit{get;set;} public string SplitUrgency{get;set;}="" }
class LcomResult { public double Score{get;set;} public int MethodCount{get;set;} public int FieldCount{get;set;} public int SharedFieldPairs{get;set;} public string Interpretation{get;set;}="" }
class MethodCluster { public int ClusterId{get;set;} public List<string> Methods{get;set;}=new(); public List<string> SharedFields{get;set;}=new(); public List<string> SharedDependencies{get;set;}=new(); public string SuggestedName{get;set;}="" }
class FieldAccessEntry { public string FieldName{get;set;}="" public string TypeName{get;set;}="" public List<string> ReadByMethods{get;set;}=new(); public List<string> WrittenByMethods{get;set;}=new(); public int? ExclusiveToCluster{get;set;} }
class DependencyGroup { public string Dependency{get;set;}="" public List<string> UsedByMethods{get;set;}=new(); public string SuggestedOwner{get;set;}="" }
class SplitSuggestion { public string NewClassName{get;set;}="" public string Responsibility{get;set;}="" public List<string> Methods{get;set;}=new(); public List<string> Fields{get;set;}=new(); public List<string> Dependencies{get;set;}=new(); public string Reasoning{get;set;}="" public int EstimatedLines{get;set;} }
class FieldInfo { public string Name{get;set;}="" public string TypeName{get;set;}="" public bool IsInjected{get;set;} }
