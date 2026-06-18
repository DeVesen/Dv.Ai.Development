using System.Text;
using System.Text.RegularExpressions;
using Dev.WindowsService.Mcp.Models;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Dev.WindowsService.Mcp.Services;

public sealed class CodeReadService
{
    private static readonly Regex TsMethodRegex = new(
        @"^(\s*)(?:(public|private|protected)\s+)?(?:(async)\s+)?(?:(static)\s+)?(\w+)\s*\(([^)]*)\)\s*(?::\s*([^{;]+))?\s*\{?",
        RegexOptions.Compiled | RegexOptions.Multiline);

    private static readonly Regex TsPropertyRegex = new(
        @"^(\s*)(?:(public|private|protected)\s+)?(?:(readonly)\s+)?(\w+)\s*(?::\s*([^;=]+))?\s*(?:=\s*[^;]+)?;",
        RegexOptions.Compiled | RegexOptions.Multiline);

    private static readonly Regex TsClassRegex = new(
        @"(?:export\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?\s*\{",
        RegexOptions.Compiled);

    public IReadOnlyList<SignatureEntry> ReadSignaturesOnly(string filePath, bool includePrivate)
    {
        if (filePath.EndsWith(".cs", StringComparison.OrdinalIgnoreCase))
            return ReadCSharpSignatures(filePath, includePrivate);
        if (filePath.EndsWith(".ts", StringComparison.OrdinalIgnoreCase) || filePath.EndsWith(".tsx", StringComparison.OrdinalIgnoreCase))
            return ReadTypeScriptSignatures(filePath, includePrivate);
        throw new InvalidOperationException($"Unsupported file type: {filePath}");
    }

    public MethodReadResult ReadMethod(string filePath, string methodName, string? className)
    {
        if (filePath.EndsWith(".cs", StringComparison.OrdinalIgnoreCase))
            return ReadCSharpMethod(filePath, methodName, className);
        if (filePath.EndsWith(".ts", StringComparison.OrdinalIgnoreCase) || filePath.EndsWith(".tsx", StringComparison.OrdinalIgnoreCase))
            return ReadTypeScriptMethod(filePath, methodName, className);
        throw new InvalidOperationException($"Unsupported file type: {filePath}");
    }

    public ClassSummaryResult ReadClassSummary(string filePath, string? className)
    {
        if (filePath.EndsWith(".cs", StringComparison.OrdinalIgnoreCase))
            return ReadCSharpClassSummary(filePath, className);
        if (filePath.EndsWith(".ts", StringComparison.OrdinalIgnoreCase) || filePath.EndsWith(".tsx", StringComparison.OrdinalIgnoreCase))
            return ReadTypeScriptClassSummary(filePath, className);
        throw new InvalidOperationException($"Unsupported file type: {filePath}");
    }

    private static IReadOnlyList<SignatureEntry> ReadCSharpSignatures(string filePath, bool includePrivate)
    {
        var text = File.ReadAllText(filePath);
        var tree = CSharpSyntaxTree.ParseText(text);
        var root = tree.GetCompilationUnitRoot();
        var results = new List<SignatureEntry>();

        foreach (var member in root.DescendantNodes().OfType<MemberDeclarationSyntax>())
        {
            switch (member)
            {
                case MethodDeclarationSyntax method:
                    if (!includePrivate && IsPrivate(method.Modifiers)) continue;
                    results.Add(new SignatureEntry("method", GetAccess(method.Modifiers),
                        method.WithBody(null).WithSemicolonToken(default).ToFullString().Trim(),
                        method.GetLocation().GetLineSpan().StartLinePosition.Line + 1));
                    break;
                case PropertyDeclarationSyntax property:
                    if (!includePrivate && IsPrivate(property.Modifiers)) continue;
                    results.Add(new SignatureEntry("property", GetAccess(property.Modifiers),
                        property.ToFullString().Trim().TrimEnd('{').Trim(),
                        property.GetLocation().GetLineSpan().StartLinePosition.Line + 1));
                    break;
                case IndexerDeclarationSyntax indexer:
                    if (!includePrivate && IsPrivate(indexer.Modifiers)) continue;
                    results.Add(new SignatureEntry("indexer", GetAccess(indexer.Modifiers),
                        indexer.ToFullString().Trim().Split('{')[0].Trim(),
                        indexer.GetLocation().GetLineSpan().StartLinePosition.Line + 1));
                    break;
            }
        }

        return results;
    }

