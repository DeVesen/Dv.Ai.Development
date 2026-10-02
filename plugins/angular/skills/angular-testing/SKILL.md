---
name: angular-testing
description: Use when writing, reviewing, or setting up unit or integration-style tests for Angular components, services, directives, pipes, or guards. Triggers on test creation, mocking dependencies, signal/input testing, routing tests, component harnesses, or async test flakiness. Not for non-Angular JS/TS testing.
---

# Angular Testing

Framework-agnostic core. Test runner (Jest / Vitest / Jasmine) and E2E tool (Playwright / Cypress) differ per project. Vitest is the CLI default for new v21 projects (Karma removed for new apps), but existing projects may still run Jest or Karma — so always detect the actual runner from `package.json` before writing runner-specific code, never assume it from the Angular version alone, then load the matching reference below.

## Unit vs. integration-style tests

- **Unit test:** contract of one unit (component, service, pipe) in isolation — public surface only (signal inputs reflected in template, outputs fire with right payload, visible text/state — not private fields or incidental DOM).
- **Integration-style test:** behavior across multiple in-process units (smart component + feature service + mocked HTTP, or routing with guards/resolvers) — not browser E2E.
- Treat integration-style tests as specifications of intended behavior: if one fails after a change, assume regression first, don't rewrite the assertion to match without confirming intent.
- Unit tests may change when the public API changes; integration tests protect behavior across refactors.

## Core pattern (`TestBed`)

`describe`/`it`/`expect`/`beforeEach` are the same globals regardless of runner.

```typescript
describe('MyComponent', () => {
  let fixture: ComponentFixture<MyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MyComponent] }).compileComponents();
    fixture = TestBed.createComponent(MyComponent);
  });

  it('should update when input signal changes', () => {
    fixture.componentRef.setInput('data', { name: 'Initial' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Initial');
  });
});
```

- **Signal inputs:** `fixture.componentRef.setInput('name', value)`.
- **Zoneless / async-first projects:** Act → `await fixture.whenStable()` → Assert, instead of manual `fixture.detectChanges()` — see [references/vitest.md](references/vitest.md) for the full pattern (applies regardless of runner if the app is zoneless).
- **OnPush components:** require explicit change detection after each input change — same `setInput` + `detectChanges`/`whenStable`.
- **Services:** exercise public methods and readonly signal exposure; avoid coupling to private `signal()`/`computed()` state.
- **HTTP:** `HttpTestingController` + `provideHttpClient()`/`provideHttpClientTesting()`, `afterEach(() => httpMock.verify())`.

## What to avoid

- Real HTTP calls, or flaky timers/`setTimeout` without the project's async strategy (`fakeAsync`/`tick`).
- Over-mocking an integration test until it proves nothing.
- Asserting on incidental DOM (deep CSS, internal markup) instead of roles/harness queries/visible text.
- "Fixing" a failing integration test to match a refactor without confirming the behavior change was intended.

## References — load the one matching the project

| Topic | File |
|---|---|
| Unit/integration test policy in depth | [references/policy.md](references/policy.md) |
| Vitest (zoneless Act-Wait-Assert, `vi.fn`) | [references/vitest.md](references/vitest.md) |
| Jest (`jest.fn`/`jest.spyOn`/`jest.mocked`) | [references/jest.md](references/jest.md) |
| Jasmine/Karma (legacy) | [references/jasmine.md](references/jasmine.md) |
| Component harnesses (Material/CDK) | [references/harnesses.md](references/harnesses.md) |
| Routing tests (`RouterTestingHarness`) | [references/router-testing.md](references/router-testing.md) |
| E2E — Playwright | [references/e2e-playwright.md](references/e2e-playwright.md) |
| E2E — Cypress (legacy) | [references/e2e-cypress.md](references/e2e-cypress.md) |
