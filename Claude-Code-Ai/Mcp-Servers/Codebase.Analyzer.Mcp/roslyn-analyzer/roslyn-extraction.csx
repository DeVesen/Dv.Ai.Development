#!/usr/bin/env dotnet-script
// roslyn-extraction.csx
// Usage: dotnet script roslyn-extraction.csx -- <filePath> <minLines> <minCC>
//
// CONTRACT (keep in sync with src/features/extraction-types.ts):
//   stdout JSON (PascalCase): { "Reports": [{ "Method", "Lines", "CyclomaticComplexity",
//       "Candidates": [{ "SuggestedName", "StartLine", "EndLine", "Parameters": string[] }]
//   }], "Error"?: string }

#r "nuget: Microsoft.CodeAnalysis.CSharp, 5.0.0-2.final"
#nullable enable

using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

const int MinCandidateBlockLines = 5;

try
{
    var filePath = Args.ElementAtOrDefault(0) ?? "";
    var minLines = int.TryParse(Args.ElementAtOrDefault(1), out var ml) ? ml : 20;
    var minCC = int.TryParse(Args.ElementAtOrDefault(2), out var mc) ? mc : 8;

    if (string.IsNullOrWhiteSpace(filePath) || !File.Exists(filePath))
    {
        Emit(new ExtractionResult { Error = $"File not found: {filePath}" });
        return;
    }

    var code = File.ReadAllText(filePath);
    var tree = CSharpSyntaxTree.ParseText(code, path: filePath);
    var root = tree.GetCompilationUnitRoot();
    var compilation = CSharpCompilation.Create("ExtractionDummy", new[] { tree });
    var model = compilation.GetSemanticModel(tree);

    var reports = new List<MethodReport>();

    foreach (var cls in root.DescendantNodes().OfType<ClassDeclarationSyntax>())
    {
        foreach (var method in cls.Members.OfType<MethodDeclarationSyntax>())
            AnalyzeMethod(method.Identifier.Text, method, method.Body, model, minLines, minCC, reports, code.Split('\n'));

        foreach (var localFn in cls.DescendantNodes().OfType<LocalFunctionStatementSyntax>())
            AnalyzeMethod($"{cls.Identifier.Text}.{localFn.Identifier.Text}", localFn, localFn.Body, model, minLines, minCC, reports, code.Split('\n'));
    }

    foreach (var localFn in root.DescendantNodes().OfType<LocalFunctionStatementSyntax>()
        .Where(l => l.Ancestors().OfType<ClassDeclarationSyntax>().Any() == false))
    {
        AnalyzeMethod(localFn.Identifier.Text, localFn, localFn.Body, model, minLines, minCC, reports, code.Split('\n'));
    }

    Emit(new ExtractionResult { Reports = reports.OrderByDescending(r => r.CyclomaticComplexity).ToList() });
}
catch (Exception ex)
{
    Emit(new ExtractionResult { Error = ex.Message });
}

static void AnalyzeMethod(string name, SyntaxNode methodRoot, BlockSyntax? body, SemanticModel model,
    int minLines, int minCC, List<MethodReport> reports, string[] lines)
{
    var span = methodRoot.GetLocation().GetLineSpan();
    if (body == null)
    {
        var locOnly = span.EndLinePosition.Line + 1 - (span.StartLinePosition.Line + 1) + 1;
        var (ccOnly, _) = ComputeComplexity(methodRoot);
        reports.Add(new MethodReport { Method = name, Lines = locOnly, CyclomaticComplexity = ccOnly, Candidates = new() });
        return;
    }
    var startLine = span.StartLinePosition.Line + 1;
    var endLine = span.EndLinePosition.Line + 1;
    var loc = endLine - startLine + 1;
    var (complexity, _) = ComputeComplexity(methodRoot);
    var candidates = (loc >= minLines && complexity >= minCC)
        ? FindBlocks(body, methodRoot, model, lines)
        : new List<CandidateEntry>();
    reports.Add(new MethodReport { Method = name, Lines = loc, CyclomaticComplexity = complexity, Candidates = candidates });
}

// SYNC with roslyn-advanced.csx — keep ComputeComplexity logic aligned.
static (int Complexity, List<string> Branches) ComputeComplexity(SyntaxNode node)
{
    int cc = 1;
    var branches = new List<string>();
    void Count(string n) { cc++; branches.Add(n); }

    foreach (var n in node.DescendantNodes())
    {
        switch (n)
        {
            case IfStatementSyntax:                Count("if"); break;
            case ConditionalExpressionSyntax:      Count("?:"); break;
            case ForStatementSyntax:               Count("for"); break;
            case ForEachStatementSyntax:           Count("foreach"); break;
            case WhileStatementSyntax:             Count("while"); break;
            case DoStatementSyntax:                Count("do"); break;
            case CaseSwitchLabelSyntax:            Count("case"); break;
            case CatchClauseSyntax:                Count("catch"); break;
            case SwitchExpressionArmSyntax:        Count("switch-arm"); break;
            case BinaryExpressionSyntax b when b.OperatorToken.Text is "&&" or "||": Count(b.OperatorToken.Text); break;
            case BinaryExpressionSyntax b when b.OperatorToken.Text is "??":         Count("??"); break;
        }
    }
    return (cc, branches.GroupBy(b => b).Select(g => g.Count() > 1 ? $"{g.Key}×{g.Count()}" : g.Key).ToList());
}

