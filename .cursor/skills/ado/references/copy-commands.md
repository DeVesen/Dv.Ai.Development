# Copy-Befehle (`## Möglichkeiten`)

Fertig ausgefüllte Zeilen zum Kopieren in den Chat — **keine** Platzhalter `[Story-ID]` / `[Slug/Name]`.

## Slug- und ID-Auflösung

| Begriff | Regel | Beispiel (Datei `tasks/task-maschinenfilter-suchwizard.md`, Story `287638`) |
|---------|--------|-------------------------------------------------------------------------------|
| **Story-ID** | `System.Id` / Ordner `UserStory-{id}-*` | `287638` |
| **Task-Dateistamm** | Dateiname in `tasks/` ohne `.md` (für Copy-Befehle) | `task-maschinenfilter-suchwizard` |
| **Marker-`task-slug`** | Wie in [markers.md](markers.md): Dateiname ohne `tasks/task-` und ohne `.md` | `task-maschinenfilter-suchwizard` |

Copy-Befehle in `## Möglichkeiten` nutzen den **Task-Dateistamm** (voller `task-…`-Name wie in `prüfe`-Triggern: `Task task-… erledigt`).

## Verfeinern unter `## Offene Fragen`

Nur wenn `## Offene Fragen` existiert und **mindestens eine** Bullet-Frage (`- …`) enthält (nicht nur Platzhalter).

Direkt nach der letzten Fragen-Bullet (eine Leerzeile danach optional):

```markdown
`Task {taskDateistamm} in Story {storyId} verfeinern`
```

Beispiel:

```markdown
`Task task-maschinenfilter-suchwizard in Story 287638 verfeinern`
```

Ohne echte Fragen: **keine** Zeile unter `## Offene Fragen` — nur `verfeinern` in `## Möglichkeiten`.

## Task: `## Möglichkeiten` (offen)

Am **Ende** der `task-*.md`, nach `## Nutzer-ToDos`:

```markdown
## Möglichkeiten

- `@buddy-agent Task {taskDateistamm} in Story {storyId} — Plan-Prompt, kurz, ohne Code`
- `markiere Task {taskDateistamm} in Story {storyId} als fertig`
- `ToDo für Task {taskDateistamm} in Story {storyId}: `
- `Task {taskDateistamm} in Story {storyId} verfeinern`
- `plane Task {taskDateistamm} in Story {storyId}`
```

`ToDo …:` mit Leerzeichen nach dem Doppelpunkt — Freitext vom Nutzer anhängen.

## Story: `## Möglichkeiten`

Am **Ende** der Story-`UserStory-{id}-*.md`:

```markdown
## Möglichkeiten

- `prüfe Story {storyId}`
- `prüfe Feature {parentFeatureId}` *(nur wenn `System.Parent` ein Feature ist; sonst Zeile weglassen)*
- `Story {storyId} auf active`
- `Story {storyId} resolved`
```

`resolved` → Skill-Operation mit Nutzerbestätigung und Löschung des Story-Ordners.

## Workflow-Zuordnung (keine ADO-MCP-Ops)

| Copy-Zeile | Workflow |
|------------|----------|
| `prüfe Story …` | ado — Story-`prüfe` |
| `prüfe Feature …` | ado — Feature-`prüfe` (alle Child-Stories + `## Feature-Kontext`) |
| `markiere Task … als fertig`, `ToDo für Task …` | ado — Task fertig / ToDo |
| `Story … auf active` / `… resolved` | ado — State setzen |
| `@buddy-agent Task … — Plan-Prompt …` | **buddy-agent** — [../../../agents/buddy-agent.md](../../../agents/buddy-agent.md); End-Artefakt für `plane Task`; **kein** ADO-MCP |
| `Task … verfeinern` (**Legacy**) | ado — [task-verfeinern.md](task-verfeinern.md): interaktiver Klärungsworkflow (Phasen 1–4 read-only, Phase 5 nach Freigabe); **kein** Vorgehen/Planning-Planpaket in die Datei; **kein** ADO-MCP |
| `plane Task …` | [planning-workflow](../../planning-workflow/SKILL.md) — finales Planpaket + Umsetzungs-Topologie **im Chat**; Task `### Planung` / `AC-P*`; **kein** ADO-MCP |

## Wann erzeugen / aktualisieren

| Situation | `## Möglichkeiten` | Verfeinern unter Offene Fragen |
|-----------|-------------------|--------------------------------|
| Neue `task-*.md` aus Template | aus Template | nur wenn Fragen-Bullets im Template-Inhalt |
| `prüfe` | fehlend → anfügen; vorhanden → Block **ersetzen** (siehe SKILL) | setzen/aktualisieren wenn ≥1 Frage; nicht duplizieren |
| Umbenennung `task-*.md` | Block neu schreiben | Slug anpassen |
| Nutzer: „Möglichkeiten aktualisieren" | gezielt neu | optional |
| `## Umsetzung`, `## Nutzer-ToDos` | **nie** überschreiben | nur Verfeinern-Zeile in `## Offene Fragen` |
| Task-Inhalts-Abschnitte (`## Anforderung`, `## Offene Fragen`, `## Akzeptanzkriterien`) | nur bei **`Task … verfeinern` Phase 5** nach Nutzer-Freigabe ersetzen | Verfeinern-Zeile bei Fragen |
| `## Story-Bezug` | bei `verfeinern` nur bei geänderter Story-Quelle; bei `prüfe` durch Task-SubAgent | — |
| Legacy-Abschnitte (Original Text, Zielsetzung, Vorgehen, …) | bei `prüfe`/`verfeinern` entfernen falls vorhanden | — |

## Parser-Hinweis für `prüfe`

- Block-Grenzen: von Zeile `## Möglichkeiten` bis vor nächstes `## …` oder Dateiende.
- Ersetzen = gesamten Block inkl. Überschrift neu schreiben (idempotent, keine doppelten Überschriften).
- Nutzer-manuell ergänzte Zeilen im Block können bei `prüfe`-Sync verloren gehen — dokumentiert; Erweiterungen außerhalb des Blocks oder nach expliziter Nutzeranweisung.