    private static MethodReadResult ReadCSharpMethod(string filePath, string methodName, string? className)
    {
        var text = File.ReadAllText(filePath);
        var tree = CSharpSyntaxTree.ParseText(text);
        var root = tree.GetCompilationUnitRoot();

        foreach (var typeDecl in root.DescendantNodes().OfType<TypeDeclarationSyntax>())
        {
            if (className is not null && !typeDecl.Identifier.Text.Equals(className, StringComparison.Ordinal))
                continue;

            foreach (var method in typeDecl.Members.OfType<MethodDeclarationSyntax>())
            {
                if (!method.Identifier.Text.Equals(methodName, StringComparison.Ordinal)) continue;

                var span = method.GetLocation().GetLineSpan();
                return new MethodReadResult(
                    method.WithBody(null).WithSemicolonToken(default).ToFullString().Trim(),
                    method.Body?.ToFullString().Trim() ?? method.ExpressionBody?.ToFullString().Trim() ?? string.Empty,
                    span.StartLinePosition.Line + 1,
                    span.EndLinePosition.Line + 1);
            }
        }

        throw new InvalidOperationException($"Method not found: {methodName}");
    }

    private static ClassSummaryResult ReadCSharpClassSummary(string filePath, string? className)
    {
        var text = File.ReadAllText(filePath);
        var tree = CSharpSyntaxTree.ParseText(text);
        var root = tree.GetCompilationUnitRoot();
        var typeDecl = FindCSharpType(root, className)
            ?? throw new InvalidOperationException(className is null ? "No class found in file" : $"Class not found: {className}");

        string? baseClass = null;
        var interfaces = new List<string>();
        if (typeDecl.BaseList is not null)
        {
            var baseTypes = typeDecl.BaseList.Types.Select(t => t.Type.ToString()).ToList();
            if (baseTypes.Count > 0)
            {
                if (LooksLikeInterface(baseTypes[0])) interfaces.AddRange(baseTypes);
                else { baseClass = baseTypes[0]; interfaces.AddRange(baseTypes.Skip(1)); }
            }
        }

        var properties = typeDecl.Members.OfType<PropertyDeclarationSyntax>()
            .Select(p => new ClassPropertySummary(p.Identifier.Text, p.Type.ToString(), GetAccess(p.Modifiers)))
            .ToList();

        var methods = typeDecl.Members.OfType<MethodDeclarationSyntax>()
            .Select(m => new ClassMethodSummary(
                m.Identifier.Text, m.ReturnType.ToString(),
                m.ParameterList.Parameters.Select(p => p.ToString().Trim()).ToList(),
                m.GetLocation().GetLineSpan().StartLinePosition.Line + 1))
            .ToList();

        return new ClassSummaryResult(typeDecl.Identifier.Text, baseClass, interfaces, properties, methods);
    }

    private static TypeDeclarationSyntax? FindCSharpType(CompilationUnitSyntax root, string? className)
    {
        var types = root.DescendantNodes().OfType<TypeDeclarationSyntax>()
            .Where(t => t is ClassDeclarationSyntax or RecordDeclarationSyntax).ToList();
        if (className is not null)
            return types.FirstOrDefault(t => t.Identifier.Text.Equals(className, StringComparison.Ordinal));
        return types.FirstOrDefault();
    }

    private static IReadOnlyList<SignatureEntry> ReadTypeScriptSignatures(string filePath, bool includePrivate)
    {
        var text = File.ReadAllLines(filePath);
        var results = new List<SignatureEntry>();

        for (var i = 0; i < text.Length; i++)
        {
            var line = text[i];
            var propMatch = TsPropertyRegex.Match(line);
            if (propMatch.Success && !line.Contains('('))
            {
                var access = propMatch.Groups[2].Success ? propMatch.Groups[2].Value : "public";
                if (!includePrivate && access == "private") continue;
                results.Add(new SignatureEntry("property", access, line.Trim(), i + 1));
                continue;
            }

            var methodMatch = TsMethodRegex.Match(line);
            if (!methodMatch.Success) continue;

            var methodAccess = methodMatch.Groups[2].Success ? methodMatch.Groups[2].Value : "public";
            if (!includePrivate && methodAccess == "private") continue;
            results.Add(new SignatureEntry("method", methodAccess, line.Trim(), i + 1));
        }

        return results;
    }

