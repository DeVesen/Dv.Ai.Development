---
name: conversation-insights
description: >
  Scans current conversation for decisive insights and appends them to
  <insights-path>/log.md. Triggers (EN primary): capture insights, log insights,
  session insights, conversation insights, what did we learn, log learnings,
  record insights, note what was decisive, learning log, log what we learned,
  write to insights log. Also DE: insights sammeln, was haben wir gelernt,
  erkenntnisse protokollieren, notiere was wichtig war, was war entscheidend,
  lern-log. Refinement: refine insight, make rule from insight, promote entry.
  NOT for handoff/describe-as-prompt phrases.
when_to_use: >
  Wenn der Nutzer Erkenntnisse oder Learnings aus der aktuellen Session festhalten will
  — was entscheidend war, was überraschend war, was sich als Muster herausstellt.
  NICHT für Handoff/Prompt-Erstellung — das ist describe-as-prompt.
---

# Conversation Insights (Learning Log)

Portable skill: capture **decisive insights** from the current conversation and
append them to `<insights-path>/log.md` — then display them in chat.

`<insights-path>` = vom User angegeben oder Standard `.claude/insights`.

## Voraussetzungen

- `<insights-path>` bekannt (Standard: `.claude/insights` oder vom User angegeben).
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

Keyword-basierter Einstieg (ohne expliziten Agent-Aufruf): Skill wird über `when_to_use` und `description` ausgelöst.

Beide Einstiegspunkte führen zur selben SKILL.md und erzeugen dieselbe Ausgabe.

### Reporting an den Parent

Wenn als Subagent beendet:
1. Anzahl erfasster Einträge
2. Pfad der aktualisierten Datei
3. Falls keine Einträge: eine Zeile Begründung

## Abgrenzung zu describe-as-prompt

| Signale für **diesen** Skill | Signale für **describe-as-prompt** |
|---|---|
| `capture insights`, `log learnings`, `what did we learn`, `decisive`, `surprising`, `learning log` | `handoff`, `prompt for next agent`, `wasserdicht`, `summarize as prompt`, `for new agent` |
| Was war **entscheidend / überraschend** | Was wurde **getan / implementiert** |

Wenn **beide** Signale in einer Nachricht vorkommen: erst describe-as-prompt (Handoff),
dann conversation-insights auf explizitem Nachfolge-Trigger.

## Nicht auslösen

- Reine Erklärung: `what is the insights skill?`, `show me an example entry`
- Handoff ohne Lernfokus: `create prompt for next agent`, `wasserdicht` → describe-as-prompt
- Status-Update ohne Lern-Intent: `what have we done so far?` — nur auslösen wenn Lernkontext eindeutig
- Kalender / Alltag ohne Session-Bezug

## Opt-out

`describe-as-prompt` / `handoff` → Skill **nicht** laden (anderer Skill).

Keine Code-Beispiele ohne explizite Nachfrage.
