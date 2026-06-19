#!/usr/bin/env dotnet-script
// roslyn-test-coverage-static.csx
// Usage: dotnet script roslyn-test-coverage-static.csx -- <path> <depth: file|project>
// Static coverage proxy (Variante B, syntactic heuristic) — NO test run.
// Roslyn is used ONLY to parse the syntax tree; there is NO semantic reference
// resolution (no SymbolFinder). Member/class matching is a word-boundary text
// heuristic restricted to test files.
// The member-reference check is scoped PER CLASS: a member only counts as
// referenced when it appears in a test file that is itself associated with the
// owning class (name-stem <Class>[Tests|Test|Spec] or a word-boundary code
// reference to the class). This mirrors the Angular import gate.
// LIMITATION (principled divergence from Angular): .NET has no real import
// system like TS imports, so class→test association relies on this filename /
// word-boundary heuristic rather than a resolved import — it is necessarily
// looser than the TS import gate (see features/detect-untested-public-api.md).
// Emits ONE JSON object: { "Findings": [{ "Symbol", "File", "Line", "Reason" }],
//                          "CapReached": bool }
// Reason: "no_test_file" (class/record/struct has no associated test file) |
//         "no_reference_found" (a test file exists for the type, but the member
//         is never referenced) |
//         "no_test_file:controller_may_be_integration_tested" (Controller class — likely
//         covered by WebApplicationFactory/HTTP integration tests, not unit tests) |
//         "no_reference_found:controller_may_be_integration_tested" (same hint for member level).

#r "nuget: Microsoft.CodeAnalysis.CSharp, 5.0.0-2.final"
#nullable enable

using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Xml.Linq;

var inputPath = Args.ElementAtOrDefault(0) ?? Directory.GetCurrentDirectory();
// Default aligned with the zod schema (depth defaults to "file").
var depth = Args.ElementAtOrDefault(1) ?? "file";
// Optional: caller-supplied test project path — skips auto-discovery entirely.
var explicitTestPath = Args.ElementAtOrDefault(2);

const int FILE_CAP = 400;
var excludedMembers = new HashSet<string> { "Dispose", "Finalize", "ToString", "Equals", "GetHashCode" };

string scanRoot;
List<string> testRoots;
List<string> srcTargets;
var capReached = false;

// FE/.NET parity (mirrors ts-advanced-features.ts: a spec path in depth=file →
// []): when the file-mode input is itself a test file, there is no production
// API to scan — emit an empty result instead of scanning the test class as a
// source. Reachable code follows when the guard does not apply.
if (depth == "file" && File.Exists(inputPath) && IsTestFile(Path.GetFileName(inputPath)))
{
    Console.WriteLine(JsonSerializer.Serialize(
        new Result(), new JsonSerializerOptions { WriteIndented = true }));
    return;
}

if (depth == "file" && File.Exists(inputPath))
{
    scanRoot = Path.GetDirectoryName(inputPath) ?? Directory.GetCurrentDirectory();
    srcTargets = new List<string> { inputPath };
    if (explicitTestPath != null)
        testRoots = new List<string> { explicitTestPath };
    else
    {
        // Find owning .csproj, then discover referencing test projects via the
        // project-reference graph. Fall back to solution-root walk.
        var owningDir = FindOwningProjectDir(inputPath);
        var discovered = owningDir != null ? FindTestProjectsViaReferences(owningDir) : new List<string>();
        testRoots = discovered.Count > 0 ? discovered
            : new List<string> { FindSolutionRoot(inputPath) ?? scanRoot };
    }
}
else
{
    scanRoot = inputPath;
    if (explicitTestPath != null)
        testRoots = new List<string> { explicitTestPath };
    else
    {
        // Primary: find all projects in the .sln that reference this production
        // project via <ProjectReference>. Fall back to solution-root walk.
        var discovered = FindTestProjectsViaReferences(inputPath);
        testRoots = discovered.Count > 0 ? discovered
            : new List<string> { FindSolutionRootFromDir(inputPath) ?? scanRoot };
    }
    var nonTestFiles = Directory.GetFiles(scanRoot, "*.cs", SearchOption.AllDirectories)
        .Where(f => !f.Contains($"{Path.DirectorySeparatorChar}obj{Path.DirectorySeparatorChar}")
                 && !f.Contains($"{Path.DirectorySeparatorChar}bin{Path.DirectorySeparatorChar}"))
        .Where(f => !IsTestFile(Path.GetFileName(f)))
        .ToList();
    capReached = nonTestFiles.Count > FILE_CAP;
    srcTargets = nonTestFiles.Take(FILE_CAP).ToList();
}

