---
name: dev-dotnet-mcp
description: >
  Kanon für MCP dev-dotnet-mcp: dotnet new, Verzeichnisstrukturen, Build und Test.
  Trigger: scaffold_dotnet_project, create_directory_structure, dotnet new,
  neues .NET-Projekt, Ordnerstruktur, build_dotnet_solution, test_dotnet_solution,
  dotnet build, dotnet test, .NET bauen, .NET testen.
  Parameter output_path, base_path, path als /workspace/... Pfade (Volume-Mount).
  Nicht für Code-Lesen — dev-filesystem-mcp.
disable-model-invocation: true
---

# dev-dotnet-mcp

Kanonische Referenz für den MCP-Server **dev-dotnet-mcp** (Docker, Port 8093).

**Vor jedem Tool-Aufruf:** Schema unter `mcps/dev-dotnet-mcp/tools/<tool>.json` lesen.

## Voraussetzungen

- Volume-Mount: `${workspaceFolder}:/workspace` (read-write)
- `output_path` / `base_path` / `path` = **Container-Absolutpfade** `/workspace/...`
- Kein Host-Pfad — immer `/workspace/...`

## Parameter (verbindlich)

| Parameter | Verwendung |
|-----------|------------|
| `output_path` | Zielverzeichnis für `dotnet new` (Container-Pfad `/workspace/...`) |
| `base_path` | Basis für `create_directory_structure` (Container-Pfad `/workspace/...`) |
| `path` | Solution/Projekt/Verzeichnis für Build oder Test (`/workspace/...`) |
| `template` | `dotnet new`-Template (z. B. `webapi`, `classlib`) |
| `name` | Projektname |
| `solution_path` | Optional: `.sln` für `dotnet sln add` (`/workspace/...`) |
| `configuration` | Optional: Build-Konfiguration (z. B. `Release`) |
| `options` | Optional: extra CLI-Flags |
| `paths_json` | JSON-Array relativer Pfade unter `base_path` |

### Nicht verwenden

| Falsch | Richtig |
|--------|---------|
| `C:\Develop\...` oder `/home/user/...` | `/workspace/...` |
| `outputPath`, `rootPath` | `output_path`, `base_path` |
| `structure` (Objekt-Baum) | `paths_json` (String-Array) |
| Host-Absolutpfad | Container-Pfad unter `/workspace` |

## Tools

| Tool | Zweck |
|------|-------|
| `scaffold_dotnet_project` | `dotnet new` + optional `dotnet sln add` |
| `create_directory_structure` | Verzeichnisse/Dateien aus `paths_json` |
| `build_dotnet_solution` | `dotnet build` — gibt `{success, errors[], warnings[], summary}` zurück |
| `test_dotnet_solution` | `dotnet test` — gibt `{success, errors[], summary}` zurück |

**Wichtig:** `build_dotnet_solution` und `test_dotnet_solution` filtern den rohen Konsolen-Output intern.
Agents erhalten ausschließlich strukturierte Daten (`errors[]`, `warnings[]`, `summary`) — niemals Raw-stdout/stderr.

## JSON-Beispiele

### scaffold_dotnet_project

```json
{
  "template": "webapi",
  "name": "UserService.Api",
  "output_path": "/workspace/src/backend/UserService.Api",
  "solution_path": "/workspace/src/backend/MyApp.sln",
  "options": "--framework net9.0"
}
```

### create_directory_structure

```json
{
  "base_path": "/workspace/src/backend/UserService",
  "paths_json": "[\"src/Api\", \"src/Domain/Entities\", \"src/Infrastructure/Persistence/.gitkeep\"]"
}
```

### build_dotnet_solution

```json
{
  "path": "/workspace/src/backend/MyApp.sln",
  "configuration": "Release"
}
```

### test_dotnet_solution

```json
{
  "path": "/workspace/src/backend/MyApp.sln"
}
```

## Fehlerdiagnose

| Symptom | Ursache | Maßnahme |
|---------|---------|----------|
| `output_path is required` / `base_path is required` | Key fehlt | Container-Pfad setzen |
| `path does not exist` | Pfad falsch oder falsches Präfix | Pfad mit `/workspace/` beginnen lassen |
| `Path outside base_path` | Pfad in `paths_json` ungültig | Relative Pfade unter `base_path` |
| Build/Test schlägt fehl | Fehler in `errors[]` | `errors[]`-Array auswerten |
| Invoke-Fehler | Falscher Parameter-Key | Schema lesen |

## Abgrenzung

- **dev-filesystem-mcp:** Bestehenden Code lesen
- **build-log-filter:** Rohen Log-Output manuell filtern (Fallback)
- **Routing:** [dev-tooling-mcp/SKILL.md](../dev-tooling-mcp/SKILL.md)

## Log-UI

Port **8093** — `GET /api/calls`.

## Opt-out

`kein dev-dotnet-mcp`, `skip-dev-dotnet-mcp` → diesen Skill nicht laden.
