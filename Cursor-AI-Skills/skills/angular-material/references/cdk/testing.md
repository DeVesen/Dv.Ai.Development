# Testing

**Kategorie:** Testing
**Import:** `@angular/cdk/testing`, `@angular/cdk/testing/testbed`, `@angular/cdk/testing/selenium-webdriver`
**URL:** https://material.angular.dev/cdk/testing/overview

## Übersicht

Das `testing`-Paket ist die abstrakte Basis für Angular CDK Component Test Harnesses. Es enthält die plattformunabhängigen Interfaces und Basisklassen, die sowohl für Unit-Tests (TestBed) als auch für E2E-Tests (Selenium WebDriver) verwendet werden. `TestbedHarnessEnvironment` in `@angular/cdk/testing/testbed` verbindet das Harness-System mit Angular's Testing-Framework. Für eine detailliertere Einführung in das Harness-Konzept siehe auch `component-harnesses.md`.

## Wichtige Direktiven/Services/Tokens

| Symbol | Paket | Beschreibung |
|---|---|---|
| `ComponentHarness` | `@angular/cdk/testing` | Basisklasse für Harnesses |
| `HarnessLoader` | `@angular/cdk/testing` | Interface zum Laden von Harnesses |
| `TestElement` | `@angular/cdk/testing` | Interface für DOM-Element-Interaktion |
| `HarnessPredicate<T>` | `@angular/cdk/testing` | Harness-Filterung |
| `ContentContainerComponentHarness` | `@angular/cdk/testing` | Harness für ng-content-Komponenten |
| `parallel` | `@angular/cdk/testing` | Parallele asynchrone Operationen |
| `TestbedHarnessEnvironment` | `@angular/cdk/testing/testbed` | TestBed-Integration |
| `SeleniumWebDriverHarnessEnvironment` | `@angular/cdk/testing/selenium-webdriver` | E2E-Integration |

**TestElement Interface Methoden:**
- `blur(), clear(), click(relativeX?, relativeY?), focus()`
- `getAttribute(name), getCssValue(property)`
- `getDimensions(), getProperty<T>(name)`
- `hasClass(name), isFocused(), isDisabled()`
- `matchesSelector(selector), text(options?)`
- `sendKeys(...keys), setInputValue(value)`
- `dispatchEvent(name, data?)`

**HarnessLoader Methoden:**
- `getHarness<T extends ComponentHarness>(query)` — Erster passender Harness
- `getAllHarnesses<T extends ComponentHarness>(query)` — Alle passenden Harnesses
- `hasHarness<T extends ComponentHarness>(query): boolean`
- `getChildLoader(selector)` — Loader für Kind-Elemente
- `getHarnessOrNull(query)` — Optionale Suche

**TestbedHarnessEnvironment Methoden:**
- `loader(fixture)` — Standard-Loader
- `documentRootLoader(fixture)` — Root-Level-Loader (für Overlays)
- `harnessForFixture(fixture, harnessType)` — Direkter Harness

## Verwendungsbeispiel

```typescript
// Komplexerer Harness mit Prädikaten
import {
  ComponentHarness,
  HarnessPredicate,
  TestElement
} from '@angular/cdk/testing';

export interface CardHarnessFilters {
  title?: string | RegExp;
}

export class CardHarness extends ComponentHarness {
  static hostSelector = 'my-card';

  static with(options: CardHarnessFilters): HarnessPredicate<CardHarness> {
    return new HarnessPredicate(CardHarness, options)
      .addOption('title', options.title,
        (harness, title) => HarnessPredicate.stringMatches(harness.getTitleText(), title));
  }

  private titleEl = this.locatorFor('.card-title');
  private bodyEl = this.locatorFor('.card-body');
  private actionButton = this.locatorForOptional('button');

  async getTitleText(): Promise<string> {
    return (await this.titleEl()).text();
  }

  async getBodyText(): Promise<string> {
    return (await this.bodyEl()).text();
  }

  async clickAction(): Promise<void> {
    const btn = await this.actionButton();
    if (btn) await btn.click();
  }
}

// Verwendung im Test
it('findet Karte nach Titel', async () => {
  const loader = TestbedHarnessEnvironment.loader(fixture);
  const card = await loader.getHarness(CardHarness.with({ title: 'Willkommen' }));
  expect(await card.getTitleText()).toBe('Willkommen');
  await card.clickAction();
});
```

## Besonderheiten

- **`parallel()`**: Hilfsfunktion zur parallelen Ausführung mehrerer asynchroner Operationen innerhalb eines Harness.
- Harnesses können verschachtelt werden: `getHarness()` innerhalb eines Harness sucht nur im Unterbereich.
- Angular Material stellt für jede Komponente einen fertigen Harness bereit (z.B. `MatButtonHarness`, `MatInputHarness`).
- `HarnessPredicate.stringMatches()` unterstützt sowohl String-Vergleich als auch RegExp.
