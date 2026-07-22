---
name: dev-mcp
description: >
  Use when reading/searching files (.cs/.ts/.json/.md), Angular or .NET scaffolding,
  ng build/test, dotnet build/test/publish, npm run/install, git mv, creating specs/test classes,
  exploring directories, or checking running processes.
  Replaces all Shell dotnet/ng/npm/git-mv commands. BLOCKER if unreachable — no silent fallback.
  Not for index/review/metrics (→ codebase-analyzer). Routing questions: references/routing.md.
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
- Keine Überschneidung: dev-mcp liest/schreibt/baut, codebase-analyzer analysiert

---

## Referenzen (on-demand lesen)

| Bedarf | Datei |
|--------|-------|
| Tool-Parameter unklar, Rückgabe-Schema, Beispiele | `references/tool-catalog.md` |
| Test/Spec anlegen (Schritt-für-Schritt) | `references/workflows.md` |
| Fehler-/Symptom-Diagnose | `references/error-guide.md` |
| Welcher MCP für welche Aufgabe (dev-mcp vs codebase-analyzer) | `references/routing.md` |
