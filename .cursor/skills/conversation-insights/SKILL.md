---
name: conversation-insights
description: >
  Scans current conversation for decisive insights and appends them to
  {insights-path}/log.md. Triggers (EN primary): capture insights, log insights,
  session insights, conversation insights, what did we learn, log learnings,
  record insights, note what was decisive, learning log, log what we learned,
  write to insights log. Also DE: insights sammeln, was haben wir gelernt,
  erkenntnisse protokollieren, notiere was wichtig war, was war entscheidend,
  lern-log. Refinement: refine insight, make rule from insight, promote entry.
  NOT for handoff/describe-as-prompt phrases.
disable-model-invocation: true
---

# Conversation Insights (Learning Log)

Portable skill: capture **decisive insights** from the current conversation and
append them to `{insights-path}/log.md` — then display them in chat.

## Voraussetzungen

- `{insights-path}` muss bekannt sein (Standard: `.cursor/insights` oder vom User angegeben).
- Kein MCP, kein Config-File erforderlich.

## Operationen

| Trigger | Operation | Detail |
|---------|-----------|--------|
| `capture insights`, `log insights`, `session insights`, `was haben wir gelernt`, u.a. | Insights aus der Session extrahieren und in `log.md` schreiben | [references/op-capture.md](references/op-capture.md) |
| `refine insight`, `make rule from insight`, `promote entry` | Einzelnen Eintrag verfeinern oder zu Regel/Skill promoten | [references/op-refine.md](references/op-refine.md) |

**Vor Ausführung:** die relevante `op-*.md` vollständig lesen.

## Geteilte Referenzen

| Thema | Datei |
|-------|-------|
| README-Header für neue Log-Dateien | [references/op-new-log.md](references/op-new-log.md) |

## Trigger-Pflege

Trigger-Keywords müssen an zwei Stellen synchron gehalten werden:
1. YAML `description` (diese Datei).
2. `.cursor/rules/conversation-insights-skill.mdc` — Trigger-Beispiele section.

## Opt-out

`describe-as-prompt` / `handoff` → Skill **nicht** laden (anderer Skill).
