# Testing with Component Harnesses

**URL:** https://material.angular.dev/guide/using-component-harnesses

## Zusammenfassung

Angular Material bietet Test Harnesses für seine Komponenten (CDK Component Harness System). Harnesses ermöglichen stabile, semantische Interaktion mit Komponenten in Tests — wie ein echter Benutzer. Tests werden lesbarer, wartbarer und unabhängig von internen DOM-Änderungen.

## Kernpunkte

- Funktioniert in Karma Unit Tests und Selenium WebDriver E2E-Tests
- `HarnessLoader` via `TestbedHarnessEnvironment.loader(fixture)` erhalten
- `getHarness()` und `getAllHarnesses()` zum Laden von Harness-Instanzen
- `HarnessPredicate` via `.with()` für selektives Laden (selector, ancestor, text)
- Alle Harness-APIs sind **asynchron** — immer `async/await` verwenden
- Kein manuelles `detectChanges()` oder `whenStable()` nötig

## Code-Beispiele

Setup:
```typescript
import {HarnessLoader} from '@angular/cdk/testing';
import {TestbedHarnessEnvironment} from '@angular/cdk/testing/testbed';

let loader: HarnessLoader;
beforeEach(async () => {
  TestBed.configureTestingModule({imports: [MyModule], declarations: [UserProfile]});
  fixture = TestBed.createComponent(UserProfile);
  loader = TestbedHarnessEnvironment.loader(fixture);
});
```

Harnesses laden und filtern:
```typescript
import {MatButtonHarness} from '@angular/material/button/testing';

const buttons = await loader.getAllHarnesses(MatButtonHarness);
const cancel = await loader.getHarness(MatButtonHarness.with({text: 'Cancel'}));
const okButton = await loader.getHarness(MatButtonHarness.with({
  selector: '.confirm',
  text: /^(Ok|Okay)$/
}));
```

Test:
```typescript
it('should mark confirmed when ok button clicked', async () => {
  const okButton = await loader.getHarness(MatButtonHarness.with({selector: '.confirm'}));
  expect(await okButton.isDisabled()).toBe(false);
  await okButton.click();
  expect(fixture.componentInstance.confirmed).toBe(true);
});
```

Select Harness:
```typescript
const select = await loader.getHarness(MatSelectHarness);
await select.open();
const bugOption = await select.getOption({text: 'Bug'});
await bugOption.click();
```

## Wichtige Hinweise

- Import-Pfade: `@angular/cdk/testing` (shared), `@angular/cdk/testing/testbed` (Karma)
- Tests ohne Harnesses verlassen sich auf interne CSS-Klassen (können sich ändern)
- Harnesses normalisieren die Asynchronität — keine Timing-Probleme
