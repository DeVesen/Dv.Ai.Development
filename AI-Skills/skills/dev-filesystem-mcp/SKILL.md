---
name: dev-filesystem-mcp
description: >
  Kanon für MCP dev-filesystem-mcp: token-effizientes Lesen und Suchen in .cs/.ts.
  Trigger: find_file, find_by_content, find_implementations, read_signatures_only,
  read_method, read_class_summary, Datei/Klasse/Methode verstehen. Pfade /project/...,
  Parameter file_path und root. Nicht für Index, Review oder AST — codebase-analyzer.
disable-model-invocation: true
---

# dev-filesystem-mcp

Kanonische Referenz für den MCP-Server **dev-filesystem-mcp** (Docker, Port 8091).

**Vor jedem Tool-Aufruf:** Schema unter `mcps/dev-filesystem-mcp/tools/<tool>.json` lesen (Cursor) bzw. MCP-Deskriptor — Parameter exakt wie im Schema.

## Voraussetzungen

- `.cursor/mcp.json`: Volume `-v ${workspaceFolder}:/project:ro`
- Alle Pfade **im Container**: Präfix `/project/` (relativ zum Workspace-Root)
- **Kein** Windows-Pfad, **kein** IDE-relativer Pfad ohne `/project/`

## Parameter (verbindlich)

| Parameter | Verwendung | Beispiel |
|-----------|------------|----------|
| `file_path` | Absolute Datei im Container | `/project/lac-db/src/backend/LAC.Core/Models/UserModel.cs` |
| `root` | Suchwurzel im Container | `/project/lac-db/src/backend` |

### Nicht verwenden

| Falsch | Richtig |
|--------|---------|
| `path` | `file_path` (read-*) oder `root` (find-*) |
| `filePath` | `file_path` (das ist codebase-analyzer-Konvention) |
| `src/backend/...` ohne Präfix | `/project/...` |

## Tools

| Tool | Zweck |
|------|-------|
| `find_file` | Glob unter `root` (max 100) |
| `find_by_content` | Regex pro Zeile, optional `file_glob` |
| `find_implementations` | Interface-Implementierungen (.cs Roslyn / .ts Regex) |
| `read_signatures_only` | Public API ohne Bodies |
| `read_method` | Eine Methode/Funktion nach `method_name` |
| `read_class_summary` | Klassen-Struktur ohne Bodies |

## JSON-Beispiele

### read_signatures_only

```json
{
  "file_path": "/project/lac-db/src/backend/LAC.Core/Models/UserModel.cs"
}
```

### read_method

```json
{
  "file_path": "/project/lac-db/src/backend/LAC.Core/Services/UserService.cs",
  "method_name": "GetUserAsync"
}
```

### read_class_summary

```json
{
  "file_path": "/project/lac-db/src/backend/LAC.Core/Services/UserService.cs"
}
```

### find_file

```json
{
  "root": "/project/lac-db/src/backend",
  "pattern": "**/*Repository.cs",
  "max_results": 20
}
```

### find_by_content

```json
{
  "root": "/project/lac-db/src/backend",
  "pattern": "interface IOrderService",
  "file_glob": "*.cs",
  "max_results": 20
}
```

### find_implementations

```json
{
  "root": "/project/lac-db/src/backend",
  "interface_name": "IOrderRepository",
  "language": "auto",
  "max_results": 20
}
```

## Fehlerdiagnose

| Symptom | Ursache | Maßnahme |
|---------|---------|----------|
| `An error occurred invoking '…'` | Falscher Parameter-**Key** (z. B. `path` statt `file_path`) | Schema lesen, JSON korrigieren |
| `file_path is required` | Key fehlt oder leer | `file_path` setzen |
| `File not found: /app/...` | Falscher **Pfad** (Host/relativ statt `/project/`) | `/project/<relativ-zu-workspace>` |
| Datei existiert, trotzdem not found | `root`/`file_path` außerhalb Mount | Workspace-Mount prüfen |

## Abgrenzung

- **codebase-analyzer:** Index, Review, Metriken — Mount `/workspace`, Parameter `filePath`/`projectPath`
- **Routing (welcher MCP wann):** [dev-tooling-mcp/SKILL.md](../dev-tooling-mcp/SKILL.md) oder `./mcps.md`

## Log-UI

Port **8091** — `GET /api/calls` (max 200 Einträge).

## Opt-out

`kein dev-filesystem-mcp`, `skip-dev-filesystem-mcp` → diesen Skill nicht laden.
