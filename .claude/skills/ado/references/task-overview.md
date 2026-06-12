# Task-Übersicht in der Story-MD (`## Task-Übersicht`)

Vier Listen unter `## Task-Übersicht` — **gegenseitig ausschließend** pro `task-slug`:

| Abschnitt | Bedeutung | Wann befüllen |
|-----------|-----------|----------------|
| `### Abgeschlossen (laut ADO-Description (x))` | Description-Hauptpunkt mit `(x)` markiert; Slug diesem Punkt zugeordnet | Parsing [description-x-markers.md](description-x-markers.md) |
| `### Abgeschlossen (laut Discussion / TASK-CLOSED)` | Task ist per Story-Discussion geschlossen (effektiver Marker, siehe [markers.md](markers.md)) | Letzter relevanter Marker = `TASK-CLOSED`, kein späteres `TASK-REOPENED`; Slug **nicht** bereits unter `(x)` |
| `### Abgeschlossen (laut Code-Stand)` | Task wirkt im Repo umgesetzt — **nur** nach explizitem Repo-Abgleich | Nutzer verlangt Code-/Repo-Scout **und** Task ist weder `(x)`- noch discussion-geschlossen |
| `### Offen (empfohlene Reihenfolge)` | Description-Punkt **ohne `(x)`** oder kein Abschluss-Signal | Standard; **auch** wenn früher `TASK-CLOSED`, aber Description-Punkt ohne `(x)` |

## Verbindliche Trennung ((x) vs. Discussion vs. Code-Stand)

1. **`(x)`-abgeschlossene Tasks** stehen **ausschließlich** unter `### Abgeschlossen (laut ADO-Description (x))` — Priorität siehe [description-x-markers.md](description-x-markers.md).
2. **Discussion-geschlossene Tasks** stehen unter `### Abgeschlossen (laut Discussion / TASK-CLOSED)` — **nur** wenn der Slug keinem Description-Punkt mit `(x)` zugeordnet ist und nicht unter Offen wegen fehlendem `(x)` stehen muss.
3. **Discussion-geschlossene Tasks** dürfen **nicht** unter `### Abgeschlossen (laut Code-Stand)` stehen.
4. **Code-Stand-Liste** enthält nur Tasks ohne `(x)`-Abschluss und ohne effektives `TASK-CLOSED`, nach explizitem Repo-Abgleich.
5. Derselbe Wikilink darf **nicht** in zwei der vier Abschnitte gleichzeitig vorkommen.
6. Description-Punkt **ohne `(x)`** → Slug unter **Offen**, auch bei historischem `TASK-CLOSED`.

## `analyse` / `save` — kein Code-Abgleich für discussion-geschlossene Tasks

Für jeden Task mit effektivem `TASK-CLOSED` gilt bei **analyse** und Feature-Kaskade:

| Aktion | Erlaubt? |
|--------|----------|
| Marker parsen, Task unter Discussion-Liste führen, `**Status:** Erledigt` in `task-*.md` | ja |
| Task aus Code-Stand-Liste **entfernen** | ja (Pflicht, falls noch vorhanden) |
| Repo-Scout / Code-Stand-Checkbox setzen oder aktualisieren | **nein** |
| Testabsicherung-Status aus Repo-Lauf ableiten oder „grün" schätzen | **nein** |
| `## Akzeptanzkriterien`-Block aus Repo neu ableiten | **nein** — bestehenden Block **beibehalten**; nur anlegen wenn Abschnitt **komplett fehlt** |

**Repo-Abgleich (Code-Stand)** nur, wenn der Nutzer das **explizit** verlangt (z. B. „Code-Stand prüfen", „Repo-Abgleich für Story …") — und dann **nur** für Tasks **ohne** effektives `TASK-CLOSED`.

## Marker-Sync (Schritt bei `analyse` / `save` / Task schließen)

1. Description `(x)` parsen → Tabelle + Zuordnung `xClosedSlugs` / `xOpenSlugs` ([description-x-markers.md](description-x-markers.md)).
2. Discussion-Kommentare parsen → Menge `discussionClosedSlugs`.
3. Story-MD `## Description-Analyse (ADO (x))` ersetzen; `## Task-Übersicht` neu ordnen:
   - Slug in `xClosedSlugs` → **(x)**-Liste (`[x]`).
   - Slug in `xOpenSlugs` → **Offen** (`[ ]`), aus Discussion/Code-Stand/(x) entfernen.
   - Slug in `discussionClosedSlugs`, nicht in `xOpenSlugs`, nicht in `xClosedSlugs` → **Discussion**.
   - Verbleibende Slugs: **Offen**, sofern nicht per explizitem Code-Scout unter Code-Stand.
4. `task-*.md`: `**Status:**` anpassen (`Erledigt (laut ADO (x))`, `Erledigt (laut Discussion)`, `Offen`); `## Umsetzung` / `## Analyse` nicht blind überschreiben.

## Blockquote-Hinweis (Story-Kopf)

Empfohlener Zusatz in der Blockquote unter `## Story-Zusammenfassung`:

```markdown
> Tasks mit `TASK-CLOSED` stehen nur unter „Abgeschlossen (laut Discussion)" — kein Code-Stand-Abgleich bei `analyse`.
```

## TASK-REOPENED

Nach effektivem `TASK-REOPENED`: Task aus **Discussion-Abgeschlossen** entfernen, unter **Offen** führen, `**Status:**` in Task-MD anpassen; Code-Stand erst wieder nur nach explizitem Repo-Abgleich.
