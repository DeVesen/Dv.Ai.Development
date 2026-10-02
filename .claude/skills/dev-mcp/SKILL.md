---
name: dev-mcp
description: >
  Use when searching or reading files (.cs/.ts/.json/.md) by pattern, content or line range,
  patching or batch-replacing text, moving or renaming files with git history, checking changed
  files or running processes via the dev-mcp server. Not for build/test/lint (→ dv-dotnet-*/dv-angular-* commands),
  scaffolding (→ ng generate / dotnet new), code reading by symbol (→ codebase-analyzer).
---

# dev-mcp

Der dev-mcp ist nur noch für Dateizugriff, Textänderungen, Git und Prozesse zuständig. Ob diese Tools bleiben, entscheidet die Retro-Messung (siehe `docs/offene-aufgaben.md`, Gruppe 1).

## Was wohin gehört

| Aufgabe | Weg |
|---|---|
| Build, Test, Lint | `dv-angular-build|test|lint`, `dv-dotnet-build|test|lint` im Bash-Tool — nie direkt `ng`/`dotnet` |
| Komponente, Service, Projekt anlegen | `ng generate`, `dotnet new` über die Shell |
| EF-Migrationen | `dotnet ef` über die Shell, siehe dotnet-Skill |
| `npm run`, `npm install`, `dotnet publish` | Shell |
| Signaturen, Methode, Klasse, Komponente lesen | codebase-analyzer: `read_signatures_only`, `read_method`, `read_class_summary`, `read_component_bundle` |
| Member einfügen, Imports umschreiben | codebase-analyzer: `insert_member`, `update_imports` |
| Implementierungen finden | codebase-analyzer: `find_type_hierarchy` |

## dev-mcp-Tools

| Aufgabe | Tool |
|---|---|
| Dateien nach Muster suchen | `find_file` |
| Inhalt per Regex suchen | `find_by_content` |
| Zeilenbereich lesen | `read_lines` |
| Mehrere Dateien auf einmal lesen | `read_files_batch` |
| Datei patchen | `apply_text_patch` |
| Batch-Textersetzung | `replace_in_files` |
| Datei löschen mit Referenzprüfung | `delete_file_safe` |
| Datei umbenennen | `rename_file` |
| Datei verschieben mit Git-History | `git_move` |
| Ordnerstruktur anlegen | `create_directory_structure` |
| Geänderte Dateien, kompakter Diff | `git_changed_files`, `git_diff_summary` |
| Laufende Prozesse | `list_processes` |

ToolSearch einmal pro Session als Batch: `select:mcp__dev-mcp__find_file,mcp__dev-mcp__find_by_content,mcp__dev-mcp__read_lines,mcp__dev-mcp__read_files_batch`

## Pfade

Echte Windows-Absolutpfade (`C:\Develop\MyProject\`), keine `/workspace/`- oder relativen Pfade. `Path not allowed` heißt: außerhalb der AllowedDirectories in `appsettings.json`.

## Init — `.mcp.json` einrichten

Trigger `dev-mcp init`: nach dem Pfad der `Dev.Mcp.exe` fragen, in der `.mcp.json` im Projekt-Root den Eintrag setzen, dann Claude Code neu starten lassen.

```json
"dev-mcp": { "command": "<Pfad zur Dev.Mcp.exe>", "env": { "LOG_VIEWER_PORT": "51011" } }
```

## Referenzen

| Bedarf | Datei |
|---|---|
| Parameter, Rückgabe-Schema | `references/tool-catalog.md` |
| Spec oder Testklasse anlegen | `references/workflows.md` |
| Fehler-Diagnose | `references/error-guide.md` |
| dev-mcp oder codebase-analyzer? | `references/routing.md` |
