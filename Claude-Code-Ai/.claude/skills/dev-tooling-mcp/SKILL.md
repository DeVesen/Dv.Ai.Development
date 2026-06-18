---
name: dev-tooling-mcp
description: >
  Router für dev-mcp (unified stdio exe) und codebase-analyzer.
  Trigger: welcher Dev-MCP, Datei lesen vs. scaffold, build, test,
  ng build, ng test, dotnet build, dotnet test, Datei/Klasse/Methode verstehen,
  read_signatures_only, scaffold_angular, scaffold_dotnet, *.cs/*.ts Signaturen.
  Nicht für codebase-analyzer oder build-log-filter.
when_to_use: >
  Aktiviere wenn unklar ist welcher Dev-MCP zu verwenden ist.
  Routet zu dev-mcp (Lesen/Suchen, Angular-Scaffolding, .NET-Scaffolding, Build, Test)
  oder codebase-analyzer (Index, Review, Metriken).
  Nicht für Log-Filterung (build-log-filter).
---

## MCP-FIRST — Build/Test (Hard Gate)

**`ng build` / `ng test` / `dotnet build` / `dotnet test` niemals als Shell-Kommando** wenn dev-mcp verfügbar.

| Verboten | Richtig |
|----------|---------|
| Shell: `ng build` | `build_angular_project` via dev-mcp |
| Shell: `ng test` | `test_angular_project` via dev-mcp |
| Shell: `dotnet build` | `build_dotnet_solution` via dev-mcp |
| Shell: `dotnet test` | `test_dotnet_solution` via dev-mcp |
| `build-log-filter` für Angular/dotnet Build/Test wenn MCP verfügbar | MCP-Ergebnis direkt auswerten (`errors[]`, `warnings[]`, `summary`) |
| Stille Ausweitung auf Shell ohne Nutzer-Freigabe | BLOCKER-Meldung + warten |

**Hard Stop — MCP nicht erreichbar:**

> **`BLOCKER: dev-mcp nicht erreichbar`**
> - Kein stiller Fallback auf Shell + build-log-filter
> - Nutzer informieren (Exe gestartet? `C:\Develop\.apps\dev-mcp\`? claude.json Eintrag?)
> - Erst nach **expliziter Nutzerfreigabe**: Shell-Fallback + build-log-filter

---

## Pfad-Kanon (Pflicht)

| MCP | Pfad-Format |
|-----|-------------|
| dev-mcp | Windows-Absolutpfad: `C:\Develop\MyProject\...` |
| codebase-analyzer | `/workspace/...` (Docker, read-only) |

**VERBOTEN für dev-mcp:** `/project/`, `/workspace/`, relative Pfade ohne Laufwerk, `{parameter}`-Platzhalter.

---

## Routing: Welcher MCP wann?

| Aufgabe | MCP | Skill laden |
|---------|-----|-------------|
| Datei/Klasse/Methode **lesen** (token-sparend) | dev-mcp | dev-mcp |
| Interface-Implementierungen **finden** | dev-mcp | dev-mcp |
| Angular-Komponente/Service **erzeugen** | dev-mcp | dev-mcp |
| Angular **bauen** (`ng build`) | dev-mcp → `build_angular_project` | dev-mcp |
| Angular **testen** (`ng test`) | dev-mcp → `test_angular_project` | dev-mcp |
| .NET-Projekt / Ordnerstruktur **anlegen** | dev-mcp | dev-mcp |
| .NET **bauen** (`dotnet build`) | dev-mcp → `build_dotnet_solution` | dev-mcp |
| .NET **testen** (`dotnet test`) | dev-mcp → `test_dotnet_solution` | dev-mcp |
| Code **reviewen**, **indexieren**, Komplexität | codebase-analyzer | codebase-analyzer |

---

## dev-mcp — Tools Kurzübersicht

**Server:** stdio, `C:\Develop\.apps\dev-mcp\Dev.WindowsService.Mcp.exe`
**Log-Viewer:** `http://localhost:5050/`

**Filesystem:** `find_file`, `find_by_content`, `find_implementations`, `read_signatures_only`, `read_method`, `read_class_summary`

**Angular:** `create_angular_project`, `scaffold_angular_component`, `scaffold_angular_service`, `scaffold_angular_directive`, `build_angular_project`, `test_angular_project`

**.NET:** `create_dotnet_solution`, `scaffold_dotnet_project`, `rename_file`, `create_directory_structure`, `build_dotnet_solution`, `test_dotnet_solution`

---

## Scope-Trennung: build-log-filter vs. dev-mcp

| Kommando | Tool | Grund |
|----------|------|-------|
| `ng build`, `ng test` | dev-mcp (MCP-First) | MCP filtert intern — kein build-log-filter |
| `dotnet build`, `dotnet test` | dev-mcp (MCP-First) | MCP filtert intern — kein build-log-filter |
| `ng serve`, `npm start` | build-log-filter (Shell) | Kein MCP für Dev-Server |
| Shell-Fallback nach BLOCKER | build-log-filter | Nur nach expliziter Nutzerfreigabe |

---

## Opt-out

`kein dev-tooling`, `no-dev-tooling`, `skip-dev-tooling` → Router nicht laden.
