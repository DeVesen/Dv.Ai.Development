# dev-mcp — Search Response Envelope Design

**Date:** 2026-07-10  
**Scope:** `find_file`, `find_by_content`, `find_implementations`  
**Status:** Approved

---

## Problem

The three search tools return a bare JSON array `[]`. When results are empty or capped,
the agent cannot distinguish:

- "Nothing found" (genuine absence)
- "Nothing found within the scanned files" (search was complete but empty)
- "Stopped early at max_results" (truncated — more results may exist)

A silent `[]` or a silently trimmed list is indistinguishable from a complete result.
This causes agents to act on wrong assumptions without any signal that the search was
incomplete.

---

## Decision: Breaking Change — Response Envelope

Response shape changes from:

```json
[{...}, {...}]
```

to:

```json
{
  "results": [{...}, {...}],
  "meta": {
    "truncated": false,
    "reason": "none",
    "filesScanned": 47
  }
}
```

When truncated:

```json
{
  "results": [{...}, ...20 items...],
  "meta": {
    "truncated": true,
    "reason": "max_results_reached",
    "filesScanned": 312,
    "hint": "Results capped at 20. Increase max_results or narrow root."
  }
}
```

**Rationale:**  
Option B (two formats) forces agents to handle both → more complexity.  
Option C (descriptions only) leaves `[]` ambiguous regardless of docs.  
Option A (breaking change) makes every response self-describing.  
Migration cost is minimal: callers change `response` → `response.results`.

### `meta` fields

| Field | Type | Always present | Purpose |
|---|---|---|---|
| `truncated` | bool | yes | Was the search stopped early? |
| `reason` | string | yes | `"max_results_reached"` or `"none"` |
| `filesScanned` | int | yes | Files actually evaluated (post-filter). Disambiguates true "not found" from "checked 0 files". |
| `hint` | string? | only when truncated | Actionable suggestion for the caller |

**Why `files_scanned` is essential:**  
`truncated: false` + `results: []` + `filesScanned: 0` → search did not run (bug or empty root).  
`truncated: false` + `results: []` + `filesScanned: 47` → searched 47 files, genuinely not found.  
These are qualitatively different outcomes. Without the counter both look identical.

`search_root` and `pattern` are NOT echoed — the caller already has these values.

---

## Scope

Affected tools: `find_file`, `find_by_content`, `find_implementations`.

Out of scope: `read_signatures_only`, `read_files_batch` — truncation in read tools is a
different failure mode (file too large, method not found) that warrants a separate design.

No capabilities endpoint — `meta` already gives the agent the runtime signal it needs.
An extra `get_capabilities` call before every search would increase token cost without
additional benefit.

---

## Architecture

### New types — `Models/SearchResult.cs`

Two new records added alongside existing records (no existing records changed):

```csharp
public record SearchMeta(
    bool Truncated,
    string Reason,
    int FilesScanned,
    string? Hint);

public record SearchResult<T>(
    IReadOnlyList<T> Results,
    SearchMeta Meta);
```

`Hint` is nullable. `JsonOptions.Default` uses `WhenWritingNull` — `hint` is omitted from
JSON when not truncated. No serialization configuration changes needed.

### Shared helper — `BuildMeta`

Static factory method placed on `SearchMeta` itself — record owns its own construction logic,
no separate factory class needed, avoids duplication across three services:

```csharp
public record SearchMeta(bool Truncated, string Reason, int FilesScanned, string? Hint)
{
    public static SearchMeta Build(bool truncated, int filesScanned, int maxResults) =>
        new(truncated,
            truncated ? "max_results_reached" : "none",
            filesScanned,
            truncated ? $"Results capped at {maxResults}. Increase max_results or narrow root." : null);
}
```

### `GlobSearchService.cs`

Return type: `IReadOnlyList<FileMatchResult>` → `SearchResult<FileMatchResult>`.

`filesScanned` counts every file that passes `PathValidator.IsUnderRoot` (i.e., files
actually checked against the glob pattern). Counter increments before the pattern match.
`truncated = true` is set at the `break` that exits the loop when `maxResults` is reached.

