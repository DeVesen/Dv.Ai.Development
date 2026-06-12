---
name: dev-filesystem-mcp
description: >
  Kanon für MCP dev-filesystem-mcp: token-effizientes Lesen und Suchen in .cs/.ts.
  Trigger: find_file, find_by_content, find_implementations, read_signatures_only,
  read_method, read_class_summary, Datei/Klasse/Methode verstehen. Pfade /project/...,
  Parameter file_path und root. Nicht für Index, Review oder AST — codebase-analyzer.
when_to_use: >
  Aktiviere für token-effizientes Lesen und Suchen in Code-Dateien (.cs/.ts).
  Erster Schritt bei bekanntem Pfad/Klasse; Scout-Fallback nach leerem find_in_index.
  Nicht für Index/Review/Metriken (codebase-analyzer) oder Build/Test (dev-angular-mcp/dev-dotnet-mcp).
---

## MCP-Pfad-Kanon (Pflicht)

- dev-filesystem-mcp nutzt `/project/` Prefix (nicht `/workspace/`)
- **VERBOTEN:** `C:\`, Windows-Pfade, IDE-relative Pfade ohne `/project/`, `{parameter}`-Platzhalter
- `File not found: /app/...` = falscher Pfad-Prefix → `/project/` setzen, kein Retry mit demselben Format
- Mount: `${workspaceFolder}:/project:ro` (read-only)

**Abgrenzung zu codebase-analyzer:**
- dev-filesystem-mcp: `/project/` Prefix, Parameter `file_path` / `root`
- codebase-analyzer: `/workspace/` Prefix, Parameter `filePath` / `projectPath`

---

## MCP dev-filesystem-mcp — Server und Tools

**Server:** `dev-filesystem-mcp` (Docker, Port 8091)
**Volume-Mount:** `-v ${workspaceFolder}:/project:ro` (read-only)

| Tool | Zweck |
|------|-------|
| `find_file` | Glob unter `root` (max 100 Ergebnisse) |
| `find_by_content` | Regex pro Zeile, optional `file_glob` |
| `find_implementations` | Interface-Implementierungen (.cs Roslyn / .ts Regex) |
| `read_signatures_only` | Public API ohne Bodies |
| `read_method` | Eine Methode/Funktion nach `method_name` |
| `read_class_summary` | Klassen-Struktur ohne Bodies |

---

## Parameter (verbindlich)

| Parameter | Verwendung | Beispiel |
|-----------|------------|----------|
| `file_path` | Absolute Datei im Container | `/project/src/backend/LAC.Core/Models/UserModel.cs` |
| `root` | Suchwurzel im Container | `/project/src/backend` |

### Nicht verwenden

| Falsch | Richtig |
|--------|---------|
| `path` | `file_path` (read-*) oder `root` (find-*) |
| `filePath` | `file_path` (das ist codebase-analyzer-Konvention) |
| `src/backend/...` ohne Präfix | `/project/...` |

---

## JSON-Beispiele

### read_signatures_only

```json
{
  "file_path": "/project/src/backend/LAC.Core/Models/UserModel.cs"
}
```

### read_method

```json
{
  "file_path": "/project/src/backend/LAC.Core/Services/UserService.cs",
  "method_name": "GetUserAsync"
}
```

### read_class_summary

```json
{
  "file_path": "/project/src/backend/LAC.Core/Services/UserService.cs"
}
```

### find_file

```json
{
  "root": "/project/src/backend",
  "pattern": "**/*Repository.cs",
  "max_results": 20
}
```

### find_by_content

```json
{
  "root": "/project/src/backend",
  "pattern": "interface IOrderService",
  "file_glob": "*.cs",
  "max_results": 20
}
```

### find_implementations

```json
{
  "root": "/project/src/backend",
  "interface_name": "IOrderRepository",
  "language": "auto",
  "max_results": 20
}
```

---

## Scout-Fallback (Index-Miss)

In Scout-/repo-check-Phasen ist dieser MCP die **Pflicht-Zweitstrategie** nach leerem `find_in_index` (codebase-analyzer):

1. `find_by_content` (Regex, optional `file_glob`) oder `find_file` (Glob unter `root`)
2. bei Treffer: `read_class_summary` / `read_signatures_only`

**Nicht** sofort natives Grep — MCP-Kette zuerst.

Bei **bekanntem Pfad/Klasse** (Task, Handoff): Filesystem-MCP **zuerst**, Index optional für Abhängigkeiten.

---

## Fehlerdiagnose

| Symptom | Ursache | Maßnahme |
|---------|---------|----------|
| `An error occurred invoking '…'` | Falscher Parameter-**Key** (z. B. `path` statt `file_path`) | Schema lesen, JSON korrigieren |
| `file_path is required` | Key fehlt oder leer | `file_path` setzen |
| `File not found: /app/...` | Falscher **Pfad** (Host/relativ statt `/project/`) | `/project/<relativ-zu-workspace>` |
| Datei existiert, trotzdem not found | `root`/`file_path` außerhalb Mount | Workspace-Mount prüfen |

---

## Abgrenzung

- **codebase-analyzer:** Index, Review, Metriken — Mount `/workspace`, Parameter `filePath`/`projectPath`
- **Routing (welcher MCP wann):** dev-tooling-mcp Router-Skill

Log-UI: Port **8091** — `GET /api/calls` (max 200 Einträge)

Weiterführende Dokumentation: `docs/mcp-dev-filesystem.md`

## Opt-out

`kein dev-filesystem-mcp`, `skip-dev-filesystem-mcp` → diesen Skill nicht laden.
