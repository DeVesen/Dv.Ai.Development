---
name: commit-message
description: >
  Generates an English commit title (max 50 characters) and commit description
  (max 500 characters) from the current conversation context, optional task-*.md
  or Story ID, and optionally read-only git diff/status when local changes are
  the source. Triggers: commit message, commit description, commit beschreibung,
  Commit-Titel, Commit-Beschreibung, erstelle commit, create commit message.
  Buddy-agent applies this skill on those triggers. Not for formal ADO copy line
  Commit-Vorschlag für Task … in Story … (see ado-requests-stories / ado-agent).
disable-model-invocation: true
---

# Commit message

Portable skill: generate a commit-ready English title and body from current context without executing `git commit` unless the user explicitly asks.

## Operationen

| Trigger | Operation | Detail |
|---------|-----------|--------|
| `commit message`, `commit description`, `Commit-Beschreibung`, `Commit-Titel`, `erstelle commit`, `create commit message` | Commit-Nachricht aus Kontext generieren | [references/op-generate.md](references/op-generate.md) |

**Vor Ausführung:** relevante `op-*.md` vollständig lesen.

## Abgrenzung

| Trigger | Handler | Description limit |
|---------|---------|-------------------|
| `Commit-Beschreibung`, `commit message`, `erstelle commit` (Buddy / context) | **this skill** | 500 |
| `Commit-Vorschlag für Task … in Story …` | ado-requests-stories / ado-agent | 400 + Story # |

## Opt-out

`Commit-Vorschlag für Task … in Story …` → Skill nicht laden, stattdessen [ado/SKILL.md](../ado/SKILL.md) verwenden.