// Never treat a scanned source file as its own test file (matters in depth=file
// when the source itself is named *Test*/*Spec*).
var srcSet = new HashSet<string>(srcTargets.Select(Path.GetFullPath), StringComparer.OrdinalIgnoreCase);

var allTestFiles = testRoots
    .Where(Directory.Exists)
    .SelectMany(tr => Directory.GetFiles(tr, "*.cs", SearchOption.AllDirectories))
    .Where(f => !f.Contains($"{Path.DirectorySeparatorChar}obj{Path.DirectorySeparatorChar}")
             && !f.Contains($"{Path.DirectorySeparatorChar}bin{Path.DirectorySeparatorChar}"))
    .Where(f => IsTestFile(Path.GetFileName(f)))
    .Where(f => !srcSet.Contains(Path.GetFullPath(f)))
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToList();

// Per test file: exact MemberAccess names + raw code (for the word-boundary
// fallback — no Contains substring hits, so "Add" never matches "Address").
var testInfos = allTestFiles.Select(f =>
{
    var code = SafeRead(f);
    var root = CSharpSyntaxTree.ParseText(code).GetRoot();
    var memberNames = new HashSet<string>(root.DescendantNodes()
        .OfType<MemberAccessExpressionSyntax>().Select(ma => ma.Name.Identifier.Text));
    return (Path: f, Code: code, MemberNames: memberNames);
}).ToList();

var findings = new List<Finding>();

