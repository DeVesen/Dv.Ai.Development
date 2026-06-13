## Parameter

| Parameter | Beschreibung |
|-----------|-------------|
| `ADO.Organisation` | Azure DevOps Organisation (z. B. `MeineFirma`) |
| `ADO.Project-GUID` | Azure DevOps Projekt-GUID |

# ADO-Konfiguration

## Organisation vs. Projekt

| Begriff | Wert | Verwendung |
|---------|------|------------|
| **Organisation** | `{ADO.Organisation}` | MCP-Server-Argument in [`.cursor/mcp.json`](../../mcp.json) — **nicht** als `project`-Parameter an `wit_*`-Tools |
| **Projekt (API)** | `{ADO.Project-GUID}` (GUID) | Parameter `project` bei `wit_get_work_item`, `wit_list_work_item_comments`, `wit_add_work_item_comment` |

Kanonical JSON: [`../config.defaults.json`](../config.defaults.json).

## MCP-Server

- Server-Key in Cursor: **`ado`**
- Paket: `@azure-devops/mcp`
- Domains: `core`, `work`, `work-items`

Vor jedem Aufruf: Tool-Deskriptoren unter dem MCP-Server lesen.

## Fehlerfall Projekt

1. `wit_get_work_item` mit `defaultProject` aus `config.defaults.json`
2. Bei Fehler: `wit_get_work_items_batch_by_ids` mit derselben Projekt-GUID
3. Weiterhin Fehler: Nutzer nach **Projektname oder Projekt-GUID** fragen — **niemals** `{ADO.Organisation}` als `project` übergeben

## Repo-Pfade

- **Artefakt-Wurzel:** `{workspace-root}/requests/stories/`
- `{workspace-root}` = Cursor-Workspace-Root — **nicht** `.cursor/`, **nicht** `AI-Skills/`, **nicht** `{frontend-path}` / `{backend-path}` / `{code-root}`
- `storiesRoot` in [`config.defaults.json`](../config.defaults.json) ist relativ zu `{workspace-root}` (`requests/stories`)
- Kein Legacy-Pfad `.requests/` für neue Artefakte
