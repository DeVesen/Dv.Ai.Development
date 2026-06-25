---
name: angular-new-app
description: >
  Angular-Experte für TypeScript, Angular und skalierbare Web-Apps.
  Erstellt neue Angular-Apps und generiert Artefakte nach Angular-Best-Practices.
  Includes: documentation-first validation, mandatory Decision Gate (questionnaire),
  written implementation plan before any CLI execution, narrow subagent tasks.
  Trigger: neue App, ng new, Angular-Projekt erstellen, ng generate, Komponente erstellen,
  new Angular workspace, greenfield scaffolding, ng new flags, Decision Gate, Implementierungsplan.
license: MIT
compatibility: Requires node, npm, and access to the internet
metadata:
  author: Angular Team @ Google
  version: '2.0'
---

## Voraussetzungen

- Node, npm installiert
- Internetzugang (für `npx ng ...`)
- MCP-Server verfügbar: `ng mcp` → `get_best_practices` für aktuelle Best Practices
- Kein `next`/`rc`/Pre-Release ohne separate Freigabe
- Alle Platzhalter (`APP_NAME`, `TARGET_DIR`, `PACKAGE_MANAGER`, `AI_CONFIG`) müssen vor Ausführung aufgelöst sein

**Rolle bei neuen Projekten:** Orchestrierung, keine direkte Implementierung. Subagent erhält nur enge, nutzerfreigegebene Aufgaben.

## Operationen

**Vor Ausführung:** relevante `op-*.md` vollständig lesen.

### CLI

| Trigger | Operation | Detail |
|---------|-----------|--------|
| `neue App`, `ng new`, `Angular-Projekt erstellen` | Neue Angular-App anlegen inkl. CLI-Check, Flags, Build-Verify, Tailwind | [references/op-create-app.md](references/op-create-app.md) |
| `ng generate`, `Komponente erstellen`, `neues Artefakt` | Angular-Artefakte per CLI generieren und anpassen | [references/op-generate.md](references/op-generate.md) |

### Orchestrierung (Prozess-Gates)

| Trigger | Operation | Detail |
|---------|-----------|--------|
| Schritt 0 — vor CLI | Docs abgleichen (ng new, Versionen, AI-Kontext) | [references/op-docs-check.md](references/op-docs-check.md) |
| Schritt 1 — Anforderungsklärung | Decision Gate — alle Fragen klären (Pflicht) | [references/op-decision-gate.md](references/op-decision-gate.md) |
| Schritt 2 — nach Decision Gate | Implementierungsplan erstellen (vor `ng new`) | [references/op-implementation-plan.md](references/op-implementation-plan.md) |
| Schritt 3 — nach Nutzer-Freigabe | Subagents ausführen + Qualität prüfen | [references/op-subagents.md](references/op-subagents.md) |

## Referenzen

| Thema | Datei |
|-------|-------|
| Decision Gate Checkliste | [references/questionnaire.md](references/questionnaire.md) |
| Subagent-Vorlagen | [references/subagent-prompts.md](references/subagent-prompts.md) |
| Verboten & Anti-Patterns | [references/constraints.md](references/constraints.md) |

## Opt-out

`no-angular-new-app` → Skill nicht laden.

Keine Code-Beispiele ohne explizite Nachfrage.
