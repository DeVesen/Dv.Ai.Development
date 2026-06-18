using System.Text.RegularExpressions;
using Dev.WindowsService.Mcp.Models;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Dev.WindowsService.Mcp.Services;

public sealed class ImplementationSearchService
{
    private static readonly Regex TsImplementsRegex = new(
        @"(?:export\s+)?(?:abstract\s+)?class\s+(\w+)\s+implements\s+([^{]+)",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    public IReadOnlyList<ImplementationMatchResult> FindImplementations(
        string root, string interfaceName, string language, int maxResults)
    {
        maxResults = Math.Clamp(maxResults, 1, 100);
        var normalizedInterface = NormalizeInterfaceName(interfaceName);
        var lang = language.Trim().ToLowerInvariant();
        var results = new List<ImplementationMatchResult>(maxResults);

        if (lang is "auto" or "csharp" or "cs" or "c#")
            ScanCSharp(root, normalizedInterface, results, maxResults);

        if (results.Count < maxResults && lang is "auto" or "typescript" or "ts")
            ScanTypeScript(root, normalizedInterface, results, maxResults);

        return results;
    }

    private static void ScanCSharp(string root, string interfaceName, List<ImplementationMatchResult> results, int maxResults)
    {
        foreach (var file in GlobMatcher.EnumerateFiles(root))
        {
            if (!file.EndsWith(".cs", StringComparison.OrdinalIgnoreCase)) continue;
            if (!PathValidator.IsUnderRoot(file, root)) continue;

            string text;
            try { text = File.ReadAllText(file); }
            catch { continue; }

            var tree = CSharpSyntaxTree.ParseText(text);
            var rootNode = tree.GetCompilationUnitRoot();

            foreach (var typeDecl in rootNode.DescendantNodes().OfType<TypeDeclarationSyntax>())
            {
                if (typeDecl is InterfaceDeclarationSyntax) continue;

                var implements = typeDecl.BaseList?.Types
                    .Select(t => t.Type.ToString())
                    .Any(t => InterfaceMatches(t, interfaceName)) == true;

                if (!implements) continue;

                var line = typeDecl.GetLocation().GetLineSpan().StartLinePosition.Line + 1;
                results.Add(new ImplementationMatchResult(typeDecl.Identifier.Text, file, line));
                if (results.Count >= maxResults) return;
            }
        }
    }

    private static void ScanTypeScript(string root, string interfaceName, List<ImplementationMatchResult> results, int maxResults)
    {
        foreach (var file in GlobMatcher.EnumerateFiles(root))
        {
            if (!file.EndsWith(".ts", StringComparison.OrdinalIgnoreCase)) continue;
            if (!PathValidator.IsUnderRoot(file, root)) continue;

            string text;
            try { text = File.ReadAllText(file); }
            catch { continue; }

            foreach (Match match in TsImplementsRegex.Matches(text))
            {
                var className = match.Groups[1].Value;
                var implementsClause = match.Groups[2].Value;
                if (!implementsClause.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
                        .Any(i => InterfaceMatches(i, interfaceName)))
                    continue;

                var line = text[..match.Index].Count(c => c == '\n') + 1;
                results.Add(new ImplementationMatchResult(className, file, line));
                if (results.Count >= maxResults) return;
            }
        }
    }

    private static string NormalizeInterfaceName(string name)
    {
        var trimmed = name.Trim();
        if (trimmed.StartsWith('I') && trimmed.Length > 1 && char.IsUpper(trimmed[1]))
            return trimmed;
        return "I" + trimmed;
    }

    private static bool InterfaceMatches(string candidate, string normalizedInterface)
    {
        var trimmed = candidate.Trim();
        if (trimmed.Equals(normalizedInterface, StringComparison.Ordinal)) return true;

        if (normalizedInterface.StartsWith('I') && normalizedInterface.Length > 1)
        {
            var withoutI = normalizedInterface[1..];
            if (trimmed.Equals(withoutI, StringComparison.Ordinal)) return true;
        }

        return trimmed.EndsWith('.' + normalizedInterface, StringComparison.Ordinal)
               || trimmed.EndsWith('.' + normalizedInterface[1..], StringComparison.Ordinal);
    }
}