foreach (var srcFile in srcTargets)
{
    var code = SafeRead(srcFile);
    if (code.Length == 0) continue;
    var relPath = Path.GetRelativePath(scanRoot, srcFile);
    var root = CSharpSyntaxTree.ParseText(code, path: srcFile).GetRoot();

    // Scan classes, records and structs (interfaces excluded: no implementation to test).
    // Skip nested types (private inner classes, compiler-generated closures) — they are
    // implementation details of the outer class, not independent public API surfaces.
    // A type is nested when its direct parent in the syntax tree is another TypeDeclarationSyntax.
    var typeDecls = root.DescendantNodes().OfType<TypeDeclarationSyntax>()
        .Where(t => t is ClassDeclarationSyntax or RecordDeclarationSyntax or StructDeclarationSyntax)
        .Where(t => t.Parent is not TypeDeclarationSyntax);

    foreach (var type in typeDecls)
    {
        var clsName = type.Identifier.Text;

        // Controllers are typically covered by integration tests (WebApplicationFactory,
        // HttpClient-based tests) rather than unit tests. Static heuristics cannot
        // detect integration-test coverage — findings for controllers are marked with
        // a hint so callers know they may be false positives.
        var typeAttrs = type.AttributeLists.SelectMany(al => al.Attributes).Select(a => a.Name.ToString()).ToList();
        var isController = typeAttrs.Any(a => a.Contains("ApiController") || a == "Controller")
                        || clsName.EndsWith("Controller");

        // Class→test association (per-class scoping, analogous to the Angular
        // import gate): a test file is associated when its name stem is
        // <Class>[Tests|Test|Spec(s)] OR its code references the class by word
        // boundary. Robust against the "FooTests.cs" case (no word boundary
        // between Foo and Tests on a raw path match).
        var associatedTests = testInfos
            .Where(t => TestFileReferencesClass(t.Path, t.Code, clsName))
            .ToList();
        var classHasTestFile = associatedTests.Count > 0;

        var members = new List<(string Name, int Line)>();
        // Per-class dedup (analogous to the Angular collectPublicMembers `seen`
        // set): each member name yields a single finding even with method
        // overloads of the same name, a positional record property colliding with
        // an explicit property, etc.
        var seen = new HashSet<string>();

        // Record positional properties (e.g. `record Foo(int A, string B)`) are implicitly
        // tested whenever the record constructor is exercised — do NOT flag them individually.
        // A test that does `new Foo("x", 1)` covers all positional properties, but the
        // property names rarely appear as MemberAccess targets in the test code.

        foreach (var m in type.Members.OfType<MethodDeclarationSyntax>()
            .Where(m => m.Modifiers.Any(mod => mod.Text == "public") && !excludedMembers.Contains(m.Identifier.Text)))
            if (seen.Add(m.Identifier.Text))
                members.Add((m.Identifier.Text, m.GetLocation().GetLineSpan().StartLinePosition.Line + 1));

        foreach (var p in type.Members.OfType<PropertyDeclarationSyntax>()
            .Where(p => p.Modifiers.Any(mod => mod.Text == "public") && !excludedMembers.Contains(p.Identifier.Text)))
            if (seen.Add(p.Identifier.Text))
                members.Add((p.Identifier.Text, p.GetLocation().GetLineSpan().StartLinePosition.Line + 1));

        foreach (var (name, line) in members)
        {
            if (!classHasTestFile)
            {
                // Controllers without a unit test file are likely covered by integration tests.
                var reason = isController ? "no_test_file:controller_may_be_integration_tested" : "no_test_file";
                findings.Add(new Finding { Symbol = $"{clsName}.{name}", File = relPath, Line = line, Reason = reason });
                continue;
            }
            // Scoped to the test files associated with THIS class only.
            var referenced = associatedTests.Any(t => t.MemberNames.Contains(name) || WordMatch(t.Code, name));
            if (!referenced)
            {
                var reason = isController ? "no_reference_found:controller_may_be_integration_tested" : "no_reference_found";
                findings.Add(new Finding { Symbol = $"{clsName}.{name}", File = relPath, Line = line, Reason = reason });
            }
        }
    }
}

var opts = new JsonSerializerOptions { WriteIndented = true };
Console.WriteLine(JsonSerializer.Serialize(new Result { Findings = findings, CapReached = capReached }, opts));

// ── Helpers ─────────────────────────────────────────────────────────────────
// Test classification on the FILE NAME only — never the absolute path, so an
// ancestor folder like "Acme.Tests" / "SpecFlowDemo" does not mark every file
// as a test (which would silently yield zero findings).
static bool IsTestFile(string f)
{
    var name = Path.GetFileName(f);
    return name.Contains("Test") || name.Contains("Spec")
        || name.EndsWith("Tests.cs") || name.EndsWith("Test.cs") || name.EndsWith("Spec.cs");
}

// A test file is associated with a class when its name stem is
// <Class>[Tests|Test|Spec(s)] (exact stem compare — robust for "FooTests.cs",
// which a word-boundary path match would miss) OR its code references the class
// by word boundary.
static bool TestFileReferencesClass(string testPath, string code, string clsName)
{
    if (string.IsNullOrEmpty(clsName)) return false;
    var stem = Path.GetFileNameWithoutExtension(testPath);
    if (stem == clsName
        || stem == clsName + "Tests" || stem == clsName + "Test"
        || stem == clsName + "Spec" || stem == clsName + "Specs")
        return true;
    return WordMatch(code, clsName);
}

static bool WordMatch(string text, string word) =>
    !string.IsNullOrEmpty(word) && Regex.IsMatch(text, $@"\b{Regex.Escape(word)}\b");

