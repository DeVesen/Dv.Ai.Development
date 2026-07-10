# dev-mcp Search Response Envelope Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change `find_file`, `find_by_content`, and `find_implementations` from returning a bare JSON array to returning `{ results: [...], meta: { truncated, reason, filesScanned, hint } }` so agents can distinguish a genuine "not found" from a truncated result.

**Architecture:** Two new records (`SearchMeta` with factory, `SearchResult<T>`) are added to `Models/SearchResult.cs`. Each of the three services gains an internal `filesScanned` counter and a `truncated` flag; the public method returns `SearchResult<T>`. The tool layer requires no envelope logic — `JsonOptions.Serialize` on `SearchResult<T>` produces the correct JSON via CamelCase policy.

**Tech Stack:** C# 13 / .NET 9, xUnit, ModelContextProtocol.Server, Microsoft.CodeAnalysis (Roslyn for ImplementationSearchService)

## Global Constraints

- All paths in MCP tool calls: Windows absolute paths `C:\Develop\Dv.Ai.Development\...` — no relative paths, no `/workspace/`
- Build/test via MCP tools only: `mcp__dev-mcp__build_dotnet_solution`, `mcp__dev-mcp__test_dotnet_solution`
- Test project: `C:\Develop\Dv.Ai.Development\Mcp-Servers\Dev.Mcp\Dev.Mcp.Tests\Dev.Mcp.Tests.csproj`
- Test always with explicit `test_project_path` (see CLAUDE.md Verhaltensregeln)
- `max_results` clamps to `[1, 100]` — this is preserved unchanged in all services
- `JsonOptions.Default` uses `CamelCase` + `WhenWritingNull` — `hint` serializes to `null` omission automatically
- New records go at the end of `Models/SearchResult.cs` after existing records
- Test classes follow the pattern of existing tests: `sealed`, `IDisposable` with temp dir, direct service instantiation

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `Mcp-Servers/Dev.Mcp/Dev.Mcp/Models/SearchResult.cs` | Modify | Add `SearchMeta` record (with `Build` factory) + `SearchResult<T>` record |
| `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/SearchMetaTests.cs` | Create | Unit tests for `SearchMeta.Build` |
| `Mcp-Servers/Dev.Mcp/Dev.Mcp/Services/GlobSearchService.cs` | Modify | `FindFile` → `SearchResult<FileMatchResult>` + counter |
| `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/GlobSearchServiceTests.cs` | Create | Tests for `FindFile` envelope |
| `Mcp-Servers/Dev.Mcp/Dev.Mcp/Services/ContentSearchService.cs` | Modify | `FindByContent` → `SearchResult<ContentMatchResult>` + counter + break-flag |
| `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/ContentSearchServiceTests.cs` | Create | Tests for `FindByContent` envelope |
| `Mcp-Servers/Dev.Mcp/Dev.Mcp/Services/ImplementationSearchService.cs` | Modify | `FindImplementations` → `SearchResult<ImplementationMatchResult>` + `ref` params on private scanners |
| `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/ImplementationSearchServiceTests.cs` | Create | Tests for `FindImplementations` envelope |
| `Mcp-Servers/Dev.Mcp/Dev.Mcp/Tools/FilesystemTools.cs` | Modify | Update three `[Description]` attributes (no logic change) |
| `.claude/skills/dev-mcp/references/tool-catalog.md` | Modify | Add search-tool return-shape entry to Rückgabe-Schemas section |

---

### Task 1: SearchMeta + SearchResult\<T\> types

**Files:**
- Modify: `Mcp-Servers/Dev.Mcp/Dev.Mcp/Models/SearchResult.cs`
- Create: `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/SearchMetaTests.cs`

**Interfaces:**
- Produces: `SearchMeta.Build(bool truncated, int filesScanned, int maxResults) → SearchMeta` — used by Tasks 2, 3, 4
- Produces: `SearchResult<T>(IReadOnlyList<T> Results, SearchMeta Meta)` — used by Tasks 2, 3, 4

- [ ] **Step 1: Write the failing test**

Create `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/SearchMetaTests.cs`:

