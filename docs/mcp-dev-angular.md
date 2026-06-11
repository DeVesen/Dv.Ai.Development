# MCP: dev-angular-mcp

**Dev.Angular.Mcp** — Angular-Scaffolding, Build und Test via MCP.

> **Agent-Kanon:** [`skills/dev-angular-mcp/SKILL.md`](../AI-Skills/skills/dev-angular-mcp/SKILL.md)

| Eigenschaft | Wert |
|-------------|------|
| Transport | stdio |
| Log-Port | 8092 |
| Volume-Mount | ✅ **erforderlich** — `${workspaceFolder}:/workspace` (read-write) |
| Image | `devesen/dev-angular-mcp:latest` |
| Package | `packages/dev-angular-mcp.json` |

---

## Tools

| Tool | Beschreibung | Parameter |
|------|-------------|-----------|
| `scaffold_angular_component` | Standalone-Komponente via `ng generate` | `project_root`, `name`, optional `path`, `options` |
| `scaffold_angular_service` | Service via `ng generate` | `project_root`, `name`, optional `path`, `options` |
| `build_angular_project` | `ng build` — gibt strukturiertes Ergebnis zurück | `project_root`, optional `configuration` |
| `test_angular_project` | `ng test --watch=false` — gibt strukturiertes Ergebnis zurück | `project_root`, optional `options` |

`project_root` = Container-Pfad zum Verzeichnis mit `angular.json`, **immer** `/workspace/...`

---

## Internes Output-Filtering

`build_angular_project` und `test_angular_project` führen `ng` als internen Subprocess aus. Die rohe stdout/stderr verlässt den Server **nie** — der Agent erhält ausschließlich:

```json
{
  "success": true,
  "command": "ng build",
  "errors": [],
  "warnings": ["..."],
  "summary": "Build successful. 0 warning(s).",
  "exitCode": 0
}
```

Kein build-log-filter erforderlich für diese Tools.

---

## Beispiele (JSON)

### build_angular_project

```json
{
  "project_root": "/workspace/src/frontend",
  "configuration": "production"
}
```

### test_angular_project

```json
{
  "project_root": "/workspace/src/frontend"
}
```

### scaffold_angular_component

```json
{
  "project_root": "/workspace/src/frontend",
  "name": "user-profile",
  "path": "src/app/users",
  "options": "--change-detection OnPush --style scss"
}
```

---

## Konfiguration (mcp.json)

```jsonc
"dev-angular-mcp": {
  "command": "docker",
  "args": [
    "run", "-i", "--rm",
    "-p", "127.0.0.1:8092:8092",
    "-v", "${workspaceFolder}:/workspace",
    "devesen/dev-angular-mcp:latest"
  ],
  "transport": "stdio",
  "autoApprove": [
    "scaffold_angular_component",
    "scaffold_angular_service",
    "build_angular_project",
    "test_angular_project"
  ]
}
```
