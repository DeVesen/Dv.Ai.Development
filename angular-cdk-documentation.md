# Angular CDK Dokumentation — Version 22.0.0

> Vollständige strukturierte Dokumentation aller Angular CDK-Module (Component Development Kit)
> Quelle: https://material.angular.dev/cdk/categories | @angular/cdk@22.0.0

---

## Inhaltsverzeichnis

1. [Accessibility (a11y)](#accessibility-a11y)
2. [Accordion](#accordion)
3. [Bidi (Bidirectionality)](#bidi-bidirectionality)
4. [Clipboard](#clipboard)
5. [Coercion](#coercion)
6. [Collections](#collections)
7. [Component Test Harnesses](#component-test-harnesses)
8. [Dialog](#dialog)
9. [Drag and Drop](#drag-and-drop)
10. [Keycodes](#keycodes)
11. [Layout](#layout)
12. [Listbox](#listbox)
13. [Menu](#menu)
14. [Observers](#observers)
15. [Overlay](#overlay)
16. [Platform](#platform)
17. [Portal](#portal)
18. [Scrolling (Virtual Scrolling)](#scrolling-virtual-scrolling)
19. [Stepper](#stepper)
20. [Table](#table)
21. [Testing](#testing)
22. [Text Field](#text-field)
23. [Tree](#tree)

---

## Accessibility (a11y)

**Kategorie:** Accessibility
**Import:** `A11yModule` from `@angular/cdk/a11y`
**URL:** https://material.angular.dev/cdk/a11y/overview

### Übersicht

Das `a11y`-Paket stellt Werkzeuge zur Verbesserung der Barrierefreiheit in Angular-Anwendungen bereit. Es umfasst Tastaturnavigation, Fokus-Management und Styling-Hilfsmittel für assistive Technologien. Die Kernfunktionen beinhalten Live-Ankündigungen für Screenreader, Fokus-Trapping für modale Dialoge sowie die Erkennung der Eingabemodalität (Maus, Tastatur, Touch). Zusätzlich bietet das Paket CSS-Hilfsmittel für Hochkontrast-Modi und das visuelle Ausblenden von Elementen, die dennoch für Screenreader sichtbar bleiben sollen.

### Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `A11yModule` | NgModule | Haupt-Modul für alle Accessibility-Direktiven |
| `LiveAnnouncer` | Service | Ankündigungen für Screenreader via `aria-live`-Region |
| `FocusMonitor` | Service | Überwacht Fokus-Ursprung (Maus, Tastatur, Touch, programmatisch) |
| `InteractivityChecker` | Service | Prüft ob Elemente disabled/visible/tabbable/focusable sind |
| `FocusTrap` | Klasse | Fängt Tab-Navigation innerhalb eines Elements |
| `ConfigurableFocusTrap` | Klasse | Erweiterte Version von FocusTrap |
| `ConfigurableFocusTrapFactory` | Service | Factory für ConfigurableFocusTrap |
| `ListKeyManager` | Klasse | Verwaltet aktive Optionen in Listen per Tastatur |
| `FocusKeyManager` | Klasse | Erweiterung: Setzt echten Browser-Fokus auf Elemente |
| `ActiveDescendantKeyManager` | Klasse | Erweiterung: Nutzt `aria-activedescendant` |
| `TreeKeyManager` | Klasse | Tastaturnavigation für `role="tree"` |
| `AriaDescriber` | Service | Verwaltet `aria-describedby`-Referenzen |
| `HighContrastModeDetector` | Service | Erkennt Windows High Contrast Mode |
| `InputModalityDetector` | Service | Erkennt aktuelle Eingabemodalität |
| `INPUT_MODALITY_DETECTOR_OPTIONS` | InjectionToken | Konfiguration für InputModalityDetector |
| `cdkTrapFocus` | Direktive | Sperrt Tab-Fokus innerhalb des Elements |
| `cdkMonitorElementFocus` | Direktive | Beobachtet Fokusänderungen eines Elements |
| `cdkMonitorSubtreeFocus` | Direktive | Beobachtet Fokusänderungen im Teilbaum |
| `cdkFocusRegionStart` | Attribut | Markiert den Anfang einer Fokusregion |
| `cdkFocusRegionEnd` | Attribut | Markiert das Ende einer Fokusregion |
| `cdkFocusInitial` | Attribut | Element erhält initiale Fokus beim Öffnen |

### Verwendungsbeispiel

```typescript
// LiveAnnouncer
import { LiveAnnouncer } from '@angular/cdk/a11y';

@Component({ ... })
export class MyComponent {
  constructor(private liveAnnouncer: LiveAnnouncer) {}

  announce() {
    this.liveAnnouncer.announce('Aktion erfolgreich ausgeführt', 'polite');
  }
}
```

```html
<!-- FocusTrap für modalen Dialog -->
<div cdkTrapFocus>
  <h2>Dialog Titel</h2>
  <button cdkFocusInitial>Bestätigen</button>
  <button>Abbrechen</button>
</div>

<!-- FocusMonitor -->
<button cdkMonitorElementFocus (cdkFocusChange)="onFocusChange($event)">
  Überwachter Button
</button>
```

```typescript
// FocusKeyManager für benutzerdefinierte Listen
import { FocusKeyManager } from '@angular/cdk/a11y';

@Component({ ... })
export class ListComponent implements AfterViewInit {
  @ViewChildren(ListItemComponent) items!: QueryList<ListItemComponent>;
  private keyManager!: FocusKeyManager<ListItemComponent>;

  ngAfterViewInit() {
    this.keyManager = new FocusKeyManager(this.items)
      .withWrap()
      .withTypeAhead();
  }

  onKeydown(event: KeyboardEvent) {
    this.keyManager.onKeydown(event);
  }
}
```

### Besonderheiten

- **CSS-Klassen**: `FocusMonitor` fügt automatisch `.cdk-focused` sowie `.cdk-mouse-focused`, `.cdk-keyboard-focused`, `.cdk-touch-focused`, `.cdk-program-focused` hinzu.
- **Sass-Mixins**: `a11y-visually-hidden` blendet Elemente visuell aus, behält sie aber für Screenreader. Das `high-contrast`-Mixin wendet Styles nur bei aktiviertem High Contrast Mode an (via `forced-colors` Media Query).
- **Prebuilt-Styles**: Für den AutofillMonitor müssen die Prebuilt-Styles importiert werden: `@angular/cdk/text-field-prebuilt.css`.
- **KeyManager**: `withWrap()` ermöglicht Ringnavigation, `withTypeAhead()` ermöglicht Buchstabennavigation, `withHomeAndEnd()` aktiviert Home/End-Tasten.

---

## Accordion

**Kategorie:** Components
**Import:** `CdkAccordionModule` from `@angular/cdk/accordion`
**URL:** https://material.angular.dev/cdk/accordion/overview

### Übersicht

Das Accordion-CDK-Modul stellt unstyled Basiskomponenten für Akkordeon-Muster bereit. Es ermöglicht das Aus- und Einklappen von Inhaltsbereichen und unterstützt sowohl Einzel- als auch Mehrfachauswahl. Die `CdkAccordion`-Direktive fungiert als übergeordneter Container, während `CdkAccordionItem` einzelne Panels verwaltet. Das Modul dient als Grundlage für die `MatExpansionPanel`-Komponente von Angular Material.

### Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `CdkAccordionModule` | NgModule | Haupt-Modul |
| `CdkAccordion` | Direktive | Container; Selector: `cdk-accordion`, `[cdkAccordion]` |
| `CdkAccordionItem` | Direktive | Einzelnes Panel; Selector: `cdk-accordion-item`, `[cdkAccordionItem]` |
| `CDK_ACCORDION` | InjectionToken | Token für Accordion-Instanz |

**CdkAccordion Inputs:**
- `multi: boolean` — Erlaubt mehrere gleichzeitig geöffnete Items (Standard: `false`)

**CdkAccordion Methoden:**
- `openAll()` — Öffnet alle Items (nur wenn `multi=true`)
- `closeAll()` — Schließt alle Items

**CdkAccordionItem Inputs:**
- `expanded: boolean` — Geöffnet/Geschlossen-Status
- `disabled: boolean` — Deaktiviert das Item
- `id: string` — Eindeutige ID

**CdkAccordionItem Outputs:**
- `expandedChange: EventEmitter<boolean>` — Bei Statusänderung
- `opened: EventEmitter<void>` — Beim Öffnen
- `closed: EventEmitter<void>` — Beim Schließen
- `destroyed: EventEmitter<void>` — Beim Zerstören

### Verwendungsbeispiel

```html
<cdk-accordion>
  <cdk-accordion-item
    *ngFor="let item of items; let i = index"
    #accordionItem="cdkAccordionItem"
    [attr.id]="'accordion-header-' + i"
    [attr.aria-controls]="'accordion-body-' + i"
    role="button"
    tabindex="0">
    
    <div (click)="accordionItem.toggle()">
      {{ item.title }}
      <span>{{ accordionItem.expanded ? '▲' : '▼' }}</span>
    </div>
    
    <div
      role="region"
      [attr.id]="'accordion-body-' + i"
      [attr.aria-labelledby]="'accordion-header-' + i"
      [hidden]="!accordionItem.expanded">
      {{ item.content }}
    </div>
  </cdk-accordion-item>
</cdk-accordion>
```

```typescript
import { CdkAccordionModule } from '@angular/cdk/accordion';

@NgModule({
  imports: [CdkAccordionModule]
})
export class AppModule {}
```

### Besonderheiten

- Das Modul ist **vollständig unstyled** — kein visuelles Design ist enthalten.
- `CdkAccordionItem` stellt `toggle()`, `open()`, `close()` als Methoden bereit.
- Die `CdkAccordionItem`-Direktive implementiert `OnDestroy` und räumt automatisch auf.
- Barrierefreiheit muss manuell durch korrekte ARIA-Attribute (`aria-expanded`, `aria-controls`, `role="region"`) sichergestellt werden.

---

## Bidi (Bidirectionality)

**Kategorie:** Common Behaviors
**Import:** `BidiModule` from `@angular/cdk/bidi`
**URL:** https://material.angular.dev/cdk/bidi/overview

### Übersicht

Das `bidi`-Paket bietet Unterstützung für bidirektionale Texte (LTR/RTL) in Angular-Anwendungen. Der `Directionality`-Service stellt die aktuelle Schreibrichtung bereit und ermöglicht es Komponenten, auf Richtungsänderungen zu reagieren. Die `Dir`-Direktive kann verwendet werden, um einem Element und seinen Nachkommen eine bestimmte Richtung zuzuweisen. Dies ist besonders wichtig für die korrekte Darstellung von arabischen, hebräischen und anderen RTL-Sprachen.

### Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `BidiModule` | NgModule | Haupt-Modul |
| `Directionality` | Service | Stellt aktuelle Schreibrichtung bereit |
| `Dir` | Direktive | Setzt die Textrichtung; Selector: `[dir]` |
| `Direction` | Typ | `'ltr' \| 'rtl' \| 'auto'` |
| `DIR_DOCUMENT` | InjectionToken | Referenz auf das `document`-Objekt |

**Directionality:**
- `value: Direction` — Aktuelle Richtung (`'ltr'` oder `'rtl'`)
- `change: Observable<Direction>` — Observable bei Richtungsänderung

**Dir Inputs:**
- `dir: Direction` — Setzt die Richtung (`'ltr'`, `'rtl'`, `'auto'`)

**Dir Outputs:**
- `dirChange: EventEmitter<Direction>` — Bei Richtungsänderung

### Verwendungsbeispiel

```typescript
import { Directionality } from '@angular/cdk/bidi';
import { BidiModule } from '@angular/cdk/bidi';

@Component({
  selector: 'my-component',
  template: `<div>Aktuelle Richtung: {{ dir.value }}</div>`
})
export class MyComponent implements OnDestroy {
  private destroyed = new Subject<void>();

  constructor(public dir: Directionality) {
    dir.change
      .pipe(takeUntil(this.destroyed))
      .subscribe(() => {
        console.log('Richtung geändert zu:', dir.value);
      });
  }

  ngOnDestroy() {
    this.destroyed.next();
  }
}
```

```html
<!-- Explizite RTL-Richtung für einen Bereich -->
<div dir="rtl">
  <p>هذا النص بالعربية</p>
</div>
```

### Besonderheiten

- Der `Directionality`-Service liest den `dir`-Wert aus dem nächstgelegenen `[dir]`-Ancestor oder vom `<html>`-Element.
- In Server-Side-Rendering-Umgebungen wird `'ltr'` als Standard verwendet.
- Angular Material-Komponenten nutzen `Directionality` intern für korrekte RTL-Layouts.

---

## Clipboard

**Kategorie:** Common Behaviors
**Import:** `ClipboardModule` from `@angular/cdk/clipboard`
**URL:** https://material.angular.dev/cdk/clipboard/overview

### Übersicht

Das `clipboard`-Paket ermöglicht das Kopieren von Text in die Zwischenablage des Benutzers. Der `Clipboard`-Service bietet eine programmatische API zum Kopieren, während die `CdkCopyToClipboard`-Direktive eine deklarative Lösung für Buttons und andere interaktive Elemente darstellt. Für große Textmengen gibt es die `PendingCopy`-Klasse, die eine asynchrone Kopier-Strategie implementiert.

### Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `ClipboardModule` | NgModule | Haupt-Modul |
| `Clipboard` | Service | Programmatische Zwischenablage-Operationen |
| `CdkCopyToClipboard` | Direktive | Deklaratives Kopieren; Selector: `[cdkCopyToClipboard]` |
| `PendingCopy` | Klasse | Verwaltung großer Kopiervorgänge |

**Clipboard Service Methoden:**
- `copy(text: string): boolean` — Kopiert Text sofort, gibt Erfolg zurück
- `beginCopy(text: string): PendingCopy` — Bereitet asynchrones Kopieren vor

**CdkCopyToClipboard Inputs:**
- `cdkCopyToClipboard: string` — Zu kopierender Text
- `cdkCopyToClipboardAttempts: number` — Anzahl der Kopieversuche (Standard: 1)

**CdkCopyToClipboard Outputs:**
- `cdkCopyToClipboardCopied: EventEmitter<boolean>` — Erfolg-/Misserfolg-Meldung

### Verwendungsbeispiel

```html
<!-- Deklarativ mit Direktive -->
<button
  [cdkCopyToClipboard]="codeExample"
  (cdkCopyToClipboardCopied)="onCopied($event)">
  Code kopieren
</button>
```

```typescript
import { Clipboard } from '@angular/cdk/clipboard';

@Component({ ... })
export class MyComponent {
  constructor(private clipboard: Clipboard) {}

  copyToClipboard(text: string): void {
    const success = this.clipboard.copy(text);
    if (success) {
      console.log('Erfolgreich kopiert!');
    }
  }

  // Für große Texte: asynchrones Kopieren
  copyLargeText(text: string): void {
    const pending = this.clipboard.beginCopy(text);
    let remainingAttempts = 3;

    const attempt = () => {
      const result = pending.copy();
      if (!result && --remainingAttempts) {
        setTimeout(attempt);
      } else {
        pending.destroy();
      }
    };
    attempt();
  }
}
```

### Besonderheiten

- `copy()` erstellt intern ein temporäres `<textarea>`-Element, befüllt es und führt `document.execCommand('copy')` aus.
- `beginCopy()` ist für große Textmengen gedacht, da das temporäre Element im DOM verbleibt bis `destroy()` aufgerufen wird.
- Die Direktive gibt bei `cdkCopyToClipboardAttempts > 1` mehrere Versuche aus, was für mobile Geräte nützlich ist.
- Das Kopieren funktioniert nur in sicheren Kontexten (HTTPS oder localhost) zuverlässig.

---

## Coercion

**Kategorie:** Utilities
**Import:** Einzelne Funktionen from `@angular/cdk/coercion`
**URL:** https://material.angular.dev/cdk/coercion/overview

### Übersicht

Das `coercion`-Paket stellt Hilfsfunktionen bereit, um datengebundene Werte (typischerweise Strings aus HTML-Attributen) in die richtigen TypeScript-Typen zu konvertieren. Diese Funktionen sind besonders nützlich für Angular-Input-Properties, die sowohl als String-Attribute als auch als typisierte Werte empfangen werden können. Das Paket umfasst Konverter für boolesche Werte, Zahlen, Arrays, CSS-Pixel-Werte und mehr.

### Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `coerceBooleanProperty` | Funktion | Konvertiert zu `boolean` |
| `BooleanInput` | Typ | `string \| boolean \| null \| undefined` |
| `coerceNumberProperty` | Funktion | Konvertiert zu `number` |
| `NumberInput` | Typ | `string \| number \| null \| undefined` |
| `coerceArray` | Funktion | Konvertiert einzelnen Wert zu Array |
| `coerceCssPixelValue` | Funktion | Fügt `px` hinzu falls nicht vorhanden |
| `coerceElement` | Funktion | Konvertiert `ElementRef` zu nativem Element |
| `coerceStringArray` | Funktion | Konvertiert zu String-Array |

### Verwendungsbeispiel

```typescript
import {
  coerceBooleanProperty,
  BooleanInput,
  coerceNumberProperty,
  NumberInput
} from '@angular/cdk/coercion';

@Component({
  selector: 'my-button',
  template: `<button [disabled]="disabled">{{ label }}</button>`
})
export class MyButtonComponent {
  private _disabled = false;
  private _size = 16;

  @Input()
  get disabled(): boolean { return this._disabled; }
  set disabled(value: BooleanInput) {
    this._disabled = coerceBooleanProperty(value);
  }

  @Input()
  get size(): number { return this._size; }
  set size(value: NumberInput) {
    this._size = coerceNumberProperty(value, 16);
  }
}
```

```typescript
// coerceArray: Einzelwert oder Array akzeptieren
import { coerceArray } from '@angular/cdk/coercion';

const single = coerceArray('hello');   // ['hello']
const arr = coerceArray(['a', 'b']);   // ['a', 'b']

// coerceCssPixelValue
import { coerceCssPixelValue } from '@angular/cdk/coercion';
coerceCssPixelValue(100);    // '100px'
coerceCssPixelValue('2em'); // '2em' (unverändert)
```

### Besonderheiten

- `coerceBooleanProperty('')` gibt `false` zurück — leere Strings werden als `false` interpretiert.
- `coerceBooleanProperty(null)` und `coerceBooleanProperty(undefined)` geben `false` zurück.
- `coerceNumberProperty` verwendet sowohl `parseFloat` als auch `Number()` für robustere Validierung (z.B. wird `'123hello'` nicht als gültige Zahl akzeptiert).
- Ein optionaler Fallback-Wert kann als zweites Argument an `coerceNumberProperty` übergeben werden.
- Diese Utilities ermöglichen natürliche HTML-Attribute wie `<my-button disabled>` statt `<my-button [disabled]="true">`.

---

## Collections

**Kategorie:** Utilities
**Import:** Einzelne Klassen from `@angular/cdk/collections`
**URL:** https://material.angular.dev/cdk/collections/overview

### Übersicht

Das `collections`-Paket stellt Datenstruktur-Utilities bereit, die in Angular-Anwendungen häufig benötigt werden. Das Herzstück ist die `SelectionModel`-Klasse, die eine typsichere Auswahlliste mit Einzel- und Mehrfachauswahl unterstützt. Zusätzlich enthält das Paket das `DataSource`-Interface, das `ArrayDataSource` als Implementierung, sowie Utilities für View-Repeater und Baum-Adapter. `UniqueSelectionDispatcher` wird intern von Komponenten wie Radiobuttons verwendet, um gegenseitige Ausschließlichkeit zu koordinieren.

### Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `SelectionModel<T>` | Klasse | Verwaltet einzel-/mehrfache Auswahl |
| `DataSource<T>` | Abstrakte Klasse | Basis für Datenquellen (Tabellen, Listen etc.) |
| `ArrayDataSource<T>` | Klasse | DataSource-Implementierung für Arrays/Observables |
| `UniqueSelectionDispatcher` | Service | Koordiniert gegenseitige Ausschließlichkeit |
| `CollectionViewer` | Interface | Informiert DataSource über angezeigte Daten |

**SelectionModel Konstruktor:**
- `multiple: boolean` — Mehrfachauswahl erlauben (Standard: `false`)
- `initiallySelectedValues?: T[]` — Vorausgewählte Werte
- `emitChanges: boolean` — Änderungsevents emittieren (Standard: `true`)
- `compareWith?: (a: T, b: T) => boolean` — Benutzerdefinierter Vergleich

**SelectionModel Methoden:**
- `select(...values: T[])` — Werte auswählen
- `deselect(...values: T[])` — Werte abwählen
- `toggle(value: T)` — Auswahl umschalten
- `setSelection(...values: T[])` — Auswahl ersetzen
- `clear()` — Alle Auswahlen löschen
- `isSelected(value: T): boolean` — Auswahl prüfen
- `isEmpty(): boolean` — Prüft ob leer
- `hasValue(): boolean` — Prüft ob Wert vorhanden
- `sort(predicate?)` — Ausgewählte Werte sortieren
- `changed: Observable<SelectionChange<T>>` — Änderungs-Observable

### Verwendungsbeispiel

```typescript
import { SelectionModel } from '@angular/cdk/collections';

// Einzelauswahl
const singleSelection = new SelectionModel<string>(false, ['initial']);

// Mehrfachauswahl
const multiSelection = new SelectionModel<number>(true, [1, 3, 5]);

multiSelection.select(7);
multiSelection.deselect(1);
multiSelection.toggle(3); // Abwählen da bereits ausgewählt

console.log(multiSelection.selected); // [5, 7]
console.log(multiSelection.isSelected(5)); // true

// Auf Änderungen reagieren
multiSelection.changed.subscribe(change => {
  console.log('Hinzugefügt:', change.added);
  console.log('Entfernt:', change.removed);
});
```

```typescript
// ArrayDataSource für CdkTable oder CdkVirtualScrollViewport
import { ArrayDataSource } from '@angular/cdk/collections';

const DATA = [{ name: 'Alice' }, { name: 'Bob' }];
const dataSource = new ArrayDataSource(DATA);
// Oder mit Observable:
const dataSource2 = new ArrayDataSource(of(DATA));
```

### Besonderheiten

- `SelectionModel` verwendet intern ein `Set` für O(1)-Lookup-Performance.
- Bei Mehrfachauswahl mit `setSelection()` werden alle vorherigen Werte ersetzt.
- Das `changed`-Observable emittiert nur, wenn `emitChanges: true` (Standard).
- `UniqueSelectionDispatcher` wird primär von `MatRadioButton` und `MatSelectionList` genutzt — eigene Nutzung ist selten nötig.
- Benutzerdefinierter `compareWith` ist wichtig bei Objekten, damit Wertgleichheit statt Referenzgleichheit verglichen wird.

---

## Component Test Harnesses

**Kategorie:** Testing
**Import:** `@angular/cdk/testing`, `@angular/cdk/testing/testbed`
**URL:** https://material.angular.dev/cdk/testing/overview

### Übersicht

Component Test Harnesses bieten eine stabile, wartungsfreundliche API für das Testen von Angular-Komponenten. Anstatt direkt auf DOM-Elemente zuzugreifen, können Tests über eine semantische Harness-API mit Komponenten interagieren. Dies entkoppelt Tests von Implementierungsdetails und macht sie robuster gegenüber internen Änderungen. Angular Material stellt für jede Komponente einen fertigen Harness bereit; eigene Harnesses können durch Erweiterung von `ComponentHarness` erstellt werden.

### Wichtige Direktiven/Services/Tokens

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

### Verwendungsbeispiel

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

### Besonderheiten

- `TestbedHarnessEnvironment` verwaltet automatisch Change Detection und asynchrone Tasks.
- Für Overlays und Dialoge muss `documentRootLoader()` verwendet werden, da diese außerhalb des Fixture-Root-Elements gerendert werden.
- `HarnessPredicate` ermöglicht Filterung: `MatButtonHarness.with({ text: 'Speichern' })`.
- `@angular/cdk/testing/testbed` enthält die Unit-Test-Implementierung; `@angular/cdk/testing/selenium-webdriver` für E2E-Tests.
- Die harness-basierte API ist asynchron (`async/await`), um mit verschiedenen Test-Umgebungen kompatibel zu sein.

---

## Dialog

**Kategorie:** Components
**Import:** `DialogModule` from `@angular/cdk/dialog`
**URL:** https://material.angular.dev/cdk/dialog/overview

### Übersicht

Das `dialog`-Paket bietet eine vollständige Implementierung für modale Dialoge ohne visuelles Styling. Es basiert auf dem Overlay-CDK und integriert Barrierefreiheit-Features wie Fokus-Trapping und ARIA-Attribute. Der `Dialog`-Service ermöglicht das programmgesteuerte Öffnen von Dialogen mit Komponenten oder Templates als Inhalt. Die `DialogRef` stellt eine Referenz auf den geöffneten Dialog bereit und ermöglicht das Schließen mit einem Rückgabewert.

### Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `DialogModule` | NgModule | Haupt-Modul |
| `Dialog` | Service | Öffnet und verwaltet Dialoge |
| `DialogRef<R, C>` | Klasse | Referenz auf einen geöffneten Dialog |
| `DialogConfig<D>` | Interface | Konfigurationsoptionen |
| `DIALOG_DATA` | InjectionToken | Injektion von Dialog-Daten |
| `CdkDialogContainer` | Komponente | Interner Dialog-Container |

**Dialog Service Methoden:**
- `open<R, D, C>(component, config?): DialogRef<R, C>` — Dialog öffnen
- `closeAll()` — Alle Dialoge schließen
- `getDialogById(id): DialogRef | undefined` — Dialog per ID finden
- `afterOpened: Subject<DialogRef>` — Emittiert beim Öffnen
- `afterAllClosed: Observable<void>` — Emittiert wenn alle Dialoge geschlossen

**DialogConfig Optionen:**
- `id, data, injector, viewContainerRef`
- `width, height, minWidth, minHeight, maxWidth, maxHeight`
- `hasBackdrop, backdropClass, panelClass`
- `positionStrategy, scrollStrategy`
- `disableClose, closeOnNavigation, closeOnDestroy`
- `ariaLabel, ariaDescribedBy, ariaLabelledBy, ariaModal`
- `role: 'dialog' | 'alertdialog'`

**DialogRef Methoden:**
- `close(result?)` — Dialog schließen mit optionalem Ergebnis
- `afterOpened(): Observable<void>` — Nach dem Öffnen
- `afterClosed(): Observable<R>` — Nach dem Schließen (mit Ergebnis)
- `backdropClick(): Observable<MouseEvent>` — Klick auf Backdrop
- `updatePosition(position?)` — Position aktualisieren
- `updateSize(width?, height?)` — Größe aktualisieren

### Verwendungsbeispiel

```typescript
import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';

// Dialog-Komponente
@Component({
  template: `
    <h2>{{ data.title }}</h2>
    <p>{{ data.message }}</p>
    <button (click)="confirm()">Bestätigen</button>
    <button (click)="cancel()">Abbrechen</button>
  `
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: DialogRef<boolean>,
    @Inject(DIALOG_DATA) public data: { title: string; message: string }
  ) {}

  confirm() { this.dialogRef.close(true); }
  cancel() { this.dialogRef.close(false); }
}

// Dialog öffnen
@Component({ ... })
export class ParentComponent {
  constructor(private dialog: Dialog) {}

  openDialog() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: { title: 'Bestätigung', message: 'Wirklich löschen?' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Bestätigt!');
      }
    });
  }
}
```

### Besonderheiten

- Das CDK Dialog-Modul ist **kein Ersatz für `MatDialog`**, sondern die unstyled Basis dafür.
- `MatDialog` von Angular Material baut auf diesem CDK auf und ergänzt Material Design Styling.
- Fokus wird automatisch in den Dialog gesperrt (via `cdkTrapFocus`) und beim Schließen zurückgegeben.
- ARIA-Attribute (`aria-modal`, `role="dialog"`) werden automatisch gesetzt.
- `disableClose: true` verhindert das Schließen per Escape-Taste oder Backdrop-Klick.

---

## Drag and Drop

**Kategorie:** Components
**Import:** `DragDropModule` from `@angular/cdk/drag-drop`
**URL:** https://material.angular.dev/cdk/drag-drop/overview

### Übersicht

Das `drag-drop`-Paket bietet eine vollständige Drag-and-Drop-Lösung für Angular-Anwendungen. Elemente können mit der `cdkDrag`-Direktive versehen werden, um sie draggable zu machen. Durch `cdkDropList` können Drop-Zonen definiert werden, die automatisch Sortierung und Übertragung zwischen Listen ermöglichen. Das Modul unterstützt sowohl freies Drag als auch listenbasiertes Sortieren, mit zahlreichen Anpassungsoptionen für Vorschau-Elemente, Platzhalter und Achsenbeschränkungen.

### Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `DragDropModule` | NgModule | Haupt-Modul |
| `CdkDrag` | Direktive | Macht Element draggable; Selector: `[cdkDrag]` |
| `CdkDropList` | Direktive | Drop-Zone; Selector: `[cdkDropList]` |
| `CdkDropListGroup` | Direktive | Gruppe von Drop-Listen |
| `CdkDragHandle` | Direktive | Drag-Handle; Selector: `[cdkDragHandle]` |
| `CdkDragPreview` | Direktive | Benutzerdefinierte Drag-Vorschau |
| `CdkDragPlaceholder` | Direktive | Platzhalter während des Drags |
| `DragDrop` | Service | Programmatische API |
| `DragDropRegistry` | Service | Globale Registrierung aller Drag-Instanzen |

**CdkDrag Inputs:**
- `cdkDragData: T` — Beliebige Daten am Drag-Element
- `cdkDragLockAxis: 'x' | 'y'` — Bewegungsachse einschränken
- `cdkDragBoundary: string | Element` — Bewegungsgrenze
- `cdkDragRootElement: string` — CSS-Selektor für Root-Element
- `cdkDragStartDelay: number | {touch, mouse}` — Verzögerung
- `cdkDragFreeDragPosition: Point` — Position für freies Drag
- `cdkDragDisabled: boolean` — Drag deaktivieren
- `cdkDragConstrainPosition: (point, dragRef) => Point` — Position einschränken
- `cdkDragPreviewClass: string | string[]` — CSS-Klassen für Preview
- `cdkDragPreviewContainer: 'global' | 'parent' | ElementRef` — Preview-Container

**CdkDrag Outputs:**
- `cdkDragStarted: CdkDragStart` — Drag begonnen
- `cdkDragEnded: CdkDragEnd` — Drag beendet
- `cdkDragEntered: CdkDragEnter` — Element in neue Liste eingetreten
- `cdkDragExited: CdkDragExit` — Element aus Liste ausgetreten
- `cdkDragDropped: CdkDragDrop` — Element abgelegt
- `cdkDragMoved: Observable<CdkDragMove>` — Während Bewegung

**CdkDrag Methoden:**
- `getPlaceholderElement(): HTMLElement`
- `getRootElement(): HTMLElement`
- `reset()` — Position zurücksetzen
- `getFreeDragPosition(): Point`
- `setFreeDragPosition(value: Point): void`

**CdkDropList Inputs:**
- `cdkDropListData: T[]` — Verbundene Datenliste
- `cdkDropListConnectedTo: CdkDropList[]` — Verknüpfte Drop-Listen
- `cdkDropListOrientation: 'horizontal' | 'vertical' | 'mixed'`
- `cdkDropListDisabled: boolean`
- `cdkDropListSortingDisabled: boolean`
- `cdkDropListEnterPredicate: (drag, drop) => boolean`
- `cdkDropListSortPredicate: (index, drag, drop) => boolean`

**CdkDropList Outputs:**
- `cdkDropListDropped: CdkDragDrop<T>` — Element abgelegt
- `cdkDropListEntered: CdkDragEnter<T>` — Element eingetreten
- `cdkDropListExited: CdkDragExit<T>` — Element ausgetreten
- `cdkDropListSorted: CdkDragSortEvent<T>` — Reihenfolge geändert

### Verwendungsbeispiel

```html
<!-- Sortierbare Liste -->
<div
  cdkDropList
  [cdkDropListData]="items"
  (cdkDropListDropped)="drop($event)">
  <div
    *ngFor="let item of items"
    cdkDrag
    [cdkDragData]="item"
    class="drag-item">
    {{ item.name }}
    <span cdkDragHandle>⠿</span>
  </div>
</div>
```

```typescript
import { moveItemInArray, transferArrayItem, CdkDragDrop } from '@angular/cdk/drag-drop';

@Component({ ... })
export class DragListComponent {
  items = [
    { name: 'Item 1' }, { name: 'Item 2' }, { name: 'Item 3' }
  ];

  drop(event: CdkDragDrop<typeof this.items>) {
    moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
  }
}
```

```html
<!-- Zwischen zwei Listen verschieben -->
<div cdkDropList #list1="cdkDropList" [cdkDropListConnectedTo]="[list2]"
     [cdkDropListData]="list1Items" (cdkDropListDropped)="drop($event)">
  <div *ngFor="let item of list1Items" cdkDrag>{{ item }}</div>
</div>
<div cdkDropList #list2="cdkDropList" [cdkDropListConnectedTo]="[list1]"
     [cdkDropListData]="list2Items" (cdkDropListDropped)="drop($event)">
  <div *ngFor="let item of list2Items" cdkDrag>{{ item }}</div>
</div>
```

```typescript
drop(event: CdkDragDrop<string[]>) {
  if (event.previousContainer === event.container) {
    moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
  } else {
    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );
  }
}
```

### Besonderheiten

- **Hilfsfunktionen**: `moveItemInArray()` und `transferArrayItem()` erleichtern Array-Manipulation nach Drops.
- **Animationen**: CSS-Transitions können auf `.cdk-drag-animating` angewendet werden.
- **Vorschau-Element**: Das Standard-Preview kann durch `<ng-template cdkDragPreview>` überschrieben werden.
- **Platzhalter**: Anpassbar durch `<ng-template cdkDragPlaceholder>`.
- **Scroll**: Automatisches Scrollen ist unterstützt; `cdkScrollable` muss ggf. hinzugefügt werden.
- **Touch**: Funktioniert auf Touch-Geräten; `cdkDragStartDelay` verhindert versehentliches Drag beim Scrollen.

---

## Keycodes

**Kategorie:** Utilities
**Import:** Konstanten from `@angular/cdk/keycodes`
**URL:** https://material.angular.dev/cdk/keycodes/overview

### Übersicht

Das `keycodes`-Paket exportiert numerische Konstanten für Keyboard-Event-Codes. Diese ersetzen Magic Numbers im Code und machen Tastatur-Eventhandler lesbarer und wartbarer. Das Paket deckt alle gängigen Tasten ab, einschließlich Steuerungstasten, Navigationstasten, Funktionstasten und browserabhängige Varianten (insbesondere Firefox-spezifische Unterschiede).

### Wichtige Direktiven/Services/Tokens

Keine Klassen oder Direktiven — nur Konstanten:

| Kategorie | Beispiele |
|---|---|
| Steuerung | `ENTER`, `BACKSPACE`, `TAB`, `ESCAPE`, `SHIFT`, `CONTROL`, `ALT`, `CAPS_LOCK` |
| Navigation | `UP_ARROW`, `DOWN_ARROW`, `LEFT_ARROW`, `RIGHT_ARROW`, `HOME`, `END`, `PAGE_UP`, `PAGE_DOWN` |
| Zahlen | `ZERO` bis `NINE` |
| Buchstaben | `A` bis `Z` |
| Numpad | `NUMPAD_ZERO` bis `NUMPAD_NINE`, `NUMPAD_MULTIPLY`, `NUMPAD_PLUS` etc. |
| Funktionstasten | `F1` bis `F12` |
| Sonderzeichen | `SEMICOLON`, `EQUALS`, `COMMA`, `DASH`, `PERIOD`, `SLASH`, `APOSTROPHE` |
| Klammern | `OPEN_SQUARE_BRACKET`, `CLOSE_SQUARE_BRACKET` |
| Firefox-spez. | `FF_SEMICOLON`, `FF_EQUALS`, `FF_DASH` |
| Medientasten | `MUTE`, `VOLUME_UP`, `VOLUME_DOWN` |
| System | `SPACE`, `META`, `MAC_META`, `WIN_KEY` |

### Verwendungsbeispiel

```typescript
import {
  ENTER, SPACE, ESCAPE, UP_ARROW, DOWN_ARROW, HOME, END
} from '@angular/cdk/keycodes';

@Component({ ... })
export class CustomSelectComponent {
  onKeydown(event: KeyboardEvent) {
    switch (event.keyCode) {
      case ENTER:
      case SPACE:
        this.selectCurrent();
        event.preventDefault();
        break;
      case ESCAPE:
        this.close();
        break;
      case UP_ARROW:
        this.movePrevious();
        event.preventDefault();
        break;
      case DOWN_ARROW:
        this.moveNext();
        event.preventDefault();
        break;
      case HOME:
        this.moveFirst();
        event.preventDefault();
        break;
      case END:
        this.moveLast();
        event.preventDefault();
        break;
    }
  }
}
```

### Besonderheiten

- Alle Konstanten sind vom Typ `number` und entsprechen `KeyboardEvent.keyCode`-Werten.
- Das Paket enthält keine Klassen oder Services.
- Firefox verwendet für manche Sonderzeichen andere Key-Codes (z.B. `FF_SEMICOLON = 59` statt `SEMICOLON = 186`).
- Die `hasModifierKey(event, ...modifiers)` Hilfsfunktion prüft ob Modifier-Tasten gedrückt sind.

---

## Layout

**Kategorie:** Common Behaviors
**Import:** `LayoutModule` from `@angular/cdk/layout`
**URL:** https://material.angular.dev/cdk/layout/overview

### Übersicht

Das `layout`-Paket stellt Werkzeuge zur Erkennung von Viewport-Größen und Media-Queries bereit. `BreakpointObserver` ermöglicht reaktives Reagieren auf Viewport-Änderungen mit vordefinierten Breakpoints oder benutzerdefinierten Media-Queries. `MediaMatcher` bietet eine direkte Schnittstelle zur `matchMedia`-API des Browsers und gibt `MediaQueryList`-Objekte zurück. Diese Werkzeuge sind die Grundlage für responsive Designs in Angular-Anwendungen.

### Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `LayoutModule` | NgModule | Haupt-Modul |
| `BreakpointObserver` | Service | Observiert Media-Query-Änderungen |
| `BreakpointState` | Interface | `{ matches: boolean, breakpoints: { [key: string]: boolean } }` |
| `Breakpoints` | Konstante | Vordefinierte Breakpoint-Strings |
| `MediaMatcher` | Service | Direkte `matchMedia`-API |

**Breakpoints-Konstanten:**
- `Breakpoints.XSmall`: `(max-width: 599.98px)`
- `Breakpoints.Small`: `(min-width: 600px) and (max-width: 959.98px)`
- `Breakpoints.Medium`: `(min-width: 960px) and (max-width: 1279.98px)`
- `Breakpoints.Large`: `(min-width: 1280px) and (max-width: 1919.98px)`
- `Breakpoints.XLarge`: `(min-width: 1920px)`
- `Breakpoints.Handset`, `Breakpoints.Tablet`, `Breakpoints.Web`
- `Breakpoints.HandsetPortrait`, `Breakpoints.HandsetLandscape` etc.

**BreakpointObserver Methoden:**
- `observe(value: string | string[]): Observable<BreakpointState>` — Media-Query beobachten
- `isMatched(value: string | string[]): boolean` — Sofortiger Check

### Verwendungsbeispiel

```typescript
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { map } from 'rxjs/operators';

@Component({
  template: `
    <mat-sidenav-container>
      <mat-sidenav [mode]="isHandset ? 'over' : 'side'"
                   [opened]="!isHandset">
        Navigation
      </mat-sidenav>
      <mat-sidenav-content>
        <ng-content></ng-content>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `
})
export class AppComponent {
  isHandset$ = this.breakpointObserver
    .observe(Breakpoints.Handset)
    .pipe(map(result => result.matches));

  constructor(private breakpointObserver: BreakpointObserver) {}
}
```

```typescript
// Mehrere Breakpoints gleichzeitig beobachten
this.breakpointObserver
  .observe([Breakpoints.Small, Breakpoints.Medium])
  .subscribe(result => {
    const breakpoints = result.breakpoints;
    if (breakpoints[Breakpoints.Small]) {
      console.log('Small-Screen aktiv');
    }
    if (breakpoints[Breakpoints.Medium]) {
      console.log('Medium-Screen aktiv');
    }
  });
```

```typescript
// Benutzerdefinierte Media-Query
this.breakpointObserver
  .observe('(min-width: 500px) and (orientation: portrait)')
  .subscribe(result => {
    this.isPortraitMedium = result.matches;
  });
```

### Besonderheiten

- `BreakpointObserver.observe()` emittiert sofort den aktuellen Status und dann bei jeder Änderung.
- Mehrere Queries können als Array übergeben werden — `result.breakpoints` enthält dann den Status jeder einzelnen Query.
- `MediaMatcher` kümmert sich um SSR-Kompatibilität (gibt ein Mock-`MediaQueryList` zurück, wenn kein Browser vorhanden ist).
- Die vordefinierten `Breakpoints` basieren auf Material Design-Breakpoints.

---

## Listbox

**Kategorie:** Components
**Import:** `CdkListboxModule` from `@angular/cdk/listbox`
**URL:** https://material.angular.dev/cdk/listbox/overview

### Übersicht

Das `listbox`-Paket implementiert das WAI-ARIA Listbox-Pattern als Angular-Direktiven. Es stellt barrierefreie Listen-Auswahl-Komponenten ohne visuelles Styling bereit. `CdkListbox` ist der Container, `CdkOption` sind die einzelnen auswählbaren Optionen. Das Paket unterstützt Einzel- und Mehrfachauswahl, Tastaturnavigation, Typeahead-Suche, Formular-Integration via `ControlValueAccessor` sowie ARIA Active Descendant Pattern.

### Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `CdkListboxModule` | NgModule | Haupt-Modul |
| `CdkListbox<T>` | Direktive | Listbox-Container; Selector: `[cdkListbox]` |
| `CdkOption<T>` | Direktive | Einzelne Option; Selector: `[cdkOption]` |
| `ListboxValueChangeEvent<T>` | Interface | Änderungs-Event-Typ |

**CdkListbox Inputs:**
- `cdkListboxValue: T[]` — Ausgewählte Werte
- `cdkListboxMultiple: boolean` — Mehrfachauswahl
- `cdkListboxDisabled: boolean` — Listbox deaktivieren
- `cdkListboxUseActiveDescendant: boolean` — ARIA Active Descendant nutzen
- `cdkListboxOrientation: 'horizontal' | 'vertical'` — Navigationsrichtung
- `cdkListboxCompareWith: (a: T, b: T) => boolean` — Wertvergleich
- `cdkListboxNavigationWrapDisabled: boolean` — Ringnavigation deaktivieren

**CdkListbox Outputs:**
- `cdkListboxValueChange: ListboxValueChangeEvent<T>` — Bei Auswahländerung

**CdkOption Inputs:**
- `cdkOption: T` — Wert der Option
- `cdkOptionDisabled: boolean` — Option deaktivieren
- `cdkOptionTypeaheadLabel: string` — Label für Typeahead

### Verwendungsbeispiel

```html
<ul cdkListbox [cdkListboxValue]="selectedFruits"
    (cdkListboxValueChange)="onSelectionChange($event)">
  <li cdkOption="apple">Apfel</li>
  <li cdkOption="banana">Banane</li>
  <li cdkOption="cherry">Kirsche</li>
  <li cdkOption="disabled-fruit" cdkOptionDisabled>Gesperrt</li>
</ul>
```

```typescript
import { CdkListboxModule } from '@angular/cdk/listbox';

@Component({ ... })
export class FruitPickerComponent {
  selectedFruits = ['apple'];

  onSelectionChange(event: ListboxValueChangeEvent<string>) {
    this.selectedFruits = event.value;
  }
}
```

```html
<!-- Mehrfachauswahl -->
<div cdkListbox cdkListboxMultiple
     [(cdkListboxValue)]="selectedItems">
  <div cdkOption="item1">Item 1</div>
  <div cdkOption="item2">Item 2</div>
  <div cdkOption="item3">Item 3</div>
</div>
```

### Besonderheiten

- Tastaturnavigation: Pfeiltasten, Home, End, Space/Enter zur Auswahl, Shift für Bereichsauswahl, Ctrl+A für Alles-Auswählen.
- Typeahead: Buchstabentasten springen zur ersten übereinstimmenden Option.
- `cdkListboxUseActiveDescendant: true` verwendet `aria-activedescendant` statt echten Fokus — wichtig für Screenreader-Kompatibilität.
- Formular-Integration: `CdkListbox` implementiert `ControlValueAccessor` für Reactive Forms und Template-Driven Forms.
- ARIA-Attribute (`role="listbox"`, `aria-selected`, `role="option"`) werden automatisch gesetzt.

---

## Menu

**Kategorie:** Components
**Import:** `CdkMenuModule` from `@angular/cdk/menu`
**URL:** https://material.angular.dev/cdk/menu/overview

### Übersicht

Das `menu`-Paket implementiert barrierefreie Menü-Komponenten gemäß WAI-ARIA Menu Pattern. Es unterstützt verschachtelte Submenüs, Menüleisten, Kontext-Menüs (Rechtsklick), Checkbox-Items und Radio-Items. Alle Komponenten sind vollständig unstyled und bauen auf dem Overlay-CDK auf. Die Navigation erfolgt per Tastatur gemäß ARIA-Spezifikation (Pfeiltasten, Escape, Tab).

### Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `CdkMenuModule` | NgModule | Haupt-Modul |
| `CdkMenu` | Direktive | Menü-Container; Selector: `[cdkMenu]` |
| `CdkMenuBar` | Direktive | Horizontale Menüleiste; Selector: `[cdkMenuBar]` |
| `CdkMenuItem` | Direktive | Menü-Item; Selector: `[cdkMenuItem]` |
| `CdkMenuItemCheckbox` | Direktive | Checkbox-Item; Selector: `[cdkMenuItemCheckbox]` |
| `CdkMenuItemRadio` | Direktive | Radio-Item; Selector: `[cdkMenuItemRadio]` |
| `CdkMenuGroup` | Direktive | Gruppierung für Radio/Checkbox-Items |
| `CdkMenuTrigger` | Direktive | Trigger für Submenüs; Selector: `[cdkMenuTriggerFor]` |
| `CdkContextMenuTrigger` | Direktive | Kontextmenü-Trigger; Selector: `[cdkContextMenuTriggerFor]` |
| `MenuStack` | Service | Verwaltung des Menü-Stacks |

**CdkMenu Outputs:**
- `closed: EventEmitter<void>` — Menü geschlossen

**CdkMenuItem Inputs:**
- `cdkMenuItemDisabled: boolean` — Item deaktivieren
- `cdkMenuItemTriggersSubmenu: boolean` — Zeigt an ob Submenü vorhanden

**CdkMenuTrigger Inputs:**
- `cdkMenuTriggerFor: TemplateRef` — Template des Submenüs
- `cdkMenuPosition: ConnectedPosition[]` — Positionierung

**CdkContextMenuTrigger Inputs:**
- `cdkContextMenuTriggerFor: TemplateRef` — Template des Kontextmenüs

### Verwendungsbeispiel

```html
<!-- Einfaches Menü -->
<button [cdkMenuTriggerFor]="myMenu">Menü öffnen</button>

<ng-template #myMenu>
  <div cdkMenu>
    <button cdkMenuItem (cdkMenuItemTriggered)="onNew()">Neu</button>
    <button cdkMenuItem (cdkMenuItemTriggered)="onOpen()">Öffnen</button>
    <button cdkMenuItem [cdkMenuItemDisabled]="!canSave" (cdkMenuItemTriggered)="onSave()">
      Speichern
    </button>
  </div>
</ng-template>
```

```html
<!-- Menüleiste mit Submenüs -->
<div cdkMenuBar>
  <button cdkMenuItem [cdkMenuTriggerFor]="fileMenu">Datei</button>
  <button cdkMenuItem [cdkMenuTriggerFor]="editMenu">Bearbeiten</button>
</div>

<ng-template #fileMenu>
  <div cdkMenu>
    <button cdkMenuItem (cdkMenuItemTriggered)="onNew()">Neu</button>
    <button cdkMenuItem [cdkMenuTriggerFor]="recentMenu">Zuletzt verwendet</button>
  </div>
</ng-template>
```

```html
<!-- Kontextmenü -->
<div [cdkContextMenuTriggerFor]="contextMenu">
  Rechtsklick auf mich!
</div>

<ng-template #contextMenu>
  <div cdkMenu>
    <button cdkMenuItem (cdkMenuItemTriggered)="onCopy()">Kopieren</button>
    <button cdkMenuItem (cdkMenuItemTriggered)="onPaste()">Einfügen</button>
  </div>
</ng-template>
```

```html
<!-- Checkbox und Radio Items -->
<ng-template #optionsMenu>
  <div cdkMenu>
    <div cdkMenuGroup>
      <button cdkMenuItemRadio [cdkMenuItemChecked]="view==='grid'"
              (cdkMenuItemTriggered)="view='grid'">
        Rasteransicht
      </button>
      <button cdkMenuItemRadio [cdkMenuItemChecked]="view==='list'"
              (cdkMenuItemTriggered)="view='list'">
        Listenansicht
      </button>
    </div>
  </div>
</ng-template>
```

### Besonderheiten

- ARIA-Attribute (`role="menu"`, `role="menuitem"`, `role="menuitemcheckbox"`, `role="menuitemradio"`) werden automatisch gesetzt.
- Tastaturnavigation: Pfeiltasten für Navigation, Enter/Space zum Aktivieren, Escape zum Schließen, Tab zum Verlassen.
- Menüs öffnen/schließen automatisch bei Hover in Menüleisten.
- `CdkMenuItemSelectable` ist die abstrakte Basisklasse für Checkbox- und Radio-Items.

---

## Observers

**Kategorie:** Common Behaviors
**Import:** `ObserversModule` from `@angular/cdk/observers`
**URL:** https://material.angular.dev/cdk/observers/overview

### Übersicht

Das `observers`-Paket bietet Angular-Wrappers um native Browser-APIs zur Beobachtung von DOM-Änderungen. Der `ContentObserver`-Service nutzt die `MutationObserver`-API, um Änderungen am Inhalt eines Elements zu überwachen und als Observable zu emittieren. Die `cdkObserveContent`-Direktive vereinfacht die deklarative Verwendung. Das Paket filtert automatisch Angular-interne Comment-Nodes, um falsche Change-Detection-Zyklen zu verhindern.

### Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `ObserversModule` | NgModule | Haupt-Modul |
| `ContentObserver` | Service | Überwacht DOM-Inhalt per MutationObserver |
| `CdkObserveContent` | Direktive | Deklarative Inhaltsbeobachtung; Selector: `[cdkObserveContent]` |

**ContentObserver Methoden:**
- `observe(element: Element | ElementRef): Observable<MutationRecord[]>` — Element beobachten

**CdkObserveContent Inputs:**
- `disabled` (Alias: `cdkObserveContentDisabled`): `boolean` — Beobachtung deaktivieren
- `debounce: number` — Debounce-Zeit in ms

**CdkObserveContent Outputs:**
- `cdkObserveContent: EventEmitter<MutationRecord[]>` — Bei Inhaltsänderung

### Verwendungsbeispiel

```html
<!-- Direktive -->
<div
  (cdkObserveContent)="onContentChanged($event)"
  [debounce]="300">
  <ng-content></ng-content>
</div>
```

```typescript
import { ContentObserver } from '@angular/cdk/observers';

@Component({ ... })
export class MyComponent implements AfterViewInit, OnDestroy {
  @ViewChild('myElement') myElement!: ElementRef;
  private observer$?: Subscription;

  constructor(private contentObserver: ContentObserver) {}

  ngAfterViewInit() {
    this.observer$ = this.contentObserver
      .observe(this.myElement)
      .subscribe(mutations => {
        console.log('DOM-Änderungen:', mutations);
        this.recalculateLayout();
      });
  }

  ngOnDestroy() {
    this.observer$?.unsubscribe();
  }
}
```

### Besonderheiten

- `ContentObserver` nutzt einen Observer-Pool — mehrere Komponenten können dasselbe Element beobachten ohne mehrere `MutationObserver`-Instanzen zu erstellen.
- Angular-interne Comment-Nodes (Template-Marker) werden automatisch herausgefiltert.
- Emissionen erfolgen innerhalb der Angular-Zone, sodass Change Detection automatisch ausgelöst wird.
- `debounce`-Option verhindert übermäßige Änderungs-Events bei schnellen DOM-Manipulationen.
- Nicht verfügbar in SSR-Umgebungen (Node.js hat keine `MutationObserver`-API).

---

## Overlay

**Kategorie:** Components
**Import:** `OverlayModule` from `@angular/cdk/overlay`
**URL:** https://material.angular.dev/cdk/overlay/overview

### Übersicht

Das `overlay`-Paket ermöglicht die Darstellung schwebender UI-Panels auf dem Bildschirm. Es dient als Grundlage für Dropdowns, Tooltips, Dialoge und andere Overlay-Elemente in Angular Material. Das Paket bietet flexible Positionierungsstrategien (global oder relativ zu einem anderen Element) sowie verschiedene Scroll-Strategien, die das Verhalten des Overlays beim Scrollen der Seite steuern. Alle Angular Material Overlays (MatDialog, MatMenu, MatTooltip etc.) bauen auf diesem CDK auf.

### Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `OverlayModule` | NgModule | Haupt-Modul |
| `Overlay` | Service | Erstellt Overlay-Instanzen |
| `OverlayRef` | Klasse | Referenz auf ein Overlay |
| `OverlayConfig` | Klasse | Konfiguration für ein Overlay |
| `OverlayContainer` | Service | Container für alle Overlays |
| `FullscreenOverlayContainer` | Service | Fullscreen-kompatibler Container |
| `OverlayPositionBuilder` | Service | Erstellt Positionierungsstrategien |
| `GlobalPositionStrategy` | Klasse | Globale Positionierung im Viewport |
| `FlexibleConnectedPositionStrategy` | Klasse | Relative Positionierung zu einem Element |
| `ConnectedPosition` | Interface | Position-Definition (origin + overlay + Fallbacks) |
| `CdkOverlayOrigin` | Direktive | Markiert Element als Overlay-Origin; Selector: `[cdk-overlay-origin]` |
| `CdkConnectedOverlay` | Direktive | Deklaratives Overlay; Selector: `[cdk-connected-overlay]` |
| `OVERLAY_DEFAULT_CONFIG` | InjectionToken | Standard-Konfiguration |

**Scroll-Strategien:**
- `overlay.scrollStrategies.noop()` — Keine Reaktion (Standard)
- `overlay.scrollStrategies.close()` — Overlay schließen beim Scrollen
- `overlay.scrollStrategies.block()` — Seiten-Scrollen verhindern
- `overlay.scrollStrategies.reposition()` — Position neu berechnen

**OverlayConfig Optionen:**
- `width, height, minWidth, minHeight, maxWidth, maxHeight`
- `positionStrategy: PositionStrategy`
- `scrollStrategy: ScrollStrategy`
- `hasBackdrop: boolean`
- `backdropClass: string | string[]`
- `panelClass: string | string[]`
- `direction: Direction`
- `disposeOnNavigation: boolean`

**OverlayRef Methoden:**
- `attach(portal: Portal)` — Inhalt anhängen
- `detach()` — Inhalt entfernen
- `dispose()` — Overlay permanent entfernen
- `backdropClick(): Observable<MouseEvent>`
- `keydownEvents(): Observable<KeyboardEvent>`
- `overlayElement: HTMLElement`
- `updatePosition()` — Position neu berechnen
- `updateSize(config: OverlaySizeConfig)` — Größe aktualisieren

### Verwendungsbeispiel

```typescript
import { Overlay, OverlayConfig } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';

@Component({ ... })
export class TooltipComponent implements OnDestroy {
  private overlayRef?: OverlayRef;

  constructor(private overlay: Overlay) {}

  showTooltip(origin: ElementRef) {
    const positionStrategy = this.overlay.position()
      .flexibleConnectedTo(origin)
      .withPositions([
        { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: 8 },
        { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -8 }
      ]);

    const config = new OverlayConfig({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.close(),
      hasBackdrop: false,
      panelClass: 'my-tooltip-panel'
    });

    this.overlayRef = this.overlay.create(config);
    this.overlayRef.attach(new ComponentPortal(TooltipContentComponent));

    this.overlayRef.backdropClick().subscribe(() => this.hideTooltip());
  }

  hideTooltip() {
    this.overlayRef?.detach();
  }

  ngOnDestroy() {
    this.overlayRef?.dispose();
  }
}
```

```html
<!-- Deklarativ mit CdkConnectedOverlay -->
<button #trigger="cdkOverlayOrigin" cdkOverlayOrigin (click)="isOpen = !isOpen">
  Dropdown öffnen
</button>

<ng-template
  cdkConnectedOverlay
  [cdkConnectedOverlayOrigin]="trigger"
  [cdkConnectedOverlayOpen]="isOpen"
  (overlayOutsideClick)="isOpen = false">
  <div class="dropdown-panel">
    <p>Dropdown-Inhalt</p>
  </div>
</ng-template>
```

### Besonderheiten

- **Strukturelle Styles**: Müssen manuell importiert werden wenn Material nicht verwendet wird: `@angular/cdk/overlay-prebuilt.css`.
- **Z-Index**: Overlays werden in einem eigenen Container außerhalb des App-Roots gerendert.
- **FlexibleConnectedPositionStrategy**: Unterstützt mehrere Fallback-Positionen, Viewport-Margins, `push: true` um das Overlay in sichtbaren Bereich zu drängen.
- **PositionStrategy**: Benutzerdefinierte Strategien durch Implementierung des `PositionStrategy`-Interface möglich.
- `STANDARD_DROPDOWN_ADJACENT_POSITIONS` und `STANDARD_DROPDOWN_BELOW_POSITIONS` sind vordefinierte Position-Arrays.

---

## Platform

**Kategorie:** Utilities
**Import:** `PlatformModule` from `@angular/cdk/platform`
**URL:** https://material.angular.dev/cdk/platform/overview

### Übersicht

Das `platform`-Paket bietet einen Service zur Erkennung der aktuellen Plattform und des Rendering-Environments. Der `Platform`-Service stellt Boolean-Properties für verschiedene Browser und Rendering-Engines bereit, ohne dass direkte User-Agent-String-Prüfungen im Anwendungscode nötig sind. Dies ist besonders wichtig für Browser-spezifische Workarounds und für die SSR-Kompatibilität (Server-Side Rendering mit `isBrowser`).

### Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `PlatformModule` | NgModule | Haupt-Modul |
| `Platform` | Service | Plattform- und Browser-Erkennung |

**Platform Properties:**
- `isBrowser: boolean` — Läuft in einem Browser
- `EDGE: boolean` — Microsoft Edge
- `TRIDENT: boolean` — Internet Explorer (Trident-Engine)
- `BLINK: boolean` — Chrome, Opera (Blink-Engine)
- `WEBKIT: boolean` — Safari (WebKit ohne Blink/Trident)
- `IOS: boolean` — Apple iOS-Gerät
- `FIREFOX: boolean` — Mozilla Firefox
- `ANDROID: boolean` — Android-Gerät (ohne Trident mobile)
- `SAFARI: boolean` — Safari-Browser

### Verwendungsbeispiel

```typescript
import { Platform } from '@angular/cdk/platform';

@Component({ ... })
export class ScrollComponent {
  constructor(private platform: Platform) {}

  scrollTo(element: HTMLElement) {
    if (this.platform.isBrowser) {
      // Sicherer Zugriff auf Browser-APIs
      if (this.platform.IOS) {
        // iOS-spezifischer Workaround für Scroll-Probleme
        element.style.webkitOverflowScrolling = 'touch';
      }
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  ngOnInit() {
    if (!this.platform.isBrowser) {
      // SSR: keine Browser-APIs verfügbar
      return;
    }

    if (this.platform.FIREFOX) {
      // Firefox-spezifische Initialisierung
    }
  }
}
```

### Besonderheiten

- `isBrowser` ist die wichtigste Property für SSR-Kompatibilität.
- Die Erkennungen basieren auf User-Agent-String-Prüfungen und browser-spezifischen globalen Variablen.
- Beinhaltet defensive Programmierung (try-catch) für bestimmte Internet-Explorer-Konfigurationen.
- In Test-Umgebungen können Platform-Werte über DI überschrieben werden.
- Das Paket enthält auch Feature-Detection-Utilities in Untermodulen: `supportsPassiveEventListeners`, `getSupportedInputTypes`, `supportsScrollBehavior`, `isOnShadowRoot`.

---

## Portal

**Kategorie:** Components
**Import:** `PortalModule` from `@angular/cdk/portal`
**URL:** https://material.angular.dev/cdk/portal/overview

### Übersicht

Das `portal`-Paket ermöglicht die dynamische Darstellung von UI-Inhalten (Komponenten, Templates oder DOM-Elemente) an beliebigen Stellen in der Anwendung. Ein `Portal` repräsentiert den darzustellenden Inhalt, ein `PortalOutlet` ist der Zielort. Dieses Konzept bildet die Grundlage für das Overlay-Paket und ermöglicht fortgeschrittene Muster wie das dynamische Einfügen von Inhalten in App-Shells oder das Teleportieren von Komponenten.

### Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `PortalModule` | NgModule | Haupt-Modul |
| `Portal<T>` | Abstrakte Klasse | Basis für alle Portal-Typen |
| `ComponentPortal<T>` | Klasse | Portal für eine Angular-Komponente |
| `TemplatePortal<C>` | Klasse | Portal für ein `TemplateRef` |
| `DomPortal<T>` | Klasse | Portal für ein DOM-Element |
| `CdkPortal` | Direktive | Template-basiertes Portal; Selector: `[cdkPortal]` |
| `PortalOutlet` | Interface | Basis-Interface für Outlet |
| `DomPortalOutlet` | Klasse | DOM-basiertes Outlet |
| `CdkPortalOutlet` | Direktive | Deklaratives Outlet; Selector: `[cdkPortalOutlet]` |

**Portal API:**
- `attach(outlet: PortalOutlet): T` — Portal anhängen
- `detach(): void` — Portal ablösen
- `isAttached: boolean` — Anhänge-Status

**PortalOutlet API:**
- `attach(portal: Portal): any` — Portal anhängen
- `detach(): any` — Portal ablösen
- `dispose(): void` — Outlet permanent entfernen
- `hasAttached: boolean` — Hat ein Portal

**CdkPortalOutlet Inputs:**
- `cdkPortalOutlet: Portal | null` — Das anzuhängende Portal

**CdkPortalOutlet Outputs:**
- `attached: EventEmitter<CdkPortalOutletAttachedRef>` — Bei Anhängen

### Verwendungsbeispiel

```typescript
import {
  ComponentPortal, TemplatePortal, CdkPortalOutlet, PortalModule
} from '@angular/cdk/portal';

// Komponenten-Portal
@Component({ ... })
export class AppComponent implements AfterViewInit {
  @ViewChild(CdkPortalOutlet) portalOutlet!: CdkPortalOutlet;

  ngAfterViewInit() {
    const portal = new ComponentPortal(MyDynamicComponent);
    this.portalOutlet.attach(portal);
  }
}
```

```html
<!-- Template-Portal -->
<ng-template cdkPortal #myPortal="cdkPortal">
  <p>Ich werde dynamisch gerendert!</p>
</ng-template>

<div [cdkPortalOutlet]="activePortal"></div>
```

```typescript
// Template-Portal programmatisch
@Component({ ... })
export class ParentComponent {
  @ViewChild('myPortal') portalTemplate!: CdkPortal;
  activePortal: Portal<any> | null = null;

  showPortal() {
    this.activePortal = this.portalTemplate;
  }

  hidePortal() {
    this.activePortal = null;
  }
}
```

```typescript
// DomPortalOutlet für Rendering außerhalb des Angular-Baums
import { DomPortalOutlet, ComponentPortal, ApplicationRef } from '@angular/cdk/portal';
import { Injector } from '@angular/core';

const outlet = new DomPortalOutlet(
  document.body,
  componentFactoryResolver,
  appRef,
  injector
);
outlet.attach(new ComponentPortal(NotificationComponent));
```

### Besonderheiten

- `DomPortal` bewegt das physische DOM-Element — Angular-Bindings und Direktiven können danach nicht mehr aktualisiert werden.
- `ComponentPortal` kann einen optionalen `Injector` für Dependency Injection übergeben.
- `TemplatePortal` benötigt eine `ViewContainerRef` für die Erzeugung.
- Das Portal-System bildet die Grundlage für `Overlay`, `Dialog` und andere CDK-Komponenten.
- `CdkPortalOutlet` emittiert bei jedem Anhängen das zugehörige Portal-Ref-Objekt.

---

## Scrolling (Virtual Scrolling)

**Kategorie:** Components
**Import:** `ScrollingModule` from `@angular/cdk/scrolling`
**URL:** https://material.angular.dev/cdk/scrolling/overview

### Übersicht

Das `scrolling`-Paket bietet Virtual Scrolling für große Datenlisten und Scroll-Utilities. Das Virtual Scrolling rendert nur die aktuell sichtbaren Elemente im Viewport, was die Performance bei großen Datensätzen erheblich verbessert. `ScrollDispatcher` und `ViewportRuler` ermöglichen effizientes Scroll-Event-Handling in der gesamten Anwendung. `CdkScrollable` markiert scrollbare Container für die globale Erkennung.

### Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `ScrollingModule` | NgModule | Haupt-Modul |
| `CdkVirtualScrollViewport` | Komponente | Virtual-Scroll-Container; Selector: `cdk-virtual-scroll-viewport` |
| `CdkVirtualForOf` | Direktive | Virtual `*ngFor`; Selector: `[cdkVirtualFor]` |
| `CdkFixedSizeVirtualScroll` | Direktive | Gleichgroße Items; Selector: `[cdkFixedSizeVirtualScroll]` |
| `FixedSizeVirtualScrollStrategy` | Klasse | Scroll-Strategie für gleichgroße Items |
| `VIRTUAL_SCROLL_STRATEGY` | InjectionToken | Token für benutzerdefinierte Scroll-Strategien |
| `ScrollDispatcher` | Service | Globales Scroll-Event-Management |
| `ViewportRuler` | Service | Viewport-Größe und -Position |
| `CdkScrollable` | Direktive | Markiert scrollbaren Container |
| `CdkVirtualScrollableElement` | Direktive | Element als Scroll-Container |
| `CdkVirtualScrollableWindow` | Direktive | Window als Scroll-Container |

**CdkVirtualScrollViewport Inputs:**
- `orientation: 'horizontal' | 'vertical'` — Scroll-Richtung (Standard: `'vertical'`)
- `appendOnly: boolean` — Gerenderte Items bleiben im DOM

**CdkVirtualScrollViewport Outputs:**
- `scrolledIndexChange: EventEmitter<number>` — Index des ersten sichtbaren Elements

**CdkFixedSizeVirtualScroll Inputs:**
- `itemSize: number` — Größe jedes Items in px (Standard: 20)
- `minBufferPx: number` — Minimaler Buffer über/unter dem Viewport (Standard: 100)
- `maxBufferPx: number` — Maximaler Buffer (Standard: 200)

**CdkVirtualForOf (strukturelle Direktive):**
- `cdkVirtualForOf: DataSource<T> | Observable<T[]> | T[]` — Datenquelle
- `cdkVirtualForTrackBy: TrackByFunction<T>` — Identifikation
- `cdkVirtualForTemplate: TemplateRef<CdkVirtualForOfContext<T>>` — Template
- `cdkVirtualForTemplateCacheSize: number` — Template-Cache-Größe

### Verwendungsbeispiel

```html
<!-- Fixed-Size Virtual Scrolling -->
<cdk-virtual-scroll-viewport itemSize="50" style="height: 400px;">
  <div *cdkVirtualFor="let item of items; trackBy: trackByFn"
       style="height: 50px;">
    {{ item.name }}
  </div>
</cdk-virtual-scroll-viewport>
```

```typescript
import { ScrollingModule } from '@angular/cdk/scrolling';

@Component({
  selector: 'my-list',
  template: `
    <cdk-virtual-scroll-viewport [itemSize]="itemHeight" class="list-container">
      <div *cdkVirtualFor="let item of largeDataset; let i = index"
           [style.height.px]="itemHeight">
        {{ i }}: {{ item.name }}
      </div>
    </cdk-virtual-scroll-viewport>
  `,
  styles: ['.list-container { height: 500px; width: 100%; }']
})
export class VirtualListComponent {
  itemHeight = 48;
  largeDataset = Array.from({ length: 100000 }, (_, i) => ({ name: `Item ${i}` }));

  trackByFn(index: number, item: any) {
    return item.name;
  }
}
```

```typescript
// Benutzerdefinierte Scroll-Strategie für variable Item-Größen
import { VIRTUAL_SCROLL_STRATEGY, VirtualScrollStrategy } from '@angular/cdk/scrolling';

@Directive({ selector: '[variableSizeScroll]', providers: [{
  provide: VIRTUAL_SCROLL_STRATEGY,
  useFactory: (d: VariableSizeScrollDirective) => d.scrollStrategy,
  deps: [VariableSizeScrollDirective]
}]})
export class VariableSizeScrollDirective {
  scrollStrategy = new VariableSizeScrollStrategy(/* ... */);
}
```

### Besonderheiten

- `appendOnly: true` verhindert das Entfernen von bereits gerenderten Items — sinnvoll wenn Items über die Zeit wachsen können.
- Für variable Item-Größen muss eine benutzerdefinierte `VirtualScrollStrategy` implementiert werden.
- `ScrollDispatcher` verwendet `auditTime()` intern, um Scroll-Events zu drosseln.
- `ViewportRuler` liefert `getViewportSize()`, `getViewportRect()` und `getViewportScrollPosition()`.
- Virtual Scrolling erfordert eine **feste Höhe/Breite** am `cdk-virtual-scroll-viewport`.

---

## Stepper

**Kategorie:** Components
**Import:** `CdkStepperModule` from `@angular/cdk/stepper`
**URL:** https://material.angular.dev/cdk/stepper/overview

### Übersicht

Das `stepper`-Paket implementiert das grundlegende Stepper-Muster für Multi-Schritt-Workflows ohne visuelles Styling. Es verwaltet die Navigation zwischen einzelnen Schritten, Validierungsstatus und Barrierefreiheit. `CdkStepper` ist der Container-Direktive; `CdkStep` repräsentiert jeden Schritt. Das Paket unterstützt linearen und nicht-linearen Modus sowie horizontale und vertikale Ausrichtung.

### Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `CdkStepperModule` | NgModule | Haupt-Modul |
| `CdkStepper` | Direktive | Stepper-Container; Selector: `[cdkStepper]` |
| `CdkStep` | Komponente | Einzelner Schritt; Selector: `cdk-step` |
| `CdkStepHeader` | Direktive | Schritt-Header; Selector: `[cdkStepHeader]` |
| `CdkStepLabel` | Direktive | Schritt-Label; Selector: `[cdkStepLabel]` |
| `CdkStepperNext` | Direktive | Nächster-Schritt-Button; Selector: `[cdkStepperNext]` |
| `CdkStepperPrevious` | Direktive | Vorheriger-Schritt-Button; Selector: `[cdkStepperPrevious]` |
| `StepperSelectionEvent` | Interface | Event bei Schritt-Wechsel |
| `STEPPER_GLOBAL_OPTIONS` | InjectionToken | Globale Stepper-Konfiguration |

**CdkStep Inputs:**
- `stepControl: AbstractControl` — Formular-Kontrolle für Validierung
- `label: string` — Text-Label
- `errorMessage: string` — Fehlermeldung
- `editable: boolean` — Rückkehr zu diesem Schritt erlauben (Standard: `true`)
- `optional: boolean` — Schritt ist optional (Standard: `false`)
- `completed: boolean` — Manuell als abgeschlossen markieren
- `hasError: boolean` — Fehlerstatus
- `state: StepState` — Status: `'number' | 'edit' | 'done' | 'error' | string`

**CdkStepper Inputs:**
- `linear: boolean` — Linearer Modus (vorherige Schritte müssen abgeschlossen sein)
- `selectedIndex: number` — Aktueller Schritt-Index
- `selected: CdkStep` — Aktueller Schritt
- `orientation: 'horizontal' | 'vertical'`

**CdkStepper Outputs:**
- `selectionChange: StepperSelectionEvent` — Bei Schritt-Wechsel
- `selectedIndexChange: number` — Für Two-Way-Binding

**CdkStepper Methoden:**
- `next()` — Zum nächsten Schritt
- `previous()` — Zum vorherigen Schritt
- `reset()` — Auf ersten Schritt zurücksetzen

### Verwendungsbeispiel

```html
<div cdkStepper #stepper="cdkStepper" [linear]="isLinear">
  <!-- Schritt 1 -->
  <cdk-step [stepControl]="step1Form" label="Persönliche Daten">
    <form [formGroup]="step1Form">
      <input formControlName="name" placeholder="Name">
      <input formControlName="email" placeholder="E-Mail">
    </form>
    <button cdkStepperNext [disabled]="step1Form.invalid">Weiter</button>
  </cdk-step>

  <!-- Schritt 2 -->
  <cdk-step [stepControl]="step2Form" label="Adresse" [optional]="true">
    <form [formGroup]="step2Form">
      <input formControlName="street" placeholder="Straße">
      <input formControlName="city" placeholder="Stadt">
    </form>
    <button cdkStepperPrevious>Zurück</button>
    <button cdkStepperNext>Weiter</button>
  </cdk-step>

  <!-- Schritt 3 -->
  <cdk-step label="Bestätigung">
    <p>Alle Daten überprüft?</p>
    <button cdkStepperPrevious>Zurück</button>
    <button (click)="onSubmit()">Absenden</button>
  </cdk-step>
</div>

<!-- Schritt-Indikatoren -->
<div *ngFor="let step of stepper.steps; let i = index">
  <button (click)="stepper.selectedIndex = i">
    Schritt {{ i + 1 }}: {{ step.label }}
  </button>
</div>
```

### Besonderheiten

- Im `linear`-Modus kann der Nutzer nur zum nächsten Schritt gelangen, wenn `stepControl.valid` oder `completed: true`.
- `STEPPER_GLOBAL_OPTIONS` kann `{ showError: true, displayDefaultIndicatorType: false }` enthalten.
- Tastaturnavigation: Pfeiltasten für Header-Navigation, Tab für Inhaltsbereich.
- ARIA-Attribute werden automatisch gesetzt (`aria-selected`, `aria-disabled`).
- `CdkStep` implementiert `AfterContentInit` und `OnChanges` für reaktive Updates.

---

## Table

**Kategorie:** Components
**Import:** `CdkTableModule` from `@angular/cdk/table`
**URL:** https://material.angular.dev/cdk/table/overview

### Übersicht

Das `table`-Paket bietet eine flexible, unstyled Datentabellen-Komponente. Die `cdk-table`-Komponente unterstützt sowohl native HTML-Tabellen (`<table>`) als auch CSS-Flex-basierte Tabellen und ist hochgradig anpassbar durch Spalten- und Zeilen-Definitionen via Templates. Es unterstützt Sticky-Spalten und -Zeilen, mehrere Zeilen pro Datenelement sowie verschiedene Datenquellen (Arrays, Observables, DataSource). Angular Materials `MatTable` baut direkt auf diesem CDK auf.

### Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `CdkTableModule` | NgModule | Haupt-Modul |
| `CdkTable<T>` | Komponente | Tabellen-Container; Selector: `cdk-table`, `table[cdk-table]` |
| `CdkColumnDef` | Direktive | Spalten-Definition; Selector: `[cdkColumnDef]` |
| `CdkHeaderCellDef` | Direktive | Header-Zelle; Selector: `[cdkHeaderCellDef]` |
| `CdkCellDef` | Direktive | Daten-Zelle; Selector: `[cdkCellDef]` |
| `CdkFooterCellDef` | Direktive | Footer-Zelle; Selector: `[cdkFooterCellDef]` |
| `CdkHeaderRowDef` | Direktive | Header-Zeile; Selector: `[cdkHeaderRowDef]` |
| `CdkRowDef<T>` | Direktive | Daten-Zeile; Selector: `[cdkRowDef]` |
| `CdkFooterRowDef` | Direktive | Footer-Zeile; Selector: `[cdkFooterRowDef]` |
| `CdkHeaderRow` | Komponente | Gerenderter Header-Zeilen-Container |
| `CdkRow` | Komponente | Gerenderter Daten-Zeilen-Container |
| `CdkNoDataRow` | Direktive | Anzeige bei leeren Daten |
| `CdkTextColumn<T>` | Komponente | Einfache Text-Spalte |
| `DataSource<T>` | Abstrakte Klasse | Re-Export aus collections |

**CdkTable Inputs:**
- `dataSource: T[] | Observable<T[]> | DataSource<T>` — Datenquelle
- `trackBy: TrackByFunction<T>` — Identifikation für Change Detection
- `multiTemplateDataRows: boolean` — Mehrere Zeilen pro Datenelement
- `fixedLayout: boolean` — Feste Spaltenbreiten (Performance für Sticky)
- `recycleRows: boolean` — View-Recycling für bessere Performance

**CdkTable Outputs:**
- `contentChanged: EventEmitter<void>` — Nach dem Rendern

**CdkHeaderRowDef / CdkRowDef Inputs:**
- `columns: string[]` — Anzuzeigende Spalten-IDs
- `sticky: boolean` — Sticky-Positionierung (nur Header/Footer)
- `when: (index: number, rowData: T) => boolean` — Bedingte Zeilenauswahl

### Verwendungsbeispiel

```typescript
export interface Person {
  name: string;
  age: number;
  email: string;
}

@Component({
  template: `
    <table cdk-table [dataSource]="people">
      <!-- Name-Spalte -->
      <ng-container cdkColumnDef="name">
        <th cdk-header-cell *cdkHeaderCellDef>Name</th>
        <td cdk-cell *cdkCellDef="let row">{{ row.name }}</td>
      </ng-container>

      <!-- Alter-Spalte -->
      <ng-container cdkColumnDef="age">
        <th cdk-header-cell *cdkHeaderCellDef>Alter</th>
        <td cdk-cell *cdkCellDef="let row">{{ row.age }}</td>
      </ng-container>

      <!-- E-Mail-Spalte -->
      <ng-container cdkColumnDef="email">
        <th cdk-header-cell *cdkHeaderCellDef>E-Mail</th>
        <td cdk-cell *cdkCellDef="let row">{{ row.email }}</td>
      </ng-container>

      <!-- Zeilen-Definitionen -->
      <tr cdk-header-row *cdkHeaderRowDef="displayedColumns; sticky: true"></tr>
      <tr cdk-row *cdkRowDef="let row; columns: displayedColumns;"></tr>
      <tr cdk-no-data-row>
        <td>Keine Daten vorhanden</td>
      </tr>
    </table>
  `
})
export class DataTableComponent {
  displayedColumns = ['name', 'age', 'email'];
  people: Person[] = [
    { name: 'Alice', age: 30, email: 'alice@example.com' },
    { name: 'Bob', age: 25, email: 'bob@example.com' }
  ];
}
```

### Besonderheiten

- Unterstützt sowohl `<table cdk-table>` (natives HTML-Table-Rendering) als auch `<cdk-table>` (Flex-basiertes Rendering).
- **Sticky-Columns**: `[sticky]` für die erste Spalte, `[stickyEnd]` für die letzte Spalte.
- `fixedLayout: true` ist für Sticky-Columns empfohlen — verbessert Performance durch festes Layout.
- `recycleRows: true` verbessert Scroll-Performance, ist aber inkompatibel mit Zeilen-Animationen.
- Mehrere `CdkRowDef` mit unterschiedlichen `when`-Prädikaten ermöglichen verschiedene Zeilen-Templates für dasselbe Datenelement.
- `DataSource` als Klasse bietet mehr Kontrolle über Daten-Streams als ein einfaches Array.

---

## Testing

**Kategorie:** Testing
**Import:** `@angular/cdk/testing`, `@angular/cdk/testing/testbed`, `@angular/cdk/testing/selenium-webdriver`
**URL:** https://material.angular.dev/cdk/testing/overview

### Übersicht

Das `testing`-Paket ist die abstrakte Basis für Angular CDK Component Test Harnesses (detaillierter beschrieben unter [Component Test Harnesses](#component-test-harnesses)). Es enthält die plattformunabhängigen Interfaces und Basisklassen, die sowohl für Unit-Tests (TestBed) als auch für E2E-Tests (Selenium WebDriver) verwendet werden. `TestbedHarnessEnvironment` in `@angular/cdk/testing/testbed` verbindet das Harness-System mit Angular's Testing-Framework.

### Wichtige Direktiven/Services/Tokens

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

### Verwendungsbeispiel

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

### Besonderheiten

- **`parallel()`**: Hilfsfunktion zur parallelen Ausführung mehrerer asynchroner Operationen innerhalb eines Harness.
- Harnesses können verschachtelt werden: `getHarness()` innerhalb eines Harness sucht nur im Unterbereich.
- Angular Material stellt für jede Komponente einen fertigen Harness bereit (z.B. `MatButtonHarness`, `MatInputHarness`).
- `HarnessPredicate.stringMatches()` unterstützt sowohl String-Vergleich als auch RegExp.

---

## Text Field

**Kategorie:** Components
**Import:** `TextFieldModule` from `@angular/cdk/text-field`
**URL:** https://material.angular.dev/cdk/text-field/overview

### Übersicht

Das `text-field`-Paket bietet Utilities für Texteingabefelder. `CdkTextareaAutosize` passt die Höhe eines `<textarea>`-Elements automatisch an seinen Inhalt an. `AutofillMonitor` erkennt wann der Browser ein Eingabefeld automatisch ausfüllt. Diese Utilities werden in Angular Material für `MatInput` und `MatFormField` verwendet. Das Paket erfordert das Einbinden der Prebuilt-Styles für die Autofill-Erkennung.

### Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `TextFieldModule` | NgModule | Haupt-Modul |
| `CdkTextareaAutosize` | Direktive | Auto-Größenanpassung für Textareas; Selector: `textarea[cdkTextareaAutosize]` |
| `AutofillMonitor` | Service | Erkennt Browser-Autofill-Events |
| `AutofillEvent` | Interface | `{ target: Element, isAutofilled: boolean }` |

**CdkTextareaAutosize Inputs:**
- `cdkAutosizeMinRows: number` — Minimale Zeilenzahl
- `cdkAutosizeMaxRows: number` — Maximale Zeilenzahl
- `cdkTextareaAutosize: boolean` — Autosize aktivieren/deaktivieren
- `placeholder: string` — Placeholder-Attribut

**CdkTextareaAutosize Methoden:**
- `resizeToFitContent(force?: boolean)` — Größe manuell neu berechnen

**AutofillMonitor Methoden:**
- `monitor(element: Element | ElementRef): Observable<AutofillEvent>` — Autofill beobachten
- `stopMonitoring(element: Element | ElementRef): void` — Beobachtung beenden

### Verwendungsbeispiel

```html
<!-- Textarea mit automatischer Größenanpassung -->
<textarea
  cdkTextareaAutosize
  cdkAutosizeMinRows="3"
  cdkAutosizeMaxRows="10"
  placeholder="Nachricht eingeben..."
  [(ngModel)]="message">
</textarea>
```

```typescript
import { AutofillMonitor } from '@angular/cdk/text-field';

@Component({
  template: `
    <input #emailInput type="email" placeholder="E-Mail">
    <p *ngIf="emailAutofilled">E-Mail wurde automatisch ausgefüllt</p>
  `
})
export class LoginFormComponent implements AfterViewInit, OnDestroy {
  @ViewChild('emailInput') emailInput!: ElementRef;
  emailAutofilled = false;

  constructor(private autofillMonitor: AutofillMonitor) {}

  ngAfterViewInit() {
    this.autofillMonitor
      .monitor(this.emailInput)
      .subscribe(event => {
        this.emailAutofilled = event.isAutofilled;
      });
  }

  ngOnDestroy() {
    this.autofillMonitor.stopMonitoring(this.emailInput);
  }
}
```

### Besonderheiten

- **Prebuilt-Styles**: Für `AutofillMonitor` müssen CSS-Animations-Styles importiert werden: `@import '@angular/cdk/text-field-prebuilt.css'`.
- `AutofillMonitor` basiert auf CSS-Animations-Events (`cdk-text-field-autofill-start` / `cdk-text-field-autofill-end`) statt auf direkter `input`-Event-Überwachung.
- `CdkTextareaAutosize` verwendet `auditTime()` zum Drosseln von Resize-Berechnungen.
- Firefox-spezifischer Workaround: Nach dem Resize wird zur Caret-Position gescrollt.
- `resizeToFitContent(true)` erzwingt eine Neuberechnung, auch wenn sich der Wert nicht geändert hat.
- Eine feste `height` in CSS muss entfernt werden, damit Autosize funktioniert.

---

## Tree

**Kategorie:** Components
**Import:** `CdkTreeModule` from `@angular/cdk/tree`
**URL:** https://material.angular.dev/cdk/tree/overview

### Übersicht

Das `tree`-Paket bietet eine leistungsfähige, unstyled Baumstruktur-Komponente für Angular. Es unterstützt sowohl flache (Flat Tree) als auch verschachtelte (Nested Tree) Darstellungen. Die `cdk-tree`-Komponente verwaltet Knotenexpansion, Tastaturnavigation, ARIA-Attribute und bietet flexible Datenquellen-Unterstützung. `FlatTreeControl` und `NestedTreeControl` werden für ältere Implementierungen unterstützt; moderne Implementierungen verwenden `levelAccessor` und `childrenAccessor` direkt.

### Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `CdkTreeModule` | NgModule | Haupt-Modul |
| `CdkTree<T, K>` | Komponente | Baum-Container; Selector: `cdk-tree` |
| `CdkTreeNode<T, K>` | Direktive | Baum-Knoten; Selector: `cdk-tree-node` |
| `CdkTreeNodeDef<T>` | Direktive | Knoten-Template; Selector: `[cdkTreeNodeDef]` |
| `CdkTreeNodePadding<T>` | Direktive | Einrückung; Selector: `[cdkTreeNodePadding]` |
| `CdkTreeNodeToggle<T>` | Direktive | Expand/Collapse-Button; Selector: `[cdkTreeNodeToggle]` |
| `CdkTreeNodeOutlet` | Direktive | Rendering-Outlet; Selector: `[cdkTreeNodeOutlet]` |
| `TreeControl<T>` | Interface | Abstrakte Baumsteuerung (veraltet) |
| `FlatTreeControl<T>` | Klasse | Steuerung für Flat Trees (veraltet) |
| `NestedTreeControl<T>` | Klasse | Steuerung für Nested Trees (veraltet) |

**CdkTree Inputs:**
- `dataSource: DataSource<T> | Observable<T[]> | T[]` — Datenquelle
- `treeControl: TreeControl<T>` — Baumsteuerung (veraltet)
- `levelAccessor: (node: T) => number` — Level-Berechnung (empfohlen)
- `childrenAccessor: (node: T) => T[] | Observable<T[]>` — Kind-Knoten (empfohlen)
- `trackBy: TrackByFunction<T>` — Identifikation

**CdkTreeNode Inputs:**
- `cdkTreeNodeTypeaheadLabel: string` — Typeahead-Label für Tastaturnavigation

**CdkTreeNodePadding Inputs:**
- `cdkTreeNodePaddingIndent: number` — Einrückung pro Level in px (Standard: 28)
- `level: number` — Manuell gesetztes Level

**CdkTreeNodeToggle:**
- `[cdkTreeNodeToggleRecursive]="true"` — Rekursives Expand/Collapse

### Verwendungsbeispiel

```typescript
interface FoodNode {
  name: string;
  children?: FoodNode[];
}

const TREE_DATA: FoodNode[] = [
  {
    name: 'Früchte',
    children: [
      { name: 'Apfel' },
      { name: 'Banane' },
      { name: 'Kirsche', children: [{ name: 'Sauerkirsche' }] }
    ]
  },
  { name: 'Gemüse', children: [{ name: 'Tomate' }, { name: 'Gurke' }] }
];

@Component({
  template: `
    <cdk-tree [dataSource]="dataSource" [childrenAccessor]="childrenAccessor">
      <cdk-tree-node *cdkTreeNodeDef="let node"
                     [cdkTreeNodePaddingIndent]="24"
                     cdkTreeNodePadding>
        <button cdkTreeNodeToggle [attr.aria-label]="'Toggle ' + node.name">
          {{ hasChildren(node) ? (isExpanded(node) ? '▼' : '▶') : '' }}
        </button>
        {{ node.name }}
      </cdk-tree-node>
    </cdk-tree>
  `
})
export class TreeComponent {
  dataSource = TREE_DATA;

  childrenAccessor = (node: FoodNode) => node.children ?? [];

  hasChildren = (_: number, node: FoodNode) =>
    !!node.children && node.children.length > 0;
}
```

```typescript
// Moderner Ansatz mit Observable-Datenquelle
import { CdkTreeModule } from '@angular/cdk/tree';
import { ArrayDataSource } from '@angular/cdk/collections';

// Flat Tree (alle Knoten auf einer Ebene, Level über levelAccessor)
interface FlatNode {
  name: string;
  level: number;
  expandable: boolean;
}

@Component({ ... })
export class FlatTreeComponent {
  flatNodes: FlatNode[] = [/* ... */];
  dataSource = new ArrayDataSource(this.flatNodes);
  levelAccessor = (node: FlatNode) => node.level;
}
```

### Besonderheiten

- **Flach vs. Verschachtelt**: Flat Trees speichern alle Knoten in einer flachen Liste mit Level-Information; Nested Trees haben verschachtelte Datenstrukturen. Flat Trees sind oft performanter.
- `FlatTreeControl` und `NestedTreeControl` sind **veraltet** — `levelAccessor` und `childrenAccessor` sind die empfohlene Alternative.
- Tastaturnavigation folgt WAI-ARIA Tree Pattern: Pfeiltasten zum Navigieren, Enter/Space zum Aktivieren, Home/End für erste/letzte Knoten.
- ARIA-Attribute (`role="tree"`, `role="treeitem"`, `aria-expanded`, `aria-level`, `aria-setsize`, `aria-posinset`) werden automatisch berechnet und gesetzt.
- `CdkTreeNodePadding` berechnet die Einrückung automatisch basierend auf dem Level.

---

## Vollständige Modulliste

Alle gefundenen CDK-Module in @angular/cdk@22.0.0:

| # | Modul | Import-Pfad | Kategorie |
|---|---|---|---|
| 1 | Accessibility (a11y) | `@angular/cdk/a11y` | Accessibility |
| 2 | Accordion | `@angular/cdk/accordion` | Components |
| 3 | Bidi (Bidirectionality) | `@angular/cdk/bidi` | Common Behaviors |
| 4 | Clipboard | `@angular/cdk/clipboard` | Common Behaviors |
| 5 | Coercion | `@angular/cdk/coercion` | Utilities |
| 6 | Collections | `@angular/cdk/collections` | Utilities |
| 7 | Dialog | `@angular/cdk/dialog` | Components |
| 8 | Drag and Drop | `@angular/cdk/drag-drop` | Components |
| 9 | Keycodes | `@angular/cdk/keycodes` | Utilities |
| 10 | Layout | `@angular/cdk/layout` | Common Behaviors |
| 11 | Listbox | `@angular/cdk/listbox` | Components |
| 12 | Menu | `@angular/cdk/menu` | Components |
| 13 | Observers | `@angular/cdk/observers` | Common Behaviors |
| 14 | Overlay | `@angular/cdk/overlay` | Components |
| 15 | Platform | `@angular/cdk/platform` | Utilities |
| 16 | Portal | `@angular/cdk/portal` | Components |
| 17 | Scrolling (Virtual Scrolling) | `@angular/cdk/scrolling` | Components |
| 18 | Stepper | `@angular/cdk/stepper` | Components |
| 19 | Table | `@angular/cdk/table` | Components |
| 20 | Testing (Harnesses) | `@angular/cdk/testing` | Testing |
| 21 | Testing/Testbed | `@angular/cdk/testing/testbed` | Testing |
| 22 | Testing/Selenium | `@angular/cdk/testing/selenium-webdriver` | Testing |
| 23 | Text Field | `@angular/cdk/text-field` | Components |
| 24 | Tree | `@angular/cdk/tree` | Components |

**Zusätzliche Entry Points (keine eigene Dokumentation):**
- `@angular/cdk/private` — Interne CDK-Utilities
- `@angular/cdk/coercion/private` — Interne Coercion-Utilities
- `@angular/cdk/observers/private` — Interne Observer-Utilities
- `@angular/cdk/a11y-prebuilt` — Vorgefertigte A11y-CSS-Styles
- `@angular/cdk/overlay-prebuilt` — Vorgefertigte Overlay-CSS-Styles
- `@angular/cdk/text-field-prebuilt` — Vorgefertigte Text-Field-CSS-Styles
- `@angular/cdk/schematics` — Angular-Schematics für CDK

---

*Erstellt aus @angular/cdk@22.0.0 — Quelldateien aus github.com/angular/components (main branch)*
