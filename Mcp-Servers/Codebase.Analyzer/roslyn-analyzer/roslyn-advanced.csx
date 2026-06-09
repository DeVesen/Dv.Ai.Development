#!/usr/bin/env dotnet-script
// roslyn-advanced.csx
// Usage: dotnet script roslyn-advanced.csx -- <rootPath> <feature>
// Features: complexity | deadcode | nullflow | duplicates | refactoring | autofix | dataflow | all

#r "nuget: Microsoft.CodeAnalysis.CSharp, 5.0.0-2.final"
#nullable enable

using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Security.Cryptography;
using System.Text;

var rootPath = Args.ElementAtOrDefault(0) ?? Directory.GetCurrentDirectory();
var feature  = Args.ElementAtOrDefault(1) ?? "all";

if (!Directory.Exists(rootPath)) { Console.Error.WriteLine($"Not found: {rootPath}"); Environment.Exit(1); }

// ── Load all .cs files ────────────────────────────────────────────────────────
var csFiles = Directory.GetFiles(rootPath, "*.cs", SearchOption.AllDirectories)
    .Where(f => !f.Contains($"{Path.DirectorySeparatorChar}obj{Path.DirectorySeparatorChar}")
             && !f.Contains($"{Path.DirectorySeparatorChar}bin{Path.DirectorySeparatorChar}")
             && !f.Contains($"{Path.DirectorySeparatorChar}Migrations{Path.DirectorySeparatorChar}")
             && !f.EndsWith(".g.cs"))
    .Take(300).ToList();

var parsedFiles = csFiles.Select(f => (
    Path: f,
    RelPath: Path.GetRelativePath(rootPath, f),
    Code: File.ReadAllText(f),
    Tree: CSharpSyntaxTree.ParseText(File.ReadAllText(f), path: f)
)).ToList();

var compilation = CSharpCompilation.Create("advanced-analysis")
    .AddReferences(MetadataReference.CreateFromFile(typeof(object).Assembly.Location))
    .AddSyntaxTrees(parsedFiles.Select(f => f.Tree));

// ── Result container ──────────────────────────────────────────────────────────
var result = new AdvancedAnalysisResult { ProjectRoot = rootPath, GeneratedAt = DateTime.UtcNow.ToString("o") };

if (feature is "complexity" or "all")   result.CyclomaticComplexity = AnalyzeComplexity(parsedFiles);
if (feature is "deadcode" or "all")     result.DeadCode = AnalyzeDeadCode(parsedFiles, compilation);
if (feature is "nullflow" or "all")     result.NullabilityIssues = AnalyzeNullability(parsedFiles, compilation);
if (feature is "duplicates" or "all")   result.Duplicates = AnalyzeDuplicates(parsedFiles);
if (feature is "refactoring" or "all")  result.RefactoringSafety = AnalyzeRefactoring(parsedFiles, compilation);
if (feature is "autofix" or "all")      result.AutoFixes = GenerateAutoFixes(parsedFiles);
if (feature is "dataflow" or "all")     result.CrossFileDataflow = AnalyzeDataflow(parsedFiles, compilation);

var opts = new JsonSerializerOptions { WriteIndented = true, DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull };
Console.WriteLine(JsonSerializer.Serialize(result, opts));

// ════════════════════════════════════════════════════════════════════════════
// 1. CYCLOMATIC COMPLEXITY
// ════════════════════════════════════════════════════════════════════════════
static List<ComplexityEntry> AnalyzeComplexity(List<(string Path, string RelPath, string Code, SyntaxTree Tree)> files)
{
    var results = new List<ComplexityEntry>();
    foreach (var (_, relPath, _, tree) in files)
    {
        var root = tree.GetRoot();
        foreach (var cls in root.DescendantNodes().OfType<ClassDeclarationSyntax>())
        foreach (var method in cls.Members.OfType<MethodDeclarationSyntax>())
        {
            var (complexity, branches) = ComputeComplexity(method);
            if (complexity < 10) continue;
            results.Add(new ComplexityEntry
            {
                File = relPath, ClassName = cls.Identifier.Text,
                MethodName = method.Identifier.Text,
                Line = method.GetLocation().GetLineSpan().StartLinePosition.Line + 1,
                Complexity = complexity,
                Severity = complexity >= 20 ? "critical" : complexity >= 15 ? "warning" : "info",
                Branches = branches,
            });
        }
    }
    return results.OrderByDescending(r => r.Complexity).ToList();
}

