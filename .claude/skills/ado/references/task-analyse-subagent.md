# Task-SubAgent (Phase `analyse` — Draft only)

Ein Lauf pro discussion-offenem Task. Wird vom Story-Orchestrator oder `ado-story-pruefe-agent` in Phase **`analyse`** gestartet.

**Modus `analyse`:** Code-Scout + **Task-Draft** zurück — **kein** Schreiben von `task-*.md`. Persistenz nur via [`phase-save.md`](phase-save.md).

Prompt-Vorlagen: [`subagent-prompts.md`](subagent-prompts.md).

## Abgrenzung

| | Phase `analyse` (dieser SubAgent) | Phase `save` |
|---|-----------------------------------|--------------|
| Code-Scout | Ja (read-only, MCP bevorzugt) | Nein |
| Output | `taskDraft` im Analyse-Bundle | Datei `tasks/task-{slug}.md` |
| Buddy | Nein | Nein |

## Modell

Profil `ado-task-pruefe-agent` (im Projekt deployed). Modell: `auto`.

## Input-Bundle

| Block | Inhalt |
|-------|--------|
| `mode` | **`analyse`** (Pflicht in Phase analyse) |
| `featureContext` | Feature-Zusammenfassung oder `kein Feature` |
| `story` | `storyId`, title, adoUrl, Description-/AC-/Discussion-Kurz aus Load-Bundle |
| `task` | `slug`, `label`, `originalText` |
| `paths` | `storyFolder`, `taskFilePath` (geplant, für Möglichkeiten-Draft) |

## Ablauf Modus `analyse`

1. **Codebase-Scout** read-only — MCP-Kette `codebase-analyzer` bevorzugt: `index_project` → `find_in_index`; Read/Grep nur Fallback.
2. **Task-Draft** (strukturiert, **nicht** als Datei):
   - `## Anforderung` (knapp)
   - `## Offene Fragen`
   - `## Story-Bezug`
   - `## Akzeptanzkriterien` — Bullets, keine IDs ([`acceptance-criteria.md`](acceptance-criteria.md))
   - `## AI Zusammenfassung` — Caveman Ultra
   - `moeglichkeitenBlock` — aus [`copy-commands.md`](copy-commands.md) (buddy intake/repo-check, markiere fertig, ToDo, plane)
3. Bestehende Task-MD **lesen:** Legacy-Abschnitte für Save markieren (`legacySectionsRemoved`); geschützte Blöcke bei `TASK-CLOSED` notieren.

## Rückgabe

| Feld | Inhalt |
|------|--------|
| `slug` | Task-Slug |
| `status` | `OK` / `FAIL` |
| `modelUsed` | `auto` (oder Profil-Slug) |
| `taskDraft` | Abschnitte + moeglichkeitenBlock |
| `legacySectionsRemoved` | Liste (für save) |
| `openQuestions` | Kurz |
| `errors` | bei FAIL |

## Verboten in `analyse`

- `task-*.md` schreiben
- ADO schreiben
- Produktcode implementieren
- Buddy / interaktives `verfeinern`

## Task-Tool nicht verfügbar

Orchestrator: **`BLOCKER`**; Task nur im Inventar ohne Draft.

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*
