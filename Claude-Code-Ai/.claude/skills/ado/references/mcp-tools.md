# MCP-Tools (Azure DevOps — Work Items)

Server: **`ado`** — Paket `@azure-devops/mcp` (Domains: `core`, `work`, `work-items`).

**Organisation vs. Projekt:**

| Begriff | Verwendung |
|---------|------------|
| **Organisation** | MCP-Server-Argument — **nicht** als `project`-Parameter an `wit_*`-Tools |
| **Projekt (API)** | Parameter `project` bei `wit_get_work_item` u.a. — immer GUID aus `config.defaults.json` |

Vor jedem Aufruf das Tool-Schema im MCP-Ordner lesen.

## Lesen

| Tool | Zweck |
|------|--------|
| `wit_get_work_item` | Ein Work Item: `id`, `project` (GUID), optional `fields`, `expand` |
| `wit_get_work_items_batch_by_ids` | Mehrere IDs |
| `wit_list_work_item_comments` | Discussion |
| `wit_query_by_wiql` | Child-User-Stories unter Feature — [feature-pruefe.md](feature-pruefe.md) |

Empfohlene Felder:

- `System.Id`, `System.WorkItemType`, `System.Title`, `System.State`
- `System.Description`, `System.Parent`, `Microsoft.VSTS.Common.Priority`
- `Microsoft.VSTS.Common.AcceptanceCriteria` (falls vorhanden)

### Anhänge (optional)

Vor Phase **load:** MCP-Schema auf ein Tool zum **Auflisten** von Work-Item-Attachments prüfen (Namen/Metadaten, **kein** Download).

| Wenn Tool existiert | Phase load + save |
|---------------------|-------------------|
| Ja | Namen sammeln → Load-Bundle → in Story-Blockquote z. B. `Anhänge: a.png, b.pdf` |
| Nein | Feld **komplett weglassen** — kein Platzhalter in MD oder Chat |

## Schreiben (erlaubt)

| Tool | Zweck | Einschränkung |
|------|--------|----------------|
| `wit_add_work_item_comment` | Discussion | `format: markdown`; [markers.md](markers.md) |
| `wit_update_work_item` | State | **Nur** `/fields/System.State` |

## Verboten

- Description / AC per MCP schreiben
- Child-Work-Items anlegen (V1)

## Fehlerfall Projekt

1. `wit_get_work_item` mit `defaultProject` aus `config.defaults.json`
2. Bei Fehler: `wit_get_work_items_batch_by_ids` mit derselben Projekt-GUID
3. Weiterhin Fehler: Nutzer nach **Projektname oder Projekt-GUID** fragen — **niemals** Organisation als `project` übergeben

## Phasen-Reihenfolge

### `load feature`

1. Schema lesen
2. `wit_get_work_item` (Feature, ggf. `expand: relations`)
3. `wit_list_work_item_comments` (Feature)
4. Optional: Attachment-List-Tool (wenn im Schema)
5. Child-Story-IDs
6. Pro Child: wie `load story` (Schritte 2–4)

### `load story` / `load task` → Parent-Story

1. Schema lesen
2. `wit_get_work_item`
3. `wit_list_work_item_comments`
4. Optional: Attachment-List-Tool
5. **Keine** lokalen MD in load/analyse

### `save`

Kein MCP nötig (außer Nutzer fordert State-Ops separat).
