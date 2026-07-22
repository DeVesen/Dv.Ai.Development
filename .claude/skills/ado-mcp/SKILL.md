---
name: ado-mcp
description: >
  Use when reading, querying, updating, or analyzing Azure DevOps work items
  via the Microsoft ADO MCP Server. Covers: reading work items by ID or URL,
  updating fields/comments, and decomposing work items into docs/ado/<id>.md.
  Trigger "ado-mcp init" to configure mcp.json.
---

## Init — `.mcp.json` einrichten

**Trigger:** `ado-mcp init`

Lies `references/mcp-config.md` — dort steht der vollständige Ablauf.

---

## ToolSearch — Batch-Load (Session-Start)

Vor dem ersten ADO-MCP-Aufruf einmalig laden:

```
select:mcp__ado__wit_get_work_items_batch_by_ids,mcp__ado__wit_work_item_write,mcp__ado__wit_work_item_comment_write,mcp__ado__wit_work_item_list_comments,mcp__ado__wit_query_wiql
```

Falls Tool-Namen abweichen: `ToolSearch("ado work item")` — der Server heißt `ado`.

---

## Quick-Routing

| Aufgabe | Tool / Referenz |
|---------|----------------|
| Work Item per ID lesen | `wit_get_work_items_batch_by_ids` |
| Work Item per URL lesen | ID aus URL extrahieren → `wit_get_work_items_batch_by_ids` |
| Kommentare / Diskussion lesen | `wit_work_item_list_comments` |
| Feld aktualisieren | `wit_work_item_write` (update) |
| Kommentar hinzufügen | `wit_work_item_comment_write` (add) |
| Work Item anlegen | `wit_work_item_write` (create) |
| WIQL-Query ausführen | `wit_query_wiql` |
| Work Item analysieren → docs/ado/ | `references/op-analyze-workitem.md` |
| Status eines Tasks abfragen | `references/op-status-marker.md` |
| Status aller Tasks abfragen | `references/op-status-marker.md` |
| Task als 🔄 / ✅ markieren | `references/op-status-marker.md` |

Tool-Parameter-Details: `references/tool-catalog.md`

---

## Referenzen (on-demand)

| Bedarf | Datei |
|--------|-------|
| Init / mcp.json-Konfiguration | `references/mcp-config.md` |
| Vollständige Tool-Parameter | `references/tool-catalog.md` |
| Work Item analysieren & docs/ado/ befüllen | `references/op-analyze-workitem.md` |
| Status-Marker lesen & setzen | `references/op-status-marker.md` |
