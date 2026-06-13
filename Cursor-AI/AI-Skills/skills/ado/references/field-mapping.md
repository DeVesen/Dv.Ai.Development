# ADO-Felder → Story-Markdown

## Story-Metatable (`## Story-Zusammenfassung`)

| Markdown-Zeile | ADO-Feld | Hinweis |
|----------------|----------|---------|
| Titel | `System.Title` | |
| Type | `System.WorkItemType` | User Story, Task, Feature, … |
| Status | `System.State` | Nach `active`/`resolved` lokal mitziehen |
| Priorität | `Microsoft.VSTS.Common.Priority` | falls leer: `—` |
| Parent-No | `System.Parent` | Link `…/_workitems/edit/{parentId}` |
| Direkt-Link | `System.Id` + `defaultProject` | aus [../config.defaults.json](../config.defaults.json) |

## Blockquote unter der Tabelle

Vorlage (anpassen nach Abruf):

```markdown
> **Quellen in DevOps:** Description … · Acceptance Criteria … · Discussions: N Kommentare · Anhänge: name1, name2 *(nur wenn MCP geliefert — sonst weglassen)*
> „Abgeschlossen (laut Code-Stand)" = nur bei explizitem Repo-Abgleich; nie für `TASK-CLOSED`-Tasks.  
> Task „fertig" (Discussion): `TASK-CLOSED` — nur unter „Abgeschlossen (laut Discussion)"; siehe [task-overview.md](task-overview.md).
```

## Description → Task-Dateien

- Description **lesen** zur Ableitung neuer `task-*.md` (Überschriften, nummerierte Punkte).
- **`(x)`-Markierungen** parsen und in `## Description-Analyse (ADO (x))` + Task-Übersicht übernehmen — [description-x-markers.md](description-x-markers.md).
- **`## Story-Bezug`:** relevante Auszüge aus der **Story-**Description (und ggf. `## Feature-Kontext`), die diesen Task inspirieren — wörtlich oder als Zitatblock (ersetzt früheres `## Original Text`).
- **`## Anforderung`:** erste knappe **Interpretation** der Anforderung (Agent-Verständnis); bei `verfeinern` nach Nutzer-Freigabe ausarbeiten — nicht Story-Rohzitat duplizieren.
- **Nicht** per MCP zurückschreiben.
- Bestehende Task-Dateien: `## Umsetzung`, `## Nutzer-ToDos` **nicht** überschreiben — nur Kopfzeile `**Status:**` und Story-Checkboxen bei Marker-Sync. Anforderung/ACs bei **`Task … verfeinern`** nach Nutzer-Freigabe — [task-verfeinern.md](task-verfeinern.md).
- **`## Akzeptanzkriterien`** bei **analyse/save** pflegen (Block aus Task-Draft) — [acceptance-criteria.md](acceptance-criteria.md).

## Slug aus Titel

1. Titel bereinigen (Sonderzeichen entfernen)
2. Kebab-case für `task-{slug}.md`
3. Story-Ordner: `UserStory-{id}-{PascalOrKebabFromTitle}` — am Referenzbeispiel #287638 orientieren: `UserStory-287638-ZweiteFeedbackschleifePhilipp`

Bestehenden Ordner per Glob `UserStory-{id}-*` finden; nicht zweimal anlegen.

## `## Feature-Kontext` (Feature-Load / save)

Platzierung in der Story-MD: direkt **nach** `## Story-Zusammenfassung`, **vor** `## Task-Übersicht`.

| Regel | Detail |
|-------|--------|
| Wann setzen | `load feature` + **save** für jede Child-Story mit gleichem `featureContext` |
| Block-Grenzen | Von `## Feature-Kontext` bis vor nächstes `## …` oder EOF — bei Sync **gesamten Block ersetzen** (idempotent) |
| Inhalt | Link zum Parent-Feature; verdichtete Zusammenfassung aus Feature-**Description**, **AC**, **Discussion** (kein vollständiger HTML-Rohdump) |
| Geschützt | `## Umsetzung`, `## Nutzer-ToDos` in Tasks — **nicht** durch Feature-Kontext ersetzen |
| Tasks ableiten | Weiterhin nur aus **Story-**Description, nicht aus Feature-Description |

Mindeststruktur:

```markdown
## Feature-Kontext

Parent-Feature: [#{featureId} {featureTitle}]({featureAdoUrl}) · Sync {datum}

### Description (Zusammenfassung)

{kurz}

### Acceptance Criteria (Zusammenfassung)

{kurz oder „nicht gepflegt"}

### Discussion (Zusammenfassung)

{kurz; keine TASK-CLOSED der Stories hierher mischen}
```

Ablauf Feature-Kaskade: [feature-pruefe.md](feature-pruefe.md).

## `## Task-Übersicht` (vier Listen)

Vollständige Regeln: [task-overview.md](task-overview.md), `(x)`: [description-x-markers.md](description-x-markers.md).

- **`(x)` in Description:** Slug unter `### Abgeschlossen (laut ADO-Description (x))`.
- **`TASK-CLOSED`:** Slug nur unter `### Abgeschlossen (laut Discussion / TASK-CLOSED)` wenn kein `(x)`-Abschluss und nicht wegen fehlendem `(x)` offen.
- **Ohne `(x)` auf zugeordnetem Description-Punkt:** Slug unter **Offen**, auch bei historischem `TASK-CLOSED`.
- **Code-Stand:** nur discussion-offene Tasks ohne `(x)`; nur nach explizitem Nutzer-Repo-Scout.

## Copy-Befehle (`## Möglichkeiten`)

- Kanonische Vorlagen und **save**-Sync: [copy-commands.md](copy-commands.md).
- **Task-Dateistamm** für Copy-Zeilen = Dateiname in `tasks/` ohne `.md` (z. B. `task-maschinenfilter-suchwizard`).
