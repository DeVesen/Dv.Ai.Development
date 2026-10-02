# Unit vs. integration-style test policy

## Unit tests

**Goal:** verify the contract of one unit (component, service, pipe) quickly and in isolation.

- Use `TestBed` for components and injectable services unless a pure function needs no DI.
- Focus on the public surface:
  - Template reflects signal inputs and state (`fixture.componentRef.setInput(...)` where applicable).
  - Outputs fire with the right payload on user interaction or API calls.
  - Visible text, disabled/enabled state, key DOM outcomes — not private fields or incidental layout/class stacks.
- Services: exercise public methods and readonly signal exposure from the facade; avoid coupling to private `signal()`/`computed()` unless that is the deliberate contract.

## Integration-style tests

**Goal:** verify behavior across multiple units (in-process), not browser E2E.

Typical scopes:

- Smart component + feature service + mocked HTTP chain.
- Routing: guards, resolvers, real navigation behavior — prefer `RouterTestingHarness` when that matters ([router-testing.md](router-testing.md)).
- Multi-step user-visible flows: load, display, submit, error path.

Treat integration-style tests as specifications of desired product behavior. If they fail after a change, assume regression or intentional behavior change — do not rewrite expectations without confirming intent.

## Test policy during refactoring

- Integration/behavior tests: protect intended behavior; investigate production code first when they break.
- Unit tests: may change when the public API changes, or when replacing brittle assertions with harnesses/stable mocks.
- Prefer stable doubles (`HttpTestingController`, router harness, Material/CDK harnesses where the UI library is used).

## What to avoid

- Real HTTP or flaky timers/`setTimeout` without the project's async strategy (`fakeAsync`/`tick`).
- Over-mocking integration tests (everything stubbed → the test proves nothing).
- Assertions on incidental DOM (deep CSS, internal markup) instead of roles, harness queries, or visible text.
- "Fixing" failing integration tests to match a refactor without stakeholder confirmation.
