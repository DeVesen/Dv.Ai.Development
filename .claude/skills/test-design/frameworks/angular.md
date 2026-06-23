# Angular — Test-Environment

Gilt für **Frontend-Tests** (`*.spec.ts`, co-located neben der Quell-Datei).

Gemeinsame Konventionen: [SKILL.md](../SKILL.md), [references/naming-and-aaa.md](../references/naming-and-aaa.md), [references/avoid-magic-strings.md](../references/avoid-magic-strings.md).

**Mechanik** (TestBed-APIs, Harnesses, Router): [angular-developer](../../angular-developer/SKILL.md), [angular-developer-extension](../../angular-developer-extension/references/testing.md) — dort laden, hier nur LAC-Konventionen und Ist-Stack.

## Technologie-Stack (Ist-Zustand LAC)

| Zweck | Paket/API | Hinweis |
|-------|-----------|---------|
| Runner | Karma + karma-jasmine | `ng test` |
| Spec-Syntax | jasmine-core | `describe` / `it` / `beforeEach` |
| DI-Testmodul | `@angular/core/testing` TestBed | |
| HTTP-Mock | `HttpTestingController` | `provideHttpClientTesting()` bevorzugen |
| Spies | `jasmine.createSpy` / `createSpyObj` | **Kein** ng-mocks, Spectator |
| Assertions | Jasmine `expect()` | **Kein** zusätzliches Assert-Paket |
| Coverage | karma-coverage | |
| Zone | zone.js (aktiv) | `fakeAsync`/`tick` und `async`/`whenStable` je nach Fall |
| Animationen | `provideNoopAnimations()` | in Component-Specs |

**VERBOTEN ohne ausdrücklichen Nutzerwunsch:** Vitest/Jest-Migration, ng-mocks, Spectator, Testing Library.

## Datei- und Ordnerstruktur

| Regel | Wert |
|-------|------|
| Spec-Datei | `<name>.spec.ts` **neben** der Quelle |
| `describe` | Klassen-/Service-/Komponentenname |
| Feature-Test-Helfer | optional `features/<feature>/testing/*-testing.helpers.ts` |
| Kein separates Testprojekt | anders als Backend `tests/<Projekt>.Tests` |

Jede Komponente: `*.component.spec.ts` — siehe [angular-developer-extension](../../angular-developer-extension/SKILL.md).

## Jasmine-Spies (Moq-Äquivalent)

| Moq (.NET) | Jasmine (LAC) |
|------------|---------------|
| `new Mock<IService>()` | `jasmine.createSpyObj<T>('Name', ['method1'])` |
| `.Setup(…).Returns(…)` | `.and.returnValue(…)` / `.and.returnValues(…)` |
| `.Verify(…, Times.Never)` | `expect(spy).not.toHaveBeenCalled()` |
| Interface injizieren | `{ provide: MyService, useValue: spy }` |

Jede injizierte Abhängigkeit in Arrange stubben. Wiederverwendbare Stubs: Feature-Helper — siehe [angular/feature-test-helpers-template.md](angular/feature-test-helpers-template.md).

## HTTP-Tests (Controller-Äquivalent)

| Schritt | API |
|---------|-----|
| Setup | `provideHttpClient()`, `provideHttpClientTesting()` |
| Inject | `httpMock = TestBed.inject(HttpTestingController)` |
| Cleanup | `afterEach(() => httpMock.verify())` |
| Assert Request | `httpMock.expectOne(url)` — URL als Konstante |
| Response | `req.flush(body)` |

**Neue Specs:** `provideHttpClientTesting()` statt `HttpClientTestingModule`. Bestand mit `HttpClientTestingModule` darf erweitert werden.

Vorlage: [angular/http-service-template.md](angular/http-service-template.md)

## Async-Strategie

| Muster | Wann |
|--------|------|
| `async`/`await` + `fixture.whenStable()` | Promises, Component-Rendering |
| `fakeAsync` + `tick` / `flushMicrotasks` | Timer, Debounce, verzögerte Promises |

Beides ist im Bestand erlaubt — nicht pauschal auf ein Muster umstellen.

## Unit vs. Integration-style

- **Unit:** eine Komponente/Service/Pipe/Guard; Abhängigkeiten gemockt
- **Integration-style:** mehrere echte Services + HTTP-Mock oder breites TestBed — Verhaltensspezifikation; bei Fehlern zuerst Produktionscode prüfen ([angular-developer-extension/testing.md](../../angular-developer-extension/references/testing.md))

Kein Pflicht-Ordner `Integration-Tests/` — große Specs (z. B. `parameter-search.service.spec.ts`) sind Integration-style im selben File.

**Router:** Bestand oft `Router` als `createSpyObj`. Für **neue** Integration-style-Routing-Tests: `RouterTestingHarness` bevorzugen ([angular-developer/router-testing.md](../../angular-developer/references/router-testing.md)).

**Material:** Bestand `MatDialog` etc. als Spy; für **neue** Component-Tests mit Material-UI: CDK/Material-Harnesses bevorzugen ([angular-developer/component-harnesses.md](../../angular-developer/references/component-harnesses.md)).

## Bestand und Migration (Angular)

| Situation | Verhalten |
|-----------|-----------|
| **Neue Spec** | Karma + Jasmine + Konventionen |
| **Bestehende Spec erweitern** | Neue `it` nach Konvention; alte Namen behalten |
| **Bestehende `it` anpassen** | Konventionen auf geänderten Test; Runner unverändert |
| **Karma→Vitest / zusätzliche Mock-Libs** | **Nur** auf ausdrücklichen Nutzerwunsch |
| **Massen-Umbenennung `should …`** | **Nur** auf ausdrücklichen Nutzerwunsch |

## Verifikation

`test_angular_project` via MCP `dev-mcp`.

## Templates und Beispiele

| Thema | Datei |
|-------|-------|
| Namenskonvention | [angular/naming-examples.md](angular/naming-examples.md) |
| Service + SpyObj | [angular/service-unit-template.md](angular/service-unit-template.md) |
| HTTP-Service | [angular/http-service-template.md](angular/http-service-template.md) |
| Component (shallow) | [angular/component-shallow-template.md](angular/component-shallow-template.md) |
| Feature-Test-Helper | [angular/feature-test-helpers-template.md](angular/feature-test-helpers-template.md) |
| Guard | [angular/guard-template.md](angular/guard-template.md) |

## Referenzen

Templates unter `frameworks/angular/` zeigen vollständige Muster für alle gängigen Fälle.
