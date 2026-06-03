# Story-SubAgent (`prüfe` — Story-Phase)

Gilt, wenn der **Hauptagent** bei **`prüfe Feature`** pro Child-User-Story einen **Story-SubAgent** startet. Bei **`prüfe Story {id}`** (gezielt) führt der **Hauptagent** dieselbe Story-Phase **selbst** aus — **kein** Story-SubAgent.

Prompt-Vorlagen: [../subagent-prompts.md](../subagent-prompts.md).

## Rolle

- **Story-Orchestrator:** ADO-Story lesen, lokales Story-Artefakt pflegen, Task-Inventar ableiten, **parallele Task-Subagents** starten, Task-Übersicht finalisieren.
- **Kein** vollständiges Schreiben der Task-Verfeinerungs-Inhalte im Story-Turn — das übernehmen [task-pruefe-subagent.md](task-pruefe-subagent.md).
- **Kein** interaktives `Task … verfeinern` in diesem Lauf — das führt der Orchestrator/Hauptagent separat.

## Modell

Ziel-Profil [../../agents/ado-story-pruefe-agent.md](../../agents/ado-story-pruefe-agent.md). Aufrufer: [../../../references/subagent-model-before-task.md](../../../references/subagent-model-before-task.md) — Slugs **nicht** hier duplizieren.

## Input (vom Hauptagenten)

| Feld | Pflicht | Inhalt |
|------|---------|--------|
| `storyId` | ja | Child-User-Story-ID |
| `featureContext` | ja bei Feature-Kaskade | Objekt aus [feature-pruefe.md](feature-pruefe.md) Phase A (`featureId`, `featureTitle`, `featureAdoUrl`, `descriptionSummary`, `acSummary`, `discussionSummary`) |
| `config` | ja | `defaultProject` aus [../config.defaults.json](../config.defaults.json) |

## Ablauf (verbindlich)

1. **MCP `ado`:** `wit_get_work_item` für `storyId`; `wit_list_work_item_comments` **nur** für die Story ([markers.md](markers.md)).
2. **Ordner:** `requests/stories/UserStory-{storyId}-*` suchen oder anlegen ([field-mapping.md](field-mapping.md)).
3. **Story-MD:** Kopf/`## Story-Zusammenfassung` aktualisieren ([../templates/story.md.template](../templates/story.md.template)).
4. **`## Feature-Kontext`:** gesamten Block ersetzen (idempotent), wenn `featureContext` gesetzt — [field-mapping.md](field-mapping.md).
5. **Task-Inventar** aus **Story-Description** ableiten ( **nicht** Feature-Description):
   - Zuerst `(x)`-Markierungen parsen — [description-x-markers.md](description-x-markers.md).
   - Je Task: `slug` (kebab), `label`, `originalTextExcerpt`, `adoXDone` (ja/nein), optional `priority`/`order`.
   - Bestehende lokale `task-*.md`-Slugs berücksichtigen; keine Duplikate; fehlende Tasks für Punkte **ohne `(x)`** anlegen.
6. **`## Description-Analyse (ADO (x))`** in Story-MD ersetzen (idempotent).
7. **`## Task-Übersicht`:** Skeleton + Sync `(x)` / `TASK-CLOSED` / `TODO` ([task-overview.md](task-overview.md)) — **ohne** Code-Stand-Scout.
8. **`## Möglichkeiten`** an Story-MD: Block ersetzen ([copy-commands.md](copy-commands.md)).
9. **Task-Subagents:** Für jeden Inventar-Eintrag **ohne** `(x)` auf zugeordnetem Description-Punkt **und ohne** effektives `TASK-CLOSED` einen [Task-SubAgent](task-pruefe-subagent.md) starten (parallel, max. **10** pro Welle; Host-Batching bei mehr).
10. **Nach allen Task-Subagents:** Task-Übersicht finalisieren (Wikilinks `[[tasks/task-{slug}|>> Label <<<]]`, Listen `(x)` / discussion / offen / Code-Stand).
11. **Stub-Dateien:** Für neue Tasks minimal `tasks/task-{slug}.md` anlegen (Kopf + `## Story-Bezug`), falls der Task-SubAgent noch nicht geschrieben hat — oder Task-SubAgent legt vollständige Datei an.

### Ausnahme `(x)` und `TASK-CLOSED`

Tasks mit `(x)` auf zugeordnetem Description-Punkt:

- Unter **`### Abgeschlossen (laut ADO-Description (x))`** führen; **kein** Task-SubAgent nur wegen `(x)`.

Tasks mit effektivem `TASK-CLOSED` ([markers.md](markers.md)), deren Description-Punkt **ohne `(x)`**:

- **Kein** Task-SubAgent für Verfeinerungs-/AC-Blöcke.
- Story-Phase: unter **Offen** führen (`**Status:** Offen`); historisches `TASK-CLOSED` in Task-MD/Discussion unverändert lassen.

Tasks mit effektivem `TASK-CLOSED` **ohne** Description-Zuordnung oder mit `(x)`:

- **Kein** Task-SubAgent für Verfeinerungs-/AC-Blöcke bei `(x)` oder discussion-closed ohne `(x)`-Konflikt.
- Story-Phase: Status **Erledigt**, Checkbox unter „Abgeschlossen (laut Discussion / TASK-CLOSED)" bzw. `(x)`; `## Akzeptanzkriterien` **nicht** ersetzen ([acceptance-criteria.md](acceptance-criteria.md)).

## Task-SubAgent starten

- Prompt: [../subagent-prompts.md](../subagent-prompts.md) → „Task-SubAgent (`prüfe`)".
- Payload: `featureContext` (oder explizit „kein Feature"), Story-Payload (Titel, ID, Description-/AC-Kurz, Discussion-Kurz), Task-Spec (`slug`, `label`, `originalText`), Pfade `storyFolder`, `storyMdPath`.
- Modell Task-SubAgent: siehe [task-pruefe-subagent.md](task-pruefe-subagent.md#modell).

## Rückgabe an Hauptagenten (Story-Bericht)

Strukturiert, kurz:

| Feld | Inhalt |
|------|--------|
| `storyId` | ID |
| `status` | `OK` / `FAIL` |
| `storyFolder` | Pfad |
| `taskInventoryCount` | Anzahl abgeleiteter Tasks |
| `taskSubagentsStarted` | Anzahl gestarteter Task-Subagents |
| `taskSubagentResults` | Liste: `slug` → `OK`/`FAIL`, Modell-Slug, geänderte `##`-Abschnitte |
| `errors` | MCP- oder Subagent-Fehler |

## Parallelität

- Mehrere Story-Subagents laufen **parallel** auf Feature-Ebene (Hauptagent).
- Pro Story: Task-Subagents **parallel** (max. 10/Welle).
- Story-SubAgent **darf** Task-Subagents in **einem** Turn batchen (mehrere `Task`-Aufrufe), sofern der Host es erlaubt.

## Verboten

- ADO `System.Description` / Acceptance Criteria schreiben.
- Feature-Description als Quelle für neue Tasks.
- Code-Stand-Liste „Abgeschlossen (laut Code-Stand)" ohne explizite Nutzeranfrage.
- IMP-Tabellen, Planpaket, Scout-Rohlog in Story-MD.
- Interaktives `Task … verfeinern` in diesem Lauf.

## Task-Tool nicht verfügbar

Wie [../SKILL.md](../SKILL.md): **`BLOCKER`** — keine Story-Phase durch Rollensimulation ersetzen.
