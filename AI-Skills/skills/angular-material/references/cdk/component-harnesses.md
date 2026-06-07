# Component Test Harnesses

**Kategorie:** Testing
**Import:** `@angular/cdk/testing`, `@angular/cdk/testing/testbed`
**URL:** https://material.angular.dev/cdk/testing/overview

## Übersicht

Component Test Harnesses bieten eine stabile, wartungsfreundliche API für das Testen von Angular-Komponenten. Anstatt direkt auf DOM-Elemente zuzugreifen, können Tests über eine semantische Harness-API mit Komponenten interagieren. Dies entkoppelt Tests von Implementierungsdetails und macht sie robuster gegenüber internen Änderungen. Angular Material stellt für jede Komponente einen fertigen Harness bereit; eigene Harnesses können durch Erweiterung von `ComponentHarness` erstellt werden.

## Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `ComponentHarness` | Abstrakte Klasse | Basisklasse für alle Test-Harnesses |
| `HarnessLoader` | Interface | Lädt Harness-Instanzen aus dem DOM |
| `TestElement` | Interface | Repräsentiert ein DOM-Element in Tests |
| `HarnessPredicate<T>` | Klasse | Filtert Harness-Instanzen nach Kriterien |
| `ContentContainerComponentHarness` | Klasse | Harness für Komponenten mit `ng-content` |
| `TestbedHarnessEnvironment` | Klasse | Harness-Umgebung für Angular TestBed |
| `SeleniumWebDriverHarnessEnvironment` | Klasse | Harness-Umgebung für E2E-Tests |

**TestbedHarnessEnvironment Methoden:**
- `loader(fixture)` — Erstellt Loader auf dem Fixture-Root-Element
- `documentRootLoader(fixture)` — Loader für Elemente außerhalb des Fixtures (z.B. Overlays)
- `harnessForFixture(fixture, harnessType)` — Erstellt Harness direkt für Fixture

**ComponentHarness Methoden:**
- `host()` — Gibt das Host-Element als `TestElement` zurück
- `locatorFor(selector)` — Findet erstes passendes Element
- `locatorForAll(selector)` — Findet alle passenden Elemente
- `locatorForOptional(selector)` — Optionale Suche

## Verwendungsbeispiel

```typescript
// Eigenen Harness erstellen
import { ComponentHarness } from '@angular/cdk/testing';

export class MyButtonHarness extends ComponentHarness {
  static hostSelector = 'my-button';

  async click(): Promise<void> {
    return (await this.host()).click();
  }

  async getText(): Promise<string> {
    return (await this.host()).text();
  }

  async isDisabled(): Promise<boolean> {
    return (await this.host()).hasClass('disabled');
  }
}
```

```typescript
// Harness in Tests verwenden
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MyButtonHarness } from './my-button.harness';

describe('MyButtonComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyButtonModule]
    }).compileComponents();
    fixture = TestBed.createComponent(TestHostComponent);
  });

  it('sollte Text anzeigen', async () => {
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const button = await loader.getHarness(MyButtonHarness);
    expect(await button.getText()).toBe('Klick mich');
  });

  it('sollte klickbar sein', async () => {
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const button = await loader.getHarness(MyButtonHarness);
    await button.click();
    // Assertions...
  });
});
```

## Besonderheiten

- `TestbedHarnessEnvironment` verwaltet automatisch Change Detection und asynchrone Tasks.
- Für Overlays und Dialoge muss `documentRootLoader()` verwendet werden, da diese außerhalb des Fixture-Root-Elements gerendert werden.
- `HarnessPredicate` ermöglicht Filterung: `MatButtonHarness.with({ text: 'Speichern' })`.
- `@angular/cdk/testing/testbed` enthält die Unit-Test-Implementierung; `@angular/cdk/testing/selenium-webdriver` für E2E-Tests.
- Die harness-basierte API ist asynchron (`async/await`), um mit verschiedenen Test-Umgebungen kompatibel zu sein.
