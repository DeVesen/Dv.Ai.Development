---
name: describe-as
description: >
  Compresses conversation into copy-paste handoff artifacts for a follow-up agent.
  Two operations: text (fenced markdown prompt) and html (standalone HTML + Mermaid diagrams).
  Both support Wasserdicht-Modus (no planning meta) and Planning-obligation (default for planning threads).
  Triggers: describe-as-prompt, describe-as-html-prompt, handoff, Ask zusammenfassen, wasserdicht,
  erstelle prompt, plane als/im prompt, das/als prompt, für neuen Agent, beschreibe als HTML,
  HTML-Prompt, in HTML zusammenfassen, html prompt für, Mermaid, sequenceDiagram.
  Opt-out: kein describe-as, no describe-as.
when_to_use: >
  Wenn der Nutzer eine Unterhaltung als Copy-Paste-Prompt für einen Folge-Agenten verdichten will
  oder Formulierungen wie Handoff / Describe-as-Prompt / Describe-as-HTML nutzt.
  NICHT für Handoff ohne Lernfokus — das ist describe-as. NICHT für conversation-insights.
---

## Voraussetzungen

- Kein MCP-Tool erforderlich.
- Output-Stil für Text-Operation: Caveman Full — terse Bullets, keine einleitenden Sätze.
- Inhalt **immer nur** aus aktuellem Thread ableiten — kein Repo-Scouting.

## Operationen

| Trigger | Operation | Detail |
|---------|-----------|--------|
| `describe-as-prompt`, `handoff`, `als Prompt`, `für neuen Agent`, `wasserdicht`, `erstelle prompt` | Markdown-Handoff-Prompt (Section A + Section B als fenced markdown) | [references/op-describe-as-text.md](references/op-describe-as-text.md) |
| `describe-as-html-prompt`, `beschreibe als HTML`, `HTML-Prompt`, `in HTML zusammenfassen`, `html prompt für`, `Mermaid`, `sequenceDiagram` | HTML-Handoff mit Mermaid-Diagrammen (Section A + Section B als standalone HTML) | [references/op-describe-as-html.md](references/op-describe-as-html.md) |

**Vor Ausführung:** relevante `op-*.md` vollständig lesen.

## Opt-out

`kein describe-as` / `no describe-as` → Skill nicht laden.

Keine Code-Beispiele ohne explizite Nachfrage.
