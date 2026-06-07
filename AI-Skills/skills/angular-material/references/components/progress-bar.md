# Progress Bar

**Kategorie:** Buttons & Indicators
**Selector:** `<mat-progress-bar>`
**Import:** `MatProgressBarModule` from `@angular/material/progress-bar`; Standalone: `MatProgressBar`
**URL:** https://material.angular.dev/components/progress-bar/overview

## Übersicht

Visualisiert Fortschritt oder Ladezustände. Vier Modi: `determinate` (bekannter Fortschritt), `indeterminate` (unbekannte Dauer), `buffer` (für Streaming), `query` (reverse-indeterminate). Vollständig barrierefrei mit ARIA-Attributen.

## Wichtige Inputs

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `mode` | `'determinate' \| 'indeterminate' \| 'buffer' \| 'query'` | Anzeigemodus |
| `value` | `number` | Fortschrittswert (0–100) |
| `bufferValue` | `number` | Buffer-Wert (0–100), nur `buffer`-Modus |
| `color` | `string \| null \| undefined` | Theme-Farbe (nur M2) |

## Wichtige Outputs

| Output | Typ | Beschreibung |
|--------|-----|-------------|
| `animationEnd` | `EventEmitter<ProgressAnimationEnd>` | Animation abgeschlossen (determinate) |

## Verwendungsbeispiel

```html
<!-- Determinate -->
<mat-progress-bar mode="determinate" [value]="uploadProgress"></mat-progress-bar>

<!-- Indeterminate -->
<mat-progress-bar mode="indeterminate"></mat-progress-bar>

<!-- Buffer (Streaming) -->
<mat-progress-bar mode="buffer"
                  [value]="playedPercent"
                  [bufferValue]="bufferedPercent">
</mat-progress-bar>
```

## Besonderheiten / Gotchas

- Im `indeterminate` und `query`-Modus wird `value` ignoriert
- `MAT_PROGRESS_BAR_DEFAULT_OPTIONS` für applikationsweite Defaults
