# MCP: dev-angular-mcp

**Dev.Angular.Mcp** — Angular-Scaffolding via `ng generate`.

> **Agent-Kanon:** [`skills/dev-angular-mcp/SKILL.md`](../AI-Skills/skills/dev-angular-mcp/SKILL.md)

| Eigenschaft | Wert |
|-------------|------|
| Transport | stdio |
| Log-Port | 8092 |
| Volume-Mount | ❌ — schreibt auf Host via `project_root` (Absolutpfad) |
| Image | `devesen/dev-angular-mcp:latest` |
| Package | `packages/dev-angular-mcp.json` |

---

## Tools

| Tool | Parameter (Kanon) |
|------|-------------------|
| `scaffold_angular_component` | `project_root`, `name`, optional `path`, `options` |
| `scaffold_angular_service` | `project_root`, `name`, optional `path`, `options` |

`project_root` = Verzeichnis mit `angular.json` (Host-Absolut, z. B. `C:\Develop\MyApp\src\frontend`).

---

## Beispiel (JSON)

```json
{
  "project_root": "C:\\Develop\\MyApp\\src\\frontend",
  "name": "user-profile",
  "path": "src/app/users"
}
```

---

## Konfiguration

Siehe `packages/dev-angular-mcp.json`.