    private static MethodReadResult ReadTypeScriptMethod(string filePath, string methodName, string? className)
    {
        var lines = File.ReadAllLines(filePath);
        var inClass = className is null;
        var braceDepth = 0;
        var methodStart = -1;

        for (var i = 0; i < lines.Length; i++)
        {
            var line = lines[i];

            if (!inClass && className is not null)
            {
                if (Regex.IsMatch(line, $@"class\s+{Regex.Escape(className)}\b")) inClass = true;
                continue;
            }

            if (!inClass) continue;

            if (methodStart < 0)
            {
                if (Regex.IsMatch(line, $@"\b{Regex.Escape(methodName)}\s*\("))
                {
                    methodStart = i;
                    braceDepth = line.Count(c => c == '{') - line.Count(c => c == '}');
                    if (braceDepth > 0 || line.TrimEnd().EndsWith('{')) continue;
                    return new MethodReadResult(line.Trim(), string.Empty, i + 1, i + 1);
                }
                continue;
            }

            braceDepth += line.Count(c => c == '{') - line.Count(c => c == '}');
            if (braceDepth <= 0)
            {
                var body = string.Join('\n', lines[methodStart..(i + 1)]);
                return new MethodReadResult(lines[methodStart].Trim(), body, methodStart + 1, i + 1);
            }
        }

        throw new InvalidOperationException($"Method not found: {methodName}");
    }

    private static ClassSummaryResult ReadTypeScriptClassSummary(string filePath, string? className)
    {
        var text = File.ReadAllText(filePath);
        Match classMatch;
        if (className is null) classMatch = TsClassRegex.Match(text);
        else
        {
            classMatch = TsClassRegex.Matches(text).Cast<Match>().FirstOrDefault(m => m.Groups[1].Value == className)
                ?? throw new InvalidOperationException($"Class not found: {className}");
        }

        if (!classMatch.Success) throw new InvalidOperationException("No class found in file");

        var foundClassName = classMatch.Groups[1].Value;
        var baseClass = classMatch.Groups[2].Success ? classMatch.Groups[2].Value : null;
        var interfaces = classMatch.Groups[3].Success
            ? classMatch.Groups[3].Value.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries).ToList()
            : (List<string>)[];

        var classBodyStart = classMatch.Index + classMatch.Length;
        var classBody = ExtractBalancedBlock(text, classBodyStart);
        var properties = new List<ClassPropertySummary>();
        var methods = new List<ClassMethodSummary>();

        foreach (Match prop in TsPropertyRegex.Matches(classBody))
        {
            if (prop.Value.Contains('(')) continue;
            properties.Add(new ClassPropertySummary(
                prop.Groups[4].Value,
                prop.Groups[5].Success ? prop.Groups[5].Value.Trim() : "unknown",
                prop.Groups[2].Success ? prop.Groups[2].Value : "public"));
        }

        foreach (Match method in TsMethodRegex.Matches(classBody))
        {
            var lineOffset = text[..(classBodyStart + method.Index)].Count(c => c == '\n') + 1;
            methods.Add(new ClassMethodSummary(
                method.Groups[5].Value,
                method.Groups[7].Success ? method.Groups[7].Value.Trim() : "void",
                method.Groups[6].Value.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries).ToList(),
                lineOffset));
        }

        return new ClassSummaryResult(foundClassName, baseClass, interfaces, properties, methods);
    }

    private static string ExtractBalancedBlock(string text, int startIndex)
    {
        var depth = 0;
        var started = false;
        var sb = new StringBuilder();

        for (var i = startIndex; i < text.Length; i++)
        {
            var ch = text[i];
            if (ch == '{') { depth++; started = true; continue; }
            if (!started) continue;
            if (ch == '}') { depth--; if (depth == 0) break; }
            sb.Append(ch);
        }

        return sb.ToString();
    }

    private static bool IsPrivate(Microsoft.CodeAnalysis.SyntaxTokenList modifiers) =>
        modifiers.Any(m => m.IsKind(SyntaxKind.PrivateKeyword));

    private static string GetAccess(Microsoft.CodeAnalysis.SyntaxTokenList modifiers)
    {
        if (modifiers.Any(m => m.IsKind(SyntaxKind.PublicKeyword))) return "public";
        if (modifiers.Any(m => m.IsKind(SyntaxKind.ProtectedKeyword))) return "protected";
        if (modifiers.Any(m => m.IsKind(SyntaxKind.InternalKeyword))) return "internal";
        if (modifiers.Any(m => m.IsKind(SyntaxKind.PrivateKeyword))) return "private";
        return "internal";
    }

    private static bool LooksLikeInterface(string typeName) =>
        typeName.Length > 1 && typeName[0] == 'I' && char.IsUpper(typeName[1]);
}