static (int Complexity, List<string> Branches) ComputeComplexity(SyntaxNode node)
{
    int cc = 1;
    var branches = new List<string>();
    void Count(string name) { cc++; branches.Add(name); }

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

// ════════════════════════════════════════════════════════════════════════════
// 2. DEAD CODE
// ════════════════════════════════════════════════════════════════════════════
static List<DeadCodeEntry> AnalyzeDeadCode(List<(string Path, string RelPath, string Code, SyntaxTree Tree)> files, CSharpCompilation compilation)
{
    var results = new List<DeadCodeEntry>();
    // Collect all symbol names referenced anywhere
    var allReferences = new HashSet<string>();
    foreach (var (_, _, _, tree) in files)
    foreach (var id in tree.GetRoot().DescendantNodes().OfType<IdentifierNameSyntax>())
        allReferences.Add(id.Identifier.Text);

    foreach (var (_, relPath, code, tree) in files)
    {
        var root = tree.GetRoot();
        var lines = code.Split('\n');

        foreach (var cls in root.DescendantNodes().OfType<ClassDeclarationSyntax>())
        {
            // Private methods never called within class
            foreach (var method in cls.Members.OfType<MethodDeclarationSyntax>()
                .Where(m => m.Modifiers.Any(mod => mod.Text == "private")))
            {
                var name = method.Identifier.Text;
                if (name == cls.Identifier.Text) continue; // constructor-like
                var calledInClass = cls.DescendantNodes()
                    .OfType<IdentifierNameSyntax>()
                    .Any(id => id.Identifier.Text == name
                            && id.Parent is not MethodDeclarationSyntax);
                if (!calledInClass)
                    results.Add(new DeadCodeEntry { File = relPath, Name = $"{cls.Identifier.Text}.{name}", Kind = "method", Line = method.GetLocation().GetLineSpan().StartLinePosition.Line + 1, Visibility = "private", Reason = "Private method never called within class" });
            }

            // Private fields/properties never read
            foreach (var field in cls.Members.OfType<FieldDeclarationSyntax>()
                .Where(f => f.Modifiers.Any(m => m.Text == "private")))
            {
                foreach (var variable in field.Declaration.Variables)
                {
                    var name = variable.Identifier.Text;
                    var readCount = cls.DescendantNodes().OfType<IdentifierNameSyntax>()
                        .Count(id => id.Identifier.Text == name);
                    if (readCount == 0) // declaration is SyntaxToken, not IdentifierNameSyntax — any count > 0 is a real usage
                        results.Add(new DeadCodeEntry { File = relPath, Name = $"{cls.Identifier.Text}.{name}", Kind = "field", Line = field.GetLocation().GetLineSpan().StartLinePosition.Line + 1, Visibility = "private", Reason = "Private field never read after assignment" });
                }
            }
        }

        // Internal/public classes never referenced across project
        foreach (var cls in root.DescendantNodes().OfType<ClassDeclarationSyntax>()
            .Where(c => !c.Modifiers.Any(m => m.Text == "public") && !c.Modifiers.Any(m => m.Text == "private")))
        {
            var name = cls.Identifier.Text;
            var refCount = files.Sum(f => f.Tree.GetRoot().DescendantNodes()
                .OfType<IdentifierNameSyntax>().Count(id => id.Identifier.Text == name && f.RelPath != relPath));
            if (refCount == 0)
                results.Add(new DeadCodeEntry { File = relPath, Name = name, Kind = "class", Line = cls.GetLocation().GetLineSpan().StartLinePosition.Line + 1, Visibility = "internal", Reason = "Internal class never referenced outside its file" });
        }
    }
    return results;
}

// ════════════════════════════════════════════════════════════════════════════
// 3. NULL FLOW / NULLABLE ANALYSIS
// ════════════════════════════════════════════════════════════════════════════
static List<NullabilityEntry> AnalyzeNullability(List<(string Path, string RelPath, string Code, SyntaxTree Tree)> files, CSharpCompilation compilation)
{
    var results = new List<NullabilityEntry>();
    foreach (var (_, relPath, code, tree) in files)
    {
        var root = tree.GetRoot();
        var model = compilation.GetSemanticModel(tree);
        var lines = code.Split('\n');

        foreach (var node in root.DescendantNodes())
        {
            // 1. Null-forgiving operator (!) on member access
            if (node is PostfixUnaryExpressionSyntax postfix && postfix.OperatorToken.Text == "!")
            {
                var line = postfix.GetLocation().GetLineSpan().StartLinePosition.Line + 1;
                results.Add(new NullabilityEntry { File = relPath, Line = line, Code = lines[line-1].Trim(), Issue = "Null-forgiving operator (!) used — runtime NullReferenceException if value is null", Severity = "warning", Fix = "Add proper null-check: if (value != null) { ... } or use value?.Property" });
            }

            // 2. .Result on Task without null check
            if (node is MemberAccessExpressionSyntax ma && ma.Name.Identifier.Text == "Result")
            {
                var line = ma.GetLocation().GetLineSpan().StartLinePosition.Line + 1;
                results.Add(new NullabilityEntry { File = relPath, Line = line, Code = lines[line-1].Trim(), Issue = ".Result on Task can be null if task faulted, and causes deadlock in sync contexts", Severity = "critical", Fix = "Use await instead: var result = await someTask;" });
            }

            // 3. Direct cast without null check (as-cast result used directly)
            if (node is BinaryExpressionSyntax bin && bin.OperatorToken.Text == "as")
            {
                var parent = bin.Parent;
                if (parent is not EqualsValueClauseSyntax) continue;
                var varDecl = parent.Parent as VariableDeclaratorSyntax;
                if (varDecl == null) continue;
                // Look for usage without null check
                var name = varDecl.Identifier.Text;
                var method = bin.Ancestors().OfType<MethodDeclarationSyntax>().FirstOrDefault();
                if (method == null) continue;
                var usages = method.DescendantNodes().OfType<IdentifierNameSyntax>()
                    .Where(id => id.Identifier.Text == name)
                    .Skip(1).ToList(); // skip declaration
                var hasNullCheck = method.DescendantNodes().OfType<BinaryExpressionSyntax>()
                    .Any(b => (b.Left is IdentifierNameSyntax lid && lid.Identifier.Text == name ||
                               b.Right is IdentifierNameSyntax rid && rid.Identifier.Text == name) &&
                              b.OperatorToken.Text is "==" or "!=");
                if (usages.Count > 0 && !hasNullCheck)
                {
                    var line = varDecl.GetLocation().GetLineSpan().StartLinePosition.Line + 1;
                    results.Add(new NullabilityEntry { File = relPath, Line = line, Code = lines[line-1].Trim(), Issue = $"'as' cast result \"{name}\" used without null check — will be null if cast fails", Severity = "critical", Fix = $"Check: if ({name} is not null) {{ ... }}" });
                }
            }

            // 4. FirstOrDefault().Property — classic NRE
            if (node is InvocationExpressionSyntax inv)
            {
                var methodName = (inv.Expression as MemberAccessExpressionSyntax)?.Name.Identifier.Text;
                if (methodName is "FirstOrDefault" or "SingleOrDefault" or "LastOrDefault")
                {
                    var parent = inv.Parent;
                    if (parent is MemberAccessExpressionSyntax)
                    {
                        var line = inv.GetLocation().GetLineSpan().StartLinePosition.Line + 1;
                        results.Add(new NullabilityEntry { File = relPath, Line = line, Code = lines[line-1].Trim(), Issue = $".{methodName}() may return null — direct member access will throw NullReferenceException", Severity = "critical", Fix = $"Use null-conditional: .{methodName}()?.Property ?? defaultValue" });
                    }
                }
            }

            // 5. Missing ArgumentNullException.ThrowIfNull in public methods
            if (node is MethodDeclarationSyntax method2 && method2.Modifiers.Any(m => m.Text == "public"))
            {
                foreach (var param in method2.ParameterList.Parameters)
                {
                    var typeName = param.Type?.ToString() ?? "";
                    // Reference types (classes) that aren't nullable
                    if (!typeName.EndsWith("?") && !typeName.StartsWith("int") && !typeName.StartsWith("bool") &&
                        !typeName.StartsWith("double") && !typeName.StartsWith("string") &&
                        char.IsUpper(typeName.FirstOrDefault()))
                    {
                        var paramName = param.Identifier.Text;
                        var hasGuard = method2.Body?.DescendantNodes()
                            .OfType<InvocationExpressionSyntax>()
                            .Any(inv => inv.ToString().Contains($"ThrowIfNull") && inv.ToString().Contains(paramName)) ?? false;
                        if (!hasGuard)
                        {
                            var line = method2.GetLocation().GetLineSpan().StartLinePosition.Line + 1;
                            results.Add(new NullabilityEntry { File = relPath, Line = line, Code = lines[line-1].Trim(), Issue = $"Public method parameter \"{paramName}: {typeName}\" missing null guard", Severity = "warning", Fix = $"Add: ArgumentNullException.ThrowIfNull({paramName});" });
                        }
                    }
                }
            }
        }
    }
    return results;
}

// ════════════════════════════════════════════════════════════════════════════
// 4. STRUCTURAL DUPLICATE DETECTION
// ════════════════════════════════════════════════════════════════════════════
static List<DuplicateGroup> AnalyzeDuplicates(List<(string Path, string RelPath, string Code, SyntaxTree Tree)> files)
{
    var signatures = new List<(string File, string Class, string Method, int Line, string Hash, int BodyLines)>();

    foreach (var (_, relPath, _, tree) in files)
    foreach (var cls in tree.GetRoot().DescendantNodes().OfType<ClassDeclarationSyntax>())
    foreach (var method in cls.Members.OfType<MethodDeclarationSyntax>())
    {
        if (method.Body == null) continue;
        var lines = method.GetLocation().GetLineSpan().EndLinePosition.Line - method.GetLocation().GetLineSpan().StartLinePosition.Line;
        if (lines < 5) continue;
        var hash = NormalizeAndHash(method.Body.ToString());
        signatures.Add((relPath, cls.Identifier.Text, method.Identifier.Text, method.GetLocation().GetLineSpan().StartLinePosition.Line + 1, hash, lines));
    }

    return signatures
        .GroupBy(s => s.Hash)
        .Where(g => g.Count() >= 2)
        .Select(g => new DuplicateGroup
        {
            Similarity = 95,
            Instances = g.Select(m => new DuplicateInstance { File = m.File, ClassName = m.Class, MethodName = m.Method, Line = m.Line }).ToList(),
            Suggestion = $"Extract to shared service/base class or utility. Methods: {string.Join(", ", g.Select(m => $"{m.Class}.{m.Method}"))}",
        })
        .OrderByDescending(g => g.Instances.Count)
        .ToList();
}

static string NormalizeAndHash(string body)
{
    var normalized = System.Text.RegularExpressions.Regex.Replace(body, @"//[^\n]*", "");
    normalized = System.Text.RegularExpressions.Regex.Replace(normalized, @"""[^""]*""", "\"S\"");
    normalized = System.Text.RegularExpressions.Regex.Replace(normalized, @"\b\d+\b", "N");
    normalized = System.Text.RegularExpressions.Regex.Replace(normalized, @"\b[a-z_]\w*\b", "V");
    normalized = System.Text.RegularExpressions.Regex.Replace(normalized, @"\s+", " ").Trim();
    using var sha = SHA256.Create();
    return Convert.ToHexString(sha.ComputeHash(Encoding.UTF8.GetBytes(normalized))).ToLower()[..16];
}

// ════════════════════════════════════════════════════════════════════════════
// 5. REFACTORING SAFETY
// ════════════════════════════════════════════════════════════════════════════
static List<RefactoringSafetyEntry> AnalyzeRefactoring(List<(string Path, string RelPath, string Code, SyntaxTree Tree)> files, CSharpCompilation compilation)
{
    var results = new List<RefactoringSafetyEntry>();

    foreach (var (_, relPath, _, tree) in files)
    foreach (var cls in tree.GetRoot().DescendantNodes().OfType<ClassDeclarationSyntax>())
    foreach (var method in cls.Members.OfType<MethodDeclarationSyntax>()
        .Where(m => m.Modifiers.Any(mod => mod.Text == "public")))
    {
        var name = method.Identifier.Text;
        var usages = new List<UsageEntry>();

        foreach (var (_, otherRelPath, otherCode, otherTree) in files)
        {
            foreach (var inv in otherTree.GetRoot().DescendantNodes().OfType<MemberAccessExpressionSyntax>()
                .Where(ma => ma.Name.Identifier.Text == name))
            {
                var line = inv.GetLocation().GetLineSpan().StartLinePosition.Line + 1;
                var lineText = otherCode.Split('\n').ElementAtOrDefault(line - 1)?.Trim() ?? "";
                usages.Add(new UsageEntry { File = otherRelPath, Line = line, Context = lineText[..Math.Min(80, lineText.Length)] });
            }
        }

        var risks = new List<string>();
        var usageFiles = usages.Select(u => u.File).Distinct().ToList();
        if (usages.Count > 15) risks.Add($"High usage count ({usages.Count}) across {usageFiles.Count} files");

        // Check if part of an interface
        var implementedInterfaces = cls.BaseList?.Types.Select(t => t.Type.ToString()).ToList() ?? new();
        if (implementedInterfaces.Any())
            risks.Add($"Class implements interfaces ({string.Join(", ", implementedInterfaces)}) — interface contracts must be updated too");

        // Check if method is virtual/override
        if (method.Modifiers.Any(m => m.Text is "virtual" or "override"))
            risks.Add("Method is virtual/override — subclass overrides must be updated");

        results.Add(new RefactoringSafetyEntry
        {
            File = relPath,
            ClassName = cls.Identifier.Text,
            MemberName = name,
            Line = method.GetLocation().GetLineSpan().StartLinePosition.Line + 1,
            UsageCount = usages.Count,
            Usages = usages.Take(8).ToList(),
            SafeToRename = risks.Count == 0 && usages.Count <= 5,
            Risks = risks,
        });
    }

    return results.OrderByDescending(r => r.UsageCount).Take(30).ToList();
}

// ════════════════════════════════════════════════════════════════════════════
// 6. AUTO-FIX GENERATION
// ════════════════════════════════════════════════════════════════════════════
static List<AutoFixEntry> GenerateAutoFixes(List<(string Path, string RelPath, string Code, SyntaxTree Tree)> files)
{
    var fixes = new List<AutoFixEntry>();

    foreach (var (_, relPath, code, tree) in files)
    {
        var root = tree.GetRoot();
        var lines = code.Split('\n');

        foreach (var cls in root.DescendantNodes().OfType<ClassDeclarationSyntax>())
        {
            // Fix 1: .Result / .Wait() → await
            foreach (var ma in cls.DescendantNodes().OfType<MemberAccessExpressionSyntax>()
                .Where(m => m.Name.Identifier.Text is "Result" or "Wait"))
            {
                var line = ma.GetLocation().GetLineSpan().StartLinePosition.Line + 1;
                var lineText = lines[line - 1].Trim();
                fixes.Add(new AutoFixEntry { File = relPath, Line = line, Category = "async-fix", Description = "Replace .Result/.Wait() with await to prevent deadlocks", Before = lineText, After = lineText.Replace(".Result", " /* await */").Replace(".Wait()", " /* await task */"), Automated = false });
            }

            // Fix 2: Add ArgumentNullException.ThrowIfNull to public methods
            foreach (var method in cls.Members.OfType<MethodDeclarationSyntax>()
                .Where(m => m.Modifiers.Any(mod => mod.Text == "public")))
            {
                foreach (var param in method.ParameterList.Parameters)
                {
                    var typeName = param.Type?.ToString() ?? "";
                    if (char.IsUpper(typeName.FirstOrDefault()) && !typeName.EndsWith("?"))
                    {
                        var pName = param.Identifier.Text;
                        var hasGuard = method.Body?.ToString().Contains($"ThrowIfNull({pName})") ?? false;
                        if (!hasGuard)
                        {
                            var line = method.GetLocation().GetLineSpan().StartLinePosition.Line + 1;
                            fixes.Add(new AutoFixEntry { File = relPath, Line = line + 1, Category = "null-guard", Description = $"Add null guard for parameter \"{pName}\"", Before = "(missing)", After = $"ArgumentNullException.ThrowIfNull({pName});", Automated = true });
                        }
                    }
                }
            }

            // Fix 3: Missing cancellation token
            foreach (var method in cls.Members.OfType<MethodDeclarationSyntax>()
                .Where(m => m.Modifiers.Any(mod => mod.Text == "async") && m.Modifiers.Any(mod => mod.Text == "public")))
            {
                var hasCT = method.ParameterList.Parameters.Any(p => p.Type?.ToString().Contains("CancellationToken") == true);
                if (!hasCT)
                {
                    var line = method.GetLocation().GetLineSpan().StartLinePosition.Line + 1;
                    var name = method.Identifier.Text;
                    fixes.Add(new AutoFixEntry { File = relPath, Line = line, Category = "cancellation-token", Description = $"Add CancellationToken to async method \"{name}\"", Before = lines[line - 1].Trim(), After = lines[line - 1].Trim().Replace(")", ", CancellationToken cancellationToken = default)"), Automated = true });
                }
            }

            // Fix 4: Switch to pattern matching
            foreach (var sw in cls.DescendantNodes().OfType<SwitchStatementSyntax>())
            {
                var line = sw.GetLocation().GetLineSpan().StartLinePosition.Line + 1;
                fixes.Add(new AutoFixEntry { File = relPath, Line = line, Category = "pattern-matching", Description = "Consider replacing switch statement with switch expression (C# 8+)", Before = $"switch ({sw.Expression}) {{ ... }}", After = $"var result = {sw.Expression} switch {{ ... }};", Automated = false });
            }

            // Fix 5: var → explicit type for readability in complex expressions
            foreach (var local in cls.DescendantNodes().OfType<LocalDeclarationStatementSyntax>()
                .Where(l => l.Declaration.Type is IdentifierNameSyntax id && id.Identifier.Text == "var"))
            {
                var initializer = local.Declaration.Variables.FirstOrDefault()?.Initializer?.Value;
                if (initializer is ObjectCreationExpressionSyntax objCreation)
                {
                    var line = local.GetLocation().GetLineSpan().StartLinePosition.Line + 1;
                    var typeName = objCreation.Type.ToString();
                    var varName = local.Declaration.Variables.First().Identifier.Text;
                    if (typeName.Length > 3)
                        fixes.Add(new AutoFixEntry { File = relPath, Line = line, Category = "explicit-type", Description = $"Consider explicit type for clarity: \"{varName}\"", Before = lines[line - 1].Trim(), After = lines[line - 1].Trim().Replace("var ", $"{typeName} "), Automated = true });
                }
            }
        }
    }
    return fixes;
}

// ════════════════════════════════════════════════════════════════════════════
// 7. CROSS-FILE DATAFLOW
// ════════════════════════════════════════════════════════════════════════════
static List<DataflowEntry> AnalyzeDataflow(List<(string Path, string RelPath, string Code, SyntaxTree Tree)> files, CSharpCompilation compilation)
{
    var results = new List<DataflowEntry>();

    // Build method return-type map
    var methodReturns = new Dictionary<string, (string ReturnType, bool IsNullable, bool IsTask, string File)>();
    foreach (var (_, relPath, _, tree) in files)
    foreach (var cls in tree.GetRoot().DescendantNodes().OfType<ClassDeclarationSyntax>())
    foreach (var method in cls.Members.OfType<MethodDeclarationSyntax>())
    {
        var key = $"{cls.Identifier.Text}.{method.Identifier.Text}";
        var ret = method.ReturnType.ToString();
        var isNullable = ret.EndsWith("?") || ret.Contains("Nullable<");
        var isTask = ret.StartsWith("Task") || ret.StartsWith("ValueTask");
        methodReturns[key] = (ret, isNullable, isTask, relPath);
    }

    foreach (var (_, relPath, code, tree) in files)
    {
        var lines = code.Split('\n');
        var root = tree.GetRoot();

        foreach (var cls in root.DescendantNodes().OfType<ClassDeclarationSyntax>())
        {
            // Get injected dependencies
            var deps = cls.Members.OfType<ConstructorDeclarationSyntax>()
                .SelectMany(c => c.ParameterList.Parameters)
                .ToDictionary(p => p.Identifier.Text, p => p.Type?.ToString() ?? "");

            foreach (var method in cls.Members.OfType<MethodDeclarationSyntax>())
            {
                foreach (var invocation in method.DescendantNodes().OfType<InvocationExpressionSyntax>())
                {
                    if (invocation.Expression is not MemberAccessExpressionSyntax ma) continue;
                    var objName = ma.Expression is ThisExpressionSyntax ? "" : ma.Expression.ToString();
                    var calledMethod = ma.Name.Identifier.Text;

                    // Resolve service type
                    string? serviceType = null;
                    if (deps.TryGetValue(objName, out var depType)) serviceType = depType;
                    if (serviceType == null) continue;

                    var key = $"{serviceType}.{calledMethod}";
                    if (!methodReturns.TryGetValue(key, out var returnInfo)) continue;

                    // Check: nullable return used without null-guard
                    if (returnInfo.IsNullable)
                    {
                        var parent = invocation.Parent;
                        if (parent is MemberAccessExpressionSyntax && !parent.ToString().Contains("?."))
                        {
                            var line = invocation.GetLocation().GetLineSpan().StartLinePosition.Line + 1;
                            results.Add(new DataflowEntry
                            {
                                File = relPath, Line = line,
                                FromClass = serviceType, FromMethod = calledMethod,
                                ToClass = cls.Identifier.Text, ToMethod = method.Identifier.Text,
                                Issue = $"{serviceType}.{calledMethod}() returns nullable \"{returnInfo.ReturnType}\" — used without null-check",
                                Severity = "critical",
                                DataPath = $"{serviceType}.{calledMethod}() → {cls.Identifier.Text}.{method.Identifier.Text} (line {line})",
                            });
                        }
                    }

                    // Check: Task not awaited
                    if (returnInfo.IsTask)
                    {
                        var isAwaited = invocation.Parent is AwaitExpressionSyntax;
                        var isAssigned = invocation.Parent is EqualsValueClauseSyntax or AssignmentExpressionSyntax;
                        if (!isAwaited && !isAssigned)
                        {
                            var line = invocation.GetLocation().GetLineSpan().StartLinePosition.Line + 1;
                            results.Add(new DataflowEntry
                            {
                                File = relPath, Line = line,
                                FromClass = serviceType, FromMethod = calledMethod,
                                ToClass = cls.Identifier.Text, ToMethod = method.Identifier.Text,
                                Issue = $"Task from {serviceType}.{calledMethod}() is not awaited — fire-and-forget, exceptions silently lost",
                                Severity = "critical",
                                DataPath = $"{serviceType}.{calledMethod}() → unawaited",
                            });
                        }
                    }
                }
            }
        }
    }
    return results;
}

// ── Data Models ───────────────────────────────────────────────────────────────
class AdvancedAnalysisResult { public string ProjectRoot{get;set;}=""; public string GeneratedAt{get;set;}=""; public List<ComplexityEntry>? CyclomaticComplexity{get;set;} public List<DeadCodeEntry>? DeadCode{get;set;} public List<NullabilityEntry>? NullabilityIssues{get;set;} public List<DuplicateGroup>? Duplicates{get;set;} public List<RefactoringSafetyEntry>? RefactoringSafety{get;set;} public List<AutoFixEntry>? AutoFixes{get;set;} public List<DataflowEntry>? CrossFileDataflow{get;set;} }
class ComplexityEntry { public string File{get;set;}=""; public string ClassName{get;set;}=""; public string MethodName{get;set;}=""; public int Line{get;set;} public int Complexity{get;set;} public string Severity{get;set;}=""; public List<string> Branches{get;set;}=new(); }
class DeadCodeEntry { public string File{get;set;}=""; public string Name{get;set;}=""; public string Kind{get;set;}=""; public int Line{get;set;} public string Visibility{get;set;}=""; public string Reason{get;set;}=""; }
class NullabilityEntry { public string File{get;set;}=""; public int Line{get;set;} public string Code{get;set;}=""; public string Issue{get;set;}=""; public string Severity{get;set;}=""; public string Fix{get;set;}=""; }
class DuplicateGroup { public int Similarity{get;set;} public List<DuplicateInstance> Instances{get;set;}=new(); public string Suggestion{get;set;}=""; }
class DuplicateInstance { public string File{get;set;}=""; public string ClassName{get;set;}=""; public string MethodName{get;set;}=""; public int Line{get;set;} }
class RefactoringSafetyEntry { public string File{get;set;}=""; public string ClassName{get;set;}=""; public string MemberName{get;set;}=""; public int Line{get;set;} public int UsageCount{get;set;} public List<UsageEntry> Usages{get;set;}=new(); public bool SafeToRename{get;set;} public List<string> Risks{get;set;}=new(); }
class UsageEntry { public string File{get;set;}=""; public int Line{get;set;} public string Context{get;set;}=""; }
class AutoFixEntry { public string File{get;set;}=""; public int Line{get;set;} public string Category{get;set;}=""; public string Description{get;set;}=""; public string Before{get;set;}=""; public string After{get;set;}=""; public bool Automated{get;set;} }
class DataflowEntry { public string File{get;set;}=""; public int Line{get;set;} public string FromClass{get;set;}=""; public string FromMethod{get;set;}=""; public string ToClass{get;set;}=""; public string ToMethod{get;set;}=""; public string Issue{get;set;}=""; public string Severity{get;set;}=""; public string DataPath{get;set;}=""; }
