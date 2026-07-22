# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Dieses Repo enthält **eigene Skills / MCP-Server** für Angular/.NET-Entwicklung, aufbauend auf dem Superpowers-Plugin.

---

## Voraussetzung: Superpowers global installieren

```
/plugin install superpowers@claude-plugins-official
```

Superpowers liefert den Prozess-Rahmen (Planung, TDD, Debugging, Review, …).
Die Skills in `.claude/skills/` sind domänenspezifische Ergänzungen dazu.

Das Submodul `.claude/plugins/superpowers/` ist eine **reine Lese-Referenz** — nicht von Claude geladen.
Beim Entwickeln eigener Skills zuerst die relevante Superpowers-Quelldatei lesen:
`.claude/plugins/superpowers/skills/<name>/SKILL.md`

---

## MCP-Konfiguration (.mcp.json)

| Server | Transport | Deploy-Pfad |
|--------|-----------|-------------|
| `dev-mcp` | stdio (.exe) | `C:\Develop\.apps\dev-mcp\Dev.Mcp.exe` |
| `codebase-analyzer` | Node stdio | `C:\Develop\.apps\codebase-analyzer\index.js` |
| `build-log-filter` | Docker HTTP | Port 8089 |

**Pfad-Konvention:** Windows-Absolutpfad `C:\Develop\...` — kein `/workspace/`, keine relativen Pfade.

---

## Build & Deploy

### Dev.Mcp (C# / .NET 9)

```powershell
# Tests
dotnet test Mcp-Servers/Dev.Mcp/Dev.Mcp.slnx

# Einzelnen Test ausführen
dotnet test Mcp-Servers/Dev.Mcp/Dev.Mcp.slnx --filter "FullyQualifiedName~<TestName>"

# Deploy → C:\Develop\.apps\dev-mcp\ (MCP-Prozess muss gestoppt sein)
.\Mcp-Servers\Dev.Mcp\scripts\deploy.ps1
# Alternativer Zielpfad:
.\Mcp-Servers\Dev.Mcp\scripts\deploy.ps1 -Target "D:\custom\path"
```

Das Deploy-Script publiziert self-contained win-x64 (single-file), kopiert `appsettings.json` explizit und bereinigt das Zielverzeichnis vorab.

### Codebase.Analyzer.Mcp (TypeScript / Node)

```powershell
# Abhängigkeiten
cd Mcp-Servers/Codebase.Analyzer.Mcp
npm install

# Bauen
npm run build          # tsc → dist/

# Entwicklung (ohne Build)
npm run dev            # tsx src/index.ts direkt

# Tests (fixture-basiert, kein Test-Runner)
npm run test:untested-api
npm run test:compiler-diagnostics
npm run test:boyscout-actions
# ... weitere test:* Scripts in package.json

# Deploy → C:\Develop\.apps\codebase-analyzer\
.\scripts\deploy.ps1
```

### Build.Log.Filter.Mcp (C# / .NET 9 / Docker)

```powershell
# Tests
dotnet test Mcp-Servers/Build.Log.Filter.Mcp/Build.Log.Filter.Mcp.slnx

# Lokal als stdio-Prozess starten (ohne Docker)
dotnet run --project Mcp-Servers/Build.Log.Filter.Mcp/Build.Log.Filter.Mcp

# Docker lokal bauen
.\Mcp-Servers\Build.Log.Filter.Mcp\scripts\build-local.ps1
# → Image: dv-build-log-filter-mcp:local

# Docker Hub push (interaktiv, fragt nach Repository-Name)
.\Mcp-Servers\Build.Log.Filter.Mcp\scripts\build-and-push.ps1
```

---

## Architektur

### Dev.Mcp

**Zweck:** Datei-I/O, Build/Test-Ausführung (ng/dotnet/npm), Git-Operationen, Scaffolding — ersetzt alle Shell-Kommandos für diese Aufgaben.

**Struktur:**
- `Tools/` — MCP-Tool-Klassen (`FilesystemTools`, `DotnetTools`, `AngularTools`, `ExtendedFilesystemTools`, `GitAndTestTools`, `InspectionTools`, `LintTools`, `AngularArchTools`) — je eine Klasse pro Domäne, als `.WithTools<T>()` in `Program.cs` registriert
- `Services/` — Implementierung (z. B. `ProcessRunner`, `PatchService`, `GlobSearchService`) — via DI als Singletons injiziert
- `appsettings.json` — `AllowedDirectories` steuert, auf welche Pfade der Server zugreifen darf; wird beim Deploy explizit mitkopiert (nicht Teil des SDK-Default-Globs)

**Transport:** stdio — Claude Code startet den Prozess als Child-Prozess. Logs auf stderr, Crash-Log neben der Exe (`crash.log`).

**Tests:** xunit, kein Mocking-Framework. Tests in `Dev.Mcp.Tests/` — internes API über `InternalsVisibleTo` erreichbar.

### Codebase.Analyzer.Mcp

**Zweck:** AST-Analyse, Index, Code-Review, Coverage, Komplexität, Refactoring-Safety — liest, baut nicht.

