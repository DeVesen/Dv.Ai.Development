# MCP: dev-dotnet-mcp

**Dev.Dotnet.Mcp** — .NET-Scaffolding via `dotnet new` und Verzeichnisstrukturen.

> **Agent-Kanon:** [`skills/dev-dotnet-mcp/SKILL.md`](../AI-Skills/skills/dev-dotnet-mcp/SKILL.md)

| Eigenschaft | Wert |
|-------------|------|
| Transport | stdio |
| Log-Port | 8093 |
| Volume-Mount | ❌ — `output_path` / `base_path` Host-Absolut |
| Image | `devesen/dev-dotnet-mcp:latest` |
| Package | `packages/dev-dotnet-mcp.json` |

---

## Tools

| Tool | Parameter (Kanon) |
|------|-------------------|
| `scaffold_dotnet_project` | `template`, `name`, `output_path`, optional `solution_path`, `options` |
| `create_directory_structure` | `base_path`, `paths_json` (JSON-Array relativer Pfade) |

---

## Beispiel (JSON)

```json
{
  "template": "webapi",
  "name": "UserService.Api",
  "output_path": "C:\\Develop\\MyApp\\src\\backend\\UserService.Api"
}
```

---

## Konfiguration

Siehe `packages/dev-dotnet-mcp.json`.
