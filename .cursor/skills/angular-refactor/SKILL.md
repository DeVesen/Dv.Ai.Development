---
name: angular-refactor
description: >
  Guides Angular refactoring to match the target repo Angular version, avoid deprecated patterns, and align with
  angular-developer-extension (layout, test policy, signal architecture) and angular-developer. Prioritizes stability, maintainability, and performance.
  Distinguishes integration-style tests (preserve desired behavior) from unit tests. Use when the user asks
  for Angular refactor, refactoring, deprecated Angular APIs, modern Angular migration, test relevance,
  stability, maintainability, or performance of frontend code.
---

# Angular Refactor

Workflow for refactoring Angular code in the **target** repository. **Always** load the version- and pattern-specific skills first — this skill only orchestrates the workflow.

## Before any refactoring

1. **Angular version** — Read `package.json` (`@angular/core`). Do **not** recommend APIs or syntax from a newer major than the repo uses.
2. **Project skills** — Load as needed:
   - [Angular Developer Extension](../angular-developer-extension/SKILL.md) — structure, standalone, `input()`/`output()`, control flow, migrations, **test policy** + `*.component.spec.ts`, **signal architecture** (`computed`/`effect` misuse vs derivation, RxJS boundaries); API semantics → [Angular Developer](../angular-developer/SKILL.md).
   - [Signal architecture (reference)](../angular-developer-extension/references/signal-architecture.md) — façade state, readonly API, observable→signal boundary — when refactoring services.
   - [Testing policy (reference)](../angular-developer-extension/references/testing.md) — unit vs integration stance, public API, refactor test stance; TestBed/HTTP/harness mechanics → [Angular Developer](../angular-developer/SKILL.md).

## Refactoring goals

- Prefer **modern Angular** only where supported by the **actual** version: standalone components, signal inputs/outputs where applicable, `@if` / `@for` / `@switch`, explicit `track` in `@for`.
- **Do not** introduce new legacy patterns where the project skill allows modern ones (e.g. avoid new `*ngIf` / `@Input()` on **new** code paths when the Angular version supports modern APIs).
- **Avoid deprecated APIs** — check compiler/IDE warnings and Angular release notes for the current major; migrate incrementally rather than piling on shims.
- **Signals vs RxJS** — follow [signal architecture](../angular-developer-extension/references/signal-architecture.md): signals for local/feature state; Observables for real streams; a single boundary when translating.

## Evaluation dimensions

Prioritize changes by **stability**, **maintainability**, and **performance** (in that order unless the user explicitly optimizes for performance).

| Dimension | Ask |
|-----------|-----|
| Stability | Fewer branches, clearer invariants, deterministic async, fewer flaky tests |
| Maintainability | Smaller components, clear Feature Service boundaries, less duplication, strict types |
| Performance | List `track`, avoid unnecessary CD, avoid redundant subscriptions / duplicated work |

Skip purely cosmetic refactors unless they reduce complexity or risk.

## Test policy

- **Integration-style / behavior tests** (multi-unit flows, router, HTTP chain, user-visible flows): treat them as **specifications of desired behavior**. If they fail after a refactor, **first** assume production code may be wrong or the refactor changed observable behavior unintentionally — do **not** “fix” tests to match a new implementation without confirming the intended product behavior.
- **Unit tests** (`*.spec.ts` tied to one component/service): may change when **public API** or observable behavior intentionally changes, or when replacing brittle DOM assertions with harnesses/mocks — keep them aligned with the **intended** contract, not with accidental implementation details.
- **Review test value** — flag tests that burn time without guarding real behavior: duplicated coverage, over-mocked integration, flaky timers. Prefer **stable** fakes: `HttpTestingController`, `RouterTestingHarness` / focused router mocks, Material harnesses where applicable (see testing reference).

## Execution workflow

1. **Document** current behavior, entry points, and risk (routing, guards, global services).
2. **Plan** small steps; one concern per commit-sized change where possible.
3. **After each meaningful step** — run build/lint/tests appropriate to risk (per Architecture skill: `ng build` after non-trivial edits).
4. **If tests fail** — distinguish regression vs. outdated spec; escalate ambiguity to the user before rewriting integration expectations.

## Optional deep checks (ideas)

- **Accessibility** — custom widgets: keyboard, focus, ARIA (Architecture skill).
- **Change detection / zoneless** — avoid patterns that assume implicit timing; prefer explicit signal flow.
- **Bundle and lazy loading** — keep feature boundaries; avoid pulling heavy deps into shared paths.
- **Dead code** — remove unused abstractions after migration.
- **Duplication** — consolidate duplicate test setup via helpers, not copy-pasted mega `beforeEach`.

## Output format (plans / reviews)

Use a short, scannable list:

- **Change** — what
- **Why** — stability / maintainability / performance
- **Risk** — low / medium / high
- **Tests** — which specs must stay green as contracts; which unit specs may move
- **Verify** — build command, focused test paths
