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
select:mcp__ado__wit_work_item,mcp__ado__wit_work_item_write,mcp__ado__wit_work_item_comment_write,mcp__ado__wit_query,mcp__ado__core_list_projects
```

Falls Tool-Namen abweichen: `ToolSearch("ado work item")` — der Server heißt `ado`. Server braucht nach Config-Änderung/Neustart oft mehrere ToolSearch-Anläufe bis er als "connected" auftaucht (verifiziert 2026-08-10) — bei leerem Ergebnis kurz erneut versuchen, nicht auf Fehlkonfiguration schließen.

**Bleibt der Server dauerhaft leer** (mehrere ToolSearch-Anläufe über verschiedene Queries, kein Treffer, Server auch nicht mehr in "still connecting"-Liste): bekanntes, wiederkehrendes Problem, sitzt öfter auf Client-Ebene fest. Nicht auf Neukonfiguration schließen, nicht auf Client-Neustart warten (oft nicht möglich, z. B. weil parallel ein anderer Agent im selben Client läuft). Für reines Lesen (Title/Description/Acceptance Criteria/Discussion inkl. Bilder) direkt auf `references/op-fallback-az-cli.md` wechseln — braucht nur `az` CLI + gültigen `az login`, kein MCP.

**Wichtig:** `project`-Parameter ist bei den meisten Calls Pflicht (sonst "Project selection cancelled"). Projektname: `Laser Application Database`.

---

## Quick-Routing

| Aufgabe | Tool / Referenz |
|---------|----------------|
| Work Item per ID lesen | `wit_work_item` (action `get`, `id`, `project`) |
| Work Item per URL lesen | ID aus URL extrahieren → `wit_work_item` (action `get`) |
| Mehrere Work Items per ID lesen | `wit_work_item` (action `get_batch`, `ids`) |
| Kommentare / Diskussion lesen | `wit_work_item` (action `list_comments`, `workItemId`) |
| Feld aktualisieren | `wit_work_item_write` (action `update`) |
| Kommentar hinzufügen | `wit_work_item_comment_write` (action `add`) |
| Work Item anlegen | `wit_work_item_write` (action `create`) |
| WIQL-Query ausführen | `wit_query` (action `wiql`, `wiql`-Parameter) |
| Work Item analysieren → docs/ado/ | `references/op-analyze-workitem.md` |
| Status eines Tasks abfragen | `references/op-status-marker.md` |
| Status aller Tasks abfragen | `references/op-status-marker.md` |
| Task als 🔄 / ✅ markieren | `references/op-status-marker.md` |
| Sprint analysieren | `references/op-sprint-analyse.md` |
| ado-mcp liefert dauerhaft keine Tools (Fallback) | `references/op-fallback-az-cli.md` |

Tool-Parameter-Details: `references/tool-catalog.md`

---

## Referenzen (on-demand)

| Bedarf | Datei |
|--------|-------|
| Init / mcp.json-Konfiguration | `references/mcp-config.md` |
| Vollständige Tool-Parameter | `references/tool-catalog.md` |
| Work Item analysieren & docs/ado/ befüllen | `references/op-analyze-workitem.md` |
| Status-Marker lesen & setzen | `references/op-status-marker.md` |
| Sprint-Analyse Workflow | `references/op-sprint-analyse.md` |
| Fallback ohne ado-mcp (az CLI) | `references/op-fallback-az-cli.md` |
