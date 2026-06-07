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

## Pflegehinweis

Trigger-Keywords müssen an zwei Stellen synchron gehalten werden:
1. YAML `description` (diese Datei).
2. `.cursor/rules/conversation-insights-skill.mdc` — Trigger-Beispiele section.

## Agent-Konfiguration

Konfiguration des **conversation-insights-agent** — führt diesen Skill vollständig aus.

### Modell

| Feld | Wert |
|------|------|
| **Primär** | `auto` |

### Kontextquelle

Dieser Agent sieht den aktuellen Conversation-Thread.
Bei **Fresh Start ohne Kontext** (Aufruf außerhalb einer laufenden Session):

> "No conversation context found. Paste the relevant session content or describe what was decisive."

### Trigger

Explizite Aufrufe: `/conversation-insights` · `@conversation-insights-agent`

Keyword-basierter Einstieg (ohne expliziten Agent-Aufruf) → Rule [`../../rules/conversation-insights-skill.mdc`](../../rules/conversation-insights-skill.mdc).

Beide Einstiegspunkte führen zur selben SKILL.md und erzeugen dieselbe Ausgabe.

### Reporting an den Parent

Wenn als Subagent beendet:
1. Anzahl erfasster Einträge
2. Pfad der aktualisierten Datei
3. Falls keine Einträge: eine Zeile Begründung

---

## Opt-out

`describe-as-prompt` / `handoff` → Skill **nicht** laden (anderer Skill).
