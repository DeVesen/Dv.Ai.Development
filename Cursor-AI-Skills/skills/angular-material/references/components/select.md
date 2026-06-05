# Select

**Kategorie:** Form Controls
**Selector:** `<mat-select>`
**Import:** `MatSelectModule` from `@angular/material/select`; Standalone: `MatSelect`
**URL:** https://material.angular.dev/components/select/overview

## Übersicht

Vollständig barrierefreier Dropdown-Selektor mit Material Design-Styling. Unterstützt Einzel- und Mehrfachauswahl, Optionsgruppen via `<mat-optgroup>`, benutzerdefinierte Trigger-Anzeige via `<mat-select-trigger>` und Typeahead-Navigation. Integration in `<mat-form-field>` und Angular Forms.

## Wichtige Inputs

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `multiple` | `boolean` | Mehrfachauswahl |
| `disabled` | `boolean` | Deaktivieren |
| `required` | `boolean` | Pflichtfeld |
| `placeholder` | `string` | Platzhaltertext ohne Auswahl |
| `compareWith` | `(o1: any, o2: any) => boolean` | Vergleichsfunktion für Werte |
| `value` | `any` | Aktueller Wert |
| `panelWidth` | `string \| number \| null` | Panel-Breite |
| `disableOptionCentering` | `boolean` | Aktive Option nicht zentrieren |
| `hideSingleSelectionIndicator` | `boolean` | Haken ausblenden |
| `typeaheadDebounceInterval` | `number` | Debounce-Zeit für Typeahead (ms) |
| `errorStateMatcher` | `ErrorStateMatcher` | Fehleranzeige-Steuerung |

## Wichtige Outputs

| Output | Typ | Beschreibung |
|--------|-----|-------------|
| `selectionChange` | `EventEmitter<MatSelectChange>` | Auswahl geändert |
| `openedChange` | `EventEmitter<boolean>` | Panel geöffnet/geschlossen |
| `opened` | `Observable<void>` | Panel geöffnet |
| `closed` | `Observable<void>` | Panel geschlossen |

## Verwendungsbeispiel

```html
<mat-form-field>
  <mat-label>Land</mat-label>
  <mat-select formControlName="country" multiple>
    <mat-optgroup label="Europa">
      <mat-option value="de">Deutschland</mat-option>
      <mat-option value="at">Österreich</mat-option>
    </mat-optgroup>
    <mat-optgroup label="Amerika">
      <mat-option value="us">USA</mat-option>
    </mat-optgroup>
  </mat-select>
</mat-form-field>
```

## `MatOption` und `MatOptgroup` API

**Inputs `<mat-option>`:** `value: any`, `disabled: boolean`, `id: string`

**Outputs `<mat-option>`:** `onSelectionChange: EventEmitter<MatOptionSelectionChange>`

**Methoden `MatOption`:** `select()`, `deselect()`, `focus()`

**Inputs `<mat-optgroup>`:** `label: string`, `disabled: boolean`

## Besonderheiten / Gotchas

- Bei Objektwerten `compareWith` implementieren — sonst fehlt Auswahl nach Datenneu-Laden
- `<mat-select-trigger>` für benutzerdefinierte Anzeige im geschlossenen Zustand
- `MAT_SELECT_CONFIG` für applikationsweite Standardkonfiguration
- `MAT_OPTION_PARENT_COMPONENT` und `MAT_OPTGROUP` sind interne Tokens; für programmatischen Zugriff `MatOption.select()` / `MatOption.deselect()` verwenden
