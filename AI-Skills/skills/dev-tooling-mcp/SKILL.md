---
name: dev-tooling-mcp
description: >
  Router für die drei Dev-Tooling-MCPs (filesystem, angular, dotnet). Trigger: welcher
  Dev-MCP, Datei lesen vs. scaffold, dev-tooling. Lädt nicht die Tool-Details —
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
| .NET-Projekt / Ordnerstruktur **anlegen** | dev-dotnet-mcp | dev-dotnet-mcp |
| Code **reviewen**, **indexieren**, Komplexität | codebase-analyzer | [codebase-analyzer/SKILL.md](../codebase-analyzer/SKILL.md) |
| Build-/Test-Log **verdichten** | build-log-filter | [build-log-filter/SKILL.md](../build-log-filter/SKILL.md) |

## Pfad-Übersicht (nur Merkhilfe)

| MCP | Mount | Parameter-Namen |
|-----|-------|-----------------|
| dev-filesystem-mcp | `/project:ro` | `file_path`, `root` |
| dev-angular-mcp | — (Host) | `project_root` |
| dev-dotnet-mcp | — (Host) | `output_path`, `base_path` |
| codebase-analyzer | `/workspace:ro` | `filePath`, `projectPath` |

**Verwechslungsrisiko:** `path` / `filePath` / `file_path` — je Server unterschiedlich; immer Kanon-Skill + Schema lesen.

## Situative Auswahl

`./mcps.md` im Projekt-Root listet verfügbare Server — kein festes Ablaufschema. Fallback bei MCP-Fehler: Read/Grep mit Begründung.

## Opt-out

`kein dev-tooling`, `no-dev-tooling`, `skip-dev-tooling` → Router nicht laden.
