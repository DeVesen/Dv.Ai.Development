---
name: describe-as
description: >
  Compresses conversation into copy-paste handoff artifacts for a follow-up agent.
  Two operations: text (fenced markdown prompt) and html (standalone HTML + Mermaid diagrams).
  Both support Wasserdicht-Modus (no planning meta) and Planning-obligation (default for planning threads).
  Triggers: describe-as-prompt, describe-as-html-prompt, handoff, Ask zusammenfassen, wasserdicht,
  erstelle prompt, plane als/im prompt, das/als prompt, für neuen Agent, beschreibe als HTML,
  HTML-Prompt, in HTML zusammenfassen, html prompt für, Mermaid, sequenceDiagram.
disable-model-invocation: true
---

## Voraussetzungen

- Kein MCP-Tool erforderlich.
- Output-Stil für Text-Operation: [`/caveman full`](../caveman/SKILL.md).
- Inhalt **immer nur** aus aktuellem Thread ableiten — kein Repo-Scouting.

## Operationen

| Trigger | Operation | Detail |
|---------|-----------|--------|
| `describe-as-prompt`, `handoff`, `als Prompt`, `für neuen Agent`, `wasserdicht`, `erstelle prompt` | Markdown-Handoff-Prompt (Section A + Section B als fenced markdown) | [references/op-describe-as-text.md](references/op-describe-as-text.md) |
| `describe-as-html-prompt`, `beschreibe als HTML`, `HTML-Prompt`, `in HTML zusammenfassen`, `html prompt für`, `Mermaid`, `sequenceDiagram` | HTML-Handoff mit Mermaid-Diagrammen (Section A + Section B als standalone HTML) | [references/op-describe-as-html.md](references/op-describe-as-html.md) |

**Vor Ausführung:** relevante `op-*.md` vollständig lesen.

## Opt-out

`kein describe-as` / `no describe-as` → Skill nicht laden.
