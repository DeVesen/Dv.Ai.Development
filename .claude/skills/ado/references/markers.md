Der konkrete Wert von `markerVersion` wird aus [`../config.defaults.json`](../config.defaults.json) gelesen (Standard: `REQUESTS v1`).

# Discussion-Marker `[{markerVersion}]`

Alle Agent-Kommentare in der **Story-Discussion** (nicht Feature-Discussion) beginnen mit dieser Zeile. Bei **`load feature`:** Feature-Discussion nur für **`## Feature-Kontext`**; `TASK-CLOSED`/`TODO` weiter nur an der **jeweiligen Story** auswerten.

## Formate

| Typ | Zeile (Beispiel) |
|-----|------------------|
| Task geschlossen | `[{markerVersion}] TASK-CLOSED task-maschinenfilter-suchwizard \| 2026-05-19T10:00:00Z \| by-agent` |
| Nutzer-ToDo | `[{markerVersion}] TODO task-maschinenfilter-suchwizard \| Freitext des Nutzers` |
| Story resolved | `[{markerVersion}] STORY-RESOLVED \| optionaler Grund` |
| Task wieder offen (optional V2) | `[{markerVersion}] TASK-REOPENED task-maschinenfilter-suchwizard \| Grund` |

- `task-slug` = Dateiname ohne `tasks/task-` und ohne `.md`
- Zeitstempel: ISO-8601 UTC (`…Z`)
- Trenner zwischen Teilen: ` \| ` (Leerzeichen-Pipe-Leerzeichen)

## Source of Truth

- **Task „fertig" (Discussion):** Gültig nur, wenn der **neueste** relevante Marker für diesen `task-slug` ein `TASK-CLOSED` ist und **kein** späterer `TASK-REOPENED` für denselben Slug existiert.
- **Nicht** aus Description oder Acceptance Criteria ableiten.
- Discussion-geschlossene Tasks: **nur** unter `### Abgeschlossen (laut Discussion / TASK-CLOSED)` — bei `analyse` **kein** Repo-/Code-Abgleich ([task-overview.md](task-overview.md)).
- „Code-Stand" in der Story-MD gilt **nur** für discussion-offene Tasks und **nur** nach explizitem Repo-Scout durch den Nutzer.

## Idempotenz

Vor `TASK-CLOSED` oder `TODO`: `wit_list_work_item_comments` auswerten.

- Gleicher `TASK-CLOSED`-Slug wie letzter CLOSED-Eintrag → **nicht** erneut posten.
- Gleicher `TODO`-Text wie letzter TODO für denselben Slug → **nicht** erneut posten.

## Parser (bei `analyse` / `save`)

1. Kommentare chronologisch sortieren (API-Reihenfolge bzw. Zeitstempel falls vorhanden).
2. Pro `task-slug` letzten Status aus CLOSED/REOPENED bestimmen.
3. Story-`## Task-Übersicht` neu ordnen: CLOSED-Slugs → Discussion-Liste; dieselben aus Code-Stand und Offen **entfernen** ([task-overview.md](task-overview.md)).
4. `TODO`-Zeilen in `## Offene Fragen` der jeweiligen `task-*.md` spiegeln (append-only, Duplikate vermeiden).

## Menschliche Lesbarkeit

Die Zeile ist kurz und auf Deutsch/Englisch mischbar lesbar; der Präfix `[{markerVersion}]` markiert Agent-Einträge in der Discussion.
