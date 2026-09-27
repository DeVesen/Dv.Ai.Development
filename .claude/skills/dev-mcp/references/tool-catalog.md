# dev-mcp Tool-Katalog

Parameter der Tools, die der dev-mcp weiter anbietet. Lesen wenn Tool-Aufruf unklar oder Parameter-Namen gefragt.

Parameter der umgezogenen Lese- und Einfüge-Tools (`read_signatures_only`, `read_method`, `read_class_summary`, `read_component_bundle`, `insert_member`, `update_imports`): siehe codebase-analyzer. Build, Test und Lint: `dv-forge: <plattform>-<kommando>`. Scaffolding, EF, `npm`, `dotnet publish`: Shell.

---

## Filesystem Read

| Tool | Pflicht-Parameter | Optional |
|------|------------------|---------|
| `find_file` | `root`, `pattern` (Glob) | `max_results` (default 20) |
| `find_by_content` | `root`, `pattern` (Regex) | `file_glob`, `max_results`, `format` (full/compact/paths_only), `group_by_file` |
| `read_lines` | `file_path`, `start_line`, `end_line` | `context_lines` (max 500 Zeilen) |
| `read_files_batch` | `file_paths` (JSON-Array), `mode` (signatures/class_summary/method) | — |

## Git

| Tool | Pflicht-Parameter | Optional |
|------|------------------|---------|
| `git_changed_files` | `repo_root`, `base` (staged/unstaged/all/branch:\<name>/commit:\<sha>) | — |
| `git_diff_summary` | `file_paths` (JSON-Array), `repo_root` | — |
| `git_move` | `source`, `destination` | `repo_root` (auto-detect aus source-Verzeichnis) |

## Patch/Write

| Tool | Pflicht-Parameter | Optional |
|------|------------------|---------|
| `apply_text_patch` | `file_path`, `old_text`, `new_text` | `dry_run`, `run_compiler_gate`, `rollback_on_error` |
| `replace_in_files` | `root`, `pattern`, `replacement` | `file_glob`, `dry_run`, `confirm` |
| `rename_file` | `old_path`, `new_path` | — |
| `create_directory_structure` | `base_path`, `paths_json` (JSON-Array) | — |
| `delete_file_safe` | `file_path` | `dry_run`, `force` |

## Utilities

| Tool | Pflicht-Parameter | Optional |
|------|------------------|---------|
| `slice_test_targets` | `changed_file_paths` (JSON-Array) | `stack` (angular/dotnet/auto) |
| `list_processes` | — | `name_filter` (Regex, z.B. `"Dev\|Mcp\|node"`) |

---

## Rückgabe-Schemas

### Suche (find_file, find_by_content)
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
- `results`: Array der Treffer — Shape je Tool: `{path,relative,sizeBytes}` / `{file,line,match}`
- `meta.truncated`: `true` wenn `max_results` erreicht — weitere Ergebnisse können existieren
- `meta.reason`: `"max_results_reached"` | `"none"`
- `meta.filesScanned`: Anzahl tatsächlich geprüfter Dateien. Disambiguiert echtes „nicht gefunden" (`filesScanned > 0, results []`) von „gar nicht gesucht" (`filesScanned = 0`)
- `meta.hint`: bei `truncated: true` — Hinweistext; sonst nicht serialisiert (null wird weggelassen)

### git_move
```
{ success, oldPath, newPath, error }
```

### list_processes
```
{ processes: [{ id, name, path }] }
```

---

## Deployment dev-mcp

```
dotnet publish C:\Develop\Dv.Ai.Development\Mcp-Servers\Dev.Mcp\Dev.Mcp\Dev.Mcp.csproj -c Release -r win-x64 --self-contained true -o C:\Develop\.apps\dev-mcp\
```
Danach Claude Code neu starten (EXE ist im laufenden Betrieb gesperrt).

---

## Token-sparende Patterns

| Situation | Statt | Besser |
|-----------|-------|--------|
| 10 Dateien Signaturen | 10× Read | `read_files_batch(paths, "signatures")` |
| Geänderte Dateien ermitteln | `git status` (Shell) | `git_changed_files(repo, "unstaged")` |
| Test-Targets ableiten | manuell | `slice_test_targets(changedFiles, "auto")` |
