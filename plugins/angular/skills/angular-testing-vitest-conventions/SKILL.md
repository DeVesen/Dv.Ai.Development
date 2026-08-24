---
name: angular-testing-vitest-conventions
description: Use when writing, reviewing, or refactoring an Angular *.spec.ts test that runs on Vitest — new test file, added it() block, mock/spy setup, zoneless async assertion, or a naming/structure cleanup of an existing spec. Triggers on Vitest, TestBed, ng test, vi.fn/vi.spyOn, HttpTestingController, Service-/Component-/Guard-Test, zoneless whenStable. Not for Jest, Jasmine, or E2E (Playwright/Cypress).
---

# Angular / Vitest — Test-Konventionen

Wie Angular-Unit-Tests aufgebaut sind (Struktur, Naming, TestBed, Spies, HTTP, Async). **Projekt-agnostisch**: beschreibt WIE, nie WO. Scope: **Vitest**-Unit + Integration-style. **Kein Playwright/Cypress/E2E.**

## 1. Wann dieser Skill gilt

- Neue oder angepasste `*.spec.ts` (Vitest)
- Code-Änderung, die Test-Absicherung braucht
- Explizit: Refactor einer Spec

**Opt-out:** „ohne angular-testing-vitest-conventions"

## 2. Technologie-Stack (neue Specs)

| Zweck | Paket/API | Hinweis |
|---|---|---|
| Runner | Vitest | nativ über `@angular/build:unit-test` (`ng test`); **Default für neue Projekte seit Angular v21** (ersetzt Karma) |
| Spec-Syntax | `describe` / `it` / `beforeEach` | aus `vitest` importiert |
| DI-Testmodul | `@angular/core/testing` TestBed | |
| HTTP-Mock | `HttpTestingController` | `provideHttpClientTesting()` bevorzugen |
| Spies | `vi.fn()` / `vi.spyOn()` / `vi.mocked()` | **kein** `jasmine.createSpyObj`, **kein** `jest.fn` |
| Assertions | Vitest `expect()` | kein zusätzliches Assert-Paket |
| Change Detection | zoneless — **Default für neue Projekte seit Angular v21** | Act-Wait-Assert statt manuellem `detectChanges()` — siehe Abschnitt 9 |
| Animationen | `provideNoopAnimations()` | in Component-Specs |

**VERBOTEN ohne ausdrücklichen Wunsch:** Runner-Wechsel, zusätzliche Mock-Libs (ng-mocks, Spectator, Testing Library).

## 3. AAA

Jeder Test: Arrange – Act – Assert, mit Kommentaren `// Arrange` / `// Act` / `// Assert`. Details + Beispiele: `references/naming-and-aaa.md`, `templates/naming-examples.md`.

## 4. Namenskonvention

`<methodName>_<AusgangssituationUndEingabe>_<ErwartetesErgebnis>` im `it(...)` — `references/naming-and-aaa.md`. Kein `should work`. `describe('ClassName')`; optional `describe('methodName')` für mehrere Szenarien.

## 5. Magic Strings

Mehrfach genutzte API-Verträge (Routen, Feldnamen, JSON-Properties) → benannte Konstante. `references/avoid-magic-strings.md`.

## 6. Datei- und Ordnerstruktur

| Regel | Wert |
|---|---|
| Spec-Datei | `<name>.spec.ts` **neben** der Quelle |
| `describe` | Klassen-/Service-/Komponentenname |
| Feature-Test-Helfer | optional `.../testing/*-testing.helpers.ts` |
| Kein separates Testprojekt | Specs co-located |

## 7. Vitest-Spies (Moq-Äquivalent)

| Moq (.NET) | Vitest |
|---|---|
| `new Mock<IService>()` | `{ m: vi.fn() } as unknown as T` bzw. `vi.mocked(...)` |
| `.Setup(…).Returns(…)` | `.mockReturnValue(…)` / `.mockResolvedValue(…)` |
| mehrere Rückgaben | `.mockReturnValueOnce(…).mockReturnValueOnce(…)` |
| `.Verify(…, Times.Never)` | `expect(spy).not.toHaveBeenCalled()` |
| Interface injizieren | `{ provide: MyService, useValue: spy }` |
| `jasmine.objectContaining` | `expect.objectContaining` |
| `jasmine.any(Type)` | `expect.any(Type)` |

Jede injizierte Abhängigkeit in Arrange stubben. Wiederverwendbare Stubs: `templates/feature-test-helpers.md`.

## 8. HTTP-Tests

| Schritt | API |
|---|---|
| Setup | `provideHttpClient()`, `provideHttpClientTesting()` |
| Inject | `httpMock = TestBed.inject(HttpTestingController)` |
| Cleanup | `afterEach(() => httpMock.verify())` |
| Assert Request | `httpMock.expectOne(url)` — URL als Konstante |
| Response | `req.flush(body)` |

Vorlage: `templates/http-service.md`.

## 9. Async-Strategie (zoneless)

Seit Angular v21 ist zoneless Default für neue Projekte — State-Updates asynchron einplanen, **kein** blindes `fixture.detectChanges()` als alleinigen Trigger.

| Muster | Wann |
|---|---|
| **Act → `await fixture.whenStable()` → Assert** | Standardmuster: Signal setzen/Input ändern, dann warten, dann prüfen |
| `fakeAsync` + `tick`/`flushMicrotasks` | Timer, Debounce, verzögerte Promises |

## 10. Unit vs. Integration-style

- **Unit:** eine Komponente/Service/Pipe/Guard; Abhängigkeiten gemockt.
- **Integration-style:** mehrere echte Services + HTTP-Mock oder breites TestBed; bei Fehlern zuerst Produktionscode prüfen.

Kein Pflicht-Ordner `Integration-Tests/` — große Specs sind Integration-style im selben File.

## 11. Bestand & Migration

| Situation | Verhalten |
|---|---|
| Neue Spec | Vitest + Konventionen |
| Bestehende Spec erweitern | neue `it` nach Konvention; alte Namen behalten |
| Bestehende `it` anpassen | Konventionen auf den geänderten Test; Runner unverändert |
| Runner-Wechsel / zusätzliche Mock-Libs | nur auf ausdrücklichen Wunsch |
| Massen-Umbenennung `should …` | nur auf ausdrücklichen Wunsch |

## 12. Verifikation

Tests grün laufen lassen über den Standard-Testlauf des Projekts (RED → GREEN). Falls das Projekt einen Test-MCP/-Runner vorschreibt, diesen nutzen — kein stiller Shell-Fallback.

## Referenzen

| Bedarf | Datei |
|---|---|
| AAA, Namensschema | `references/naming-and-aaa.md` |
| Magic Strings | `references/avoid-magic-strings.md` |
| Service + Vitest-Mock | `templates/service-unit.md` |
| HTTP-Service | `templates/http-service.md` |
| Component (shallow, zoneless Act-Wait-Assert) | `templates/component-shallow.md` |
| Guard | `templates/guard.md` |
| Feature-Test-Helper | `templates/feature-test-helpers.md` |
| Naming-Beispiele | `templates/naming-examples.md` |
