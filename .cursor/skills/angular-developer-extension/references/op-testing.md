# Operation: Testing

Test-Policy und Guidance für Unit- und Integrationstests im Projekt.

**Vollständige Referenz:** [testing.md](testing.md)

**Auch laden:** [../../angular-developer/SKILL.md](../../angular-developer/SKILL.md) für TestBed, HttpTestingController, Harnesses, Router-Tests und async-Patterns.

---

## Überblick

- Jede Komponente liefert `*.component.spec.ts` (4-Datei-Regel — [op-layout.md](op-layout.md)).
- **Unit tests:** Vertrag einer Einheit isoliert prüfen; fokus auf public surface.
- **Integration-style tests:** Verhalten über mehrere Einheiten hinweg (in-process); kein E2E.
- **Signal inputs testen:** `fixture.componentRef.setInput('name', value)`.
- **Refactoring:** Integration/Behavior-Tests schützen intendiertes Verhalten; Unit-Tests dürfen sich ändern, wenn public API sich ändert.

Alle Details, Muster und Policies → [testing.md](testing.md).

**Verwandte Referenzen:**
- [signal-architecture.md](signal-architecture.md) — State-Ownership und RxJS-Boundaries beim Testen von Facades
- [../../angular-refactor/SKILL.md](../../angular-refactor/SKILL.md) — Unterscheidung Integration/Behavior vs. Unit specs beim Refactoring
