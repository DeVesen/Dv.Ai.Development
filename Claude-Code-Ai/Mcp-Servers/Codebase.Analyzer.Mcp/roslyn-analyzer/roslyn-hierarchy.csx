#!/usr/bin/env dotnet-script
// roslyn-hierarchy.csx
// Usage: dotnet script roslyn-hierarchy.csx -- <rootPath> <typeName> [<filePath>] [<direction>]
//
// CONTRACT (keep in sync with src/features/type-hierarchy-types.ts):
//   CLI args:  <rootPath> <typeName> <filePath??""> <direction??"both">
//   stdout JSON (PascalCase): { "Up": [{ "Name", "File", "Line", "Kind" }],
//                              "Down": [{ "Name", "File", "Line", "Kind" }],
//                              "CapReached": bool, "Error"?: string }
//   On any failure: { "Up": [], "Down": [], "CapReached": false, "Error": "..." }
//   and Exit 0 (never crash).

#r "nuget: Microsoft.CodeAnalysis.CSharp, 5.0.0-2.final"
#nullable enable

using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using System.Text.Json;
using System.Text.Json.Serialization;

try
{
    var rootPath = Args.ElementAtOrDefault(0) ?? Directory.GetCurrentDirectory();
    var typeName = Args.ElementAtOrDefault(1) ?? "";
    var filePath = Args.ElementAtOrDefault(2) ?? "";
    var direction = Args.ElementAtOrDefault(3) ?? "both";

    if (!Directory.Exists(rootPath))
        return Emit(new HierarchyResult { Error = $"Directory not found: {rootPath}" });
    if (string.IsNullOrWhiteSpace(typeName))
        return Emit(new HierarchyResult { Error = "typeName is required" });

    var includeUp = direction is "up" or "both";
    var includeDown = direction is "down" or "both";

    const int FileCap = 400;
    var allCsFiles = Directory
        .GetFiles(rootPath, "*.cs", SearchOption.AllDirectories)
        .Where(f => !f.Contains(Path.DirectorySeparatorChar + "obj" + Path.DirectorySeparatorChar)
                 && !f.Contains(Path.DirectorySeparatorChar + "bin" + Path.DirectorySeparatorChar)
                 && !f.Contains(Path.DirectorySeparatorChar + "Migrations" + Path.DirectorySeparatorChar)
                 && !f.EndsWith(".g.cs")
                 && !f.EndsWith(".Designer.cs"))
        .ToList();
    var capReached = allCsFiles.Count > FileCap;
    var csFiles = allCsFiles.Take(FileCap).ToList();

    var parsedFiles = csFiles
        .Select(f =>
        {
            var text = File.ReadAllText(f);
            return (Path: f, Text: text, Tree: CSharpSyntaxTree.ParseText(text, path: f));
        })
        .ToList();

    var tpaRefs = ((string?)AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES") ?? "")
        .Split(Path.PathSeparator)
        .Where(p => p.EndsWith(".dll") && File.Exists(p))
        .Select(p => (MetadataReference)MetadataReference.CreateFromFile(p));

    var compilation = CSharpCompilation.Create("hierarchy")
        .AddReferences(tpaRefs)
        .AddSyntaxTrees(parsedFiles.Select(f => f.Tree));

    var normFilePath = string.IsNullOrEmpty(filePath) ? "" : filePath.Replace('\\', '/');
    var models = new Dictionary<SyntaxTree, SemanticModel>();
    SemanticModel ModelFor(SyntaxTree tree) =>
        models.TryGetValue(tree, out var m) ? m : (models[tree] = compilation.GetSemanticModel(tree));

    var anchorSymbols = new List<INamedTypeSymbol>();
    foreach (var (path, text, tree) in parsedFiles)
    {
        if (!string.IsNullOrEmpty(normFilePath))
        {
            var p = path.Replace('\\', '/');
            if (p != normFilePath && !p.EndsWith("/" + normFilePath)) continue;
        }
        if (!text.Contains(typeName)) continue;
        var model = ModelFor(tree);
        foreach (var decl in tree.GetRoot().DescendantNodes())
        {
            if (!IsTypeDeclaration(decl, typeName)) continue;
            var declared = model.GetDeclaredSymbol(decl) as INamedTypeSymbol;
            if (declared != null) anchorSymbols.Add(declared);
        }
    }

    if (anchorSymbols.Count == 0)
        return Emit(new HierarchyResult
        {
            Error = $"Type `{typeName}` not found" + (string.IsNullOrEmpty(filePath) ? "" : $" in {filePath}"),
        });

    var anchor = anchorSymbols[0];
    var up = new List<TypeEntry>();
    var down = new List<TypeEntry>();
    var seenUp = new HashSet<string>();
    var seenDown = new HashSet<string>();

    if (includeUp)
        CollectUp(anchor, rootPath, up, seenUp);

    if (includeDown)
        CollectDown(compilation, anchor, rootPath, down, seenDown);

    return Emit(new HierarchyResult { Up = up, Down = down, CapReached = capReached });
}
catch (Exception ex)
{
    return Emit(new HierarchyResult { Error = ex.Message });
}

static void CollectUp(INamedTypeSymbol anchor, string rootPath, List<TypeEntry> up, HashSet<string> seen)
{
    var baseChain = new List<TypeEntry>();
    var visited = new HashSet<string>();

    if (anchor.TypeKind == TypeKind.Interface)
    {
        var current = anchor;
        while (current.Interfaces.Length > 0)
        {
            var parent = current.Interfaces[0];
            if (visited.Contains(parent.Name)) break;
            visited.Add(parent.Name);
            baseChain.Add(SymbolToEntry(parent, rootPath));
            current = parent;
        }
    }
    else
    {
        var current = anchor;
        while (true)
        {
            foreach (var iface in current.Interfaces)
            {
                var entry = SymbolToEntry(iface, rootPath);
                if (seen.Add(entry.Key)) up.Add(entry);
            }

            var baseType = current.BaseType;
            if (baseType == null || baseType.SpecialType == SpecialType.System_Object) break;
            if (visited.Contains(baseType.Name)) break;
            visited.Add(baseType.Name);
            baseChain.Add(SymbolToEntry(baseType, rootPath));
            current = baseType;
        }
    }

    baseChain.Reverse();
    foreach (var entry in baseChain)
    {
        if (seen.Add(entry.Key)) up.Add(entry);
    }
}

static void CollectDown(Compilation compilation, INamedTypeSymbol anchor, string rootPath, List<TypeEntry> down, HashSet<string> seen)
{
    foreach (var tree in compilation.SyntaxTrees)
    {
        var model = compilation.GetSemanticModel(tree);
        foreach (var decl in tree.GetRoot().DescendantNodes())
        {
            if (decl is not TypeDeclarationSyntax) continue;
            var sym = model.GetDeclaredSymbol(decl) as INamedTypeSymbol;
            if (sym == null || SymbolEqualityComparer.Default.Equals(sym, anchor)) continue;

            var matches = anchor.TypeKind == TypeKind.Interface
                ? sym.AllInterfaces.Any(i => SymbolEqualityComparer.Default.Equals(i, anchor))
                : DerivesFrom(sym, anchor);

            if (!matches) continue;
            var entry = SymbolToEntry(sym, rootPath);
            if (seen.Add(entry.Key)) down.Add(entry);
        }
    }

    down.Sort((a, b) => a.File == b.File ? a.Line.CompareTo(b.Line) : string.Compare(a.File, b.File, StringComparison.Ordinal));
}

static bool DerivesFrom(INamedTypeSymbol type, INamedTypeSymbol anchor)
{
    var current = type.BaseType;
    while (current != null && current.SpecialType != SpecialType.System_Object)
    {
        if (SymbolEqualityComparer.Default.Equals(current, anchor)) return true;
        current = current.BaseType;
    }
    return false;
}

static TypeEntry SymbolToEntry(INamedTypeSymbol sym, string rootPath)
{
    var loc = sym.Locations.FirstOrDefault(l => l.IsInSource);
    var relFile = "";
    var line = 0;
    if (loc?.SourceTree != null)
    {
        relFile = Path.GetRelativePath(rootPath, loc.SourceTree.FilePath).Replace('\\', '/');
        line = loc.GetLineSpan().StartLinePosition.Line + 1;
    }
    return new TypeEntry
    {
        Name = sym.Name,
        File = relFile,
        Line = line,
        Kind = MapKind(sym),
        Key = $"{sym.Name}:{relFile}:{line}",
    };
}

static string MapKind(INamedTypeSymbol sym) => sym.TypeKind switch
{
    TypeKind.Interface => "interface",
    TypeKind.Struct => "struct",
    _ when sym.IsRecord => "record",
    _ when sym.IsAbstract => "abstract",
    _ => "class",
};

static bool IsTypeDeclaration(SyntaxNode node, string name) => node switch
{
    ClassDeclarationSyntax c => c.Identifier.Text == name,
    InterfaceDeclarationSyntax i => i.Identifier.Text == name,
    StructDeclarationSyntax s => s.Identifier.Text == name,
    RecordDeclarationSyntax r => r.Identifier.Text == name,
    _ => false,
};

static int Emit(HierarchyResult result)
{
    var options = new JsonSerializerOptions { WriteIndented = true };
    Console.WriteLine(JsonSerializer.Serialize(result, options));
    return 0;
}

class HierarchyResult
{
    public List<TypeEntry> Up { get; set; } = new();
    public List<TypeEntry> Down { get; set; } = new();
    public bool CapReached { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Error { get; set; }
}

class TypeEntry
{
    public string Name { get; set; } = "";
    public string File { get; set; } = "";
    public int Line { get; set; }
    public string Kind { get; set; } = "class";

    [JsonIgnore]
    public string Key { get; set; } = "";
}
