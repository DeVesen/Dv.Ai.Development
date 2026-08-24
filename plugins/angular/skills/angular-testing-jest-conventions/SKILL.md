---
name: angular-testing-jest-conventions
description: Use when writing, reviewing, or refactoring an Angular *.spec.ts test that runs on Jest — new test file, added it() block, mock/spy setup, or a naming/structure cleanup of an existing spec. Triggers on Jest, TestBed, ng test, jest.fn/jest.spyOn, HttpTestingController, Service-/Component-/Guard-Test. Not for Vitest, Jasmine, or E2E (Playwright/Cypress).
---

# Angular / Jest — Test-Konventionen

Wie Angular-Unit-Tests aufgebaut sind (Struktur, Naming, TestBed, Spies, HTTP). **Projekt-agnostisch**:
beschreibt WIE, nie WO. Scope: **Jest**-Unit + Integration-style. **Kein Playwright/E2E.**

## 1. Wann dieser Skill gilt
- Neue oder angepasste `*.spec.ts` (Jest)
- Code-Änderung, die Test-Absicherung braucht
- Explizit: Refactor einer Spec

**Opt-out:** „ohne angular-test-conventions"

## 2. Technologie-Stack (neue Specs)
| Zweck | Paket/API | Hinweis |
|---|---|---|
| Runner | Jest | z. B. via `@angular-builders/jest` (`ng test`) |
| Spec-Syntax | `describe` / `it` / `beforeEach` | Jest-Globals |
| DI-Testmodul | `@angular/core/testing` TestBed | |
| HTTP-Mock | `HttpTestingController` | `provideHttpClientTesting()` bevorzugen |
| Spies | `jest.fn()` / `jest.spyOn()` / `jest.mocked()` | **kein** `jasmine.createSpyObj` |
| Assertions | Jest `expect()` | kein zusätzliches Assert-Paket |
| Zone | zone.js | `fakeAsync`/`tick` und `async`/`whenStable` je nach Fall |
| Animationen | `provideNoopAnimations()` | in Component-Specs |

**VERBOTEN ohne ausdrücklichen Wunsch:** Runner-Wechsel, zusätzliche Mock-Libs (ng-mocks, Spectator, Testing Library).

## 3. AAA
Jeder Test: Arrange – Act – Assert, mit Kommentaren `// Arrange` / `// Act` / `// Assert`.
Details + Beispiele: `references/naming-and-aaa.md`, `templates/naming-examples.md`.

## 4. Namenskonvention
`<methodName>_<AusgangssituationUndEingabe>_<ErwartetesErgebnis>` im `it(...)` — `references/naming-and-aaa.md`.
Kein `should work`. `describe('ClassName')`; optional `describe('methodName')` für mehrere Szenarien.

## 5. Magic Strings
Mehrfach genutzte API-Verträge (Routen, Feldnamen, JSON-Properties) → benannte Konstante. `references/avoid-magic-strings.md`.

## 6. Datei- und Ordnerstruktur
| Regel | Wert |
|---|---|
| Spec-Datei | `<name>.spec.ts` **neben** der Quelle |
| `describe` | Klassen-/Service-/Komponentenname |
| Feature-Test-Helfer | optional `.../testing/*-testing.helpers.ts` |
| Kein separates Testprojekt | Specs co-located |

## 7. Jest-Spies (Moq-Äquivalent)
| Moq (.NET) | Jest |
|---|---|
| `new Mock<IService>()` | `{ m: jest.fn() } as jest.Mocked<T>` bzw. `jest.mocked(...)` |
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

## 9. Async-Strategie
| Muster | Wann |
|---|---|
| `async`/`await` + `fixture.whenStable()` | Promises, Component-Rendering |
| `fakeAsync` + `tick`/`flushMicrotasks` | Timer, Debounce, verzögerte Promises |

## 10. Unit vs. Integration-style
- **Unit:** eine Komponente/Service/Pipe/Guard; Abhängigkeiten gemockt.
- **Integration-style:** mehrere echte Services + HTTP-Mock oder breites TestBed; bei Fehlern zuerst Produktionscode prüfen.

Kein Pflicht-Ordner `Integration-Tests/` — große Specs sind Integration-style im selben File.

## 11. Bestand & Migration
| Situation | Verhalten |
|---|---|
| Neue Spec | Jest + Konventionen |
| Bestehende Spec erweitern | neue `it` nach Konvention; alte Namen behalten |
| Bestehende `it` anpassen | Konventionen auf den geänderten Test; Runner unverändert |
| Runner-Wechsel / zusätzliche Mock-Libs | nur auf ausdrücklichen Wunsch |
| Massen-Umbenennung `should …` | nur auf ausdrücklichen Wunsch |

## 12. Verifikation
Tests grün laufen lassen über den Standard-Testlauf des Projekts (RED → GREEN). Falls das Projekt
einen Test-MCP/-Runner vorschreibt, diesen nutzen — kein stiller Shell-Fallback.

## 13. Bootstrap-Modus (`using-skill` / `bootstrap`)
Aufruf mit Argument `using-skill` oder `bootstrap` → deterministischer Installer. Folge
`references/op-using-skill.md` vollständig.

## 14. Autoren-Modus (`improve-skill`)
Aufruf mit Argument `improve-skill` → Autoren-Modus. Folge `references/op-improve-skill.md` vollständig.

## 15. Portabilitäts-Regel (stehend)
Skill-Inhalt bleibt projekt-agnostisch: keine Projektnamen, Absolutpfade, Ports, konkreten
Projekt-Versionen im Skill-Body oder Marker-Block-Template. Projektspezifisches → Projekt-
`CLAUDE.md`/Memory. Neue Regeln erst durch das Portabilitäts-Gate in `op-improve-skill.md`.

## Referenzen
| Bedarf | Datei |
|---|---|
| AAA, Namensschema | `references/naming-and-aaa.md` |
| Magic Strings | `references/avoid-magic-strings.md` |
| Service + Jest-Mock | `templates/service-unit.md` |
| HTTP-Service | `templates/http-service.md` |
| Component (shallow) | `templates/component-shallow.md` |
| Guard | `templates/guard.md` |
| Feature-Test-Helper | `templates/feature-test-helpers.md` |
| Naming-Beispiele | `templates/naming-examples.md` |
| Bootstrap-Ablauf | `references/op-using-skill.md` |
| Autoren-Ablauf | `references/op-improve-skill.md` |
