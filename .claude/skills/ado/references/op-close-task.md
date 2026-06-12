# ADO Task als fertig markieren

Portable Skill: Task abschließen — Akzeptanzkriterien prüfen, `TASK-CLOSED` in Story-Discussion, lokales `task-*.md` aktualisieren.

## Voraussetzungen

1. MCP-Server **`ado`** erreichbar ([`mcp-tools.md`](mcp-tools.md))
2. [`../config.defaults.json`](../config.defaults.json) gelesen
3. Vor jedem MCP-Aufruf: Tool-Schema lesen ([`mcp-tools.md`](mcp-tools.md))

## Konfiguration

- Artefakt-Wurzel: `<workspace-root>/requests/stories/` — [`config.md`](config.md)
- JSON: [`../config.defaults.json`](../config.defaults.json)
- Marker: [`markers.md`](markers.md)
- Task-Übersicht: [`task-overview.md`](task-overview.md)
- Akzeptanzkriterien: [`acceptance-criteria.md`](acceptance-criteria.md)

## Operation: Task als fertig markieren

**Trigger:** `markiere Task … als fertig`, `Task task-maschinenfilter-suchwizard erledigt`, `schließe Task … in Story 287638`.

**Ablauf**

1. Story-ID + `task-slug` auflösen.
2. **`## Akzeptanzkriterien`:** kurz prüfen ob wesentliche Kriterien erfüllt sind ([`acceptance-criteria.md`](acceptance-criteria.md)). Sonst Nutzer **warnen** — nur nach expliziter Freigabe „trotzdem schließen" fortfahren.
3. Idempotenz: letzten Marker prüfen ([`markers.md`](markers.md)).
4. `wit_add_work_item_comment` — `format: markdown`, Zeile `TASK-CLOSED`.
5. `task-*.md`: **Erledigt**, `### Lösung` befüllen (Begründung warum Task fertig); Template [`../templates/task-done.md.template`](../templates/task-done.md.template) wo sinnvoll.
6. Story-MD: Checkbox `[x]`; **nur** unter „Abgeschlossen (laut Discussion / TASK-CLOSED)" eintragen; Slug aus „Abgeschlossen (laut Code-Stand)" und „Offen" entfernen ([`task-overview.md`](task-overview.md)).

**VERBOTEN:** Description/AC in ADO ändern.

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

## Reporting (Pflicht)

- Work-Item-ID und ADO-URL
- Geänderte Pfade unter `<workspace-root>/requests/stories/`
- Posted/skipped Discussion-Marker
- Offene Punkte / MCP-Fehler

## Opt-out

Nutzer sagt ausdrücklich **`ohne ado-story-skill`**, **`ohne ado-requests-skill`**, **`no ado requests skill`** → diesen Skill nicht laden.
