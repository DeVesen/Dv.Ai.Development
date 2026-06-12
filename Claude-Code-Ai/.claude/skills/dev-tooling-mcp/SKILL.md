---
name: dev-tooling-mcp
description: >
  Router für die drei Dev-Tooling-MCPs (filesystem, angular, dotnet). Trigger: welcher
  Dev-MCP, Datei lesen vs. scaffold, build, test, dev-tooling, ng build, ng test,
  dotnet build, dotnet test, Datei/Klasse/Methode verstehen, read_signatures_only,
  scaffold_angular, scaffold_dotnet, *.cs/*.ts Signaturen. Nicht für codebase-analyzer
  oder build-log-filter.
when_to_use: >
  Aktiviere wenn unklar ist welcher Dev-MCP zu verwenden ist, oder bei *.cs/*.ts Dateien
  mit Signaturen/Methoden-Bedarf vor vollem Read. Routet zu dev-filesystem-mcp (lesen),
  dev-angular-mcp (Scaffolding, Build, Test Angular), dev-dotnet-mcp (Scaffolding, Build,
  Test .NET). Nicht für Index/Review (codebase-analyzer) oder Log-Filterung (build-log-filter).
---

## MCP-FIRST — Build/Test (Hard Gate)

**`ng build` / `ng test` / `dotnet build` / `dotnet test` niemals als Shell-Kommando** wenn MCPs verfügbar.

| Verboten | Richtig |
|----------|---------|
| Shell: `ng build` | `build_angular_project` via dev-angular-mcp |
| Shell: `ng test` | `test_angular_project` via dev-angular-mcp |
| Shell: `dotnet build` | `build_dotnet_solution` via dev-dotnet-mcp |
| Shell: `dotnet test` | `test_dotnet_solution` via dev-dotnet-mcp |
| `build-log-filter` für Angular-/dotnet-Build/Test wenn MCP verfügbar | MCP-Ergebnis direkt auswerten (`errors[]`, `warnings[]`, `summary`) |
| Stille Ausweitung auf Shell ohne Nutzer-Freigabe | BLOCKER-Meldung + warten |

**Hard Stop — MCP nicht erreichbar:**

Wenn `dev-angular-mcp` oder `dev-dotnet-mcp` für Build/Test **nicht** in der Tool-Liste steht:

> **`BLOCKER: [dev-angular-mcp | dev-dotnet-mcp] nicht erreichbar`**
> - Kein stiller Fallback auf Shell + build-log-filter
> - Build-/Test-Kette stoppen
> - Nutzer informieren (Docker? MCP aktiv? Image gebaut?)
> - Erst nach **expliziter Nutzerfreigabe**: Shell-Fallback + build-log-filter gemäß `docs/mcp/build-log-filter.md`

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

---

## MCP-Pfad-Kanon (Pflicht)

| MCP | Parameter-Präfix | Mount |
|-----|------------------|-------|
| dev-filesystem-mcp | `/project/` | read-only |
| dev-angular-mcp | `/workspace/` | read-write |
| dev-dotnet-mcp | `/workspace/` | read-write |
| codebase-analyzer | `/workspace/` | read-only |

**VERBOTEN:** C:\, Windows-Pfade, relative Pfade ohne Präfix, `{parameter}`-Platzhalter als MCP-Argument
`Path not found` = Pfad-Format-Fehler, kein Retry mit demselben Format — Format korrigieren.

**Verwechslungsrisiko:** `path` / `filePath` / `file_path` — je Server unterschiedlich; immer Kanon-Skill lesen.

---

## Routing: Welcher MCP wann?

| Aufgabe | MCP | Kanon-Skill laden |
|---------|-----|-------------|
| Datei/Klasse/Methode **lesen** (token-sparend) | dev-filesystem-mcp | dev-filesystem-mcp |
| Interface-Implementierungen **finden** | dev-filesystem-mcp | dev-filesystem-mcp |
| Angular-Komponente/Service **erzeugen** | dev-angular-mcp | dev-angular-mcp |
| Angular **bauen** (`ng build`) | dev-angular-mcp → `build_angular_project` | dev-angular-mcp |
| Angular **testen** (`ng test`) | dev-angular-mcp → `test_angular_project` | dev-angular-mcp |
| .NET-Projekt / Ordnerstruktur **anlegen** | dev-dotnet-mcp | dev-dotnet-mcp |
| .NET **bauen** (`dotnet build`) | dev-dotnet-mcp → `build_dotnet_solution` | dev-dotnet-mcp |
| .NET **testen** (`dotnet test`) | dev-dotnet-mcp → `test_dotnet_solution` | dev-dotnet-mcp |
| Code **reviewen**, **indexieren**, Komplexität | codebase-analyzer | codebase-analyzer |

---

## MCP-Tools Kurzübersicht

**dev-filesystem-mcp** (Port 8091, `/project:ro`):
`find_file`, `find_by_content`, `find_implementations`, `read_signatures_only`, `read_method`, `read_class_summary`

**dev-angular-mcp** (Port 8092, `/workspace:rw`):
`scaffold_angular_component`, `scaffold_angular_service`, `build_angular_project`, `test_angular_project`

**dev-dotnet-mcp** (Port 8093, `/workspace:rw`):
`scaffold_dotnet_project`, `create_directory_structure`, `build_dotnet_solution`, `test_dotnet_solution`

---

## Kanon-Skills (Parameter + JSON)

| Situation | Tool | Skill |
|-----------|------|-------------|
| Lesen/Suchen unter `/project/...` | dev-filesystem-mcp | dev-filesystem-mcp |
| Angular `ng generate` | `scaffold_angular_component` / `scaffold_angular_service` | dev-angular-mcp |
| Angular **Build** | `build_angular_project` (dev-angular-mcp) | dev-angular-mcp |
| Angular **Test** | `test_angular_project` (dev-angular-mcp) | dev-angular-mcp |
| `dotnet new` / Ordnerstruktur | `scaffold_dotnet_project` / `create_directory_structure` | dev-dotnet-mcp |
| .NET **Build** | `build_dotnet_solution` (dev-dotnet-mcp) | dev-dotnet-mcp |
| .NET **Test** | `test_dotnet_solution` (dev-dotnet-mcp) | dev-dotnet-mcp |
| Review, Index, Komplexität | **codebase-analyzer** | codebase-analyzer |

---

## Scope-Trennung: build-log-filter vs. Dev-MCPs

| Kommando | Tool | Grund |
|----------|------|-------|
| `ng build`, `ng test` | dev-angular-mcp (MCP-First) | MCP filtert intern — kein build-log-filter |
| `dotnet build`, `dotnet test` | dev-dotnet-mcp (MCP-First) | MCP filtert intern — kein build-log-filter |
| `ng serve`, `npm start` | build-log-filter (Shell) | Kein MCP für Dev-Server |
| Shell-Fallback nach BLOCKER | build-log-filter | Nur nach expliziter Nutzerfreigabe |

---

## Opt-out

`kein dev-tooling`, `no-dev-tooling`, `skip-dev-tooling` → Router nicht laden.
