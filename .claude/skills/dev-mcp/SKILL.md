---
name: dev-mcp
description: >
  Kanon für MCP dev-mcp: 49 Dev-Tools in einem stdio-Prozess —
  Filesystem (find_file, find_by_content, find_implementations, read_signatures_only, read_method, read_class_summary,
  read_file_raw, list_directory, find_test_pattern, read_lines, read_files_batch, read_component_bundle),
  Filesystem-Intelligence (find_angular_route, find_angular_guard, find_dotnet_endpoint, find_di_registration,
  read_related_files, update_imports),
  Git (git_changed_files, git_diff_summary, git_move),
  Patch/Write (apply_text_patch, replace_in_files, insert_member),
  Move/Rename (rename_file, rename_file_with_impact),
  .NET-Scaffolding (create_dotnet_solution, scaffold_dotnet_project, scaffold_dotnet_test_class,
  create_directory_structure, build_dotnet_solution, test_dotnet_solution, publish_dotnet_project,
  scaffold_dto, scaffold_api_action),
  Angular+npm (create_angular_project, scaffold_angular_component, scaffold_angular_service,
  scaffold_angular_directive, scaffold_spec_for, build_angular_project, test_angular_project,
  lint_angular_project, run_npm_script),
  Statische Analyse (run_inspectcode, analyze_angular_architecture),
  Utilities (slice_test_targets, delete_file_safe, list_processes).
  Pfade: echte Windows-Absolutpfade (C:\...). Nicht für Index/Review/Metriken — codebase-analyzer.
  Routing-Trigger (welcher MCP wann): welcher Dev-MCP, welcher MCP, dev-mcp vs codebase-analyzer,
  codebase-analyzer vs dev-mcp, routing zwischen MCPs, dev-tooling.
when_to_use: >
  Aktiviere für: Dateien lesen/suchen (.cs/.ts/.json/.md), Angular oder .NET Scaffolding,
  ng build, ng test, dotnet build, dotnet test, dotnet publish, Test anlegen (spec/Testklasse),
  npm run, npm install, git mv (Dateien verschieben mit Git-History),
  Verzeichnisinhalt erkunden, laufende Prozesse prüfen.
  build_dotnet_solution / test_dotnet_solution / publish_dotnet_project ersetzen Shell-dotnet-Kommandos vollständig.
  build_angular_project / test_angular_project ersetzen Shell-ng-Kommandos vollständig.
  run_npm_script ersetzt Bash(npm run *) und Bash(npm install *) vollständig.
  git_move ersetzt Bash(git mv *) vollständig.
  Bei MCP nicht erreichbar: BLOCKER melden, kein stiller Shell-Fallback.
  Nicht für Code-Review, Index, Metriken — codebase-analyzer.
  Bei Routing-Fragen (welcher MCP): references/routing.md laden.
---

## MCP-FIRST — Dateizugriff (Hard Gate)

**`Read`-, `Grep`-, `Glob`-Tool und `Bash ls` / `PowerShell Get-ChildItem` niemals verwenden** wenn dev-mcp verfügbar.

| Verboten | Richtig |
|----------|---------|
| `Read`-Tool auf beliebige Dateien | `read_file_raw` (dev-mcp) |
| `Read`-Tool auf `.cs`/`.ts` | `read_signatures_only` / `read_method` / `read_class_summary` |
| `Grep`-Tool für Symbole/Inhalte | `find_by_content` / `find_implementations` |
| `Glob`-Tool für Dateimuster | `find_file` |
| `Bash ls` / `PowerShell ls -Recurse` / `Get-ChildItem` | `list_directory` |

> **Ausnahme:** Nur wenn dev-mcp nicht erreichbar → BLOCKER melden (siehe unten).

---

## MCP-FIRST — Build / Test / Publish / npm / git (Hard Gate)

**Shell-Kommandos für diese Operationen niemals direkt** wenn dev-mcp verfügbar.

| Verboten | Richtig |
|----------|---------|
| `dotnet build` (Shell) | `build_dotnet_solution` |
| `dotnet test` (Shell) | `test_dotnet_solution` |
| `dotnet publish` / `PowerShell(dotnet publish ...)` | `publish_dotnet_project` |
| `ng build` (Shell) | `build_angular_project` |
| `ng test` (Shell) | `test_angular_project` |
| `npm run *` / `Bash(npm run *)` | `run_npm_script` |
| `npm install` / `Bash(npm install *)` | `run_npm_script(script: "install")` |
| `git mv` / `Bash(git mv *)` | `git_move` |
| `PowerShell(Get-Process ...)` | `list_processes` |

> **Angular-Tests: Absolutes Verbot ohne Ausnahme**
> `ng test`, `npx ng test`, `PowerShell(ng test ...)` — vollständig verboten, null Ausnahmen.
> Einziger erlaubter Weg: `mcp__dev-mcp__test_angular_project`.
> MCP nicht erreichbar? → BLOCKER melden. Kein Shell-Fallback für ng test.

