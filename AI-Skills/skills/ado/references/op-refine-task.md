# ADO Task verfeinern (Legacy)

Portable Skill: Interaktiver 5-Phasen-Klärungsworkflow für `tasks/task-*.md` — nur bei explizitem `verfeinern`-Trigger.

**Standard für Task-Klärung ist buddy-agent** — Plan-Prompt für `plan-agent`. Dieser Skill gilt nur bei explizitem `Task … verfeinern` oder Copy-Zeile aus `## Möglichkeiten`.

## Konfiguration

- JSON: [`../config.defaults.json`](../config.defaults.json)
- Copy-Befehle: [`copy-commands.md`](copy-commands.md)
- Akzeptanzkriterien: [`acceptance-criteria.md`](acceptance-criteria.md)

## Task klären: buddy-agent (Standard) vs. verfeinern (Legacy)

| Situation | Vorrang |
|-----------|---------|
| Task klären / Sparring / Plan-Prompt / `@buddy-agent` / *Task mit Buddy* / *Task durchsprechen* | **buddy-agent** — [`../../buddy-agent/SKILL.md`](../../buddy-agent/SKILL.md) |
| Explizit `Task … verfeinern` oder Copy-Zeile `verfeinern` | **Legacy** — dieser Skill, [`task-verfeinern.md`](task-verfeinern.md), Orchestrator [`../SKILL.md`](../SKILL.md) |
| Unklar | **Eine** Rückfrage: Buddy (Plan-Prompt) oder klassisch verfeinern? |

## Operation §6: Task verfeinern (Legacy)

**Trigger:** `Task {taskDateistamm} in Story {storyId} verfeinern` (Copy aus `## Möglichkeiten` oder sinngleich).

**Standard für Task-Klärung ist buddy-agent** — dieser Abschnitt gilt nur bei **explizitem** `verfeinern`-Trigger.

**Ablauf:** Vollständig [`task-verfeinern.md`](task-verfeinern.md) — Kurz: Phasen 1–4 read-only (Code-Abgleich, Fragen-Schleife mit Nutzer, Zusammenfassung mit Mermaid im Chat, Nutzer prüft) → Phase 5 **nur nach Freigabe:** Task-MD mit `## Anforderung`, `## Offene Fragen`, `## Akzeptanzkriterien`; Legacy-Abschnitte entfernen.

**Verboten:** MD-Schreiben ohne Nutzer-Freigabe; `## Vorgehen`/Planpaket in Task-MD; ADO-MCP.

**Reporting:** wie [`task-verfeinern.md`](task-verfeinern.md); geänderte `##`-Abschnitte auflisten.

## Schutz bestehender Inhalte

- Nie `## AI Zusammenfassung` bei `verfeinern` überschreiben (Scout-Findings beibehalten).
- **`Task … verfeinern`** → [`task-verfeinern.md`](task-verfeinern.md) (interaktiv; **kein** autonomes MD-Schreiben ohne Nutzer-Freigabe).
- **`plane Task …`** → [`planning-workflow`](../../planning-workflow/SKILL.md) — **keine** ADO-MCP-Operation; finales Planpaket **im Chat**.

## Zusammenspiel andere Workflows

| Situation | Skill |
|-----------|--------|
| Task klären / Plan-Prompt (Standard) | **buddy-agent** — [`../../buddy-agent/SKILL.md`](../../buddy-agent/SKILL.md) |
| `Task … verfeinern` (**Legacy**) | **dieser Skill** — [`task-verfeinern.md`](task-verfeinern.md) (interaktiv, Freigabe-Gate) |
| `plane Task …` / Umsetzungsplan | [`planning-workflow`](../../planning-workflow/SKILL.md) |
| Code umsetzen | [`implementation-workflow`](../../implementation-workflow/SKILL.md) |

## Opt-out

Nutzer sagt ausdrücklich **`ohne ado-story-skill`**, **`ohne ado-requests-skill`**, **`no ado requests skill`** → diesen Skill nicht laden.