```csharp
using Dev.Mcp.Models;

namespace Dev.Mcp.Tests;

public sealed class SearchMetaTests
{
    [Fact]
    public void Build_WhenNotTruncated_ReturnsNoneReasonAndNullHint()
    {
        var meta = SearchMeta.Build(truncated: false, filesScanned: 42, maxResults: 20);

        Assert.False(meta.Truncated);
        Assert.Equal("none", meta.Reason);
        Assert.Equal(42, meta.FilesScanned);
        Assert.Null(meta.Hint);
    }

    [Fact]
    public void Build_WhenTruncated_ReturnsMaxResultsReasonAndHintContainingLimit()
    {
        var meta = SearchMeta.Build(truncated: true, filesScanned: 312, maxResults: 20);

        Assert.True(meta.Truncated);
        Assert.Equal("max_results_reached", meta.Reason);
        Assert.Equal(312, meta.FilesScanned);
        Assert.NotNull(meta.Hint);
        Assert.Contains("20", meta.Hint);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```
mcp__dev-mcp__test_dotnet_solution(
  path="C:\Develop\Dv.Ai.Development\Mcp-Servers\Dev.Mcp",
  test_project_path="C:\Develop\Dv.Ai.Development\Mcp-Servers\Dev.Mcp\Dev.Mcp.Tests\Dev.Mcp.Tests.csproj"
)
```

Expected: FAIL — `SearchMeta` does not exist yet.

- [ ] **Step 3: Add SearchMeta and SearchResult\<T\> to SearchResult.cs**

Append to the end of `Mcp-Servers/Dev.Mcp/Dev.Mcp/Models/SearchResult.cs` (after the last existing record):

```csharp
public record SearchMeta(bool Truncated, string Reason, int FilesScanned, string? Hint)
{
    public static SearchMeta Build(bool truncated, int filesScanned, int maxResults) =>
        new(truncated,
            truncated ? "max_results_reached" : "none",
            filesScanned,
            truncated ? $"Results capped at {maxResults}. Increase max_results or narrow root." : null);
}

public record SearchResult<T>(IReadOnlyList<T> Results, SearchMeta Meta);
```

- [ ] **Step 4: Run tests to verify they pass**

```
mcp__dev-mcp__test_dotnet_solution(
  path="C:\Develop\Dv.Ai.Development\Mcp-Servers\Dev.Mcp",
  test_project_path="C:\Develop\Dv.Ai.Development\Mcp-Servers\Dev.Mcp\Dev.Mcp.Tests\Dev.Mcp.Tests.csproj"
)
```

Expected: `SearchMetaTests` — 2 passed. All other existing tests still pass.

- [ ] **Step 5: Commit**

```
git add Mcp-Servers/Dev.Mcp/Dev.Mcp/Models/SearchResult.cs
git add Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/SearchMetaTests.cs
git commit -m "feat(dev-mcp): add SearchMeta + SearchResult<T> types"
```

---

### Task 2: GlobSearchService — search envelope

**Files:**
- Modify: `Mcp-Servers/Dev.Mcp/Dev.Mcp/Services/GlobSearchService.cs`
- Create: `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/GlobSearchServiceTests.cs`

**Interfaces:**
- Consumes: `SearchMeta.Build(...)` from Task 1, `SearchResult<T>` from Task 1
- Produces: `GlobSearchService.FindFile(...) → SearchResult<FileMatchResult>` — consumed by `FilesystemTools.FindFile` (Task 5, no change to tool call needed)

- [ ] **Step 1: Write failing tests**

Create `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/GlobSearchServiceTests.cs`:

```csharp
using Dev.Mcp.Services;

namespace Dev.Mcp.Tests;

public sealed class GlobSearchServiceTests : IDisposable
{
    private readonly string _root;
    private readonly GlobSearchService _svc = new();

