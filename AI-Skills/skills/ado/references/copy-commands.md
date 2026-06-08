# Copy-Befehle (`## Möglichkeiten`)

Fertig ausgefüllte Zeilen zum Kopieren — **keine** Platzhalter `[Story-ID]` / `[Slug]`.

## Slug- und ID-Auflösung

| Begriff | Regel | Beispiel |
|---------|--------|----------|
| **Story-ID** | `System.Id` / Ordner `UserStory-{id}-*` | `287638` |
| **Task-Dateistamm** | Dateiname in `tasks/` ohne `.md` | `task-maschinenfilter-suchwizard` |

## Task: `## Möglichkeiten` (offen)

Am **Ende** der `task-*.md`, nach `## AI Zusammenfassung` (und ggf. `## Nutzer-ToDos`):

```markdown
## Möglichkeiten

- `buddy intake {taskDateistamm} aus Story {storyId}`
- `buddy repo-check {taskDateistamm} aus Story {storyId}`
- `markiere Task {taskDateistamm} in Story {storyId} als fertig`
- `ToDo für Task {taskDateistamm} in Story {storyId}: `
- `plane Task {taskDateistamm} in Story {storyId}`
```

Beispiel:

```markdown
## Möglichkeiten

- `buddy intake task-maschinenfilter-suchwizard aus Story 287638`
- `buddy repo-check task-maschinenfilter-suchwizard aus Story 287638`
- `markiere Task task-maschinenfilter-suchwizard in Story 287638 als fertig`
- `ToDo für Task task-maschinenfilter-suchwizard in Story 287638: `
- `plane Task task-maschinenfilter-suchwizard in Story 287638`
```

`ToDo …:` mit Leerzeichen nach dem Doppelpunkt — Freitext anhängen.

**Buddy lädt nur** `tasks/{taskDateistamm}.md` — **keine** Story.md / Feature.

## Story: `## Möglichkeiten`

Am **Ende** der Story-`UserStory-{id}-*.md`:

```markdown
## Möglichkeiten

- `load story {storyId}`
- `analyse`
- `save`
- `load feature {parentFeatureId}` *(nur wenn `System.Parent` ein Feature ist; sonst Zeile weglassen)*
- `Story {storyId} auf active`
- `Story {storyId} resolved`
```

`resolved` → Nutzerbestätigung + Ordner löschen ([`op-set-state.md`](op-set-state.md)).

## Workflow-Zuordnung

| Copy-Zeile | Workflow |
|------------|----------|
| `load story …` / `load feature …` | ado — Phase [`phase-load.md`](phase-load.md) |
| `analyse` | ado — Phase [`phase-analyse.md`](phase-analyse.md) |
| `save` | ado — Phase [`phase-save.md`](phase-save.md) |
| `buddy intake …` / `buddy repo-check …` | **buddy-agent** — nur Task.md; [`../../buddy-agent/SKILL.md`](../../buddy-agent/SKILL.md) |
| `markiere Task …`, `ToDo …` | ado — [`op-close-task.md`](op-close-task.md) / [`op-add-todo.md`](op-add-todo.md) |
| `Story … active` / `resolved` | ado — [`op-set-state.md`](op-set-state.md) |
| `plane Task …` | [planning-workflow](../../planning-workflow/SKILL.md) |

**Entfernt:** `prüfe Story/Task/Feature`, `@buddy-agent Task … Plan-Prompt`, `Task … verfeinern` in Möglichkeiten (Legacy `verfeinern` nur noch expliziter Trigger außerhalb des Blocks).

## Wann erzeugen / aktualisieren

| Situation | Block |
|-----------|-------|
| Phase **save** | fehlend → anfügen; vorhanden → Block **ersetzen** (idempotent) |
| Task-Draft in **analyse** | `moeglichkeitenBlock` vorbereiten |
| Umbenennung `task-*.md` | Block neu schreiben bei nächstem **save** |
| `## Umsetzung`, `## Nutzer-ToDos` | **nie** überschreiben |

## Parser (save)

- Block-Grenzen: `## Möglichkeiten` bis vor nächstes `##` oder EOF.
- Ersetzen = gesamten Block inkl. Überschrift neu schreiben.
