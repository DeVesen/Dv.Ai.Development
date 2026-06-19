# Story-Analyse (Phase `analyse`)

Gilt für **eine** User Story nach Phase [`load`](phase-load.md).

- Bei **`load feature`:** `ado-story-pruefe-agent` führt diese Analyse **pro Child-Story** aus (parallel).
- Bei **`load story`:** Orchestrator (`ado-agent`) führt dieselben Schritte **selbst** aus — **kein** Story-SubAgent.

Prompt-Vorlagen: [`subagent-prompts.md`](subagent-prompts.md).

## Rolle

- Load-Bundle + optional Read bestehender lokaler Dateien → **Analyse-Bundle** (Drafts).
- **Parallele** Task-Subagents Modus **`analyse`** — **kein** Schreiben von Story-/Task-MD.

## Input

| Feld | Pflicht | Inhalt |
|------|---------|--------|
| `loadBundle` | ja | Aus [`phase-load.md`](phase-load.md) |
| `storyId` | ja | User-Story-ID |
| `featureContext` | ja bei Feature-Kaskade | Feature-Kontext aus Load |
| `config` | ja | `defaultProject` |

## Ablauf (verbindlich)

1. **Task-Inventar** aus **Story-Description** im Load-Bundle (nicht Feature-Description):
   - `(x)` — [`description-x-markers.md`](description-x-markers.md)
   - Slugs: bestehende `tasks/task-*.md` per Glob **lesen** (Abgleich, keine Duplikate)
2. Discussion-Marker aus Load (ggf. MCP-Nachladen): `TASK-CLOSED`, `TODO` — [`markers.md`](markers.md)
3. **Drafts** (nur im Analyse-Bundle, nicht auf Disk):
   - `## Story-Zusammenfassung` + Blockquote (Anhänge-Namen **nur** wenn Load-Bundle `attachmentNames` hat)
   - `## Feature-Kontext` wenn `featureContext` gesetzt
   - `## Description-Analyse (ADO (x))`
   - `## Task-Übersicht` (Skeleton)
   - `## Möglichkeiten` (Story) — [`copy-commands.md`](copy-commands.md)
4. **Task-Subagents** Modus **`analyse`:** discussion-offene Tasks **ohne** `(x)` **und ohne** effektives `TASK-CLOSED` — [`task-analyse-subagent.md`](task-analyse-subagent.md) (parallel, max. **10**/Welle)
5. Task-Drafts in Analyse-Bundle sammeln; Task-Übersicht-Draft finalisieren

### Ausnahme `(x)` und `TASK-CLOSED`

- `(x)` auf Description-Punkt → **kein** Task-SubAgent nur wegen `(x)`; Liste „Abgeschlossen (laut ADO-Description (x))"
- Effektives `TASK-CLOSED` ohne `(x)` → **kein** Task-SubAgent; Status Offen in Übersicht
- `TASK-CLOSED` mit `(x)` oder ohne Description-Zuordnung → Erledigt; AC-Draft **nicht** ersetzen wenn lokal geschützt

## Task-SubAgent starten

- Agent-Typ: **`ado-task-pruefe-agent`**
- Modus: **`analyse`** (siehe [`task-analyse-subagent.md`](task-analyse-subagent.md))
- Prompt: [`subagent-prompts.md`](subagent-prompts.md) → „Task-SubAgent (`analyse`)"

## Rückgabe

| Feld | Inhalt |
|------|--------|
| `storyId` | ID |
| `status` | `OK` / `FAIL` |
| `analyseBundle` | storyDraft, taskInventory, taskDrafts[] |
| `taskSubagentsStarted` | Anzahl |
| `taskSubagentResults` | slug → OK/FAIL, modelUsed |
| `errors` | … |

## Verboten

- Story.md / task-*.md schreiben
- ADO schreiben
- Code-Stand-Liste ohne explizite Nutzeranfrage in `analyse`
- Buddy / `verfeinern`

## Task-Tool nicht verfügbar

**`BLOCKER`** — keine Analyse durch Rollensimulation.

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*