static List<CandidateEntry> FindBlocks(BlockSyntax body, SyntaxNode methodRoot, SemanticModel model, string[] fileLines)
{
    var statements = body.Statements.ToList();
    var ranges = new List<BlockRange>();

    var group = new List<StatementSyntax>();
    int groupStart = 0;
    for (int i = 0; i < statements.Count; i++)
    {
        var stmt = statements[i];
        if (group.Count == 0)
            groupStart = stmt.GetLocation().GetLineSpan().StartLinePosition.Line + 1;
        group.Add(stmt);

        var next = i + 1 < statements.Count ? statements[i + 1] : null;
        if (next == null || HasSeparator(stmt, next, fileLines))
        {
            var endLine = stmt.GetLocation().GetLineSpan().EndLinePosition.Line + 1;
            if (endLine - groupStart + 1 >= MinCandidateBlockLines)
                ranges.Add(new BlockRange(groupStart, endLine, group.ToList()));
            group = new List<StatementSyntax>();
        }
    }

    foreach (var stmt in statements)
    {
        var cf = ControlFlowRange(stmt);
        if (cf != null && !ranges.Any(r => Overlap(r, cf)))
            ranges.Add(cf);
    }

    ranges.Sort((a, b) => a.StartLine.CompareTo(b.StartLine));
    return ranges.Select(r => new CandidateEntry
    {
        SuggestedName = SuggestName(r, fileLines),
        StartLine = r.StartLine,
        EndLine = r.EndLine,
        Parameters = InferParameters(r.Statements, methodRoot, model, r.EndLine),
    }).ToList();
}

static bool HasSeparator(StatementSyntax prev, StatementSyntax next, string[] fileLines)
{
    var prevEnd = prev.GetLocation().GetLineSpan().EndLinePosition.Line + 1;
    var nextStart = next.GetLocation().GetLineSpan().StartLinePosition.Line + 1;
    if (nextStart <= prevEnd + 1) return false;

    for (int line = prevEnd + 1; line < nextStart; line++)
    {
        var trimmed = (line - 1 < fileLines.Length ? fileLines[line - 1] : "").Trim();
        if (trimmed == "" || trimmed.StartsWith("//")) return true;
    }
    return false;
}

static BlockRange? ControlFlowRange(StatementSyntax stmt)
{
    BlockSyntax? body = stmt switch
    {
        IfStatementSyntax i => i.Statement is BlockSyntax b ? b : null,
        ForStatementSyntax f => f.Statement as BlockSyntax,
        ForEachStatementSyntax fe => fe.Statement as BlockSyntax,
        WhileStatementSyntax w => w.Statement as BlockSyntax,
        DoStatementSyntax d => d.Statement as BlockSyntax,
        _ => null,
    };
    if (body == null) return null;
    var start = body.GetLocation().GetLineSpan().StartLinePosition.Line + 1;
    var end = body.GetLocation().GetLineSpan().EndLinePosition.Line + 1;
    if (end - start + 1 < MinCandidateBlockLines) return null;
    return new BlockRange(start, end, body.Statements.ToList());
}

static bool Overlap(BlockRange a, BlockRange b) => a.StartLine <= b.EndLine && b.StartLine <= a.EndLine;

static string SuggestName(BlockRange range, string[] fileLines)
{
    var stopwords = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "const", "let", "var", "await", "return", "if", "for", "while", "do", "switch",
        "throw", "new", "typeof", "void", "delete", "yield", "async", "foreach", "using"
    };
    var commentLine = range.StartLine - 1;
    if (commentLine >= 1 && commentLine - 1 < fileLines.Length)
    {
        var trimmed = fileLines[commentLine - 1].Trim();
        if (trimmed.StartsWith("//"))
            return ToCamelCase(trimmed[2..].Trim());
    }

    var first = range.Statements.FirstOrDefault()?.ToString() ?? "";
    var words = Regex.Split(first, @"[^a-zA-Z0-9_]+").Where(w => w.Length > 0).ToList();
    var verb = words.FirstOrDefault(w => !stopwords.Contains(w)) ?? "extract";
    var noun = words.Skip(1).FirstOrDefault(w => !stopwords.Contains(w));
    return noun != null
        ? char.ToLower(verb[0]) + verb[1..] + char.ToUpper(noun[0]) + noun[1..]
        : char.ToLower(verb[0]) + verb[1..];
}

