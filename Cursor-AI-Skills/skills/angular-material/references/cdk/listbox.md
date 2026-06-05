# Listbox

**Kategorie:** Components
**Import:** `CdkListboxModule` from `@angular/cdk/listbox`
**URL:** https://material.angular.dev/cdk/listbox/overview

## Übersicht

Das `listbox`-Paket implementiert das WAI-ARIA Listbox-Pattern als Angular-Direktiven. Es stellt barrierefreie Listen-Auswahl-Komponenten ohne visuelles Styling bereit. `CdkListbox` ist der Container, `CdkOption` sind die einzelnen auswählbaren Optionen. Das Paket unterstützt Einzel- und Mehrfachauswahl, Tastaturnavigation, Typeahead-Suche, Formular-Integration via `ControlValueAccessor` sowie ARIA Active Descendant Pattern.

## Wichtige Direktiven/Services/Tokens

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

## Verwendungsbeispiel

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

## Besonderheiten

- Tastaturnavigation: Pfeiltasten, Home, End, Space/Enter zur Auswahl, Shift für Bereichsauswahl, Ctrl+A für Alles-Auswählen.
- Typeahead: Buchstabentasten springen zur ersten übereinstimmenden Option.
- `cdkListboxUseActiveDescendant: true` verwendet `aria-activedescendant` statt echten Fokus — wichtig für Screenreader-Kompatibilität.
- Formular-Integration: `CdkListbox` implementiert `ControlValueAccessor` für Reactive Forms und Template-Driven Forms.
- ARIA-Attribute (`role="listbox"`, `aria-selected`, `role="option"`) werden automatisch gesetzt.
