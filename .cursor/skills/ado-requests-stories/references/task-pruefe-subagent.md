## Parameter

| Parameter | Beschreibung |
|-----------|-------------|
| `{code-root}` | Wurzelpfad des Code-Repositories (z. B. `my-project/`) |
| `{frontend-path}` | Pfad zum Frontend-Projekt innerhalb von `{code-root}` |
| `{backend-path}` | Pfad zum Backend-Projekt innerhalb von `{code-root}` |

# Task-SubAgent (`prüfe` — Task-MD + Code-Analyse)

Ein Task-SubAgent pro abgeleitetem **discussion-offenen** Task. Wird vom **Story-SubAgent** oder vom **Hauptagenten** (bei `prüfe Story`) nach der Story-Phase gestartet.

Prompt-Vorlagen: [subagent-prompts.md](../subagent-prompts.md).

## Abgrenzung zu `Task … verfeinern`

| | `prüfe` (dieser SubAgent) | `Task … verfeinern` |
|---|---------------------------|---------------------|
| Code | Ein Agent, Repo-Scout im Scope | Optional read-only Scouts in Phase 1; interaktiver Dialog mit Nutzer |
| Review | **Kein** interaktiver Klärungsdialog | 5-Phasen-Ablauf mit Nutzer-Freigabe vor MD-Schreiben |
| Chat | Kurzer Task-Bericht an Orchestrator | Zusammenfassung + Fragen im Chat (Phasen 1–4) |
| MD-Schema | Schlankes Initial-Schema | Ausgearbeitete Anforderung nach Freigabe |

## Modell

Ziel-Profil [ado-task-pruefe-agent.md](../../../agents/ado-task-pruefe-agent.md). Aufrufer: [subagent-model-before-task.md](../../../references/subagent-model-before-task.md) — Slugs **nicht** hier duplizieren.

## Input-Bundle (Pflicht im Prompt)

| Block | Inhalt |
|-------|--------|
| `featureContext` | Verdichtete Feature-Zusammenfassung **oder** explizit `kein Feature` |
| `story` | `storyId`, `title`, `adoUrl`, Description-Auszug, AC-Kurz, Discussion-Kurz (kein HTML-Rohdump) |
| `task` | `slug`, `label`, `originalText` (Story-Auszug für diesen Task) |
| `paths` | `storyFolder`, `taskFilePath` = `{storyFolder}/tasks/task-{slug}.md` |

## Ablauf (verbindlich)

1. **Codebase-Scout** (read-only) im Repo unter `{code-root}/`:
   - Scope aus Task/Story ableiten: typisch `{frontend-path}`, `{backend-path}`, ggf. weitere Stacks.
   - **Recherche-Reihenfolge (Pflicht):** Bei Bezug auf Klassen, Methoden, Services, Components oder Routen zuerst `index_project` + `find_in_index` (MCP `code-review-mcp`), dann `Read`; Grep nur ergänzend. UI-only-Begriffe ohne Symbol (Button-Label, Feldname) ausnehmen. Siehe [code-review-mcp — Code-Landkarte](../../../skills/code-review-mcp/SKILL.md#code-landkarte--verbindliche-recherche-reihenfolge).
   - Konkrete Dateien, Einstiegspunkte, Nachbarschaft — **keine** Implementierung.
2. **`tasks/task-{slug}.md`** anlegen oder aktualisieren mit **schlankem Schema** ([task-verfeinern.md](task-verfeinern.md#pflichtabschnitte-in-der-task-md)):
   - `## Story-Bezug` — Story-Zitat für diesen Task (bei Neuanlage; bei bestehender Datei nur wenn Story-Quelle geändert)
   - `## Anforderung` — knappe erste Interpretation (Agent-Verständnis)
   - `## Offene Fragen`
   - `## Akzeptanzkriterien` inkl. `### Lesbar`, `### Planung`, `### Umsetzung`, `### Testabsicherung` — [acceptance-criteria.md](acceptance-criteria.md)
3. **Legacy-Abschnitte entfernen** (falls vorhanden): `## Original Text`, `## Zielsetzung`, `## Vorgehen`, `## Ablauf (Sequenzdiagramme)`, `## Nicht im Scope`, `## Erlebnis im Zusammenspiel (Frontend & Backend)`, `## Verfeinerung (Meta)`.
4. **`## Möglichkeiten`:** Block ersetzen ([copy-commands.md](copy-commands.md)).
5. Unter `## Offene Fragen`: Copy-Zeile `` `Task {slug} in Story {storyId} verfeinern` `` nur bei ≥1 echter Frage.

**Hinweis in Task-Bericht:** Für ausgearbeitete Anforderung → `Task {slug} in Story {storyId} verfeinern` (interaktiver Klärungsworkflow).

## Geschützt (nicht überschreiben)

- `## Umsetzung`, `## Nutzer-ToDos`
- Bei effektivem `TASK-CLOSED`: gesamter `## Akzeptanzkriterien`-Block — Task-SubAgent **nicht** starten (Entscheidung Story-Phase)
- `## Story-Bezug`: nur bei geänderter Story-Quelle aktualisieren

## Verboten in der Task-MD

- `## Umsetzungs-Topologie`, `IMP-*`-Tabellen, finales Planpaket
- `## Vorgehen`, `## Zielsetzung`, separate Mermaid-Abschnitte, `## Verfeinerung (Meta)`
- Scout-Rohlog, Review-Volltext

## Rückgabe an Story-Orchestrator

| Feld | Inhalt |
|------|--------|
| `slug` | Task-Slug |
| `status` | `OK` / `FAIL` |
| `modelUsed` | Erster erfolgreicher Slug der Kette |
| `sectionsUpdated` | Liste der geschriebenen `##`-Abschnitte |
| `legacySectionsRemoved` | Entfernte Legacy-Abschnitte (falls bereinigt) |
| `codeTouchpoints` | Kurz: relevante Pfade (max. 10 Zeilen) |
| `openQuestions` | Anzahl / Kurzfassung |
| `errors` | Fehler falls `FAIL` |

## Task-Tool nicht verfügbar

Orchestrator meldet **`BLOCKER`** — dieser SubAgent-Lauf entfällt; Task ggf. nur als Stub + Hinweis im Story-Bericht.
