# Frontend testing policy (extension)

Portable **policy** for **unit tests** vs **integration-style tests** on top of the vendor baseline. Techniques (`TestBed`, async patterns, HTTP testing, harnesses, router harness) stay in **`angular-developer`** — load these when implementing:

- [testing-fundamentals.md](../../angular-developer/references/testing-fundamentals.md)
- [component-harnesses.md](../../angular-developer/references/component-harnesses.md)
- [router-testing.md](../../angular-developer/references/router-testing.md)

**Layout requirement:** Every component ships **`*.component.spec.ts`** — [SKILL.md](../SKILL.md).

## Before you test

1. Read **`package.json`** (`@angular/core`). Do **not** assume APIs from a newer major than the repo uses.
2. Related skills — load when relevant:
   - [Angular Developer](../../angular-developer/SKILL.md) — framework-level testing APIs and snippets.
   - [Signal architecture](signal-architecture.md) — state ownership and RxJS boundaries when testing facades/state services.
   - [Angular Refactor](../../angular-refactor/SKILL.md) — refactor-time distinction between integration/behavior specs and unit specs.

## Unit tests

**Goal:** Verify the **contract of one unit** (component, service, pipe, etc.) quickly and in isolation.

- Use **`TestBed`** for components and injectable services unless a pure function needs no DI — details: [testing-fundamentals.md](../../angular-developer/references/testing-fundamentals.md).
- Focus on the **public surface**:
  - Template reflects **signal inputs** and state (`fixture.componentRef.setInput(...)` where applicable).
  - **Outputs** fire with the right payload on user interaction or API calls.
  - Visible text, disabled/enabled state, and key DOM outcomes — not private fields or incidental layout/class stacks.
- **Services:** Exercise **public methods** and **readonly** signal exposure from the façade; avoid coupling to private `signal()` / `computed()` unless that is the deliberate contract.

## Integration-style tests

**Goal:** Verify **behavior across multiple units** (in-process), not browser E2E.

Typical scopes:

- Smart component + **feature service** + mocked HTTP chain (see vendor HTTP-testing patterns).
- **Routing:** guards, resolvers, real navigation behavior — prefer **`RouterTestingHarness`** when that matters (see [router-testing.md](../../angular-developer/references/router-testing.md)); for isolated components, mocking `ActivatedRoute` / `Router` is often enough.
- Multi-step **user-visible** flows: load, display, submit, error path.

Treat integration-style tests as **specifications of desired product behavior**. If they fail after a change, assume regression or intentional behavior change — do **not** rewrite expectations without confirming intent (align with [Angular Refactor](../../angular-refactor/SKILL.md)).

## Test policy during refactoring

Follow [Angular Refactor](../../angular-refactor/SKILL.md):

- **Integration / behavior tests:** protect intended behavior; investigate production code first when they break.
- **Unit tests:** may change when **public API** or **intentionally** changed observable behavior changes, or when replacing brittle assertions with harnesses / stable mocks.
- Prefer **stable doubles** as described in the vendor references (`HttpTestingController`, router harness or focused mocks, **Material/CDK harnesses** where the UI library is used).

## Patterns and stability

- **Signal inputs:** `fixture.componentRef.setInput('name', value)` then follow project async/CD convention (`whenStable` etc.) — [testing-fundamentals.md](../../angular-developer/references/testing-fundamentals.md).
- **Lists:** respect **`track`** in `@for` (fixtures use stable ids).
- **Material:** prefer **`TestbedHarnessEnvironment`** and **`Mat…Harness`** — [component-harnesses.md](../../angular-developer/references/component-harnesses.md).
- **RxJS in tests:** subscribe only as needed; HTTP flush/verify patterns — vendor testing docs.

## What to avoid

- Real HTTP or flaky **timers** / **setTimeout** without the project’s async strategy (`fakeAsync` / `tick` where standardized).
- Over-mocking integration (everything stubbed → the test proves nothing).
- Assertions on **incidental** DOM (deep CSS, internal markup) instead of roles, harness queries, or visible text.
- “Fixing” failing integration tests to match a refactor **without** stakeholder confirmation.

## Verification

- Run the project’s unit test command (e.g. **`ng test`**) after meaningful test or production changes.
- After non-trivial Angular edits, run **build** per this extension (`ng build` or documented equivalent).
