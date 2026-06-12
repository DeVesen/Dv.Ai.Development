#!/usr/bin/env dotnet-script
// roslyn-references.csx
// Usage: dotnet script roslyn-references.csx -- <rootPath> <symbolName> [<filePath>]
//
// CONTRACT (keep in sync with src/features/symbol-reference-types.ts):
//   CLI args:  <rootPath> <symbolName> <filePath??"">
//   stdout JSON (PascalCase): { "References": [{ "File": string, "Line": number,
//                                                "SurroundingMethod": string|null,
//                                                "Snippet": string }],
//                              "CapReached": bool,
//                              "Error"?: string }
//   On any failure: { "References": [], "CapReached": false, "Error": "..." }
//   and Exit 0 (never crash).
//
// Matching: the compilation references the full set of Trusted Platform
// Assemblies, so most symbols resolve. GetSymbolInfo/SymbolEqualityComparer is
// the PRIMARY filter (candidates are gated by Identifier.Text == symbolName for
// speed, then verified semantically against the declared anchor symbol). A pure
// name match is only the FALLBACK when a reference symbol still fails to resolve
// (e.g. unresolved generics, missing assemblies).

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
    var symbolName = Args.ElementAtOrDefault(1) ?? "";
    var filePath = Args.ElementAtOrDefault(2) ?? "";

    if (!Directory.Exists(rootPath))
        return Emit(new ReferencesResult { Error = $"Directory not found: {rootPath}" });
    if (string.IsNullOrWhiteSpace(symbolName))
        return Emit(new ReferencesResult { Error = "symbolName is required" });

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

    // Read each file once: the text is reused for parsing and for snippet lines.
    var parsedFiles = csFiles
        .Select(f =>
        {
            var text = File.ReadAllText(f);
            return (Path: f, Text: text, Tree: CSharpSyntaxTree.ParseText(text, path: f));
        })
        .ToList();

    // Reference the full Trusted Platform Assemblies set so symbols resolve
    // (enables real semantic comparison instead of name-only matching).
    var tpaRefs = ((string?)AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES") ?? "")
        .Split(Path.PathSeparator)
        .Where(p => p.EndsWith(".dll") && File.Exists(p))
        .Select(p => (MetadataReference)MetadataReference.CreateFromFile(p));

    var compilation = CSharpCompilation.Create("references")
        .AddReferences(tpaRefs)
        .AddSyntaxTrees(parsedFiles.Select(f => f.Tree));

    // Optional anchor file (best-effort): normalize for endsWith / full-path compare.
    var normFilePath = string.IsNullOrEmpty(filePath) ? "" : filePath.Replace('\\', '/');

    // Cache semantic models so a tree that is touched by both the anchor and the
    // reference pass is only bound once.
    var models = new Dictionary<SyntaxTree, SemanticModel>();
    SemanticModel ModelFor(SyntaxTree tree) =>
        models.TryGetValue(tree, out var m) ? m : (models[tree] = compilation.GetSemanticModel(tree));

    // ── Collect anchor symbols (best-effort) ─────────────────────────────────
    var anchorSymbols = new List<ISymbol>();
    foreach (var (path, text, tree) in parsedFiles)
    {
        if (!string.IsNullOrEmpty(normFilePath))
        {
            // Suffix match must respect a path boundary so user.cs does not
            // match superuser.cs.
            var p = path.Replace('\\', '/');
            if (p != normFilePath && !p.EndsWith("/" + normFilePath)) continue;
        }
        // A file that never mentions the name cannot declare it.
        if (!text.Contains(symbolName)) continue;
        var model = ModelFor(tree);
        foreach (var decl in tree.GetRoot().DescendantNodes())
        {
            if (!IsNamedDeclaration(decl, symbolName)) continue;
            var declared = model.GetDeclaredSymbol(decl);
            if (declared != null) anchorSymbols.Add(declared);
        }
    }

    // ── Collect references (semantic match primary, name match fallback) ──────
    var references = new List<ReferenceEntry>();
    var seen = new HashSet<string>();

    foreach (var (path, text, tree) in parsedFiles)
    {
        // Cheap substring prefilter: a file that never mentions the symbol name
        // cannot reference it — skip the expensive semantic analysis below.
        if (!text.Contains(symbolName)) continue;

        var relPath = Path.GetRelativePath(rootPath, path).Replace('\\', '/');
        var lines = text.Split('\n');
        var model = ModelFor(tree);

        foreach (var id in tree.GetRoot().DescendantNodes().OfType<IdentifierNameSyntax>()
            .Where(n => n.Identifier.Text == symbolName))
        {
            // PRIMARY: semantic match. Skip when the reference resolves but does
            // not point at an anchor. FALLBACK: when it does not resolve (null),
            // keep the name match made above.
            if (anchorSymbols.Count > 0)
            {
                var sym = model.GetSymbolInfo(id).Symbol;
                if (sym != null && !anchorSymbols.Any(a => SymbolEqualityComparer.Default.Equals(a, sym)
                                                        || SymbolEqualityComparer.Default.Equals(a, sym.OriginalDefinition)))
                    continue;
            }

            var startPos = id.GetLocation().GetLineSpan().StartLinePosition;
            var line = startPos.Line + 1;
            var col = startPos.Character + 1;
            var key = relPath + ":" + line + ":" + col;
            if (!seen.Add(key)) continue;

            var lineText = (lines.ElementAtOrDefault(line - 1) ?? "").Trim();

            references.Add(new ReferenceEntry
            {
                File = relPath,
                Line = line,
                SurroundingMethod = SurroundingMethod(id),
                Snippet = lineText.Substring(0, Math.Min(80, lineText.Length)),
            });
        }
    }

    // Final ordering is applied by the runner (localeCompare); emit as collected.
    return Emit(new ReferencesResult { References = references, CapReached = capReached });
}
catch (Exception ex)
{
    return Emit(new ReferencesResult { Error = ex.Message });
}

