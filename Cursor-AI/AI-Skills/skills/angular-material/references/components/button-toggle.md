# Button Toggle

**Kategorie:** Buttons & Indicators
**Selector:** `<mat-button-toggle-group>`, `<mat-button-toggle>`
**Import:** `MatButtonToggleModule` from `@angular/material/button-toggle`; Standalone: `MatButtonToggleGroup`, `MatButtonToggle`
**URL:** https://material.angular.dev/components/button-toggle/overview

## Übersicht

An/Aus-Buttons einzeln oder in einer Gruppe (exklusiv oder mehrfach). Standardmodus: Radio-Button-Gruppe. Mit `multiple="true"`: Checkbox-Gruppe. Jeder Toggle hat einen `value`.

## Wichtige Inputs — `<mat-button-toggle-group>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `value` | `any` | Ausgewählter Wert |
| `multiple` | `boolean` | Mehrfachauswahl |
| `disabled` | `boolean` | Gesamte Gruppe deaktivieren |
| `vertical` | `boolean` | Vertikale Anordnung |
| `appearance` | `'legacy' \| 'standard'` | Erscheinungsbild |
| `hideSingleSelectionIndicator` | `boolean` | Haken bei Einzelauswahl ausblenden |
| `hideMultipleSelectionIndicator` | `boolean` | Haken bei Mehrfachauswahl ausblenden |

## Wichtige Inputs — `<mat-button-toggle>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `value` | `any` | Wert dieses Toggles |
| `checked` | `boolean` | Auswahlzustand |
| `disabled` | `boolean` | Toggle deaktivieren |
| `disableRipple` | `boolean` | Ripple deaktivieren |

## Wichtige Outputs

| Output | Typ | Beschreibung |
|--------|-----|-------------|
| `change` | `EventEmitter<MatButtonToggleChange>` | Auswahl geändert |
| `valueChange` | `EventEmitter<any>` | Wert geändert (nur Gruppe) |

## Verwendungsbeispiel

```html
<mat-button-toggle-group [(ngModel)]="alignment" aria-label="Textausrichtung">
  <mat-button-toggle value="left" aria-label="Links">
    <mat-icon>format_align_left</mat-icon>
  </mat-button-toggle>
  <mat-button-toggle value="center" aria-label="Zentriert">
    <mat-icon>format_align_center</mat-icon>
  </mat-button-toggle>
  <mat-button-toggle value="right" aria-label="Rechts">
    <mat-icon>format_align_right</mat-icon>
  </mat-button-toggle>
</mat-button-toggle-group>
```

## Besonderheiten / Gotchas

- Standalone Toggles (ohne Gruppe) haben binären An/Aus-Zustand
- `MAT_BUTTON_TOGGLE_DEFAULT_OPTIONS` für applikationsweite Defaults
