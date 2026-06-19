# ADO-Description: `(x)`-Markierungen (Story-Analyse)

Projektleitung markiert in `System.Description` erledigte nummerierte Punkte mit **`(x)`** am Anfang (Varianten: `(x)`, `(X)`, `( x )`). Diese Markierung dient der **Story-Analyse** (Phase `analyse`) und **Task-Übersicht** (Phase `save`).

## Erkennung (Parsing)

Quelle: `System.Description` (HTML) der **Story** — nicht Feature-Description.

1. HTML in lesbare Listenzeilen überführen (nummerierte `<ol>` / `<li>`, ggf. verschachtelt).
2. Pro Listeneintrag prüfen, ob der sichtbare Text mit `(x)` beginnt (case-insensitive, optional Leerzeichen).
3. `(x)` entfernen → `label` / `originalTextExcerpt` für Task-Mapping.
4. Abschnittsüberschriften im Fließtext (z. B. „Suchwizard:", „Ansicht der Suchergebnisse:") als Kontext für `section` mitführen.
5. Verschachtelte Unterpunkte (a/b/c) **nicht** als eigene Top-Level-Tasks zählen, wenn sie zum übergeordneten nummerierten Punkt gehören — Ausnahme: Nutzer oder Task-MD trennt sie explizit.

## Story-MD: `## Description-Analyse (ADO (x))`

Bei **`analyse`** / **`save`** den Abschnitt **nach** `## Story-Zusammenfassung` (und ggf. `## Feature-Kontext`) **vor** `## Task-Übersicht` pflegen — bei **save** gesamten Block ersetzen (idempotent).

Mindeststruktur:

```markdown
## Description-Analyse (ADO (x))

Sync {datum} · Quelle: Story-Description · PM markiert erledigt mit `(x)`

| # | Abschnitt | ADO-Punkt (Kurz) | (x) | Lokaler Task-Slug |
|---|-----------|------------------|-----|-------------------|
| 1 | Suchwizard | Mehrfachauswahl Type of joint / weld | ja | task-mehrfachauswahl-type-of-joint-weld |
| 2 | Suchwizard | Alloy + Thickness Min/Max | nein | task-material-thickness-minmax |
```

Regeln:

- **Eine Zeile pro nummeriertem ADO-Hauptpunkt** (nicht pro Unterpunkt a/b/c).
- Spalte **(x):** `ja` / `nein`.
- Spalte **Lokaler Task-Slug:** bestehender `task-*.md`-Dateistamm oder `— (neu anlegen)` bis Datei existiert.
- Kein HTML-Rohdump; Kurztext aus Description.

## Task-Inventar und Mapping

Bei Ableitung des Task-Inventars ([`story-analyse-subagent.md`](story-analyse-subagent.md)):

1. Zuerst `(x)`-Tabelle aus Description parsen.
2. Bestehende lokale `task-*.md`-Slugs per Label/Originaltext zuordnen (keine Duplikate).
3. Punkt **ohne `(x)`** und **ohne** passenden Task → Eintrag in `taskDrafts[]` / Inventar; physische `tasks/task-{kebab-slug}.md` erst in [`phase-save.md`](phase-save.md).
4. Punkt **mit `(x)`** und **ohne** Task → optional Stub in **save**; unter „Abgeschlossen (laut ADO-Description (x))" führen (selten).

## Task-Übersicht: vierte Liste

Ergänzung zu [task-overview.md](task-overview.md) — **gegenseitig ausschließend** pro Slug:

| Abschnitt | Bedeutung |
|-----------|-----------|
| `### Abgeschlossen (laut ADO-Description (x))` | Description-Punkt ist mit `(x)` markiert; lokaler Task diesem Punkt zugeordnet |
| `### Abgeschlossen (laut Discussion / TASK-CLOSED)` | Effektiver Discussion-Marker — nur wenn Slug **nicht** bereits unter `(x)` oder Code-Stand |
| `### Abgeschlossen (laut Code-Stand)` | Nur nach explizitem Repo-Scout; Slug nicht unter `(x)` oder Discussion |
| `### Offen (empfohlene Reihenfolge)` | Description-Punkt **ohne `(x)`** oder kein Abschluss-Signal |

### Priorität bei `analyse` / `save` (verbindlich)

1. Slug einem Description-Hauptpunkt **mit `(x)`** zugeordnet → nur unter **`(x)`**-Liste (`[x]`).
2. Slug einem Description-Hauptpunkt **ohne `(x)`** zugeordnet → nur unter **Offen** (`[ ]`) — **auch** wenn früher `TASK-CLOSED` in Discussion (PM-Signal hat Vorrang für Description-Punkte).
3. Effektives `TASK-CLOSED` **ohne** Description-Mapping → Discussion-Liste.
4. Code-Stand nur nach expliziter Nutzeranfrage; nie für Slugs unter `(x)` oder Discussion.

**Hinweis in Task-MD:** Wechsel von Erledigt → Offen wegen fehlendem `(x)`: `**Status:** Offen` und kurzer Bullet unter `## Nutzer-ToDos` oder `## Anforderung`: `PM: ADO-Punkt ohne (x) — erneut offen (Sync {datum}).`

## Blockquote (Story-Kopf)

Ergänzung in der Blockquote unter `## Story-Zusammenfassung`:

```markdown
> Description `(x)` = PM markiert erledigt — siehe `## Description-Analyse (ADO (x))` und [description-x-markers.md](description-x-markers.md).
```

## Verboten

- `(x)` in ADO per MCP setzen oder entfernen.
- `(x)` allein als `TASK-CLOSED`-Ersatz in Discussion schreiben.
- Description-Punkt ohne `(x)` unter Discussion-Abgeschlossen belassen, wenn Slug eindeutig zugeordnet ist.