// Nearest *named* enclosing unit: method, local function, constructor,
// property (incl. its accessors). Largely analogous to the Angular
// surroundingMethodName; .NET additionally covers field initializers.
static string? SurroundingMethod(SyntaxNode node)
{
    foreach (var a in node.Ancestors())
    {
        switch (a)
        {
            case MethodDeclarationSyntax m: return m.Identifier.Text;
            case LocalFunctionStatementSyntax lf: return lf.Identifier.Text;
            // Constructor identifier is the class name; report "constructor" to
            // match the Angular path instead of leaking the class name.
            case ConstructorDeclarationSyntax: return "constructor";
            case AccessorDeclarationSyntax acc:
                return acc.FirstAncestorOrSelf<PropertyDeclarationSyntax>()?.Identifier.Text;
            case PropertyDeclarationSyntax p: return p.Identifier.Text;
        }
    }
    return null;
}

static bool IsNamedDeclaration(SyntaxNode node, string name) => node switch
{
    MethodDeclarationSyntax m => m.Identifier.Text == name,
    PropertyDeclarationSyntax p => p.Identifier.Text == name,
    ClassDeclarationSyntax c => c.Identifier.Text == name,
    StructDeclarationSyntax st => st.Identifier.Text == name,
    InterfaceDeclarationSyntax i => i.Identifier.Text == name,
    EnumDeclarationSyntax e => e.Identifier.Text == name,
    RecordDeclarationSyntax r => r.Identifier.Text == name,
    DelegateDeclarationSyntax d => d.Identifier.Text == name,
    EventDeclarationSyntax ev => ev.Identifier.Text == name,
    ConstructorDeclarationSyntax ctor => ctor.Identifier.Text == name,
    // Only fields and event-fields are valid anchors. They surface as variable
    // declarators under a (Event)FieldDeclarationSyntax; locals and loop
    // counters share the same node type and must NOT become anchors (they would
    // resolve to ILocalSymbol and over-match common names like i/result/item).
    VariableDeclaratorSyntax v => v.Identifier.Text == name
        && v.FirstAncestorOrSelf<BaseFieldDeclarationSyntax>() != null,
    _ => false,
};

static int Emit(ReferencesResult result)
{
    // No global WhenWritingNull: SurroundingMethod must serialize as explicit
    // null (string|null), consistent with the Angular path. Only Error is
    // dropped when null (see the per-property attribute).
    var options = new JsonSerializerOptions { WriteIndented = true };
    Console.WriteLine(JsonSerializer.Serialize(result, options));
    return 0;
}

class ReferencesResult
{
    public List<ReferenceEntry> References { get; set; } = new();
    public bool CapReached { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Error { get; set; }
}

class ReferenceEntry
{
    public string File { get; set; } = "";
    public int Line { get; set; }
    public string? SurroundingMethod { get; set; }
    public string Snippet { get; set; } = "";
}
