# Slider

**Kategorie:** Form Controls
**Selector:** `<mat-slider>`, `input[matSliderThumb]`, `input[matSliderStartThumb]`, `input[matSliderEndThumb]`
**Import:** `MatSliderModule` from `@angular/material/slider`; Standalone: `MatSlider`, `MatSliderThumb`, `MatSliderRangeThumb`
**URL:** https://material.angular.dev/components/slider/overview

## Übersicht

Material Design Bereichsschieber. Enthält ein oder zwei `<input matSliderThumb>`-Elemente für Einzel- oder Bereichsauswahl. Durch diese Architektur direkt mit Angular Forms kompatibel. Tick-Marks, diskrete Wertanzeige und Formatierung konfigurierbar.

## Wichtige Inputs — `<mat-slider>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `min` | `number` | Minimaler Wert (Standard: 0) |
| `max` | `number` | Maximaler Wert (Standard: 100) |
| `step` | `number` | Schrittgröße (Standard: 1) |
| `discrete` | `boolean` | Numerisches Label beim Drücken |
| `showTickMarks` | `boolean` | Tick-Markierungen anzeigen |
| `disabled` | `boolean` | Deaktivieren |
| `disableRipple` | `boolean` | Ripple deaktivieren |
| `displayWith` | `(value: number) => string` | Wert-Formatierungsfunktion |

## Wichtige Inputs/Outputs — `input[matSliderThumb]`

| Input/Output | Typ | Beschreibung |
|--------------|-----|-------------|
| `value` | `number` (Input) | Aktueller Wert |
| `valueChange` | `EventEmitter<number>` (Output) | Wert geändert |
| `dragStart` | `EventEmitter<MatSliderDragEvent>` (Output) | Ziehen beginnt |
| `dragEnd` | `EventEmitter<MatSliderDragEvent>` (Output) | Ziehen endet |

## Verwendungsbeispiel

```html
<!-- Einfacher Slider -->
<mat-slider min="0" max="100" step="5" discrete>
  <input matSliderThumb [(ngModel)]="volume">
</mat-slider>

<!-- Range Slider -->
<mat-slider>
  <input matSliderStartThumb [(ngModel)]="minPrice">
  <input matSliderEndThumb [(ngModel)]="maxPrice">
</mat-slider>
```

## Besonderheiten / Gotchas

- Neue API (v15+): `<input matSliderThumb>` muss direkt im `<mat-slider>` liegen
- `displayWith` für Formatierung wie `€ 50` im Tooltip
- Farbe in M2 via `color`-Input; in M3 über Token-System