---

## Hard Stop — MCP nicht erreichbar

> **`BLOCKER: dev-mcp nicht erreichbar`**
> - Kein stiller Fallback auf Shell / native Tools
> - Nutzer informieren: MCP aktiv? Exe unter `C:\Develop\.apps\dev-mcp\`?
> - Erst nach **expliziter Nutzerfreigabe**: Shell-Fallback

---

## ToolSearch — Standard-Batch (Session-Start)

**Einmaliger Batch-Load** vor dem ersten dev-mcp-Aufruf in der Session — statt 5 sequenzieller Calls:

```
select:mcp__dev-mcp__read_lines,mcp__dev-mcp__read_files_batch,mcp__dev-mcp__test_angular_project,mcp__dev-mcp__test_dotnet_solution,mcp__dev-mcp__find_file
```

| Muster | Ergebnis |
|--------|----------|
| ✅ Einziger `select:`-Batch (ein Call) | Alle 5 Standard-Tools gleichzeitig geladen |
| ❌ 5 separate ToolSearch-Calls über Session verteilt | Akkumulierter Wartezeit-Overhead pro Call |

> Nur diese 5 dokumentierten Standard-Tools laden — kein Preload selten genutzter Tools.
> Stack-Hinweis: Reine Angular-Sessions können `test_dotnet_solution` weglassen; reine .NET-Sessions `test_angular_project` — dieser Vollbatch gilt für Angular+.NET-Projekte.

---

## Pfad-Kanon (Pflicht)

- Alle Pfade als **echte Windows-Absolutpfade**: `C:\Develop\MyProject\`
- **VERBOTEN:** `/project/`, `/workspace/`, relative Pfade, `{parameter}`-Platzhalter
- `Path not allowed` → Pfad liegt außerhalb AllowedDirectories (appsettings.json)
- Keine Docker-Volumes — dev-mcp läuft nativ als stdio-Prozess

---

## Routing: Welches Tool wann?

| Aufgabe | Tool |
|---------|------|
| Beliebige Datei lesen (.json, .md, .html, .scss, …) | `read_file_raw` |
| `.cs`/`.ts` Public API lesen | `read_signatures_only` |
| Einzelne Methode lesen | `read_method` |
| Klassenstruktur lesen | `read_class_summary` |
| Angular-Komponente vollständig lesen | `read_component_bundle` |
| Mehrere Dateien auf einmal lesen | `read_files_batch` |
| Verzeichnis erkunden | `list_directory` |
| Dateien nach Muster suchen | `find_file` |
| Inhalt per Regex suchen | `find_by_content` |
| Interface-Implementierungen finden | `find_implementations` |
| Muster-Spec/Testklasse finden | `find_test_pattern` |
| Angular-Spec anlegen | `scaffold_spec_for` → Workflow: `references/workflows.md` |
| Angular-Komponente/Service erzeugen | `scaffold_angular_component` / `scaffold_angular_service` |
| Angular bauen | `build_angular_project` |
| Angular testen | `test_angular_project` |
| npm-Script ausführen | `run_npm_script(working_directory, script)` |
| .NET-Testklasse anlegen | `scaffold_dotnet_test_class` → Workflow: `references/workflows.md` |
| .NET-Projekt anlegen | `create_dotnet_solution` + `scaffold_dotnet_project` |
| .NET bauen | `build_dotnet_solution` |
| .NET testen | `test_dotnet_solution` |
| .NET veröffentlichen | `publish_dotnet_project` |
| Datei verschieben (mit Git-History) | `git_move` |
| Datei umbenennen (mit Impact-Analyse) | `rename_file_with_impact` |
| Geänderte Dateien ermitteln | `git_changed_files` |
| Datei patchen | `apply_text_patch` |
| Batch-Textersetzung | `replace_in_files` |
| Laufende Prozesse prüfen | `list_processes` |
| .NET statisch analysieren (JetBrains) | `run_inspectcode` |
| Angular linten (ESLint) | `lint_angular_project` |
| Code reviewen / indexieren / Metriken | **codebase-analyzer** (anderer MCP) |

---

## Abgrenzung

- **codebase-analyzer:** Index, Review, Metriken, AST, `detect_untested_public_api` — separater MCP
- **build-log-filter:** Nur für `ng serve`/`npm start` oder Shell-Fallback nach BLOCKER
- Keine Überschneidung: dev-mcp liest/schreibt/baut, codebase-analyzer analysiert

---

## Referenzen (on-demand lesen)

| Bedarf | Datei |
|--------|-------|
| Tool-Parameter unklar, Rückgabe-Schema, Beispiele | `references/tool-catalog.md` |
| Test/Spec anlegen (Schritt-für-Schritt) | `references/workflows.md` |
| Fehler-/Symptom-Diagnose | `references/error-guide.md` |
| Welcher MCP für welche Aufgabe (dev-mcp vs codebase-analyzer) | `references/routing.md` |
