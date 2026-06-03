# ADO ToDo diktieren

Portable Skill: Freitext-ToDo in `task-*.md` notieren und `TODO`-Marker in Story-Discussion posten.

## Voraussetzungen

1. MCP-Server **`ado`** erreichbar ([`../../mcp.json`](../../mcp.json))
2. [`../config.defaults.json`](../config.defaults.json) gelesen
3. Vor jedem MCP-Aufruf: Tool-Schema lesen ([`mcp-tools.md`](mcp-tools.md))

## Konfiguration

- JSON: [`../config.defaults.json`](../config.defaults.json)
- Marker: [`markers.md`](markers.md)
- Copy-Befehle: [`copy-commands.md`](copy-commands.md)

## Operation: ToDo diktieren

**Trigger:** `ToDo für Task …: …`, `notiere im Task …`, `dictiere ToDo …`.

**Ablauf**

1. Freitext und Task-Slug ermitteln.
2. In `task-*.md` unter **`## Offene Fragen`**: `- YYYY-MM-DD: …` anhängen.
3. `wit_add_work_item_comment` mit `TODO`-Marker an der **Story** ([`markers.md`](markers.md)).
4. Idempotenz beachten: Gleicher `TODO`-Text wie letzter TODO für denselben Slug → **nicht** erneut posten.

## Reporting (Pflicht)

- Work-Item-ID und ADO-URL
- Geänderte Pfade unter `requests/stories/`
- Posted/skipped Discussion-Marker
- Offene Punkte / MCP-Fehler

## Opt-out

Nutzer sagt ausdrücklich **`ohne ado-story-skill`**, **`ohne ado-requests-skill`**, **`no ado requests skill`** → diesen Skill nicht laden.
