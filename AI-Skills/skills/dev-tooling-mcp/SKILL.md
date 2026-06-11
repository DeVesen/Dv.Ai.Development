---
name: dev-tooling-mcp
description: >
  Router für die drei Dev-Tooling-MCPs (filesystem, angular, dotnet). Trigger: welcher
  Dev-MCP, Datei lesen vs. scaffold, build, test, dev-tooling. Lädt nicht die Tool-Details —
  dafür die jeweiligen Kanon-Skills. Nicht für codebase-analyzer oder build-log-filter.
disable-model-invocation: true
---

# Dev Tooling MCP — Router

Schlanke **Auswahlhilfe** — Kanon (Tools, Parameter, JSON) steht in den Server-Skills:

| MCP | Kanon-Skill |
|-----|-------------|
| dev-filesystem-mcp | [dev-filesystem-mcp/SKILL.md](../dev-filesystem-mcp/SKILL.md) |
| dev-angular-mcp | [dev-angular-mcp/SKILL.md](../dev-angular-mcp/SKILL.md) |
| dev-dotnet-mcp | [dev-dotnet-mcp/SKILL.md](../dev-dotnet-mcp/SKILL.md) |

## Welcher MCP wann?

| Aufgabe | MCP | Kanon laden |
|---------|-----|-------------|
| Datei/Klasse/Methode **lesen** (token-sparend) | dev-filesystem-mcp | dev-filesystem-mcp |
| Interface-Implementierungen **finden** | dev-filesystem-mcp | dev-filesystem-mcp |
| Angular-Komponente/Service **erzeugen** | dev-angular-mcp | dev-angular-mcp |
| Angular **bauen** (`ng build`) | dev-angular-mcp → `build_angular_project` | dev-angular-mcp |
| Angular **testen** (`ng test`) | dev-angular-mcp → `test_angular_project` | dev-angular-mcp |
| .NET-Projekt / Ordnerstruktur **anlegen** | dev-dotnet-mcp | dev-dotnet-mcp |
| .NET **bauen** (`dotnet build`) | dev-dotnet-mcp → `build_dotnet_solution` | dev-dotnet-mcp |
| .NET **testen** (`dotnet test`) | dev-dotnet-mcp → `test_dotnet_solution` | dev-dotnet-mcp |
| Code **reviewen**, **indexieren**, Komplexität | codebase-analyzer | [codebase-analyzer/SKILL.md](../codebase-analyzer/SKILL.md) |

## VERBOTEN (Hard Gate — keine Ausnahme ohne expliziten BLOCKER)

| Verboten | Richtig |
|----------|---------|
| Shell: `ng build` / `ng test` | `build_angular_project` / `test_angular_project` via dev-angular-mcp |
| Shell: `dotnet build` / `dotnet test` | `build_dotnet_solution` / `test_dotnet_solution` via dev-dotnet-mcp |
| `build-log-filter` für Angular-/dotnet-Build/Test wenn MCP verfügbar | MCP-Ergebnis direkt auswerten (`errors[]`, `warnings[]`, `summary`) |
| Stille Ausweitung auf Shell ohne Nutzer-Freigabe | BLOCKER-Meldung + warten |

**Hard Stop — MCP nicht erreichbar:**

Wenn `dev-angular-mcp` oder `dev-dotnet-mcp` für Build/Test **nicht** in der Tool-Liste steht:

> **`BLOCKER: [dev-angular-mcp | dev-dotnet-mcp] nicht erreichbar`**
> - Kein stiller Fallback auf Shell + build-log-filter
> - Build-/Test-Kette stoppen
> - Nutzer informieren (Docker? MCP aktiv? Image gebaut?)
> - Erst nach **expliziter Nutzerfreigabe**: Shell-Fallback + build-log-filter gemäß [verification-commands.md](../../references/verification-commands.md)

## Pfad-Übersicht (nur Merkhilfe)

| MCP | Mount | Parameter-Namen |
|-----|-------|-----------------|
| dev-filesystem-mcp | `/project:ro` | `file_path`, `root` |
| dev-angular-mcp | `/workspace:rw` | `project_root` (`/workspace/...`) |
| dev-dotnet-mcp | `/workspace:rw` | `output_path`, `base_path`, `path` (`/workspace/...`) |
| codebase-analyzer | `/workspace:ro` | `filePath`, `projectPath` |

**Verwechslungsrisiko:** `path` / `filePath` / `file_path` — je Server unterschiedlich; immer Kanon-Skill + Schema lesen.

## Situative Auswahl

`./mcps.md` im Projekt-Root listet verfügbare Server — situativ wählen. **Scout-Phasen** (repo-check, Code-Landkarte, plan-agent-scout): verbindliche Kette gemäß [repo-scout-protocol/SKILL.md](../repo-scout-protocol/SKILL.md). Sonst: Fallback bei MCP-Fehler Read/Grep mit Begründung.

## Opt-out

`kein dev-tooling`, `no-dev-tooling`, `skip-dev-tooling` → Router nicht laden.
