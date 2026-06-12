---
name: angular-refactor
description: >
  Guides Angular refactoring to match the target repo Angular version, avoid deprecated patterns,
  and align with angular-developer-extension (layout, test policy, signal architecture) and
  angular-developer. Prioritizes stability, maintainability, and performance.
  Distinguishes integration-style tests (preserve desired behavior) from unit tests.
  Use when the user asks for Angular refactor, refactoring, deprecated Angular APIs,
  modern Angular migration, test relevance, stability, maintainability, or performance
  of frontend code.
---

# Angular Refactor

Workflow for refactoring Angular code in the **target** repository. **Always** load the version- and pattern-specific skills first — this skill only orchestrates the workflow.

## Voraussetzungen

1. **Angular version** — Read `package.json` (`@angular/core`). Do **not** recommend APIs or syntax from a newer major than the repo uses.
2. **Project skills** — Load as needed:
   - `angular-developer-extension` — structure, standalone, `input()`/`output()`, control flow, migrations, test policy, signal architecture.
   - `angular-developer` — API semantics, TestBed/HTTP/harness mechanics.

## Operationen

| Trigger | Operation | Detail |
|---------|-----------|--------|
| Deprecated APIs, modern migration, signals vs RxJS, goals | Refactoring-Ziele & Priorisierung | [references/op-refactor-goals.md](references/op-refactor-goals.md) |
| Integration tests, unit tests, test value, spec failure | Test-Policy | [references/op-test-policy.md](references/op-test-policy.md) |
| Plan, commit steps, build/lint, deep checks, output format | Ausführungsworkflow | [references/op-execution.md](references/op-execution.md) |

**Vor Ausführung:** relevante `op-*.md` vollständig lesen.

## Geteilte Referenzen

| Thema | Link |
|-------|------|
| Signal-Architektur (Facades, RxJS-Boundary) | `.claude/skills/angular-developer-extension/references/signal-architecture.md` |
| Testing-Policy (Unit vs Integration, Harnesses) | `.claude/skills/angular-developer-extension/references/testing.md` |

## Opt-out

`no-refactor-skill` → Skill nicht laden.

Keine Code-Beispiele ohne explizite Nachfrage.