static string ToCamelCase(string text)
{
    var parts = text.Split(' ', StringSplitOptions.RemoveEmptyEntries);
    if (parts.Length == 0) return "extractedBlock";
    return string.Concat(parts.Select((p, i) =>
        i == 0 ? char.ToLower(p[0]) + p[1..] : char.ToUpper(p[0]) + p[1..]));
}

static List<string> InferParameters(List<StatementSyntax> blockStmts, SyntaxNode methodRoot, SemanticModel model, int blockEndLine)
{
    var sw = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "const", "let", "var", "await", "return", "if", "for", "while", "do", "switch",
        "throw", "new", "typeof", "void", "delete", "yield", "async", "foreach", "using"
    };
    var blockStartLine = blockStmts.Count > 0
        ? blockStmts.Min(s => s.GetLocation().GetLineSpan().StartLinePosition.Line + 1)
        : blockEndLine;
    var declaredInBlock = new HashSet<string>();
    var declaredBefore = new HashSet<string>();
    var usedInBlock = new HashSet<string>();
    var usedAfter = new HashSet<string>();
    var methodParams = new HashSet<string>();

    if (methodRoot is BaseMethodDeclarationSyntax md)
        foreach (var p in md.ParameterList.Parameters) methodParams.Add(p.Identifier.Text);

    if (methodRoot is LocalFunctionStatementSyntax lf)
        foreach (var p in lf.ParameterList.Parameters) methodParams.Add(p.Identifier.Text);

    if (methodRoot is MethodDeclarationSyntax m && m.Body != null)
    {
        foreach (var stmt in m.Body.Statements)
        {
            if (stmt.GetLocation().GetLineSpan().StartLinePosition.Line + 1 >= blockStartLine) break;
            foreach (var decl in stmt.DescendantNodes().OfType<VariableDeclaratorSyntax>())
                declaredBefore.Add(decl.Identifier.Text);
        }
    }

    foreach (var stmt in blockStmts)
    {
        if (stmt is ForEachStatementSyntax feTop)
            declaredInBlock.Add(feTop.Identifier.Text);
        foreach (var decl in stmt.DescendantNodes().OfType<VariableDeclaratorSyntax>())
            declaredInBlock.Add(decl.Identifier.Text);
        foreach (var fe in stmt.DescendantNodes().OfType<ForEachStatementSyntax>())
            declaredInBlock.Add(fe.Identifier.Text);
    }

    foreach (var stmt in blockStmts)
    foreach (var id in stmt.DescendantNodes().OfType<IdentifierNameSyntax>())
    {
        if (id.Parent is MemberAccessExpressionSyntax ma && ma.Name == id) continue;
        if (id.Parent is ObjectCreationExpressionSyntax) continue;
        var line = id.GetLocation().GetLineSpan().StartLinePosition.Line + 1;
        if (line <= blockEndLine) usedInBlock.Add(id.Identifier.Text);
    }

    foreach (var id in methodRoot.DescendantNodes().OfType<IdentifierNameSyntax>())
    {
        var line = id.GetLocation().GetLineSpan().StartLinePosition.Line + 1;
        if (line > blockEndLine) usedAfter.Add(id.Identifier.Text);
    }

    return usedInBlock
        .Where(n => !sw.Contains(n) && !declaredInBlock.Contains(n) && !usedAfter.Contains(n)
            && (methodParams.Contains(n) || !declaredBefore.Contains(n)))
        .OrderBy(n => n)
        .ToList();
}

static void Emit(ExtractionResult result) =>
    Console.WriteLine(JsonSerializer.Serialize(result, new JsonSerializerOptions { WriteIndented = true }));

record BlockRange(int StartLine, int EndLine, List<StatementSyntax> Statements);

class ExtractionResult
{
    [JsonPropertyName("Reports")] public List<MethodReport> Reports { get; set; } = new();
    [JsonPropertyName("Error")] public string? Error { get; set; }
}

class MethodReport
{
    [JsonPropertyName("Method")] public string Method { get; set; } = "";
    [JsonPropertyName("Lines")] public int Lines { get; set; }
    [JsonPropertyName("CyclomaticComplexity")] public int CyclomaticComplexity { get; set; }
    [JsonPropertyName("Candidates")] public List<CandidateEntry> Candidates { get; set; } = new();
}

class CandidateEntry
{
    [JsonPropertyName("SuggestedName")] public string SuggestedName { get; set; } = "";
    [JsonPropertyName("StartLine")] public int StartLine { get; set; }
    [JsonPropertyName("EndLine")] public int EndLine { get; set; }
    [JsonPropertyName("Parameters")] public List<string> Parameters { get; set; } = new();
}