**Struktur:**
- `src/index.ts` — MCP-Server-Einstiegspunkt, registriert alle Tools direkt als `server.tool(...)` Aufrufe
- `src/analyzers/` — Low-Level-Analyzer: `ts-morph-analyzer.ts` (TypeScript AST via ts-morph), `roslyn-runner.ts` (C# via .csx-Skripte in `roslyn-analyzer/`)
- `src/indexers/` — Projekt-Indexierung: `angular-indexer-runner.ts`, `dotnet-indexer-runner.ts` mit In-Memory-Cache + Disk-Persistence (`%LOCALAPPDATA%\codebase-analyzer\index-registry.json`)
- `src/features/` — Ein Feature pro Datei (z. B. `boyscout-runner.ts`, `slice-impact.ts`, `angular-component-coverage.ts`). Composite-Tools (`scout_symbol`, `scout_scope`, `analyze_slice_impact`) sind in `new-tools.ts` und `slice-impact.ts` gebündelt
- `src/logviewer.ts` — HTTP-Server zum Inspektieren der Tool-Call-History (Port aus Env `LOG_VIEWER_PORT`)

**Tests:** Fixture-basiert — `test-fixtures/<feature>/run-assertions.mjs` baut das Projekt und führt Assertions gegen echte Analyzer-Ausgaben aus. Kein klassischer Unit-Test-Runner.

**Roslyn-Analyzer:** Die C#-Analyse läuft über `roslyn-analyzer/*.csx`-Skripte, die via `execSync` aufgerufen werden. Pfade sind Windows-Absolutpfade.

### Build.Log.Filter.Mcp

**Zweck:** Rohe Build-/Test-Ausgaben filtern auf Fehler, Warnungen, Zusammenfassungen, Stacktraces — reduziert Token-Verbrauch bei langen Build-Logs.

**Struktur:**
- `Filtering/` — `IToolOutputParser`-Implementierungen pro Tool-Typ (`DotnetBuildParser`, `AngularTestParser`, `JestParser` etc.) — Chain of Responsibility, `OutputFilterService` wählt den passenden Parser
- `Streaming/` — `StreamFilterSessionManager` für chunk-weises Streamen (session-gebunden, TTL 30 min)
- `Tools/` — MCP-Tool-Klassen (`OutputFilterTools`)
- `Web/` — Interner HTTP-Buffer-Viewer

**Transport:** stdio (lokal) oder Docker (HTTP Port 8089 für Remote-Einsatz). Der Docker-Container braucht `stdin_open: true`.

---

## Skill-Entwicklung

Skills liegen unter `.claude/skills/<name>/SKILL.md`. Das YAML-Frontmatter steuert das Superpowers-SDO-Triggering:

```yaml
---
name: mein-skill
description: >
  Use when ... (SDO-Format: "Use when <trigger-description>")
---
```

Referenzdateien kommen unter `.claude/skills/<name>/references/` und werden on-demand geladen — nicht im Frontmatter referenziert, sondern mit `[Name](references/datei.md)` im SKILL.md verlinkt.

**Neue Skills:** Immer zuerst die entsprechende Superpowers-Vorlage lesen:
`.claude/plugins/superpowers/skills/<ähnlicher-skill>/SKILL.md`

---

## MCP-First (immer aktiv)

| Aufgabe | Erster Griff |
|---------|-------------|
| Symbol / Datei suchen | `dev-mcp`: `find_file`, `find_by_content` |
| Klasse / Methode lesen | `dev-mcp`: `read_class_summary`, `read_signatures_only`, `read_method` |
| Index / Abhängigkeiten | `codebase-analyzer`: `find_in_index`, `index_project` |
| Angular-Tests ausführen | `dev-mcp`: `test_angular_project` — niemals via Shell/PowerShell |
| .NET-Tests ausführen | `dev-mcp`: `test_dotnet_solution` — immer `test_project_path` angeben |
| Native Read / Grep | nur als dokumentierter Fallback nach MCP-Versuch |

---

## Verhaltensregeln

**Git-Status vor Statusaussagen:** `git status` und `git branch` prüfen bevor über Dateiänderungen gesprochen wird. Bei Branch-Divergenz korrekt kommunizieren.

**Konventionsentscheidungen:** Wenn mehr als eine valide Option existiert und die Wahl User-sichtbar ist — Entscheidung in einem Halbsatz nennen, inkl. Alternativ-Hinweis. Nicht fragen, nicht schweigen.

---

## Repo-Struktur

```
.claude/
├── skills/           Eigene domänenspezifische Skills
│   ├── angular/      Angular (developer + material + new-app) — SKILL.md = ToC
│   ├── dotnet/       .NET (EF Migrations) — SKILL.md = ToC
│   └── ...           Weitere Skills (commit-message, codebase-analyzer, dev-mcp, …)
├── references/       Geteilte Referenzen
└── plugins/
    ├── superpowers/  Git-Submodul obra/superpowers (Lese-Referenz)
    └── caveman/      Git-Submodul JuliusBrussee/caveman (Lese-Referenz)

Mcp-Servers/
├── Dev.Mcp/                    C# stdio-MCP, Datei/Build/Test/Git
├── Codebase.Analyzer.Mcp/      TypeScript/Node stdio-MCP, AST/Index/Review
└── Build.Log.Filter.Mcp/       C# stdio/Docker-MCP, Build-Log-Filterung

docs/
└── ToDo.md           Offene Punkte (Superpowers Bootstrap-Verifikation)
```
