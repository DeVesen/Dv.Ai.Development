# MCP-Tools (Azure DevOps — Work Items)

Server: **`ado`** (siehe [config.md](config.md)).

Vor jedem Aufruf das Tool-Schema im MCP-Ordner lesen.

## Lesen

| Tool | Zweck |
|------|--------|
| `wit_get_work_item` | Ein Work Item: `id`, `project` (GUID), optional `fields`, `expand` |
| `wit_get_work_items_batch_by_ids` | Mehrere IDs (Child-Stories nach Feature-`prüfe`); Fallback bei Projekt-Unsicherheit |
| `wit_list_work_item_comments` | Discussion-Kommentare (Marker parsen) |
| `wit_query_by_wiql` | **Nur lesen:** Child-User-Stories unter einem Feature (Hierarchy-Forward); siehe [feature-pruefe.md](feature-pruefe.md) |

Empfohlene Felder beim Abruf (wenn `fields` gesetzt wird):

- `System.Id`, `System.WorkItemType`, `System.Title`, `System.State`
- `System.Description`, `System.Parent`, `Microsoft.VSTS.Common.Priority`
- `Microsoft.VSTS.Common.AcceptanceCriteria` (falls vorhanden)

## Schreiben (erlaubt)

| Tool | Zweck | Einschränkung |
|------|--------|----------------|
| `wit_add_work_item_comment` | Discussion-Eintrag | `format: markdown`; Marker siehe [markers.md](markers.md) |
| `wit_update_work_item` | JSON-Patch | **Nur** `/fields/System.State` für `active` / `resolved` |

## Verboten

- `wit_update_work_item` auf `/fields/System.Description`
- `wit_update_work_item` auf Acceptance Criteria
- HTML-Kommentare als Ersatz für Markdown-Discussion
- Child-Work-Items **anlegen** (nicht in V1)

## `prüfe Feature` — typische Reihenfolge

1. Schema lesen
2. `wit_get_work_item` (Feature, ggf. `expand: relations`)
3. `wit_list_work_item_comments` (Feature — **Kontext**)
4. Child-Story-IDs (Relations und/oder **ein** `wit_query_by_wiql`)
5. Pro Child-Story: wie Story-`prüfe` — `wit_get_work_item`, `wit_list_work_item_comments` (**Story**), lokale MD, `## Feature-Kontext` setzen

## Ablauf-Reihenfolge (Story / Task → Story)

1. Schema lesen
2. `wit_get_work_item`
3. `wit_list_work_item_comments`
4. Lokale Markdown-Dateien lesen/schreiben
5. Bei Bedarf `wit_add_work_item_comment` oder `wit_update_work_item` (State)
