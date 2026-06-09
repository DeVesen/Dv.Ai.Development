---
name: dev-tooling-mcp
description: >
  Token-effiziente Dev-MCPs für Lesen/Suchen (dev-filesystem-mcp), Angular-Scaffolding
  (dev-angular-mcp) und .NET-Scaffolding (dev-dotnet-mcp). Trigger: Datei lesen,
  Klasse verstehen, Methode lesen, find_file, find_by_content, find_implementations,
  read_signatures_only, read_method, read_class_summary, ng generate, scaffold_angular,
  dotnet new, Verzeichnisstruktur, create_directory_structure. Nicht für Code-Review,
  Index oder AST-Analyse — dafür code-review-mcp.
disable-model-invocation: true
---

# Dev Tooling MCP

Drei schlanke MCP-Server für **Lesen**, **Suchen** und **Scaffolding** — abgegrenzt von [code-review-mcp](../code-review-mcp/SKILL.md) (Analyse, Index, Review).

## Voraussetzungen

- MCP-Server in `.cursor/mcp.json` (Docker-Images aus `dev-*-mcp`-Packages).
- **dev-filesystem-mcp:** Volume `-v ${workspaceFolder}:/project:ro` — Pfade als `/project/...`
- **dev-angular-mcp / dev-dotnet-mcp:** Kein Volume — `project_root` / `output_path` / `base_path` als **Host-Absolutpfade** (read-write).

## Tools (8)

| Tool | MCP | Zweck |
|------|-----|-------|
| `find_file` | dev-filesystem-mcp | Glob-Suche unter `root` (max 100) |
| `find_by_content` | dev-filesystem-mcp | Regex pro Zeile, optional `file_glob` |
| `find_implementations` | dev-filesystem-mcp | Roslyn (.cs) / Regex (.ts), `language: auto` |
| `read_signatures_only` | dev-filesystem-mcp | Signaturen ohne Methoden-Bodies |
| `read_method` | dev-filesystem-mcp | Eine Methode/Funktion nach Name |
| `read_class_summary` | dev-filesystem-mcp | Struktur-Überblick (Basen, Member-Liste) |
| `scaffold_angular_component` | dev-angular-mcp | `ng generate component` (Default: `--standalone --skip-tests`) |
| `scaffold_angular_service` | dev-angular-mcp | `ng generate service` (Default: `--skip-tests`) |
| `scaffold_dotnet_project` | dev-dotnet-mcp | `dotnet new` + optional `dotnet sln add` |
| `create_directory_structure` | dev-dotnet-mcp | Verzeichnisse aus JSON-Pfadliste |

## Welcher MCP wann?

| Aufgabe | MCP | Nicht |
|---------|-----|-------|
| Datei/Klasse/Methode **lesen** (token-sparend) | dev-filesystem-mcp | `Read` ganzer Datei, Grep als Ersatz |
| Interface-Implementierungen **finden** (strukturell) | dev-filesystem-mcp `find_implementations` | code-review `find_type_hierarchy` (Vererbungsgraph) |
| Angular-Komponente/Service **erzeugen** | dev-angular-mcp | Manuelles File-Write ohne `ng generate` |
| .NET-Projekt / Ordnerstruktur **anlegen** | dev-dotnet-mcp | Shell `dotnet new` ohne MCP |
| Code **reviewen**, **indexieren**, Komplexität, Refactoring-Safety | code-review-mcp | dev-filesystem-mcp |

## Pfadkonvention

| MCP | Mount | Parameter |
|-----|-------|-----------|
| dev-filesystem-mcp | `${workspaceFolder}:/project:ro` | `root`, `file_path` → `/project/<relativ>` |
| code-review-mcp | `${workspaceFolder}:/workspace:ro` | `projectPath`, `filePath` → `/workspace/<relativ>` |
| dev-angular-mcp | — | `project_root` = Host-Absolutpfad zum Angular-Root (`angular.json`) |
| dev-dotnet-mcp | — | `output_path`, `base_path` = Host-Absolutpfade |

**Fehler:** `File not found: /app/...` bei filesystem → Windows- oder IDE-relativen Pfad statt `/project/...` verwenden.

## Abgrenzung zu code-review-mcp

- **dev-filesystem-mcp:** syntaktisches Lesen/Suchen (Roslyn/Regex), kein Projekt-Index, keine Metriken, kein Review.
- **code-review-mcp:** semantische Analyse, `index_project`/`find_in_index` zuerst bei Symbol-Bezug, Review- und Planungs-Tools.

Bei Symbol-Bezug in **Planung/Review:** code-review-mcp-Landkarte; bei **Implementierung** „nur diese Methode lesen“: dev-filesystem-mcp.

## Log-UI

| MCP | Port | Env |
|-----|------|-----|
| dev-filesystem-mcp | 8091 | `LOG_VIEWER_PORT` |
| dev-angular-mcp | 8092 | `LOG_VIEWER_PORT` |
| dev-dotnet-mcp | 8093 | `LOG_VIEWER_PORT` |

API: `GET /api/calls` (max 200 Einträge).

## Opt-out

`kein dev-tooling`, `no-dev-tooling`, `skip-dev-tooling` → Skill nicht laden.
