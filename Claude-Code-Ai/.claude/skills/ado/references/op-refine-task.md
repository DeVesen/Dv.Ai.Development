# ADO Task verfeinern (Legacy)

Interaktiver 5-Phasen-Klärungsworkflow — **Legacy**.

**Standard für Task-Klärung:** buddy-agent — Copy `buddy intake {taskDateistamm} aus Story {storyId}` aus Task-`## Möglichkeiten`.

Dieser Skill gilt nur bei explizitem `Task … verfeinern` (nicht mehr in `## Möglichkeiten`).

## Task klären: buddy vs. verfeinern (Legacy)

| Nutzer-Intent | Aktion |
|---------------|--------|
| Sparring / Plan-Prompt / Task durchsprechen | **buddy-agent** — `buddy intake …` / `buddy repo-check …` |
| Explizit `Task … verfeinern` | **Legacy** — [`task-verfeinern.md`](task-verfeinern.md) |

## Operation: Task verfeinern (Legacy)

**Trigger:** `Task {taskDateistamm} in Story {storyId} verfeinern` (sinngleich).

**Ablauf:** [`task-verfeinern.md`](task-verfeinern.md) — Phasen 1–4 interaktiv → Phase 5 nach Freigabe Task-MD.

**VERBOTEN:** MD ohne Nutzer-Freigabe; Planpaket in Task-MD; ADO-MCP.

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

## Routing

| Intent | Skill |
|--------|-------|
| `buddy intake` / `buddy repo-check` | **buddy-agent** |
| `Task … verfeinern` | **dieser Skill** |
| `plane Task …` | planning-workflow |

## Opt-out

`ohne ado-story-skill`, `ohne ado-requests-skill`, `no ado requests skill` → nicht laden.
