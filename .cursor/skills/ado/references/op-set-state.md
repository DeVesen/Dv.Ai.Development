# ADO Story-State setzen

Portable Skill: Story-State `active` oder `resolved` in ADO setzen, lokale Artefakte entsprechend aktualisieren.

## Voraussetzungen

1. MCP-Server **`ado`** erreichbar ([`../../mcp.json`](../../mcp.json))
2. [`../config.defaults.json`](../config.defaults.json) gelesen
3. Vor jedem MCP-Aufruf: Tool-Schema lesen ([`mcp-tools.md`](mcp-tools.md))

## Konfiguration

- JSON: [`../config.defaults.json`](../config.defaults.json)
- State-Mapping: [`state-mapping.md`](state-mapping.md)
- Marker: [`markers.md`](markers.md)

## Operation §4: `active`

**Trigger:** `Story 287638 auf active`, `setze … active`.

**Ablauf**

1. [`state-mapping.md`](state-mapping.md): `System.State` → `Active`.
2. `wit_update_work_item` nur State-Feld.
3. Story-MD Status-Zeile aktualisieren.
4. Ordner **nicht** löschen.

## Operation §5: `resolved`

**Trigger:** `Story 287638 resolved`, `schließe Story … resolved`.

**Ablauf**

1. Nutzer **warnen und bestätigen lassen**: Ordner `requests/stories/UserStory-{id}-*` wird gelöscht.
2. `wit_update_work_item` → `Resolved`.
3. Optional: `STORY-RESOLVED`-Kommentar in Discussion ([`markers.md`](markers.md)).
4. Nach erfolgreichem ADO-Update: gesamten Story-Ordner inkl. `tasks/` löschen.
5. Kurzprotokoll: ADO-Link, gelöschter Pfad, Hinweis Git-Historie.

## Reporting (Pflicht)

- Work-Item-ID und ADO-URL
- Geänderte/gelöschte Pfade unter `requests/stories/`
- Bei `resolved`: Bestätigung + gelöschter Pfad
- Offene Punkte / MCP-Fehler

## Opt-out

Nutzer sagt ausdrücklich **`ohne ado-story-skill`**, **`ohne ado-requests-skill`**, **`no ado requests skill`** → diesen Skill nicht laden.