// Nearest ancestor directory that contains a .sln file; null when none exists.
// startFile must be a FILE path — GetDirectoryName strips the filename first.
static string? FindSolutionRoot(string startFile)
{
    var dir = Path.GetDirectoryName(Path.GetFullPath(startFile));
    while (!string.IsNullOrEmpty(dir))
    {
        if (Directory.GetFiles(dir, "*.sln").Length > 0) return dir;
        var parent = Path.GetDirectoryName(dir);
        if (string.IsNullOrEmpty(parent) || parent == dir) break;
        dir = parent;
    }
    return null;
}

// Same as FindSolutionRoot but accepts a DIRECTORY path directly (for depth=project).
static string? FindSolutionRootFromDir(string startDir)
{
    var dir = Path.GetFullPath(startDir);
    while (!string.IsNullOrEmpty(dir))
    {
        if (Directory.GetFiles(dir, "*.sln").Length > 0) return dir;
        var parent = Path.GetDirectoryName(dir);
        if (string.IsNullOrEmpty(parent) || parent == dir) break;
        dir = parent;
    }
    return null;
}

// Walks up from a FILE to find the nearest ancestor directory that owns a .csproj.
static string? FindOwningProjectDir(string filePath)
{
    var dir = Path.GetDirectoryName(Path.GetFullPath(filePath));
    while (!string.IsNullOrEmpty(dir))
    {
        if (Directory.GetFiles(dir, "*.csproj", SearchOption.TopDirectoryOnly).Length > 0) return dir;
        var parent = Path.GetDirectoryName(dir);
        if (string.IsNullOrEmpty(parent) || parent == dir) break;
        dir = parent;
    }
    return null;
}

// Reads the .sln at the solution root, then checks every listed .csproj for a
// <ProjectReference> that points back to the production project in productionDir.
// Returns the directory of every project that references the production project
// (typically the test project(s)).
static List<string> FindTestProjectsViaReferences(string productionDir)
{
    var result = new List<string>();
    var inputCsproj = Directory.GetFiles(productionDir, "*.csproj", SearchOption.TopDirectoryOnly).FirstOrDefault();
    if (inputCsproj == null) return result;
    var inputCsprojFull = Path.GetFullPath(inputCsproj);

    var slnRoot = FindSolutionRootFromDir(productionDir);
    if (slnRoot == null) return result;
    var slnFile = Directory.GetFiles(slnRoot, "*.sln").FirstOrDefault();
    if (slnFile == null) return result;

    // Parse project paths from the .sln (lines like: Project("...") = "Name", "rel\path.csproj", "{GUID}")
    var sep = Path.DirectorySeparatorChar;
    var projectPaths = File.ReadAllLines(slnFile)
        .Where(l => l.TrimStart().StartsWith("Project("))
        .Select(l => Regex.Match(l, @",\s*""([^""]+\.csproj)"""))
        .Where(m => m.Success)
        .Select(m => Path.GetFullPath(Path.Combine(slnRoot, m.Groups[1].Value.Replace('\\', sep))))
        .Where(File.Exists)
        .ToList();

    foreach (var csproj in projectPaths)
    {
        if (string.Equals(csproj, inputCsprojFull, StringComparison.OrdinalIgnoreCase)) continue;
        try
        {
            var xml = XDocument.Load(csproj);
            var refs = xml.Descendants("ProjectReference")
                .Select(r => r.Attribute("Include")?.Value)
                .Where(v => !string.IsNullOrEmpty(v))
                .Select(v => Path.GetFullPath(Path.Combine(
                    Path.GetDirectoryName(csproj)!, v!.Replace('\\', sep))));
            if (refs.Any(r => string.Equals(r, inputCsprojFull, StringComparison.OrdinalIgnoreCase)))
                result.Add(Path.GetDirectoryName(csproj)!);
        }
        catch { /* malformed .csproj — skip */ }
    }
    return result;
}

static string SafeRead(string f) { try { return File.ReadAllText(f); } catch { return ""; } }

class Result
{
    public List<Finding> Findings { get; set; } = new();
    public bool CapReached { get; set; }
}

class Finding
{
    public string Symbol { get; set; } = "";
    public string File { get; set; } = "";
    public int Line { get; set; }
    public string Reason { get; set; } = "";
}