```csharp
public SearchResult<FileMatchResult> FindFile(string root, string pattern, int maxResults)
{
    // ... setup ...
    var filesScanned = 0;
    var truncated = false;

    foreach (var file in GlobMatcher.EnumerateFiles(root))
    {
        if (!PathValidator.IsUnderRoot(file, root)) continue;
        filesScanned++;

        // ... relative path, pattern match ...
        results.Add(...);
        if (results.Count >= maxResults) { truncated = true; break; }
    }

    return new SearchResult<FileMatchResult>(results, SearchMeta.Build(truncated, filesScanned, maxResults));
}
```

### `ContentSearchService.cs`

Return type: `IReadOnlyList<ContentMatchResult>` → `SearchResult<ContentMatchResult>`.

`filesScanned` counts files actually opened and read (after extension filter and file-glob
filter). Two-loop break uses a flag (`if (truncated) break` on the outer loop after the
inner loop sets it).

### `ImplementationSearchService.cs`

Return type: `IReadOnlyList<ImplementationMatchResult>` → `SearchResult<ImplementationMatchResult>`.

The two private static scanner methods (`ScanCSharp`, `ScanTypeScript`) receive `ref int filesScanned`
and `ref bool truncated`. The public method skips the second phase entirely if the first
phase already set `truncated = true`.

```csharp
if (!truncated && results.Count < maxResults && lang is "auto" or "typescript" ...)
    ScanTypeScript(..., ref filesScanned, ref truncated);
```

`filesScanned` in each scanner counts files that pass the extension filter and
`IsUnderRoot` check — i.e., files actually parsed or read.

### `Tools/FilesystemTools.cs`

No envelope logic in the tool layer. `JsonOptions.Serialize(searchResult)` on a
`SearchResult<T>` produces `{ results, meta }` directly via CamelCase policy.

Tool descriptions updated per three-point schema (happy path → limits → alternative):

**`find_file`:**
> Finds files by name or glob within root. Supports ** (e.g. `**/*Service.cs`); plain
> name is auto-expanded to `**/<name>`. Skips: bin, obj, node_modules, dist, .git, .vs,
> coverage. Returns `{results:[{path,relative,sizeBytes}], meta:{truncated,reason,filesScanned,hint}}`.
> When truncated: increase max_results or narrow root. For index-based symbol search use
> codebase-analyzer:find_in_index.

**`find_by_content`:**
> Finds files containing a regex or literal pattern. Searches text files only
> (.cs .ts .tsx .js .jsx .json .md .xml .html .css .scss). Skips: bin, obj, node_modules,
> dist, .git, .vs, coverage. Returns `{results:[{file,line,match}], meta:{truncated,reason,filesScanned,hint}}`.
> For stack-wide symbol search use codebase-analyzer:find_in_index.

**`find_implementations`:**
> Finds classes implementing an interface in .cs and .ts files. Scans C# first, then
> TypeScript (auto mode). Skips: bin, obj, node_modules, dist, .git, .vs, coverage.
> Returns `{results:[{className,file,line}], meta:{truncated,reason,filesScanned,hint}}`.
> For full type-hierarchy use codebase-analyzer:find_type_hierarchy.

---

## Files Changed

| File | Change |
|---|---|
| `Mcp-Servers/Dev.Mcp/Dev.Mcp/Models/SearchResult.cs` | Add `SearchMeta` (with `Build` factory) + `SearchResult<T>` |
| `Mcp-Servers/Dev.Mcp/Dev.Mcp/Services/GlobSearchService.cs` | Return type + `filesScanned` counter + `truncated` flag |
| `Mcp-Servers/Dev.Mcp/Dev.Mcp/Services/ContentSearchService.cs` | Return type + counter + two-loop break-flag |
| `Mcp-Servers/Dev.Mcp/Dev.Mcp/Services/ImplementationSearchService.cs` | Return type + `ref` parameters on private scanners |
| `Mcp-Servers/Dev.Mcp/Dev.Mcp/Tools/FilesystemTools.cs` | Updated descriptions (no logic change) |
| `.claude/skills/dev-mcp/references/tool-catalog.md` | Return-shape updated for the three tools |

---

## Non-Goals

- `read_signatures_only`, `read_files_batch` envelope changes
- `get_capabilities` tool
- Depth-limit fix (no depth limit exists — `GlobMatcher.EnumerateFiles` is fully recursive)
- `search_root` / `pattern` echo in `meta`

---

## Migration Note

Callers that today do `response[0].path` must change to `response.results[0].path`.
`response.meta.truncated` is available immediately after the change with no additional
calls. The `results` key name is stable — it will not be renamed.
