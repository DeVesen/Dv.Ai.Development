# Collections

**Kategorie:** Utilities
**Import:** Einzelne Klassen from `@angular/cdk/collections`
**URL:** https://material.angular.dev/cdk/collections/overview

## Übersicht

Das `collections`-Paket stellt Datenstruktur-Utilities bereit, die in Angular-Anwendungen häufig benötigt werden. Das Herzstück ist die `SelectionModel`-Klasse, die eine typsichere Auswahlliste mit Einzel- und Mehrfachauswahl unterstützt. Zusätzlich enthält das Paket das `DataSource`-Interface, das `ArrayDataSource` als Implementierung, sowie Utilities für View-Repeater und Baum-Adapter. `UniqueSelectionDispatcher` wird intern von Komponenten wie Radiobuttons verwendet, um gegenseitige Ausschließlichkeit zu koordinieren.

## Wichtige Direktiven/Services/Tokens

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

## Verwendungsbeispiel

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

## Besonderheiten

- `SelectionModel` verwendet intern ein `Set` für O(1)-Lookup-Performance.
- Bei Mehrfachauswahl mit `setSelection()` werden alle vorherigen Werte ersetzt.
- Das `changed`-Observable emittiert nur, wenn `emitChanges: true` (Standard).
- `UniqueSelectionDispatcher` wird primär von `MatRadioButton` und `MatSelectionList` genutzt — eigene Nutzung ist selten nötig.
- Benutzerdefinierter `compareWith` ist wichtig bei Objekten, damit Wertgleichheit statt Referenzgleichheit verglichen wird.