    public GlobSearchServiceTests()
    {
        _root = Path.Combine(Path.GetTempPath(), "devmcp-glob-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(Path.Combine(_root, "src", "deep", "nested"));
        File.WriteAllText(Path.Combine(_root, "src", "deep", "nested", "Target.cs"), "// target");
        File.WriteAllText(Path.Combine(_root, "src", "Other.ts"), "// other");
    }

    public void Dispose()
    {
        try { Directory.Delete(_root, recursive: true); } catch { }
    }

    [Fact]
    public void FindFile_WhenFileExists_ReturnsResultWithPositiveFilesScanned()
    {
        var result = _svc.FindFile(_root, "Target.cs", maxResults: 20);

        Assert.Single(result.Results);
        Assert.False(result.Meta.Truncated);
        Assert.True(result.Meta.FilesScanned >= 1);
        Assert.Null(result.Meta.Hint);
    }

    [Fact]
    public void FindFile_WhenNoMatch_ReturnsEmptyResultsWithFilesScannedAboveZero()
    {
        var result = _svc.FindFile(_root, "DoesNotExist.xyz", maxResults: 20);

        Assert.Empty(result.Results);
        Assert.False(result.Meta.Truncated);
        Assert.True(result.Meta.FilesScanned >= 2);
        Assert.Null(result.Meta.Hint);
    }

    [Fact]
    public void FindFile_WhenMaxResultsExceeded_SetsTruncatedTrueWithHint()
    {
        for (var i = 0; i < 5; i++)
            File.WriteAllText(Path.Combine(_root, $"File{i}.cs"), string.Empty);

        var result = _svc.FindFile(_root, "*.cs", maxResults: 2);

        Assert.Equal(2, result.Results.Count);
        Assert.True(result.Meta.Truncated);
        Assert.Equal("max_results_reached", result.Meta.Reason);
        Assert.NotNull(result.Meta.Hint);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```
mcp__dev-mcp__test_dotnet_solution(
  path="C:\Develop\Dv.Ai.Development\Mcp-Servers\Dev.Mcp",
  test_project_path="C:\Develop\Dv.Ai.Development\Mcp-Servers\Dev.Mcp\Dev.Mcp.Tests\Dev.Mcp.Tests.csproj"
)
```

Expected: FAIL — `_svc.FindFile(...)` returns `IReadOnlyList<FileMatchResult>`, has no `.Results` property yet.

- [ ] **Step 3: Replace GlobSearchService.FindFile**

Replace the entire `FindFile` method body in `GlobSearchService.cs`:

```csharp
public SearchResult<FileMatchResult> FindFile(string root, string pattern, int maxResults)
{
    maxResults = Math.Clamp(maxResults, 1, 100);
    var globPattern = GlobMatcher.NormalizePattern(pattern);
    var results = new List<FileMatchResult>(maxResults);
    var rootPrefix = root.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;
    var filesScanned = 0;
    var truncated = false;

    foreach (var file in GlobMatcher.EnumerateFiles(root))
    {
        if (!PathValidator.IsUnderRoot(file, root)) continue;
        filesScanned++;

        var relative = file.StartsWith(rootPrefix, StringComparison.OrdinalIgnoreCase)
            ? file[rootPrefix.Length..]
            : Path.GetRelativePath(root, file);

        if (!GlobMatcher.IsMatch(relative, globPattern)) continue;

        long size;
        try { size = new FileInfo(file).Length; }
        catch { size = 0; }

        results.Add(new FileMatchResult(file, relative.Replace('\\', '/'), size));
        if (results.Count >= maxResults) { truncated = true; break; }
    }

    return new SearchResult<FileMatchResult>(results, SearchMeta.Build(truncated, filesScanned, maxResults));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
mcp__dev-mcp__test_dotnet_solution(
  path="C:\Develop\Dv.Ai.Development\Mcp-Servers\Dev.Mcp",
  test_project_path="C:\Develop\Dv.Ai.Development\Mcp-Servers\Dev.Mcp\Dev.Mcp.Tests\Dev.Mcp.Tests.csproj"
)
```

Expected: `GlobSearchServiceTests` — 3 passed. All prior tests still pass.

Note: `FilesystemTools.cs` still compiles because `JsonOptions.Serialize` accepts any `T` — the call site `_globSearch.FindFile(...)` automatically picks up the new return type.

- [ ] **Step 5: Commit**

```
git add Mcp-Servers/Dev.Mcp/Dev.Mcp/Services/GlobSearchService.cs
git add Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/GlobSearchServiceTests.cs
git commit -m "feat(dev-mcp): find_file returns SearchResult envelope with meta"
```

---

### Task 3: ContentSearchService — search envelope

**Files:**
- Modify: `Mcp-Servers/Dev.Mcp/Dev.Mcp/Services/ContentSearchService.cs`
- Create: `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/ContentSearchServiceTests.cs`

**Interfaces:**
- Consumes: `SearchMeta.Build(...)` from Task 1, `SearchResult<T>` from Task 1
- Produces: `ContentSearchService.FindByContent(...) → SearchResult<ContentMatchResult>`

- [ ] **Step 1: Write failing tests**

Create `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/ContentSearchServiceTests.cs`:

```csharp
using Dev.Mcp.Services;

namespace Dev.Mcp.Tests;

public sealed class ContentSearchServiceTests : IDisposable
{
    private readonly string _root;
    private readonly ContentSearchService _svc = new();

    public ContentSearchServiceTests()
    {
        _root = Path.Combine(Path.GetTempPath(), "devmcp-content-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_root);
        File.WriteAllText(Path.Combine(_root, "File1.cs"), "public class Foo { string Bar = \"hello\"; }");
        File.WriteAllText(Path.Combine(_root, "File2.cs"), "public class Baz { }");
    }

    public void Dispose()
    {
        try { Directory.Delete(_root, recursive: true); } catch { }
    }

    [Fact]
    public void FindByContent_WhenPatternMatches_ReturnsResultWithPositiveFilesScanned()
    {
        var result = _svc.FindByContent(_root, "hello", fileGlob: null, maxResults: 20);

        Assert.Single(result.Results);
        Assert.False(result.Meta.Truncated);
        Assert.True(result.Meta.FilesScanned >= 1);
        Assert.Null(result.Meta.Hint);
    }

    [Fact]
    public void FindByContent_WhenNoMatch_ReturnsEmptyResultsWithBothFilesScanned()
    {
        var result = _svc.FindByContent(_root, "xyz_definitely_not_present", fileGlob: null, maxResults: 20);

        Assert.Empty(result.Results);
        Assert.False(result.Meta.Truncated);
        Assert.True(result.Meta.FilesScanned >= 2);
        Assert.Null(result.Meta.Hint);
    }

    [Fact]
    public void FindByContent_WhenMaxResultsExceeded_SetsTruncatedTrueAndStopsOuterLoop()
    {
        for (var i = 0; i < 5; i++)
            File.WriteAllText(Path.Combine(_root, $"Extra{i}.cs"), $"match_{i} match_{i} match_{i}");

        var result = _svc.FindByContent(_root, @"match_\d", fileGlob: null, maxResults: 2);

        Assert.Equal(2, result.Results.Count);
        Assert.True(result.Meta.Truncated);
        Assert.Equal("max_results_reached", result.Meta.Reason);
        Assert.NotNull(result.Meta.Hint);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```
mcp__dev-mcp__test_dotnet_solution(
  path="C:\Develop\Dv.Ai.Development\Mcp-Servers\Dev.Mcp",
  test_project_path="C:\Develop\Dv.Ai.Development\Mcp-Servers\Dev.Mcp\Dev.Mcp.Tests\Dev.Mcp.Tests.csproj"
)
```

Expected: FAIL — `FindByContent` still returns `IReadOnlyList<ContentMatchResult>`.

- [ ] **Step 3: Replace ContentSearchService.FindByContent**

Replace the entire `FindByContent` method in `ContentSearchService.cs`:

```csharp
public SearchResult<ContentMatchResult> FindByContent(
    string root, string pattern, string? fileGlob, int maxResults)
{
    maxResults = Math.Clamp(maxResults, 1, 100);
    var regex = BuildRegex(pattern);
    var fileFilter = string.IsNullOrWhiteSpace(fileGlob) ? null : GlobMatcher.NormalizePattern(fileGlob);
    var results = new List<ContentMatchResult>(maxResults);
    var rootPrefix = root.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;
    var filesScanned = 0;
    var truncated = false;

    foreach (var file in GlobMatcher.EnumerateFiles(root))
    {
        if (!PathValidator.IsUnderRoot(file, root)) continue;

        var ext = Path.GetExtension(file);
        if (ext is not (".cs" or ".ts" or ".tsx" or ".js" or ".jsx" or ".json" or ".md" or ".xml" or ".html" or ".css" or ".scss"))
            continue;

        if (fileFilter is not null)
        {
            var relative = file.StartsWith(rootPrefix, StringComparison.OrdinalIgnoreCase)
                ? file[rootPrefix.Length..]
                : Path.GetRelativePath(root, file);
            if (!GlobMatcher.IsMatch(relative.Replace('\\', '/'), fileFilter)) continue;
        }

        filesScanned++;

        string[] lines;
        try { lines = File.ReadAllLines(file); }
        catch { continue; }

        for (var i = 0; i < lines.Length; i++)
        {
            var line = lines[i];
            if (!regex.IsMatch(line)) continue;

            var match = regex.Match(line).Value;
            if (string.IsNullOrEmpty(match)) match = line.Trim();

            results.Add(new ContentMatchResult(file, i + 1, match));
            if (results.Count >= maxResults) { truncated = true; break; }
        }

        if (truncated) break;
    }

    return new SearchResult<ContentMatchResult>(results, SearchMeta.Build(truncated, filesScanned, maxResults));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
mcp__dev-mcp__test_dotnet_solution(
  path="C:\Develop\Dv.Ai.Development\Mcp-Servers\Dev.Mcp",
  test_project_path="C:\Develop\Dv.Ai.Development\Mcp-Servers\Dev.Mcp\Dev.Mcp.Tests\Dev.Mcp.Tests.csproj"
)
```

Expected: `ContentSearchServiceTests` — 3 passed. All prior tests still pass.

- [ ] **Step 5: Commit**

```
git add Mcp-Servers/Dev.Mcp/Dev.Mcp/Services/ContentSearchService.cs
git add Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/ContentSearchServiceTests.cs
git commit -m "feat(dev-mcp): find_by_content returns SearchResult envelope with meta"
```

---

### Task 4: ImplementationSearchService — search envelope

**Files:**
- Modify: `Mcp-Servers/Dev.Mcp/Dev.Mcp/Services/ImplementationSearchService.cs`
- Create: `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/ImplementationSearchServiceTests.cs`

**Interfaces:**
- Consumes: `SearchMeta.Build(...)` from Task 1, `SearchResult<T>` from Task 1
- Produces: `ImplementationSearchService.FindImplementations(...) → SearchResult<ImplementationMatchResult>`

Note: The two private static methods `ScanCSharp` and `ScanTypeScript` gain `ref int filesScanned, ref bool truncated` parameters. These are `ref` (not `out`) because the public method passes the same counters through both phases sequentially.

- [ ] **Step 1: Write failing tests**

Create `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/ImplementationSearchServiceTests.cs`:

```csharp
using Dev.Mcp.Services;

namespace Dev.Mcp.Tests;

public sealed class ImplementationSearchServiceTests : IDisposable
{
    private readonly string _root;
    private readonly ImplementationSearchService _svc = new();

    public ImplementationSearchServiceTests()
    {
        _root = Path.Combine(Path.GetTempPath(), "devmcp-impl-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_root);
        File.WriteAllText(Path.Combine(_root, "ImplA.cs"), "public class ImplA : IMyService { }");
        File.WriteAllText(Path.Combine(_root, "ImplB.cs"), "public class ImplB : IMyService { }");
        File.WriteAllText(Path.Combine(_root, "Unrelated.cs"), "public class Unrelated { }");
    }

    public void Dispose()
    {
        try { Directory.Delete(_root, recursive: true); } catch { }
    }

    [Fact]
    public void FindImplementations_WhenImplementationsExist_ReturnsThemWithFilesScanned()
    {
        var result = _svc.FindImplementations(_root, "IMyService", "csharp", maxResults: 20);

        Assert.Equal(2, result.Results.Count);
        Assert.False(result.Meta.Truncated);
        Assert.True(result.Meta.FilesScanned >= 2);
        Assert.Null(result.Meta.Hint);
    }

    [Fact]
    public void FindImplementations_WhenMaxResultsHit_SetsTruncatedTrue()
    {
        for (var i = 2; i < 5; i++)
            File.WriteAllText(Path.Combine(_root, $"Impl{i}.cs"), $"public class Impl{i} : IMyService {{ }}");

        var result = _svc.FindImplementations(_root, "IMyService", "csharp", maxResults: 2);

        Assert.Equal(2, result.Results.Count);
        Assert.True(result.Meta.Truncated);
        Assert.Equal("max_results_reached", result.Meta.Reason);
        Assert.NotNull(result.Meta.Hint);
    }

    [Fact]
    public void FindImplementations_WhenCSharpPhaseTruncated_TypeScriptPhaseIsSkipped()
    {
        for (var i = 2; i < 5; i++)
            File.WriteAllText(Path.Combine(_root, $"Impl{i}.cs"), $"public class Impl{i} : IMyService {{ }}");
        File.WriteAllText(Path.Combine(_root, "ImplTs.ts"),
            "export class ImplTs implements IMyService { }");

        var result = _svc.FindImplementations(_root, "IMyService", "auto", maxResults: 2);

        Assert.True(result.Meta.Truncated);
        Assert.DoesNotContain(result.Results, r => r.File.EndsWith(".ts", StringComparison.OrdinalIgnoreCase));
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```
mcp__dev-mcp__test_dotnet_solution(
  path="C:\Develop\Dv.Ai.Development\Mcp-Servers\Dev.Mcp",
  test_project_path="C:\Develop\Dv.Ai.Development\Mcp-Servers\Dev.Mcp\Dev.Mcp.Tests\Dev.Mcp.Tests.csproj"
)
```

Expected: FAIL — `FindImplementations` still returns `IReadOnlyList<ImplementationMatchResult>`.

- [ ] **Step 3: Replace ImplementationSearchService**

Replace the entire content of `ImplementationSearchService.cs`:

```csharp
using System.Text.RegularExpressions;
using Dev.Mcp.Models;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Dev.Mcp.Services;

public sealed class ImplementationSearchService
{
    private static readonly Regex TsImplementsRegex = new(
        @"(?:export\s+)?(?:abstract\s+)?class\s+(\w+)\s+implements\s+([^{]+)",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    public SearchResult<ImplementationMatchResult> FindImplementations(
        string root, string interfaceName, string language, int maxResults)
    {
        maxResults = Math.Clamp(maxResults, 1, 100);
        var normalizedInterface = NormalizeInterfaceName(interfaceName);
        var lang = language.Trim().ToLowerInvariant();
        var results = new List<ImplementationMatchResult>(maxResults);
        var filesScanned = 0;
        var truncated = false;

        if (lang is "auto" or "csharp" or "cs" or "c#")
            ScanCSharp(root, normalizedInterface, results, maxResults, ref filesScanned, ref truncated);

        if (!truncated && results.Count < maxResults && lang is "auto" or "typescript" or "ts")
            ScanTypeScript(root, normalizedInterface, results, maxResults, ref filesScanned, ref truncated);

        return new SearchResult<ImplementationMatchResult>(results, SearchMeta.Build(truncated, filesScanned, maxResults));
    }

    private static void ScanCSharp(string root, string interfaceName,
        List<ImplementationMatchResult> results, int maxResults,
        ref int filesScanned, ref bool truncated)
    {
        foreach (var file in GlobMatcher.EnumerateFiles(root))
        {
            if (!file.EndsWith(".cs", StringComparison.OrdinalIgnoreCase)) continue;
            if (!PathValidator.IsUnderRoot(file, root)) continue;
            filesScanned++;

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
                if (results.Count >= maxResults) { truncated = true; return; }
            }
        }
    }

    private static void ScanTypeScript(string root, string interfaceName,
        List<ImplementationMatchResult> results, int maxResults,
        ref int filesScanned, ref bool truncated)
    {
        foreach (var file in GlobMatcher.EnumerateFiles(root))
        {
            if (!file.EndsWith(".ts", StringComparison.OrdinalIgnoreCase)) continue;
            if (!PathValidator.IsUnderRoot(file, root)) continue;
            filesScanned++;

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
                if (results.Count >= maxResults) { truncated = true; return; }
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
```

- [ ] **Step 4: Run tests to verify they pass**

```
mcp__dev-mcp__test_dotnet_solution(
  path="C:\Develop\Dv.Ai.Development\Mcp-Servers\Dev.Mcp",
  test_project_path="C:\Develop\Dv.Ai.Development\Mcp-Servers\Dev.Mcp\Dev.Mcp.Tests\Dev.Mcp.Tests.csproj"
)
```

Expected: `ImplementationSearchServiceTests` — 3 passed. All prior tests still pass.

- [ ] **Step 5: Commit**

```
git add Mcp-Servers/Dev.Mcp/Dev.Mcp/Services/ImplementationSearchService.cs
git add Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/ImplementationSearchServiceTests.cs
git commit -m "feat(dev-mcp): find_implementations returns SearchResult envelope with meta"
```

---

### Task 5: FilesystemTools descriptions + publish

**Files:**
- Modify: `Mcp-Servers/Dev.Mcp/Dev.Mcp/Tools/FilesystemTools.cs`

This task changes only the three `[Description]` attributes. No logic changes. The tool layer compiles correctly since `JsonOptions.Serialize` is generic and already handles `SearchResult<T>`.

- [ ] **Step 1: Update find_file description**

In `FilesystemTools.cs`, replace the `[Description]` on `FindFile`:

```csharp
[Description("Finds files by name or glob within root. Supports ** (e.g. **/*Service.cs); plain name is auto-expanded to **/<name>. Skips: bin, obj, node_modules, dist, .git, .vs, coverage. Returns {results:[{path,relative,sizeBytes}], meta:{truncated,reason,filesScanned,hint}}. When truncated: increase max_results or narrow root. For index-based symbol search use codebase-analyzer:find_in_index.")]
```

- [ ] **Step 2: Update find_by_content description**

Replace the `[Description]` on `FindByContent`:

```csharp
[Description("Finds files containing a regex or literal pattern. Searches text files only (.cs .ts .tsx .js .jsx .json .md .xml .html .css .scss). Skips: bin, obj, node_modules, dist, .git, .vs, coverage. Returns {results:[{file,line,match}], meta:{truncated,reason,filesScanned,hint}}. For stack-wide symbol search use codebase-analyzer:find_in_index.")]
```

- [ ] **Step 3: Update find_implementations description**

Replace the `[Description]` on `FindImplementations`:

```csharp
[Description("Finds classes implementing an interface in .cs and .ts files. Scans C# first, then TypeScript (auto mode). Skips: bin, obj, node_modules, dist, .git, .vs, coverage. Returns {results:[{className,file,line}], meta:{truncated,reason,filesScanned,hint}}. For full type-hierarchy use codebase-analyzer:find_type_hierarchy.")]
```

- [ ] **Step 4: Build and run full test suite**

```
mcp__dev-mcp__test_dotnet_solution(
  path="C:\Develop\Dv.Ai.Development\Mcp-Servers\Dev.Mcp",
  test_project_path="C:\Develop\Dv.Ai.Development\Mcp-Servers\Dev.Mcp\Dev.Mcp.Tests\Dev.Mcp.Tests.csproj"
)
```

Expected: All tests pass (descriptions are not tested at runtime).

- [ ] **Step 5: Publish**

```
mcp__dev-mcp__publish_dotnet_project(
  project_path="C:\Develop\Dv.Ai.Development\Mcp-Servers\Dev.Mcp\Dev.Mcp\Dev.Mcp.csproj",
  configuration="Release",
  runtime="win-x64",
  output_path="C:\Develop\.apps\dev-mcp\",
  self_contained=true
)
```

Expected: `{ success: true, ... }`. After publish: restart Claude Code so the new EXE is loaded (the running process locks the old file).

- [ ] **Step 6: Commit**

```
git add Mcp-Servers/Dev.Mcp/Dev.Mcp/Tools/FilesystemTools.cs
git commit -m "feat(dev-mcp): update find_file/find_by_content/find_implementations descriptions"
```

---

### Task 6: tool-catalog.md — return-shape docs

**Files:**
- Modify: `.claude/skills/dev-mcp/references/tool-catalog.md`

- [ ] **Step 1: Add search-tool return-shape entry**

In `tool-catalog.md`, in the `## Rückgabe-Schemas` section, add the following block after the existing `### Build/Test/Publish` entry:

```markdown
### Suche (find_file, find_by_content, find_implementations)
```json
{
  "results": [{...}],
  "meta": {
    "truncated": false,
    "reason": "none",
    "filesScanned": 47
  }
}
```
- `results`: Array der Treffer — Shape je Tool: `{path,relative,sizeBytes}` / `{file,line,match}` / `{className,file,line}`
- `meta.truncated`: `true` wenn `max_results` erreicht — weitere Ergebnisse können existieren
- `meta.reason`: `"max_results_reached"` | `"none"`
- `meta.filesScanned`: Anzahl tatsächlich geprüfter Dateien. Disambiguiert echtes „nicht gefunden" (`filesScanned > 0, results []`) von „gar nicht gesucht" (`filesScanned = 0`)
- `meta.hint`: bei `truncated: true` — Hinweistext; sonst nicht serialisiert (null wird weggelassen)
```

- [ ] **Step 2: Commit**

```
git add .claude/skills/dev-mcp/references/tool-catalog.md
git commit -m "docs(dev-mcp): add search-tool return-shape to tool-catalog"
```
