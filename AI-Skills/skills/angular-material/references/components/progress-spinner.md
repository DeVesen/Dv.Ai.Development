# Progress Spinner

**Kategorie:** Buttons & Indicators
**Selector:** `<mat-progress-spinner>`, `<mat-spinner>`
**Import:** `MatProgressSpinnerModule` from `@angular/material/progress-spinner`; Standalone: `MatProgressSpinner`
**URL:** https://material.angular.dev/components/progress-spinner/overview

## Übersicht

Kreisförmiger Fortschrittsindikator. `<mat-spinner>` ist Alias für `<mat-progress-spinner mode="indeterminate">`. Determinate (Prozentanzeige) und indeterminate (Ladeanimation). Durchmesser und Strichbreite konfigurierbar.

## Wichtige Inputs

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `mode` | `'determinate' \| 'indeterminate'` | Anzeigemodus |
| `value` | `number` | Fortschrittswert 0–100 (nur determinate) |
| `diameter` | `number` | Durchmesser in Pixel (Standard: 40) |
| `strokeWidth` | `number` | Strichbreite in Pixel |
| `color` | `string \| null \| undefined` | Theme-Farbe (nur M2) |

## Verwendungsbeispiel

```html
<!-- Ladeindikator -->
<mat-spinner></mat-spinner>

<!-- Mit Fortschritt -->
<mat-progress-spinner mode="determinate" [value]="progress" [diameter]="60">
</mat-progress-spinner>

<!-- Benutzerdefinierte Größe -->
<mat-spinner [diameter]="80" [strokeWidth]="8"></mat-spinner>
```

## Besonderheiten / Gotchas

- `MAT_PROGRESS_SPINNER_DEFAULT_OPTIONS` für globale Standardwerte
- `_forceAnimations` in Default-Options erzwingt CSS-Animationen (für Tests)
