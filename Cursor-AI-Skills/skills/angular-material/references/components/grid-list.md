# Grid List

**Kategorie:** Layout
**Selector:** `<mat-grid-list>`, `<mat-grid-tile>`
**Import:** `MatGridListModule` from `@angular/material/grid-list`; Standalone: `MatGridList`, `MatGridTile`, `MatGridTileText`
**URL:** https://material.angular.dev/components/grid-list/overview

## Übersicht

Zweidimensionales Listenlayout mit Kacheln (`mat-grid-tile`) in einem Raster. Kacheln können mehrere Zeilen und Spalten überspannen. Responsiv über `cols` und `rowHeight` konfigurierbar.

## Wichtige Inputs — `<mat-grid-list>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `cols` | `number` | Spaltenanzahl (Pflicht) |
| `rowHeight` | `string \| number` | Zeilenhöhe: Pixel, Verhältnis (`'4:3'`) oder `'fit'` |
| `gutterSize` | `string` | Abstand zwischen Kacheln (Standard: `'1px'`) |

## Wichtige Inputs — `<mat-grid-tile>`

| Input | Typ | Beschreibung |
|-------|-----|-------------|
| `colspan` | `number` | Belegte Spalten |
| `rowspan` | `number` | Belegte Zeilen |

## Verwendungsbeispiel

```html
<mat-grid-list cols="3" rowHeight="200px" gutterSize="8px">
  <mat-grid-tile [colspan]="2">
    <mat-grid-tile-header>Titel</mat-grid-tile-header>
    Inhalt Kachel 1
  </mat-grid-tile>
  <mat-grid-tile>Kachel 2</mat-grid-tile>
  <mat-grid-tile>Kachel 3</mat-grid-tile>
</mat-grid-list>
```

## Besonderheiten / Gotchas

- `rowHeight="fit"` verteilt Kacheln gleichmäßig auf verfügbare Containerhöhe
- `<mat-grid-tile-header>` und `<mat-grid-tile-footer>` können Avatare enthalten
