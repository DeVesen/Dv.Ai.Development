---
name: dev-dotnet-mcp
description: >
  Kanon für MCP dev-dotnet-mcp: dotnet new und Verzeichnisstrukturen.
  Trigger: scaffold_dotnet_project, create_directory_structure, dotnet new,
  neues .NET-Projekt, Ordnerstruktur. Parameter output_path und base_path als
  Host-Absolutpfade. Nicht für Code-Lesen — dev-filesystem-mcp.
disable-model-invocation: true
---

# dev-dotnet-mcp

Kanonische Referenz für den MCP-Server **dev-dotnet-mcp** (Docker, Port 8093).

**Vor jedem Tool-Aufruf:** Schema unter `mcps/dev-dotnet-mcp/tools/<tool>.json` lesen.

## Voraussetzungen

- **Kein** Volume-Mount — Ausgabe direkt auf Host
- `output_path` / `base_path` = **Host-Absolutpfade**

## Parameter (verbindlich)

| Parameter | Verwendung |
|-----------|------------|
| `output_path` | Zielverzeichnis für `dotnet new` (absolut) |
| `base_path` | Basis für `create_directory_structure` (absolut) |
| `template` | `dotnet new`-Template (z. B. `webapi`, `classlib`) |
| `name` | Projektname |
| `solution_path` | Optional: `.sln` für `dotnet sln add` |
| `options` | Optional: extra CLI-Flags (z. B. `--framework net9.0`) |
| `paths_json` | JSON-Array relativer Pfade unter `base_path` |

### Nicht verwenden

| Falsch | Richtig |
|--------|---------|
| `outputPath`, `rootPath` | `output_path`, `base_path` |
| `/project/...` | Host-Absolutpfad |
| `structure` (Objekt-Baum) | `paths_json` (String-Array) |

## Tools

| Tool | Zweck |
|------|-------|
| `scaffold_dotnet_project` | `dotnet new` + optional `dotnet sln add` |
| `create_directory_structure` | Verzeichnisse/Dateien aus `paths_json` |

## JSON-Beispiele

### scaffold_dotnet_project

```json
{
  "template": "webapi",
  "name": "UserService.Api",
  "output_path": "C:\\Develop\\MyApp\\src\\backend\\UserService.Api",
  "solution_path": "C:\\Develop\\MyApp\\src\\backend\\MyApp.sln",
  "options": "--framework net9.0"
}
```

### create_directory_structure

```json
{
  "base_path": "C:\\Develop\\MyApp\\src\\backend\\UserService",
  "paths_json": "[\"src/Api\", \"src/Domain/Entities\", \"src/Infrastructure/Persistence/.gitkeep\"]"
}
```

## Fehlerdiagnose

| Symptom | Ursache | Maßnahme |
|---------|---------|----------|
| `output_path is required` / `base_path is required` | Key fehlt | Host-Absolutpfad setzen |
| `Path outside base_path` | Pfad in `paths_json` ungültig | Relative Pfade unter `base_path` |
| Invoke-Fehler | Falscher Parameter-Key | Schema lesen |

## Abgrenzung

- **dev-filesystem-mcp:** Bestehenden Code lesen
- **Routing:** [dev-tooling-mcp/SKILL.md](../dev-tooling-mcp/SKILL.md)

## Log-UI

Port **8093** — `GET /api/calls`.

## Opt-out

`kein dev-dotnet-mcp`, `skip-dev-dotnet-mcp` → diesen Skill nicht laden.
