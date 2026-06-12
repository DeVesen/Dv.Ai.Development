# MCP: dev-dotnet-mcp

**Dev.Dotnet.Mcp** — .NET-Scaffolding, Build und Test via MCP.

> **Agent-Kanon:** [`skills/dev-dotnet-mcp/SKILL.md`](../.claude/skills/dev-dotnet-mcp/SKILL.md)

| Eigenschaft | Wert |
|-------------|------|
| Transport | stdio |
| Log-Port | 8093 |
| Volume-Mount | ✅ **erforderlich** — `${workspaceFolder}:/workspace` (read-write) |
| Image | `devesen/dev-dotnet-mcp:latest` |
| Package | `packages/dev-dotnet-mcp.json` |

---

## Tools

| Tool | Beschreibung | Parameter |
|------|-------------|-----------|
| `scaffold_dotnet_project` | `dotnet new` + optional `dotnet sln add` | `template`, `name`, `output_path`, optional `solution_path`, `options` |
| `create_directory_structure` | Verzeichnis-Baum aus JSON anlegen | `base_path`, `paths_json` |
| `build_dotnet_solution` | `dotnet build` — gibt strukturiertes Ergebnis zurück | `path`, optional `configuration` |
| `test_dotnet_solution` | `dotnet test` — gibt strukturiertes Ergebnis zurück | `path`, optional `options` |

Alle Pfade = Container-Pfade, **immer** `/workspace/...`

---

## Internes Output-Filtering

`build_dotnet_solution` und `test_dotnet_solution` führen `dotnet` als internen Subprocess aus. Die rohe stdout/stderr verlässt den Server **nie** — der Agent erhält ausschließlich:

```json
{
  "success": true,
  "command": "dotnet build",
  "errors": [],
  "warnings": ["..."],
  "summary": "Build succeeded. 0 Warning(s).",
  "exitCode": 0
}
```

Kein build-log-filter erforderlich für diese Tools.

---

## Beispiele (JSON)

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
  "paths_json": "[\"src/Api\", \"src/Domain/Entities\", \"src/Infrastructure/.gitkeep\"]"
}
```

---

## Konfiguration (.mcp.json)

```jsonc
"dev-dotnet-mcp": {
  "command": "docker",
  "args": [
    "run", "-i", "--rm",
    "-p", "127.0.0.1:8093:8093",
    "-v", "${workspaceFolder}:/workspace",
    "devesen/dev-dotnet-mcp:latest"
  ],
  "transport": "stdio",
  "autoApprove": [
    "scaffold_dotnet_project",
    "create_directory_structure",
    "build_dotnet_solution",
    "test_dotnet_solution"
  ]
}
```
