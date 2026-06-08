# Phase `save` — Markdown persistieren

Schreibt **Analyse-Bundle** aus Phase [`analyse`](phase-analyse.md) nach `requests/stories/`.

## Trigger

| Trigger | Bedingung |
|---------|-----------|
| `save` | Analyse-Bundle im Thread |
| `save story {id}` | Bundle für `{id}` vorhanden |

Ohne Analyse-Bundle → **`BLOCKER: save ohne analyse — zuerst load, dann analyse`**.

## Statuszeile (Pflicht)

```
Phase: save
```

## Story-Save (Orchestrator)

1. Ordner `requests/stories/UserStory-{id}-*` suchen oder anlegen ([`field-mapping.md`](field-mapping.md)).
2. **Story.md** aus `storyDraft` schreiben/aktualisieren ([`../templates/story.md.template`](../templates/story.md.template)):
   - Metatable, Blockquote (Description, AC, Discussions; **Anhänge:** nur wenn `attachmentNames` im Bundle — z. B. `Anhänge: foo.png, bar.pdf`)
   - `## Feature-Kontext` — Block ersetzen wenn gesetzt
   - `## Description-Analyse (ADO (x))` — Block ersetzen
   - `## Task-Übersicht` — finalisieren ([`task-overview.md`](task-overview.md))
   - `## Möglichkeiten` — Block ersetzen ([`copy-commands.md`](copy-commands.md))
3. Pro Eintrag in `taskDrafts[]`:
   - `tasks/task-{slug}.md` anlegen/aktualisieren (schlankes Schema)
   - `## Möglichkeiten` — Block ersetzen (buddy intake/repo-check + ado/plan Zeilen)
   - Legacy-Abschnitte entfernen falls im Draft markiert
   - **Geschützt:** `## Umsetzung`, `## Nutzer-ToDos`, `## Akzeptanzkriterien` bei effektivem `TASK-CLOSED` — unverändert lassen
4. **Task-Übersicht** finalisieren inkl. Marker-Sync — [`task-overview.md`](task-overview.md) (Priorität `(x)` vs. `TASK-CLOSED`, `**Status:**`, `## Analyse`)
5. Stub-Tasks ohne vollständigen Draft: minimal aus Template ([`../templates/task-open.md.template`](../templates/task-open.md.template)) + Möglichkeiten

## Feature-Save

Pro Child-Story im Feature-Analyse-Bundle: Story-Save wie oben (parallel erlaubt, max. 10/Welle; keine Dateikonflikte zwischen Stories).

**Kein** Ordner nur für das Feature.

## Verboten in `save`

- ADO MCP Schreiben (Description/AC)
- Code-Scout (gehört in `analyse`)
- Task-Subagents neu starten (nur Drafts aus Bundle persistieren; bei fehlendem Draft → Stub + Hinweis im Bericht)

## Reporting (Pflicht)

- Work-Item-ID, ADO-URL
- Geänderte/neu angelegte Pfade unter `requests/stories/`
- Anzahl geschriebener Task-MDs
- Fehlende Drafts / `BLOCKER`
- **Keine** Buddy-Copy-Zeilen — Nutzer nutzt `## Möglichkeiten` in Task.md
