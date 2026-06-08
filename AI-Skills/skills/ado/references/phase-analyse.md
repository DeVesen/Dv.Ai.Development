# Phase `analyse` — Inventar + Task-Drafts (kein Persist)

Setzt auf **Load-Bundle** aus Phase [`load`](phase-load.md) auf (gleicher Thread oder explizit referenziert).

**Keine** Story-/Task-Markdown schreiben. Ergebnis = **Analyse-Bundle** für Phase [`save`](phase-save.md).

## Trigger

| Trigger | Bedingung |
|---------|-----------|
| `analyse` | Load-Bundle im Thread vorhanden |
| `analyse story {id}` | Load für `{id}` muss vorher gelaufen sein (oder explizit nachladen → dann `load` zuerst) |

Ohne Load-Bundle → **`BLOCKER: analyse ohne load — zuerst load story|feature {id}`**.

## Statuszeile (Pflicht)

```
Phase: analyse
```

## Story-Analyse (Orchestrator oder Story-SubAgent)

Referenz: [`story-analyse-subagent.md`](story-analyse-subagent.md) (ehem. Story-Phase ohne Save).

1. Load-Bundle verwenden (kein erneuter ADO-Abruf, außer Discussion-Marker unklar → optional `wit_list_work_item_comments` nachladen).
2. **Task-Inventar** aus **Story-Description** ([`description-x-markers.md`](description-x-markers.md)):
   - `(x)` parsen → `adoXDone`, Slugs zuordnen
   - Bestehende lokale `task-*.md` per Glob **lesen** (Slug-Abgleich, **nicht** überschreiben)
3. **`## Description-Analyse (ADO (x))`** — Draft-Inhalt
4. **`## Task-Übersicht`** — Draft-Skeleton (Listen, Wikilink-Ziele, Marker-Sync-Plan)
5. **Story-MD-Drafts:** Metatable, Feature-Kontext-Block, Anhänge-Zeile in Blockquote **nur** wenn Load-Bundle Anhänge hatte
6. **Task-Subagents:** Pro discussion-offenem Task **ohne** `(x)` auf zugeordnetem Description-Punkt und **ohne** effektives `TASK-CLOSED` → [`ado-task-pruefe-agent`](../../../agents/ado-task-pruefe-agent.md) Modus **`analyse`** ([`task-analyse-subagent.md`](task-analyse-subagent.md))

### Ausnahmen `(x)` / `TASK-CLOSED`

Unverändert zu [`story-analyse-subagent.md`](story-analyse-subagent.md) — kein Task-SubAgent für `(x)`-only oder discussion-closed mit geschütztem AC.

## Feature-Analyse

1. Pro Child-Story aus Load-Bundle: **parallel** `ado-story-pruefe-agent` (max. **10**/Welle) — nur Analyse-Schritte, kein Save.
2. Jedes Story-Ergebnis → Teil des Feature-Analyse-Bundles.

## Analyse-Bundle (intern + Chat)

```markdown
## Analyse-Bundle — Story {id}

### storyDraft
- paths: storyFolder (geplant), storyMdPath (geplant)
- sections: Story-Zusammenfassung, Feature-Kontext, Description-Analyse, Task-Übersicht, Möglichkeiten (Story)
- attachmentNames: […] oder weglassen

### taskInventory
- slug, label, originalText, adoXDone, statusPlan (offen|ado-x|discussion-closed|…)

### taskDrafts[]
- slug, sections: Anforderung, Offene Fragen, Story-Bezug, Akzeptanzkriterien, AI Zusammenfassung
- moeglichkeitenBlock (fertig aus copy-commands)
- taskSubagent: OK/FAIL, modelUsed, openQuestions
```

## Navigation nach `analyse`

```
analyse — erneut (nach load-Refresh)
save — Markdown persistieren
load — ADO neu laden, dann analyse erneut
```

## Verboten in `analyse`

- Story.md / task-*.md schreiben oder Ordner anlegen
- ADO Description/AC schreiben
- Interaktives Buddy / `verfeinern`

## Reporting

- Anzahl Tasks im Inventar, Anzahl Task-Subagents, je `slug` → OK/FAIL + `modelUsed`
- Offene Fragen je Task (Kurz)
- **Keine Dateien geändert** — nächster Schritt `save`
