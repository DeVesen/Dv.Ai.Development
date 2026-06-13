# Op: Refactoring Goals

## Refactoring goals

- Prefer **modern Angular** only where supported by the **actual** version: standalone components, signal inputs/outputs where applicable, `@if` / `@for` / `@switch`, explicit `track` in `@for`.
- **Do not** introduce new legacy patterns where the project skill allows modern ones (e.g. avoid new `*ngIf` / `@Input()` on **new** code paths when the Angular version supports modern APIs).
- **Avoid deprecated APIs** — check compiler/IDE warnings and Angular release notes for the current major; migrate incrementally rather than piling on shims.
- **Signals vs RxJS** — follow [signal-architecture.md](../../angular-developer-extension/references/signal-architecture.md): signals for local/feature state; Observables for real streams; a single boundary when translating.

## Evaluation dimensions

Prioritize changes by **stability**, **maintainability**, and **performance** (in that order unless the user explicitly optimizes for performance).

| Dimension | Ask |
|-----------|-----|
| Stability | Fewer branches, clearer invariants, deterministic async, fewer flaky tests |
| Maintainability | Smaller components, clear Feature Service boundaries, less duplication, strict types |
| Performance | List `track`, avoid unnecessary CD, avoid redundant subscriptions / duplicated work |

Skip purely cosmetic refactors unless they reduce complexity or risk.
