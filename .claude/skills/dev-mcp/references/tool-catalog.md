# dev-mcp Tool-Katalog

Vollständige Parameter aller 49 Tools. Lesen wenn Tool-Aufruf unklar oder Parameter-Namen gefragt.

---

## Filesystem Read (11 Tools)

| Tool | Pflicht-Parameter | Optional |
|------|------------------|---------|
| `find_file` | `root`, `pattern` (Glob) | `max_results` (default 20) |
| `find_by_content` | `root`, `pattern` (Regex) | `file_glob`, `max_results`, `format` (full/compact/paths_only), `group_by_file` |
| `find_implementations` | `root`, `interface_name` | `max_results` |
| `read_signatures_only` | `file_path` | — |
| `read_method` | `file_path`, `method_name` | `class_name` |
| `read_class_summary` | `file_path` | `class_name` |
| `read_file_raw` | `file_path` | `line_start`, `line_end` (max 2000 Zeilen) |
| `read_lines` | `file_path`, `start_line`, `end_line` | `context_lines` (max 500 Zeilen) |
| `read_files_batch` | `file_paths` (JSON-Array), `mode` (signatures/class_summary/method) | — |
| `list_directory` | `path` | `depth` (1–5, default 1) |
| `find_test_pattern` | `root`, `kind` (angular-spec/dotnet-test) | `reference_file_path`, `max_results` (max 3) |

## Filesystem Intelligence (7 Tools)

| Tool | Pflicht-Parameter | Optional |
|------|------------------|---------|
| `read_component_bundle` | `file_path` | `template_mode` (summary/full), `include_styles`, `include_spec` |
| `read_related_files` | `file_path`, `relation` (test/template/styles/module/all) | — |
| `find_angular_route` | `root`, `route_path` | `max_results` |
| `find_angular_guard` | `root`, `guard_name` | `max_results` |
| `find_dotnet_endpoint` | `root`, `route_template` | `max_results` |
| `find_di_registration` | `root`, `service_name` | — |
| `update_imports` | `file_path`, `old_import`, `new_import` | — |

## Git (3 Tools)

| Tool | Pflicht-Parameter | Optional |
|------|------------------|---------|
| `git_changed_files` | `repo_root`, `base` (staged/unstaged/all/branch:\<name>/commit:\<sha>) | — |
| `git_diff_summary` | `file_paths` (JSON-Array), `repo_root` | — |
| `git_move` | `source`, `destination` | `repo_root` (auto-detect aus source-Verzeichnis) |

## Patch/Write (3 Tools)

| Tool | Pflicht-Parameter | Optional |
|------|------------------|---------|
| `apply_text_patch` | `file_path`, `old_text`, `new_text` | `dry_run`, `run_compiler_gate`, `rollback_on_error` |
| `replace_in_files` | `root`, `pattern`, `replacement` | `file_glob`, `dry_run`, `confirm` |
| `insert_member` | `file_path`, `member_code` | `position` (end_of_class/after_member), `after_member_name` |

## Move/Rename (2 Tools)

| Tool | Pflicht-Parameter | Optional |
|------|------------------|---------|
| `rename_file` | `old_path`, `new_path` | — |
| `rename_file_with_impact` | `old_path`, `new_path` | `execute` (false=Preview, true=Umbenennen) |

## .NET (9 Tools)

| Tool | Pflicht-Parameter | Optional |
|------|------------------|---------|
| `create_dotnet_solution` | `name`, `output_path` | — |
| `scaffold_dotnet_project` | `template`, `name`, `output_path` | `solution_path`, `options` |
| `scaffold_dotnet_test_class` | `test_project_path`, `class_name` | `namespace`, `relative_folder`, `test_framework` |
| `create_directory_structure` | `base_path`, `paths_json` (JSON-Array) | — |
| `build_dotnet_solution` | `path` (.sln/.csproj/Verzeichnis) | `configuration` |
| `test_dotnet_solution` | `path` | `options`, `filter`, `test_project_path` |
| `publish_dotnet_project` | `project_path` | `configuration` (default: Release), `runtime`, `output_path`, `self_contained` |
| `scaffold_dto` | `output_path`, `class_name`, `namespace`, `properties` (JSON) | `class_type` (record/class) |
| `scaffold_api_action` | `controller_file_path`, `http_method`, `route_template`, `action_name` | `request_dto`, `response_dto` |

`properties` Format für `scaffold_dto`: `[{"name":"Id","type":"int","required":true}]`

## Angular + npm (9 Tools)

| Tool | Pflicht-Parameter | Optional |
|------|------------------|---------|
| `create_angular_project` | `parent_directory`, `name` | `options` |
| `scaffold_angular_component` | `project_root`, `name` | `path`, `options`, `include_tests` |
| `scaffold_angular_service` | `project_root`, `name` | `path`, `options`, `include_tests` |
| `scaffold_angular_directive` | `project_root`, `name` | `path`, `options`, `include_tests` |
| `scaffold_spec_for` | `project_root`, `source_file_path` | `force` |
| `build_angular_project` | `project_root` | `configuration` |
| `test_angular_project` | `project_root` | `options`, `include_patterns` (JSON-Array), `test_name_pattern` |
| `lint_angular_project` | `project_root` | — |
| `run_npm_script` | `working_directory`, `script` | `args` |

`script` für `run_npm_script`: z.B. `"build"`, `"test"`, `"start"`, `"install"` — `"install"` → `npm install`

## Statische Analyse (2 Tools)

| Tool | Pflicht-Parameter | Optional |
|------|------------------|---------|
| `run_inspectcode` | `solution_path` (.sln/.slnx) | — |
| `analyze_angular_architecture` | `project_root` | — |

## Utilities (3 Tools)

| Tool | Pflicht-Parameter | Optional |
|------|------------------|---------|
| `slice_test_targets` | `changed_file_paths` (JSON-Array) | `stack` (angular/dotnet/auto) |
| `delete_file_safe` | `file_path` | `dry_run`, `force` |
| `list_processes` | — | `name_filter` (Regex, z.B. `"Dev\|Mcp\|node"`) |

---

## Rückgabe-Schemas

### Build/Test/Publish
```
{ success, command, errors[], warnings[], exitCode, summary }
```
- `errors[]` = Fehler mit Datei/Zeile/Meldung
- `success: true` bei exitCode 0

### Scaffolding (scaffold_spec_for, scaffold_dotnet_test_class, scaffold_angular_*)
```
{ success, createdFiles[], exitCode, error }
```
- `error` ist **String** (nullable) — kein Array!

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

```json
{
  "project_path": "C:\\Develop\\Dv.Ai.Development\\Mcp-Servers\\Dev.Mcp\\Dev.Mcp\\Dev.Mcp.csproj",
  "configuration": "Release",
  "runtime": "win-x64",
  "output_path": "C:\\Develop\\.apps\\dev-mcp\\",
  "self_contained": true
}
```
→ `publish_dotnet_project` — danach Claude Code neu starten (EXE ist im laufenden Betrieb gesperrt).

---

## Token-sparende Patterns

| Situation | Statt | Besser |
|-----------|-------|--------|
| 10 Dateien Signaturen | 10× `read_signatures_only` | `read_files_batch(paths, "signatures")` |
| Angular-Komponente verstehen | 3–4× Read | `read_component_bundle(componentPath)` |
| Geänderte Dateien ermitteln | `git status` (Shell) | `git_changed_files(repo, "unstaged")` |
| Test-Targets ableiten | manuell | `slice_test_targets(changedFiles, "auto")` |
