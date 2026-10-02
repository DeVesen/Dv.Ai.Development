# Operation: Testing

**Trigger-Keywords:** `test`, `testing`, `spec`, `Vitest`, `TestBed`, `unit test`, `integration test`, `E2E`, `Cypress`, `harness`, `RouterTestingHarness`, `async test`, `flaky test`, `Signal test`

## Policy

- Jede Komponente liefert `*.component.spec.ts` (4-Datei-Regel → [op-layout.md](op-layout.md))
- **Unit tests:** Vertrag einer Einheit isoliert prüfen — fokus auf public surface
- **Integration-style tests:** Verhalten über mehrere Einheiten (in-process) — kein E2E
- **Signal inputs testen:** `fixture.componentRef.setInput('name', value)`
- **Refactoring:** Integration/Behavior-Tests schützen intendiertes Verhalten; Unit-Tests dürfen sich ändern wenn public API sich ändert

## Referenzen

| Thema | Datei |
|-------|-------|
| Test-Policy, Unit vs. Integration, Patterns | [testing.md](testing.md) |
| Unit-Testing (Vitest), async, TestBed | [testing-fundamentals.md](testing-fundamentals.md) |
| Component Harnesses | [component-harnesses.md](component-harnesses.md) |
| `RouterTestingHarness` | [router-testing.md](router-testing.md) |
| E2E mit Cypress | [e2e-testing.md](e2e-testing.md) |
| State-Ownership beim Testen von Facades | [signal-architecture.md](signal-architecture.md) |
