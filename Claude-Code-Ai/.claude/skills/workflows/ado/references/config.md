# ADO-Konfiguration

## Organisation vs. Projekt

| Begriff | Wert | Verwendung |
|---------|------|------------|
| **Organisation** | `<IhreOrganisation>` *(in config.defaults.json setzen)* | MCP-Server-Argument — **nicht** als `project`-Parameter an `wit_*`-Tools |
| **Projekt (API)** | `<Projekt-GUID>` *(in config.defaults.json setzen)* | Parameter `project` bei `wit_get_work_item`, `wit_list_work_item_comments`, `wit_add_work_item_comment` |

Kanonical JSON: [`../config.defaults.json`](../config.defaults.json).

**Konfiguration:** `<IhreOrganisation>` und `<Projekt-GUID>` in `config.defaults.json` durch echte Werte ersetzen (projektspezifisch).

## MCP-Server

- Server-Key: **`ado`**
- Paket: `@azure-devops/mcp`
- Domains: `core`, `work`, `work-items`

Vor jedem Aufruf: Tool-Deskriptoren unter dem MCP-Server lesen.

## Fehlerfall Projekt

1. `wit_get_work_item` mit `defaultProject` aus `config.defaults.json`
2. Bei Fehler: `wit_get_work_items_batch_by_ids` mit derselben Projekt-GUID
3. Weiterhin Fehler: Nutzer nach **Projektname oder Projekt-GUID** fragen — **niemals** Organisation als `project` übergeben

## Repo-Pfade

- **Artefakt-Wurzel:** `<workspace-root>/requests/stories/`
- `<workspace-root>` = Projekt-Workspace-Root — **nicht** `.claude/`, **nicht** `AI-Skills/`, **nicht** Code-Unterverzeichnisse
- `storiesRoot` in `config.defaults.json` ist relativ zu `<workspace-root>` (`requests/stories`)
- Kein Legacy-Pfad `.requests/` für neue Artefakte
