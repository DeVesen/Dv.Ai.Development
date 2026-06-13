# Autocomplete

**Kategorie:** Form Controls
**Selector:** `<mat-autocomplete>`, Trigger: `input[matAutocomplete]`
**Import:** `MatAutocompleteModule` from `@angular/material/autocomplete`; Standalone: `MatAutocomplete`, `MatAutocompleteTrigger`
**URL:** https://material.angular.dev/components/autocomplete/overview

## Übersicht

Die Autocomplete-Komponente ergänzt ein Text-Eingabefeld um ein Overlay-Panel mit gefilterten Vorschlägen. Sie besteht aus zwei Teilen: dem `<mat-autocomplete>`-Panel mit `<mat-option>`-Elementen und dem `matAutocomplete`-Trigger-Attribut auf dem `<input>`-Element. Vollständig barrierefrei (ARIA). Das Panel öffnet sich beim Fokus und schließt sich bei Blur oder Auswahl.

## Wichtige Inputs — `<mat-autocomplete>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `displayWith` | `(value: any) => string` | Optionswert → Anzeigetext |
| `autoActiveFirstOption` | `boolean` | Erste Option beim Öffnen hervorheben |
| `autoSelectActiveOption` | `boolean` | Aktive Option bei Navigation auswählen |
| `requireSelection` | `boolean` | Wert zurücksetzen wenn keine Option gewählt |
| `panelWidth` | `string \| number` | Breite des Panels |
| `disableRipple` | `boolean` | Ripple-Effekte deaktivieren |
| `hideSingleSelectionIndicator` | `boolean` | Haken bei Einzelauswahl ausblenden |

## Wichtige Inputs — `matAutocomplete`-Trigger

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `matAutocomplete` | `MatAutocomplete` | Verknüpftes Panel |
| `matAutocompletePosition` | `'auto' \| 'above' \| 'below'` | Panel-Positionierung |
| `matAutocompleteConnectedTo` | `MatAutocompleteOrigin` | Referenzelement für Positionierung |
| `matAutocompleteDisabled` | `boolean` | Autocomplete deaktivieren |

## Wichtige Outputs

| Output | Typ | Beschreibung |
|--------|-----|-------------|
| `optionSelected` | `EventEmitter<MatAutocompleteSelectedEvent>` | Option ausgewählt |
| `opened` | `EventEmitter<void>` | Panel geöffnet |
| `closed` | `EventEmitter<void>` | Panel geschlossen |
| `optionActivated` | `EventEmitter<MatAutocompleteActivatedEvent>` | Option per Tastatur aktiviert |

## Verwendungsbeispiel

```html
<mat-form-field>
  <input type="text" matInput [formControl]="myControl"
         [matAutocomplete]="auto" placeholder="Suchen...">
  <mat-autocomplete #auto="matAutocomplete" [displayWith]="displayFn">
    @for (option of filteredOptions | async; track option) {
      <mat-option [value]="option">{{ option.name }}</mat-option>
    }
  </mat-autocomplete>
</mat-form-field>
```

## CSS Custom Properties / Theming

Panel erbt M3-Token-System. Über `panelClass` eigene Klassen auf das Overlay anwenden.

## Besonderheiten / Gotchas

- `displayWith` ist Pflicht wenn Optionswert ein Objekt ist — sonst `[object Object]`
- `requireSelection: true` setzt Wert zurück wenn Feld verlassen ohne Auswahl
- `autocomplete="off"` auf dem Input verhindert Browser-Autovervollständigung
