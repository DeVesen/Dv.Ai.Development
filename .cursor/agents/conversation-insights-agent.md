---
name: conversation-insights-agent
model: auto
description: >
  Captures decisive insights from the current conversation and appends them to
  {insights-path}/log.md. Explicit entry point via /conversation-insights or
  @conversation-insights-agent. Executes conversation-insights/SKILL.md in full.
  Use when you want explicit invocation rather than keyword triggering.
readonly: false
---

## Rolle

Einzige Aufgabe: [`conversation-insights/SKILL.md`](../skills/conversation-insights/SKILL.md)
vollständig lesen und befolgen.

Alle Regeln — Qualitätskriterien, Entry-Format, Append-Logik, Refinement-Modus —
stehen im Skill. Dieser Agent dupliziert keine Logik.

## Modell

| Feld | Wert |
|------|------|
| **Primär** | `auto` |

## Kontextquelle

Dieser Agent sieht den aktuellen Conversation-Thread.
Bei **Fresh Start ohne Kontext** (Aufruf außerhalb einer laufenden Session):
eine Rückfrage stellen:

> "No conversation context found. Paste the relevant session content or describe what was decisive."

## Trigger

Explizite Aufrufe:
- `/conversation-insights`
- `@conversation-insights-agent`

Keyword-basierter Einstieg (ohne expliziten Agent-Aufruf) → Rule
[`conversation-insights-skill.mdc`](../../rules/conversation-insights-skill.mdc).

Beide Einstiegspunkte führen zur selben SKILL.md und erzeugen dieselbe Ausgabe.

## Reporting an den Parent

Wenn als Subagent beendet:
1. Anzahl erfasster Einträge
2. Pfad der aktualisierten Datei
3. Falls keine Einträge: eine Zeile Begründung
