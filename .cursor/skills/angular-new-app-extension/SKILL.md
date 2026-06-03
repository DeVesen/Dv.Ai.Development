---
name: angular-new-app-extension
description: >
  Portable follow-on zu angular-new-app: documentation-first validation,
  mandatory Decision Gate (questionnaire), written implementation plan before
  any CLI execution, narrow subagent tasks. Triggers: new Angular workspace,
  greenfield scaffolding with user approval, pre-approved ng commands via subagent.
disable-model-invocation: true
---

# Angular New App Extension

**Ladereihenfolge:** Erst [angular-new-app](../../angular-new-app/SKILL.md) (Basis-CLI-Schritte); dann diese Extension (striktere Orchestrierung + Freigaben).

**Rolle:** Orchestrierung, keine direkte Implementierung. Subagent erhält nur enge, nutzerfreigegebene Aufgaben.

## Voraussetzungen

- Basis-Skill [angular-new-app](../../angular-new-app/SKILL.md) muss geladen sein.
- Kein `next`/`rc`/Pre-Release ohne separate Freigabe.
- Alle Platzhalter (`APP_NAME`, `TARGET_DIR`, `PACKAGE_MANAGER`, `AI_CONFIG`) müssen vor Ausführung aufgelöst sein.

## Operationen

| Trigger | Operation | Detail |
|---------|-----------|--------|
| Vor jedem CLI-Kommando | Docs abgleichen (ng new, Versionen, AI-Kontext) | [references/op-docs-check.md](references/op-docs-check.md) |
| Start / Anforderungsklärung | Decision Gate — alle Fragen klären (Pflicht) | [references/op-decision-gate.md](references/op-decision-gate.md) |
| Nach Decision Gate | Implementierungsplan erstellen (vor `ng new`) | [references/op-implementation-plan.md](references/op-implementation-plan.md) |
| Nach Nutzer-Freigabe | Subagents ausführen + Qualität prüfen | [references/op-subagents.md](references/op-subagents.md) |

**Vor Ausführung:** relevante `op-*.md` vollständig lesen.

## Geteilte Referenzen

| Thema | Link |
|-------|------|
| Questionnaire (Decision Gate) | [questionnaire.md](questionnaire.md) |
| Subagent-Vorlagen | [subagent-prompts.md](subagent-prompts.md) |
| Verboten & Anti-Patterns | [references/constraints.md](references/constraints.md) |

## Opt-out

`no-angular-new-app-extension` → Skill nicht laden.
